import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JadwalMentorClient } from "@/components/mentor/JadwalMentorClient";
import { BRAND } from "@/lib/brand";
import { PREVIEW_MODE } from "@/lib/utils/preview-mode";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Jadwal Saya | ${BRAND.name}` };

export default async function JadwalMentorPage() {
  // Preview mode — tampilkan dengan data dummy
  if (PREVIEW_MODE) {
    const dummySlots = [
      { id: "s1", slot_date: new Date().toISOString().slice(0,10), slot_start: "09:00:00", slot_end: "10:00:00", is_blocked: false },
      { id: "s2", slot_date: new Date().toISOString().slice(0,10), slot_start: "11:00:00", slot_end: "12:00:00", is_blocked: true },
      { id: "s3", slot_date: new Date(Date.now() + 86400000).toISOString().slice(0,10), slot_start: "14:00:00", slot_end: "15:00:00", is_blocked: false },
    ];
    return (
      <div className="max-w-3xl space-y-6">
        <div><h2 className="text-xl font-extrabold text-slate-900">Jadwal Saya</h2><p className="text-sm text-muted-foreground mt-0.5">Kelola slot waktu tersedia kamu.</p></div>
        <JadwalMentorClient mentorId="preview-mentor" isAvailable={true} slots={dummySlots as any} bookings={[
          { slot_id: "s1", status: "confirmed", profiles: { full_name: "Rizky Aditya" } }
        ] as any} />
      </div>
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: mentorProfile } = await supabase.from("mentor_profiles").select("id, is_available").eq("user_id", user.id).single();
  const today = new Date().toISOString().slice(0, 10);
  const end   = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const { data: slots } = await supabase.from("booking_slots").select("id, slot_date, slot_start, slot_end, is_blocked").eq("mentor_id", mentorProfile?.id ?? "").gte("slot_date", today).lte("slot_date", end).order("slot_date").order("slot_start");
  const slotIds = (slots ?? []).map((s) => s.id);
  const { data: bookings } = slotIds.length > 0 ? await supabase.from("bookings").select("slot_id, status, profiles(full_name)").in("slot_id", slotIds).in("status", ["pending","confirmed"]) : { data: [] };
  return (
    <div className="max-w-3xl space-y-6">
      <div><h2 className="text-xl font-extrabold text-slate-900">Jadwal Saya</h2><p className="text-sm text-muted-foreground mt-0.5">Kelola slot waktu tersedia kamu. Klien akan booking berdasarkan slot ini.</p></div>
      <JadwalMentorClient mentorId={mentorProfile?.id ?? ""} isAvailable={mentorProfile?.is_available ?? false} slots={(slots ?? []) as any[]} bookings={(bookings ?? []) as any[]} />
    </div>
  );
}
