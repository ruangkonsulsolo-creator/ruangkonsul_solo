import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Ulasan untuk satu mentor.
 *
 * Tanpa parameter, yang dikembalikan adalah ulasan untuk mentor yang sedang
 * masuk — dipakai halaman Ulasan di panel mentor.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const mentorId = request.nextUrl.searchParams.get("mentor");

  let target = mentorId;
  if (!target) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Masuk dulu." }, { status: 401 });
    const { data: m } = await supabase
      .from("mentor_profiles").select("id").eq("user_id", user.id).maybeSingle();
    if (!m) return NextResponse.json({ data: [], ringkas: null });
    target = m.id;
  }

  const { data, error } = await supabase
    .from("ulasan")
    .select(`id, rating, komentar, balasan, dibuat_pada,
             penulis:profiles!ulasan_customer_id_fkey ( full_name )`)
    .eq("mentor_id", target)
    .order("dibuat_pada", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[ulasan] gagal memuat:", error);
    return NextResponse.json({ error: "Gagal memuat ulasan." }, { status: 500 });
  }

  const rows = data ?? [];
  // Ringkasan dihitung dari baris yang ada, bukan disimpan terpisah —
  // angka yang disimpan terpisah bisa menyimpang dari ulasan sebenarnya.
  const sebaran = [1, 2, 3, 4, 5].map(
    (b) => rows.filter((r) => r.rating === b).length
  );
  const total = rows.length;

  return NextResponse.json({
    data: rows.map((r) => {
      const p = r.penulis as unknown as { full_name: string | null } | null;
      return {
        id: r.id,
        rating: r.rating,
        komentar: r.komentar,
        balasan: r.balasan,
        penulis: p?.full_name ?? "Peserta",
        dibuatPada: r.dibuat_pada,
      };
    }),
    ringkas: total
      ? {
          total,
          rata: Number(
            (rows.reduce((s, r) => s + r.rating, 0) / total).toFixed(2)
          ),
          sebaran,
        }
      : { total: 0, rata: 0, sebaran: [0, 0, 0, 0, 0] },
  });
}

const skemaTulis = z.object({
  mentorId: z.string().uuid(),
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  komentar: z.string().trim().max(2000).optional(),
});

/** Customer menulis ulasan. RLS menolak kalau sesinya belum 'completed'. */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Masuk dulu." }, { status: 401 });

  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ error: "Data tidak terbaca." }, { status: 400 }); }

  const parsed = skemaTulis.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data ulasan belum lengkap." }, { status: 422 });
  }

  const { error } = await supabase.from("ulasan").insert({
    mentor_id: parsed.data.mentorId,
    customer_id: user.id,
    booking_id: parsed.data.bookingId,
    rating: parsed.data.rating,
    komentar: parsed.data.komentar || null,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Sesi ini sudah pernah kamu ulas." }, { status: 409 });
    }
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Ulasan hanya bisa ditulis setelah sesinya selesai." },
        { status: 403 });
    }
    console.error("[ulasan] gagal menyimpan:", error);
    return NextResponse.json({ error: "Gagal menyimpan ulasan." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

const skemaBalas = z.object({
  id: z.string().uuid(),
  balasan: z.string().trim().min(1).max(2000),
});

/** Mentor membalas ulasan. RLS membatasi ke ulasan untuk mentor itu sendiri. */
export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Masuk dulu." }, { status: 401 });

  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ error: "Data tidak terbaca." }, { status: 400 }); }

  const parsed = skemaBalas.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Balasan kosong." }, { status: 422 });
  }

  const { error } = await supabase
    .from("ulasan")
    .update({ balasan: parsed.data.balasan })
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[ulasan] gagal membalas:", error);
    return NextResponse.json({ error: "Gagal menyimpan balasan." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
