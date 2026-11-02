import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const KOLOM =
  "id, bio, headline, gelar, education, specializations, experience_years, " +
  "price_per_hour, is_available, avatar_url, linkedin_url, pencapaian, " +
  "pengalaman, pendidikan, rating_avg, session_count";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Masuk dulu." }, { status: 401 });

  const { data, error } = await supabase
    .from("mentor_profiles").select(KOLOM).eq("user_id", user.id).maybeSingle();

  if (error) {
    console.error("[profil-mentor] gagal memuat:", error);
    return NextResponse.json({ error: "Gagal memuat profil." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Profil mentor belum dibuat. Hubungi admin untuk diaktifkan.",
        action: "belum_mentor" },
      { status: 404 });
  }
  return NextResponse.json({ data });
}

const pengalaman = z.object({
  posisi: z.string().trim().max(160),
  instansi: z.string().trim().max(160),
  mulai: z.string().trim().max(20),
  selesai: z.string().trim().max(20),
  catatan: z.string().trim().max(500).optional().default(""),
});

const pendidikan = z.object({
  jenjang: z.string().trim().max(40),
  program: z.string().trim().max(160),
  kampus: z.string().trim().max(160),
  tahun: z.string().trim().max(20),
});

const skema = z.object({
  headline: z.string().trim().max(160).nullable().optional(),
  bio: z.string().trim().max(3000).nullable().optional(),
  gelar: z.string().trim().max(80).nullable().optional(),
  education: z.string().trim().max(300).nullable().optional(),
  linkedin_url: z.string().trim().url().max(300).nullable().optional().or(z.literal("")),
  avatar_url: z.string().trim().max(500).nullable().optional().or(z.literal("")),
  specializations: z.array(z.string().trim().max(80)).max(12).optional(),
  pencapaian: z.array(z.string().trim().max(240)).max(20).optional(),
  pengalaman: z.array(pengalaman).max(20).optional(),
  pendidikan: z.array(pendidikan).max(10).optional(),
  experience_years: z.number().int().min(0).max(70).optional(),
  is_available: z.boolean().optional(),
});

/**
 * Menyimpan perubahan profil.
 *
 * price_per_hour, rating_avg, dan session_count sengaja TIDAK bisa diubah
 * lewat rute ini. Tarif adalah keputusan bisnis milik admin, sedangkan
 * rating dan jumlah sesi dihitung dari data nyata oleh trigger — mentor yang
 * bisa mengetik rating sendiri membuat seluruh angka di situs tidak berarti.
 */
export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Masuk dulu." }, { status: 401 });

  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ error: "Data tidak terbaca." }, { status: 400 }); }

  const parsed = skema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ada isian yang belum benar.",
        rinci: parsed.error.issues.slice(0, 5).map((i) => i.path.join(".") + ": " + i.message) },
      { status: 422 });
  }

  const isi = { ...parsed.data };
  // String kosong disimpan sebagai NULL, bukan "", supaya kueri "belum diisi"
  // cukup memeriksa NULL saja.
  for (const k of ["linkedin_url", "avatar_url"] as const) {
    if (isi[k] === "") isi[k] = null;
  }

  const { data, error } = await supabase
    .from("mentor_profiles")
    .update({ ...isi, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .select(KOLOM)
    .maybeSingle();

  if (error) {
    console.error("[profil-mentor] gagal menyimpan:", error);
    return NextResponse.json({ error: "Gagal menyimpan profil." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Profil mentor tidak ditemukan untuk akun ini." }, { status: 404 });
  }

  return NextResponse.json({ data });
}
