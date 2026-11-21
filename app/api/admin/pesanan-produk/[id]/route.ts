import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, STAFF_ROLES } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsApp } from "@/lib/notification/whatsapp";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("aksi", [
  z.object({ aksi: z.literal("proses"), catatan_admin: z.string().trim().max(500).optional() }),
  z.object({ aksi: z.literal("kirim"), kurir: z.string().trim().min(2).max(40), no_resi: z.string().trim().min(4).max(60) }),
  z.object({ aksi: z.literal("selesai") }),
  z.object({ aksi: z.literal("batal"), alasan: z.string().trim().min(3).max(200) }),
]);

const DARI: Record<string, string[]> = {
  proses: ["dibayar"],
  kirim: ["dibayar", "diproses", "dikirim"],
  selesai: ["dibayar", "diproses", "dikirim"],
  batal: ["dibayar", "diproses"],
};

/** Admin memproses pesanan produk: proses → kirim (resi) → selesai, atau batal (refund manual). */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(STAFF_ROLES);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Input tidak valid." }, { status: 422 });
  const input = parsed.data;

  const admin = createAdminClient();
  const { data: o } = await admin.from("pesanan_produk").select("id, nomor, user_id, status, whatsapp, nama_produk").eq("id", params.id).maybeSingle();
  if (!o) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  if (!DARI[input.aksi].includes(o.status)) return NextResponse.json({ error: `Tidak bisa dari status "${o.status}".` }, { status: 409 });

  const now = new Date().toISOString();
  let patch: Record<string, unknown>;
  let pesan: string;
  if (input.aksi === "proses") {
    patch = { status: "diproses", catatan_admin: input.catatan_admin ?? null };
    pesan = `Pesanan ${o.nomor} (${o.nama_produk}) sedang kami proses.`;
  } else if (input.aksi === "kirim") {
    patch = { status: "dikirim", kurir: input.kurir, no_resi: input.no_resi };
    pesan = `Pesanan ${o.nomor} dikirim via ${input.kurir}. No. resi: ${input.no_resi}`;
  } else if (input.aksi === "selesai") {
    patch = { status: "selesai", selesai_at: now };
    pesan = `Pesanan ${o.nomor} selesai. Terima kasih!`;
  } else {
    patch = { status: "dibatalkan", dibatalkan_at: now, alasan_batal: input.alasan };
    pesan = `Pesanan ${o.nomor} dibatalkan: ${input.alasan}. Tim kami akan memproses refund.`;
  }

  const { error } = await admin.from("pesanan_produk").update(patch).eq("id", o.id).eq("status", o.status);
  if (error) return NextResponse.json({ error: "Gagal memperbarui pesanan." }, { status: 500 });
  if (input.aksi === "batal") await admin.rpc("lepas_stok_pesanan", { p_pesanan_id: o.id });

  await admin.from("notifications").insert({ user_id: o.user_id, channel: "in_app", title: "Update Pesanan", body: pesan });
  sendWhatsApp({ to: o.whatsapp, message: `📦 *${BRAND.name}* — ${pesan}` }).catch(() => undefined);
  return NextResponse.json({ data: "ok" });
}
