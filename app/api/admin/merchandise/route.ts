import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { wajibStaf } from "@/lib/auth/wajib-staf";

export const dynamic = "force-dynamic";

/**
 * Pengelolaan etalase merchandise untuk admin.
 *
 * Hak akses ditegakkan RLS (kebijakan "Admin kelola merchandise" di
 * migration 016), bukan pemeriksaan peran di rute ini. Satu tempat penegakan
 * lebih mudah dijaga daripada dua yang bisa berbeda.
 */

const skema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(3000).nullable().optional(),
  category: z.string().trim().max(80).nullable().optional(),
  price_idr: z.number().int().min(0),
  stock: z.number().int().min(0),
  weight_gram: z.number().int().min(0).nullable().optional(),
  images: z.array(z.string().trim().max(500)).max(10).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Masuk dulu." }, { status: 401 });
  const ditolak = await wajibStaf(supabase, user.id);
  if (ditolak) return ditolak;

  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ error: "Data tidak terbaca." }, { status: 400 }); }

  const parsed = skema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ada isian yang belum benar.",
        rinci: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 422 });
  }

  const { id, ...isi } = parsed.data;
  const q = id
    ? supabase.from("merchandise").update({ ...isi, updated_at: new Date().toISOString() }).eq("id", id)
    : supabase.from("merchandise").insert(isi);

  const { error } = await q;

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Hanya admin yang bisa mengubah etalase." }, { status: 403 });
    }
    console.error("[admin-merch] gagal menyimpan:", error);
    return NextResponse.json({ error: "Gagal menyimpan produk." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * Menonaktifkan produk, bukan menghapusnya.
 *
 * Pesanan lama menyimpan rincian produk di kolom items, tapi laporan
 * penjualan tetap menautkannya ke baris ini. Menghapus baris berarti
 * kehilangan riwayat penjualannya.
 */
export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Masuk dulu." }, { status: 401 });
  const ditolak = await wajibStaf(supabase, user.id);
  if (ditolak) return ditolak;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Produk tidak disebut." }, { status: 422 });

  const { error } = await supabase
    .from("merchandise").update({ is_active: false }).eq("id", id);

  if (error) {
    console.error("[admin-merch] gagal menonaktifkan:", error);
    return NextResponse.json({ error: "Gagal menonaktifkan produk." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
