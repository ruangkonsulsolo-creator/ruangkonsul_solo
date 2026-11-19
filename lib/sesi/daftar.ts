import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type SesiRow = {
  id: string;
  booking_number: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  topic: string | null;
  notes: string | null;
  price_idr: number;
  paid_at: string | null;
  bayar_sebelum: string | null;
  meeting_link: string | null;
  whatsapp: string | null;
  cancel_reason: string | null;
  created_at: string;
  slot: { slot_date: string; slot_start: string; slot_end: string } | null;
  klien: { full_name: string | null } | null;
  mentor: { display_name: string | null } | null;
};

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

/**
 * Daftar sesi untuk panel admin (semua) atau mentor (mentorId).
 * Pakai service role karena mentor tidak punya akses RLS ke profil customer;
 * pemanggil WAJIB sudah memverifikasi role / kepemilikan mentor.
 */
export async function daftarSesi(opts: { mentorId?: string; status?: string; limit?: number }): Promise<SesiRow[]> {
  const admin = createAdminClient();
  let q = admin
    .from("bookings")
    .select(
      "id, booking_number, status, topic, notes, price_idr, paid_at, bayar_sebelum, meeting_link, whatsapp, cancel_reason, created_at, slot:booking_slots!bookings_slot_id_fkey ( slot_date, slot_start, slot_end ), klien:profiles!bookings_customer_id_fkey ( full_name ), mentor:mentor_profiles ( display_name )"
    )
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.mentorId) q = q.eq("mentor_id", opts.mentorId);
  if (opts.status === "menunggu_bayar") q = q.eq("status", "pending").is("paid_at", null);
  else if (opts.status && opts.status !== "semua") q = q.eq("status", opts.status);

  const { data, error } = await q;
  if (error) console.error("[sesi] gagal memuat:", error.message);
  return (data ?? []).map((b) => ({
    ...(b as unknown as SesiRow),
    slot: one(b.slot) as SesiRow["slot"],
    klien: one(b.klien) as SesiRow["klien"],
    mentor: one(b.mentor) as SesiRow["mentor"],
  }));
}

export function labelSesi(b: Pick<SesiRow, "status" | "paid_at" | "bayar_sebelum">): { label: string; cls: string } {
  if (b.status === "pending" && !b.paid_at && b.bayar_sebelum) return { label: "Menunggu Bayar", cls: "bg-amber-50 text-amber-800 border-amber-200" };
  switch (b.status) {
    case "pending": return { label: "Menunggu Konfirmasi", cls: "bg-amber-50 text-amber-800 border-amber-200" };
    case "confirmed": return { label: "Terkonfirmasi", cls: "bg-green-50 text-green-700 border-green-200" };
    case "completed": return { label: "Selesai", cls: "bg-slate-100 text-slate-700 border-slate-200" };
    case "no_show": return { label: "Tidak Hadir", cls: "bg-slate-100 text-slate-700 border-slate-200" };
    default: return { label: "Dibatalkan", cls: "bg-red-50 text-red-700 border-red-200" };
  }
}

export const jadwalWib = (s: SesiRow["slot"]) =>
  s
    ? `${new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(`${s.slot_date}T00:00:00+07:00`))} · ${s.slot_start.slice(0, 5).replace(":", ".")}–${s.slot_end.slice(0, 5).replace(":", ".")} WIB`
    : "-";
