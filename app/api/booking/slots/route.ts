import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  mentor_id: z.string().uuid().optional(),
  /** Tanggal awal rentang, format YYYY-MM-DD. Default: hari ini WIB. */
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Jumlah hari ke depan yang diambil. Maksimal 42 (6 minggu kalender). */
  days: z.coerce.number().int().min(1).max(42).default(14),
});

/** Tanggal hari ini menurut WIB, bukan menurut jam server. */
function todayWib(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Slot bimbingan yang tersedia, dikelompokkan per tanggal.
 *
 * Bisa diakses tanpa login — pengunjung harus bisa melihat jadwal sebelum
 * memutuskan mendaftar. View available_slots sudah menyaring slot yang
 * diblokir, sudah terisi, atau sudah lewat.
 */
export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parameter tidak valid.", detail: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { mentor_id, days } = parsed.data;
  const from = parsed.data.from ?? todayWib();
  const to = addDays(from, days);

  const supabase = createClient();

  let query = supabase
    .from("available_slots")
    .select(
      "slot_id, mentor_id, mentor_name, avatar_url, specializations, slot_date, slot_start, slot_end, price_per_hour, starts_at"
    )
    .gte("slot_date", from)
    .lt("slot_date", to)
    .order("slot_date", { ascending: true })
    .order("slot_start", { ascending: true })
    .limit(500);

  if (mentor_id) query = query.eq("mentor_id", mentor_id);

  const { data, error } = await query;

  if (error) {
    console.error("[booking/slots]", error);
    return NextResponse.json(
      { error: "Gagal memuat jadwal. Coba lagi sebentar lagi." },
      { status: 500 }
    );
  }

  // Dikelompokkan per tanggal supaya komponen kalender tidak perlu
  // mengulang pengelompokan yang sama di klien.
  const byDate = new Map<string, typeof data>();
  for (const slot of data ?? []) {
    const bucket = byDate.get(slot.slot_date) ?? [];
    bucket.push(slot);
    byDate.set(slot.slot_date, bucket);
  }

  return NextResponse.json({
    from,
    to,
    timezone: "Asia/Jakarta",
    total: data?.length ?? 0,
    days: Array.from(byDate, ([date, slots]) => ({ date, slots })),
  });
}
