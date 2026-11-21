import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { wajibStaf } from "@/lib/auth/wajib-staf";

export const dynamic = "force-dynamic";

const skema = z.object({
  id: z.string().uuid().optional(),
  judul: z.string().trim().min(2, "Judul minimal 2 karakter.").max(120),
  harga_mulai: z.number().int().min(0, "Harga tidak boleh negatif.").max(100_000_000),
  satuan: z.string().trim().min(1, "Satuan wajib diisi.").max(40),
  kategori: z.string().trim().max(60).optional().default(""),
  image_url: z
    .string()
    .trim()
    .min(1, "Gambar wajib diunggah.")
    .max(500)
    .refine((v) => v.startsWith("/") || /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\//.test(v), "Gambar harus dari unggahan."),
  fitur: z.array(z.string().trim().min(1).max(120)).max(8, "Maksimal 8 poin."),
  cta_label: z.string().trim().min(1, "Teks tombol wajib diisi.").max(40),
  cta_href: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v.startsWith("/") || /^https:\/\//.test(v), "Link harus diawali / atau https://"),
  sort_order: z.number().int().min(0).max(999).optional(),
  is_active: z.boolean().optional(),
});

async function siapkan() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { galat: NextResponse.json({ error: "Masuk dulu." }, { status: 401 }) };
  const ditolak = await wajibStaf(supabase, user.id);
  if (ditolak) return { galat: ditolak };
  return { supabase };
}

export async function POST(request: NextRequest) {
  const s = await siapkan();
  if ("galat" in s) return s.galat;
  const parsed = skema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 422 });
  }
  const { id, ...d } = parsed.data;
  const isi = { ...d, kategori: d.kategori || null };
  const q = id
    ? s.supabase.from("paket_promo").update(isi).eq("id", id).select("*").single()
    : s.supabase.from("paket_promo").insert(isi).select("*").single();
  const { data, error } = await q;
  if (error) {
    console.error("[admin/paket-promo]", error.message);
    return NextResponse.json({ error: "Gagal menyimpan paket." }, { status: 500 });
  }
  revalidatePath("/");
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const s = await siapkan();
  if ("galat" in s) return s.galat;
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Id tidak valid." }, { status: 400 });
  const { data, error } = await s.supabase.from("paket_promo").delete().eq("id", id).select("image_url");
  if (error) return NextResponse.json({ error: "Gagal menghapus paket." }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });
  const m = /\/storage\/v1\/object\/public\/public-assets\/(.+)$/.exec(data[0].image_url ?? "");
  if (m) await s.supabase.storage.from("public-assets").remove([decodeURIComponent(m[1])]);
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
