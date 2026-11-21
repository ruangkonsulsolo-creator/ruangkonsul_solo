import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { wajibStaf } from "@/lib/auth/wajib-staf";
import { MESIN_LAPORAN } from "@/lib/periksa/manual";

export const dynamic = "force-dynamic";

const skema = z.object({
  persen_kemiripan: z.number().min(0, "Persentase 0–100.").max(100, "Persentase 0–100."),
  selesaikan: z.boolean().optional().default(true),
  mesin_laporan: z.enum(MESIN_LAPORAN).optional(),
});

/**
 * Admin sudah mengunggah PDF laporan langsung ke bucket "reports"
 * (<order id>/laporan.pdf). Rute ini memeriksa berkasnya ada, menyimpan
 * persentase, menandai pesanan selesai, dan memberi tahu customer.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Masuk dulu." }, { status: 401 });
  const ditolak = await wajibStaf(supabase, user.id);
  if (ditolak) return ditolak;
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ error: "Id tidak valid." }, { status: 400 });

  const parsed = skema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 422 });

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, user_id, order_number, status").eq("id", params.id).maybeSingle();
  if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  if (["menunggu_pembayaran", "dibatalkan"].includes(order.status)) {
    return NextResponse.json({ error: "Pesanan belum dibayar atau sudah dibatalkan." }, { status: 409 });
  }

  const path = `${order.id}/laporan.pdf`;
  const { data: ada } = await admin.storage.from("reports").list(order.id, { search: "laporan.pdf", limit: 1 });
  if (!Array.isArray(ada) || !ada.some((o) => o.name === "laporan.pdf")) {
    return NextResponse.json({ error: "PDF laporan belum terunggah." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("orders")
    .update({
      report_storage_path: path,
      report_uploaded_at: now,
      persen_kemiripan: parsed.data.persen_kemiripan,
      ...(parsed.data.mesin_laporan ? { mesin_laporan: parsed.data.mesin_laporan } : {}),
      assigned_admin_id: user.id,
      ...(parsed.data.selesaikan ? { status: "selesai", completed_at: now } : {}),
    })
    .eq("id", order.id);
  if (error) {
    console.error("[admin/laporan]", error.message);
    return NextResponse.json({ error: "Gagal menyimpan laporan." }, { status: 500 });
  }

  if (parsed.data.selesaikan) {
    await admin.from("notifications").insert({
      user_id: order.user_id,
      order_id: order.id,
      channel: "in_app",
      title: "Laporan Cek Plagiarisme Siap",
      body: `Laporan ${order.order_number} sudah siap: kemiripan ${parsed.data.persen_kemiripan}%${parsed.data.mesin_laporan && parsed.data.mesin_laporan !== "Lainnya" ? ` (${parsed.data.mesin_laporan})` : ""}. Lihat & unduh di Riwayat Pesanan.`,
    });
  }
  return NextResponse.json({ ok: true });
}
