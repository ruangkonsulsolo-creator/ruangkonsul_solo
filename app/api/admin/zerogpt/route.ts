import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { wajibStaf } from "@/lib/auth/wajib-staf";

export const dynamic = "force-dynamic";

/**
 * Cek koneksi ZeroGPT (khusus staf): memanggil api/dashboard/myStats dengan
 * API key server, untuk memastikan key & IP diterima dan menemukan user_id
 * akun (dibutuhkan ZEROGPT_USER_ID agar laporan PDF resmi bisa diambil).
 * API key tidak pernah ikut dikembalikan.
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
      headers: { [process.env.ZEROGPT_AUTH_HEADER || "ApiKey"]: kunci },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    const teks = await res.text();
    let isi: unknown = teks.slice(0, 2000);
    try { isi = JSON.parse(teks); } catch { /* bukan JSON */ }
    return NextResponse.json({
      status_zerogpt: res.status,
      user_id_terpasang: process.env.ZEROGPT_USER_ID ? "sudah" : "belum",
      petunjuk: "Cari medan id / user_id / _id di 'tanggapan' lalu isi ke ZEROGPT_USER_ID di Vercel.",
      tanggapan: isi,
    });
  } catch (e) {
    return NextResponse.json({ error: `Gagal menghubungi ZeroGPT: ${e instanceof Error ? e.message : e}` }, { status: 502 });
  }
}
