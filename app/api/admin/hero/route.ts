import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { wajibStaf } from "@/lib/auth/wajib-staf";

export const dynamic = "force-dynamic";

const tautan = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || v.startsWith("/") || /^https:\/\//.test(v), "Link harus diawali / atau https://");

const skema = z.object({
  id: z.string().uuid().optional(),
  image_url: z
    .string()
    .trim()
    .min(1, "Gambar wajib diisi.")
    .max(500)
    .refine((v) => v.startsWith("/") || /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\//.test(v), "Gambar harus dari unggahan."),
  alt: z.string().trim().max(200).optional().default(""),
  badge: z.string().trim().max(60).optional().default(""),
  hook: z.string().trim().max(80).optional().default(""),
  cta_label: z.string().trim().max(40).optional().default(""),
  cta_href: tautan.optional().default(""),
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

/** Tambah atau ubah slide banner hero. */
export async function POST(request: NextRequest) {
  const s = await siapkan();
  if ("galat" in s) return s.galat;

  const parsed = skema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 422 });
  }
  const { id, ...d } = parsed.data;
  const isi = {
    ...d,
    alt: d.alt || null,
    badge: d.badge || null,
    hook: d.hook || null,
    cta_label: d.cta_label || null,
    cta_href: d.cta_href || null,
  };

  const q = id
    ? s.supabase.from("hero_slides").update(isi).eq("id", id).select("*").single()
    : s.supabase.from("hero_slides").insert(isi).select("*").single();
  const { data, error } = await q;
  if (error) {
    console.error("[admin/hero]", error.message);
    return NextResponse.json({ error: "Gagal menyimpan banner." }, { status: 500 });
  }
  revalidatePath("/");
  return NextResponse.json({ data });
}

/** Hapus slide. */
export async function DELETE(request: NextRequest) {
  const s = await siapkan();
  if ("galat" in s) return s.galat;
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Id tidak valid." }, { status: 400 });

  const { data, error } = await s.supabase.from("hero_slides").delete().eq("id", id).select("image_url");
  if (error) return NextResponse.json({ error: "Gagal menghapus banner." }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Banner tidak ditemukan." }, { status: 404 });

  // Bersihkan berkas unggahan (gambar bawaan di /public dibiarkan).
  const m = /\/storage\/v1\/object\/public\/public-assets\/(.+)$/.exec(data[0].image_url ?? "");
  if (m) await s.supabase.storage.from("public-assets").remove([decodeURIComponent(m[1])]);

  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
