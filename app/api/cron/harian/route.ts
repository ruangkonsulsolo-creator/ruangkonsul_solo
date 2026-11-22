import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Tugas harian (Vercel Cron, 00:00 WIB — lihat vercel.json).
 * Vercel mengirim header `Authorization: Bearer <CRON_SECRET>`.
 *
 * 1. Tandai kuota paket yang sudah lewat masa berlaku (pengganti Edge
 *    Function expire-quota-checker yang tidak pernah dijadwalkan) dan
 *    kabari pemiliknya lewat notifikasi.
 */
export async function GET(req: NextRequest) {
  const rahasia = process.env.CRON_SECRET;
  if (!rahasia || req.headers.get("authorization") !== `Bearer ${rahasia}`) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const hasil: Record<string, unknown> = {};

  const { data: kedaluwarsa, error } = await admin
    .from("user_quotas")
    .update({ is_expired: true })
    .eq("is_expired", false)
    .lt("expires_at", now)
    .select("id, user_id");
  if (error) {
    console.error("[cron] kuota:", error.message);
    hasil.kuota = { error: error.message };
  } else {
    hasil.kuota = { kedaluwarsa: kedaluwarsa?.length ?? 0 };
    const pemilik = [...new Set((kedaluwarsa ?? []).map((k) => k.user_id))];
    if (pemilik.length) {
      await admin.from("notifications").insert(
        pemilik.map((user_id) => ({
          user_id,
          channel: "in_app",
          title: "Kuota Paket Berakhir",
          body: "Sebagian kuota paketmu sudah melewati masa berlaku. Cek Paket Saya untuk detailnya.",
        }))
      );
    }
  }

  return NextResponse.json({ ok: true, waktu: now, ...hasil });
}
