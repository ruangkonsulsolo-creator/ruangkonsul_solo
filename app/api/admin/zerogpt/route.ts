import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { wajibStaf } from "@/lib/auth/wajib-staf";
import { cariUserIdZeroGpt, headerAuth, sensor } from "@/lib/periksa/penyedia-zerogpt";

export const dynamic = "force-dynamic";

/**
 * Cek koneksi ZeroGPT (khusus staf): saldo/paket dari myStats dan user_id
 * akun (dicari otomatis dari riwayat deteksi) untuk laporan PDF resmi.
 * Semua nilai rahasia (apiKey, token, …) DISENSOR sebelum ditampilkan.
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Masuk dulu." }, { status: 401 });
  const tolak = await wajibStaf(supabase, user.id);
  if (tolak) return tolak;

  const kunci = process.env.ZEROGPT_API_KEY;
  if (!kunci) return NextResponse.json({ error: "ZEROGPT_API_KEY belum disetel di Vercel." }, { status: 400 });
  const dasar = (process.env.ZEROGPT_API_BASE || "https://api.zerogpt.com").replace(/\/$/, "");
  try {
    const res = await fetch(`${dasar}/api/dashboard/myStats`, {
      headers: headerAuth(kunci),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as { data?: Record<string, unknown> } | null;
    const d = json?.data ?? {};
    const paket = (d.balancePackage ?? {}) as Record<string, unknown>;
    const uid = await cariUserIdZeroGpt();
    return NextResponse.json({
      status_zerogpt: res.status,
      saldo_usd: d.balance ?? null,
      paket_api: paket.description ?? null,
      biaya_per_1000_kata_usd: paket.costPerThousand ?? null,
      ip_whitelist: d.ipWhitelist || "(kosong — semua IP diizinkan)",
      user_id: uid.userId ?? "belum ditemukan — jalankan satu Cek AI dulu, lalu buka halaman ini lagi",
      sumber_user_id: process.env.ZEROGPT_USER_ID ? "env ZEROGPT_USER_ID" : "otomatis dari riwayat deteksi",
      ...(uid.galat ? { catatan: uid.galat } : {}),
      riwayat_terbaru: uid.userId ? undefined : uid.riwayat,
      mystats_disensor: res.ok ? undefined : sensor(json),
    });
  } catch (e) {
    return NextResponse.json({ error: `Gagal menghubungi ZeroGPT: ${e instanceof Error ? e.message : e}` }, { status: 502 });
  }
}
