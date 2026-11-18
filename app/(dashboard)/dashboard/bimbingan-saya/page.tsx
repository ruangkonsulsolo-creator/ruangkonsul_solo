import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, ArrowRight, Video, Star } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { PREVIEW_MODE, PREVIEW_USER } from "@/lib/utils/preview-mode";
import { formatRupiah } from "@/lib/utils/format-currency";
import { PaymentStatusSync } from "@/components/dashboard/PaymentStatusSync";
import { BookingPayButton, BookingReviewForm } from "@/components/booking/BookingActions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: `Bimbingan Saya | ${BRAND.name}` };

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "info" | "destructive" | "muted" }> = {
  pending:   { label: "Menunggu Bayar", variant: "warning" },
  confirmed: { label: "Terkonfirmasi",  variant: "success" },
  completed: { label: "Selesai",        variant: "info" },
  cancelled: { label: "Dibatalkan",     variant: "destructive" },
  no_show:   { label: "Tidak Hadir",    variant: "muted" },
};

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export default async function BimbinganSayaPage({
  searchParams,
}: { searchParams: { booking?: string; paid?: string; pending?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !PREVIEW_MODE) redirect("/login?next=/dashboard/bimbingan-saya");

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      id, booking_number, status, topic, price_idr, meeting_link, rating, review, midtrans_snap_token, created_at,
      booking_slots ( slot_date, slot_start, slot_end ),
      mentor_profiles ( id, profiles ( full_name ) )
    `)
    .eq("customer_id", user?.id ?? PREVIEW_USER.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const list = bookings ?? [];
  const pendingIds = list.filter((b) => b.status === "pending").map((b) => b.id);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Bimbingan Saya</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Jadwal sesi dengan mentor, link meeting, dan ulasan.</p>
        </div>
        <Link href="/booking" className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B0000] px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-light">
          Booking Baru <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <PaymentStatusSync purpose="booking" referenceIds={pendingIds} showBanner={!!(searchParams.paid || searchParams.pending)} />

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <GraduationCap className="h-10 w-10 text-slate-200" />
          <p className="text-sm font-semibold text-slate-700">Belum ada sesi bimbingan</p>
          <Link href="/booking" className="text-xs font-semibold text-[#8B0000] hover:underline">Pilih mentor & jadwal →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((b) => {
            const slot = one(b.booking_slots as any) as { slot_date: string; slot_start: string; slot_end: string } | null;
            const mentor = one(b.mentor_profiles as any) as { profiles: any } | null;
            const mentorName = (one(mentor?.profiles) as { full_name: string } | null)?.full_name ?? "Mentor";
            const st = STATUS[b.status] ?? { label: b.status, variant: "muted" as const };
            return (
              <div key={b.id} className={`rounded-2xl border bg-white p-5 shadow-card ${searchParams.booking === b.id ? "border-[#8B0000]" : "border-slate-200"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{mentorName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.topic ?? "-"} · {b.booking_number}</p>
                    {slot && (
                      <p className="text-xs text-slate-600 mt-1.5">
                        {new Date(`${slot.slot_date}T00:00:00+07:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" })}
                        {" · "}{slot.slot_start.slice(0, 5)}–{slot.slot_end.slice(0, 5)} WIB
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-1.5">
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <p className="text-sm font-bold text-slate-900">{formatRupiah(b.price_idr)}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {b.status === "pending" && <BookingPayButton bookingId={b.id} snapToken={b.midtrans_snap_token} />}
                  {b.status === "confirmed" && (b.meeting_link ? (
                    <a href={b.meeting_link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
                      <Video className="h-3.5 w-3.5" /> Masuk Meeting
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">Link meeting akan dikirim mentor sebelum sesi.</span>
                  ))}
                  {b.status === "completed" && (b.rating ? (
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      {Array.from({ length: b.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                      <span className="ml-1">{b.review}</span>
                    </span>
                  ) : (
                    <BookingReviewForm bookingId={b.id} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
