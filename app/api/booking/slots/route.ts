import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOpenSlots, slotPrice } from "@/lib/booking/slots";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/booking/slots?mentor_id=… — slot terbuka + harga per slot (publik). */
export async function GET(request: NextRequest) {
  const mentorId = request.nextUrl.searchParams.get("mentor_id") ?? "";
  if (!UUID_RE.test(mentorId)) {
    return NextResponse.json({ error: "mentor_id tidak valid." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: mentor } = await admin
    .from("mentor_profiles")
    .select("id, price_per_hour, is_available, profiles!inner(is_active, role)")
    .eq("id", mentorId)
    .single();

  const prof = mentor
    ? ((Array.isArray(mentor.profiles) ? mentor.profiles[0] : mentor.profiles) as { is_active: boolean; role: string } | null)
    : null;

  if (!mentor || !mentor.is_available || !prof?.is_active || prof.role !== "mentor") {
    return NextResponse.json({ data: [] });
  }

  const slots = await getOpenSlots(mentorId);
  return NextResponse.json({
    data: slots.map((s) => ({
      id: s.id,
      slot_date: s.slot_date,
      slot_start: s.slot_start.slice(0, 5),
      slot_end: s.slot_end.slice(0, 5),
      price_idr: slotPrice(mentor.price_per_hour, s),
    })),
  });
}
