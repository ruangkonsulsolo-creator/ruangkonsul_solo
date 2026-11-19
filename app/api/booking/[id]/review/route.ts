import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";
import { requireUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().trim().max(1000).optional(),
});

/** Customer memberi rating untuk sesi yang sudah selesai (sekali saja). */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!(await rateLimit(`review:${auth.ctx.user.id}`, 60, 10))) {
    return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Rating 1–5 wajib diisi." }, { status: 422 });

  const admin = createAdminClient();
  const { data: updated } = await admin
    .from("bookings")
    .update({ rating: parsed.data.rating, review: parsed.data.review ?? null })
    .eq("id", params.id)
    .eq("customer_id", auth.ctx.user.id)
    .eq("status", "completed")
    .is("rating", null)
    .select("mentor_id");

  if (!updated?.length) {
    return NextResponse.json({ error: "Sesi belum selesai atau sudah diberi ulasan." }, { status: 400 });
  }

  // Hitung ulang rata-rata rating mentor
  const mentorId = updated[0].mentor_id;
  const { data: ratings } = await admin
    .from("bookings")
    .select("rating")
    .eq("mentor_id", mentorId)
    .not("rating", "is", null);
  const list = (ratings ?? []).map((r) => r.rating as number);
  const avg = list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
  await admin.from("mentor_profiles").update({ rating_avg: Math.round(avg * 100) / 100 }).eq("id", mentorId);

  return NextResponse.json({ data: "ok" });
}
