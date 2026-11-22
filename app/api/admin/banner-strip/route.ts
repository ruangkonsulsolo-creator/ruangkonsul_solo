import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { wajibStaf } from "@/lib/auth/wajib-staf";

/**
 * Kelola banner strip lebar penuh di beranda (tabel `banners`, migration 016).
 * Beranda mengambilnya lewat /api/banners di sisi klien, jadi perubahan
 * langsung terlihat tanpa revalidate.
 */
export const dynamic = "force-dynamic";

const tautan = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || v.startsWith("/") || /^https:\/\//.test(v), "Link harus diawali / atau https://");

const skema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Judul/keterangan wajib diisi.").max(200),
  image_url: z
    .string()
    .trim()
    .min(1, "Gambar wajib diisi.")
    .max(500)
    .refine((v) => v.startsWith("/") || /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\//.test(v), "Gambar harus dari unggahan."),
  link_url: tautan.optional().default(""),
  sort_order: z.number().int().min(0).max(999).optional(),
  is_active: z.boolean().optional(),
});

const BAWAAN = [
  { title: "RK Merchandise — buket wisuda dan perlengkapan kuliah", image_url: "/banner/1.jpg", link_url: "/merchandise", sort_order: 1 },
  { title: "Kelas gratis Data Science & Data Analysis", image_url: "/banner/2.jpg", link_url: "/event", sort_order: 2 },
  { title: "Giveaway tumbler untuk mahasiswa IPK di atas 3,5", image_url: "/banner/3.jpg", link_url: "/event", sort_order: 3 },
];

const KOLOM = "id, title, image_url, link_url, sort_order, is_active";

async function siapkan() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { galat: NextResponse.json({ error: "Masuk dulu." }, { status: 401 }) };
  const ditolak = await wajibStaf(supabase, user.id);
  if (ditolak) return { galat: ditolak };
  return { supabase, userId: user.id };
}

/** Tambah/ubah banner. `{ salin_bawaan: true }` menyalin 3 banner bawaan bila tabel kosong. */
export async function POST(request: NextRequest) {
  const s = await siapkan();
  if ("galat" in s) return s.galat;
  const body = await request.json().catch(() => ({}));

  if (body?.salin_bawaan === true) {
    const { count } = await s.supabase.from("banners").select("id", { count: "exact", head: true });
    if (count && count > 0) return NextResponse.json({ error: "Daftar banner sudah terisi." }, { status: 409 });
    const { data, error } = await s.supabase
      .from("banners")
      .insert(BAWAAN.map((b) => ({ ...b, created_by: s.userId })))
      .select(KOLOM);
    if (error) {
      console.error("[admin/banner-strip]", error.message);
      return NextResponse.json({ error: "Gagal menyalin banner bawaan." }, { status: 500 });
    }
    return NextResponse.json({ data });
  }

  const parsed = skema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 422 });
  }
  const { id, ...d } = parsed.data;
  const isi = { ...d, link_url: d.link_url || null };

  const q = id
    ? s.supabase.from("banners").update(isi).eq("id", id).select(KOLOM).single()
    : s.supabase.from("banners").insert({ ...isi, created_by: s.userId }).select(KOLOM).single();
  const { data, error } = await q;
  if (error) {
    console.error("[admin/banner-strip]", error.message);
    return NextResponse.json({ error: "Gagal menyimpan banner." }, { status: 500 });
  }
  return NextResponse.json({ data });
}

/** Hapus banner (berkas di storage ikut dihapus bila hasil unggahan). */
export async function DELETE(request: NextRequest) {
  const s = await siapkan();
  if ("galat" in s) return s.galat;
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Id tidak valid." }, { status: 400 });

  const { data, error } = await s.supabase.from("banners").delete().eq("id", id).select("image_url");
  if (error) return NextResponse.json({ error: "Gagal menghapus banner." }, { status: 500 });

  const url = data?.[0]?.image_url as string | undefined;
  const m = url?.match(/\/storage\/v1\/object\/public\/public-assets\/(.+)$/);
  if (m) await s.supabase.storage.from("public-assets").remove([decodeURIComponent(m[1])]);
  return NextResponse.json({ ok: true });
}
