import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SlotRow {
  id: string;
  mentor_id: string;
  slot_date: string;  // YYYY-MM-DD
  slot_start: string; // HH:MM:SS
  slot_end: string;
  is_blocked: boolean;
}

/** Waktu mulai slot sebagai Date (jadwal disimpan dalam WIB). */
export function slotStartsAt(slot: Pick<SlotRow, "slot_date" | "slot_start">): Date {
  return new Date(`${slot.slot_date}T${slot.slot_start.slice(0, 8)}+07:00`);
}

export function slotHours(slot: Pick<SlotRow, "slot_start" | "slot_end">): number {
  const [sh, sm] = slot.slot_start.split(":").map(Number);
  const [eh, em] = slot.slot_end.split(":").map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return Math.max(minutes, 0) / 60;
}

/** Harga sesi = tarif/jam mentor × durasi slot, dibulatkan ke ribuan. */
export function slotPrice(pricePerHour: number, slot: Pick<SlotRow, "slot_start" | "slot_end">): number {
  return Math.round((pricePerHour * slotHours(slot)) / 1000) * 1000;
}

/** Minimal jeda sebelum sesi dimulai agar mentor sempat bersiap. */
export const MIN_LEAD_MINUTES = 60;

/** Slot mentor yang masih bisa dibooking (belum lewat, tidak diblokir, belum diambil). */
export async function getOpenSlots(mentorId: string, days = 30): Promise<SlotRow[]> {
  const admin = createAdminClient();
  const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const until = new Date(Date.now() + (days * 24 + 7) * 3600_000).toISOString().slice(0, 10);

  const { data: slots } = await admin
    .from("booking_slots")
    .select("id, mentor_id, slot_date, slot_start, slot_end, is_blocked")
    .eq("mentor_id", mentorId)
    .eq("is_blocked", false)
    .gte("slot_date", today)
    .lte("slot_date", until)
    .order("slot_date")
    .order("slot_start");

  if (!slots?.length) return [];

  const { data: taken } = await admin
    .from("bookings")
    .select("slot_id")
    .in("slot_id", slots.map((s) => s.id))
    .in("status", ["pending", "confirmed", "completed"]);

  const takenIds = new Set((taken ?? []).map((t) => t.slot_id));
  const minStart = Date.now() + MIN_LEAD_MINUTES * 60_000;

  return (slots as SlotRow[]).filter(
    (s) => !takenIds.has(s.id) && slotStartsAt(s).getTime() > minStart
  );
}
