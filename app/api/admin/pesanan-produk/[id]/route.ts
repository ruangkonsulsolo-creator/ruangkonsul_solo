import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, STAFF_ROLES } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsApp } from "@/lib/notification/whatsapp";
import { BRAND } from "@/lib/brand";
import { appUrl } from "@/lib/notification/whatsapp";
import { bacaBerkas, MAKS_HASIL, skemaBerkas } from "@/lib/katalog/berkas-jasa";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("aksi", [
  z.object({ aksi: z.literal("proses"), catatan_admin: z.string().trim().max(500).optional() }),
  z.object({ aksi: z.literal("kirim"), kurir: z.string().trim().min(2).max(40), no_resi: z.string().trim().min(4).max(60) }),
  z.object({ aksi: z.literal("selesai") }),
  z.object({ aksi: z.literal("batal"), alasan: z.string().trim().min(3).max(200) }),
  // Jasa berkas: simpan daftar file hasil (pengganti penuh). selesaikan=true → status selesai + kabari customer.
  z.object({ aksi: z.literal("hasil"), berkas: z.array(skemaBerkas).max(MAKS_HASIL), selesaikan: z.boolean() }),
]);

const DARI: Record<string, string[]> = {
  proses: ["dibayar"],
  kirim: ["dibayar", "diproses", "dikirim"],
  selesai: ["dibayar", "diproses", "dikirim"],
  batal: ["dibayar", "diproses"],
  hasil: ["dibayar", "diproses", "dikirim", "selesai"],
};

/** Admin memproses pesanan produk: proses → kirim (resi) → selesai, atau batal (refund manual). */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(STAFF_ROLES);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Input tidak valid." }, { status: 422 });
  const input = parsed.data;

  const admin = createAdminClient();
  const { data: o } = await admin.from("pesanan_produk").select("*").eq("id", params.id).maybeSingle();
  if (!o) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  if (!DARI[input.aksi].includes(o.status)) return NextResponse.json({ error: `Tidak bisa dari status "${o.status}".` }, { status: 409 });

  if (input.aksi === "hasil") {
    if (o.jasa_berkas !== true) return NextResponse.json({ error: "Pesanan ini bukan jasa berkas." }, { status: 400 });
    // Setiap file harus berada di hasil-jasa/<id pesanan>/ dan benar-benar ada.
    const { data: ada } = await admin.storage.from("hasil-jasa").list(o.id, { limit: 100 });
    const nama = new Set((ada ?? []).map((x) => x.name));
    for (const b of input.berkas) {
      const [folder, file, ...lebih] = b.path.split("/");
      if (folder !== o.id || !file || lebih.length || !nama.has(file)) {
        return NextResponse.json({ error: `File "${b.nama}" belum terunggah dengan benar.` }, { status: 422 });
      }
    }
    if (input.selesaikan && input.berkas.length === 0) {
      return NextResponse.json({ error: "Unggah minimal satu file hasil sebelum menyelesaikan." }, { status: 422 });
    }

    // File yang dihapus dari daftar ikut dihapus dari storage.
    const tetap = new Set(input.berkas.map((b) => b.path));
    const dibuang = bacaBerkas(o.berkas_hasil).map((b) => b.path).filter((p) => !tetap.has(p));
    if (dibuang.length) await admin.storage.from("hasil-jasa").remove(dibuang);

    const now = new Date().toISOString();
    const patchHasil: Record<string, unknown> = { berkas_hasil: input.berkas };
    const jadiSelesai = input.selesaikan && o.status !== "selesai";
    if (jadiSelesai) Object.assign(patchHasil, { status: "selesai", selesai_at: now, hasil_at: now });
    else if (input.berkas.length && o.status === "dibayar") patchHasil.status = "diproses";

    const { error: eH } = await admin.from("pesanan_produk").update(patchHasil).eq("id", o.id);
    if (eH) return NextResponse.json({ error: "Gagal menyimpan file hasil." }, { status: 500 });

    if (jadiSelesai) {
      const link = `${appUrl()}/dashboard/pesanan-produk/${o.id}`;
      await admin.from("notifications").insert({
        user_id: o.user_id, channel: "in_app", title: "File Hasil Siap Diunduh",
        body: `Pesanan ${o.nomor} (${o.nama_produk}) selesai. Unduh file hasilnya di menu Pesanan Produk.`,
      });
      sendWhatsApp({
        to: o.whatsapp,
        message: `🎉 *${BRAND.name}* — Pesanan *${o.nomor}* (${o.nama_produk}) sudah selesai!\n\nUnduh file hasilnya di sini (login dulu):\n${link}\n\nTerima kasih sudah memakai layanan kami 🙏`,
      }).catch(() => undefined);
    }
    return NextResponse.json({ data: "ok" });
  }

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
