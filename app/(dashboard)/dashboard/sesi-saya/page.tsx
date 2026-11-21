import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, MessageCircle, Receipt, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatRupiah } from "@/lib/utils/format-currency";
import { BayarUlangPesanan } from "@/components/katalog/BayarUlangPesanan";
import { ReceiptPendingSync } from "@/components/payment/ReceiptPendingSync";
import { lepasBookingKedaluwarsa } from "@/lib/booking/lepas-kedaluwarsa";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Sesi Saya | ${BRAND.name}` };

type Row = {
  id: string;
  booking_number: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  topic: string | null;
  price_idr: number;
  paid_at: string | null;
  bayar_sebelum: string | null;
  midtrans_snap_token: string | null;
  meeting_link: string | null;
  cancel_reason: string | null;
  created_at: string;
  booking_slots: { slot_date: string; slot_start: string; slot_end: string } | null;
  mentor_id: string | null;
  mentor_profiles: { display_name: string | null } | null;
};

const tanggal = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});
const jam = (t: string) => t.slice(0, 5).replace(":", ".");
const jamBatas = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

function labelStatus(b: Row): { label: string; cls: string } {
  if (b.status === "pending" && !b.paid_at && b.bayar_sebelum) {
    return { label: "Menunggu Bayar", cls: "bg-amber-50 text-amber-800 border-amber-200" };
  }
  switch (b.status) {
    case "pending":
      return { label: "Menunggu Konfirmasi", cls: "bg-amber-50 text-amber-800 border-amber-200" };
    case "confirmed":
      return { label: "Terkonfirmasi", cls: "bg-green-50 text-green-700 border-green-200" };
    case "completed":
      return { label: "Selesai", cls: "bg-slate-100 text-slate-700 border-slate-200" };
    case "no_show":
      return { label: "Tidak Hadir", cls: "bg-slate-100 text-slate-700 border-slate-200" };
    default:
      return { label: "Dibatalkan", cls: "bg-red-50 text-red-700 border-red-200" };
  }
}

export default async function SesiSayaPage({
  searchParams,
}: {
  searchParams: { booking?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/sesi-saya");

  await lepasBookingKedaluwarsa();

  const admin = createAdminClient();
  const [{ data }, { data: payments }] = await Promise.all([
    admin
      .from("bookings")
      .select(
        "id, booking_number, mentor_id, status, topic, price_idr, paid_at, bayar_sebelum, midtrans_snap_token, meeting_link, cancel_reason, created_at, booking_slots:booking_slots!bookings_slot_id_fkey ( slot_date, slot_start, slot_end ), mentor_profiles ( display_name )"
      )
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("payments")
      .select("id, reference_id, status, created_at")
      .eq("user_id", user.id)
      .eq("purpose", "booking")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const rows: Row[] = (data ?? []).map((b) => ({
    ...(b as unknown as Row),
    booking_slots: one(b.booking_slots) as Row["booking_slots"],
    mentor_profiles: one(b.mentor_profiles) as Row["mentor_profiles"],
  }));

  const payBy = new Map<string, { id: string; status: string }>();
  for (const p of payments ?? []) if (!payBy.has(p.reference_id)) payBy.set(p.reference_id, p);
  const fokus = searchParams.booking ? payBy.get(searchParams.booking) : undefined;
  const now = Date.now();

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Sesi Saya</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Jadwal bimbingan dengan mentor yang sudah kamu pesan.
          </p>
        </div>
        <Link
          href="/booking"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-bold text-white hover:bg-brand-light"
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" /> Pilih Mentor &amp; Jadwal
        </Link>
      </div>

      {fokus?.status === "pending" && <ReceiptPendingSync paymentId={fokus.id} />}

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <CalendarDays className="h-10 w-10 text-slate-200" aria-hidden="true" />
          <p className="text-sm text-slate-500">Belum ada sesi yang dipesan.</p>
          <Link href="/booking" className="text-sm font-semibold text-brand hover:underline">
            Pilih mentor dan jadwal →
          </Link>
        </div>
      ) : (
        <div className="divide-y rounded-2xl border border-slate-200 bg-white">
          {rows.map((b) => {
            const st = labelStatus(b);
            const pay = payBy.get(b.id);
            const slot = b.booking_slots;
            const bisaBayar =
              b.status === "pending" &&
              !b.paid_at &&
              !!b.midtrans_snap_token &&
              !!b.bayar_sebelum &&
              new Date(b.bayar_sebelum).getTime() > now;
            return (
              <div
                key={b.id}
                className={`flex flex-wrap items-start justify-between gap-3 px-5 py-4 ${
                  searchParams.booking === b.id ? "bg-brand-50" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {b.mentor_profiles?.display_name ?? "Mentor"}
                  </p>
                  {slot && (
                    <p className="text-sm text-slate-700">
                      {tanggal.format(new Date(`${slot.slot_date}T00:00:00+07:00`))},{" "}
                      {jam(slot.slot_start)}–{jam(slot.slot_end)} WIB
                    </p>
                  )}
                  {b.topic && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{b.topic}</p>}
                  <p className="mt-1 font-mono text-xs text-slate-500">{b.booking_number}</p>
                  {b.status === "confirmed" && b.meeting_link && (
                    <a
                      href={b.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                    >
                      <Video className="h-3.5 w-3.5" aria-hidden="true" /> Buka link sesi
                    </a>
                  )}
                  {b.status === "confirmed" && !b.meeting_link && (
                    <p className="mt-1 text-xs text-slate-500">Link sesi dikirim sebelum jadwal dimulai.</p>
                  )}
                  {(b.status === "confirmed" || b.status === "completed") && b.mentor_id && (
                    <Link
                      href={`/dashboard/chat?mentor=${b.mentor_id}`}
                      className="mt-1.5 inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-100"
                    >
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> Chat mentor
                    </Link>
                  )}
                  {b.status === "cancelled" && b.cancel_reason && (
                    <p className="mt-1 text-xs text-red-600">{b.cancel_reason}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                  {b.price_idr > 0 && (
                    <span className="text-sm font-bold text-slate-900">{formatRupiah(b.price_idr)}</span>
                  )}
                  {bisaBayar && (
                    <>
                      <BayarUlangPesanan
                        pesananId={b.id}
                        snapToken={b.midtrans_snap_token!}
                        paymentId={pay?.id ?? null}
                        purpose="booking"
                      />
                      <span className="text-[11px] text-slate-500">
                        Bayar sebelum {jamBatas.format(new Date(b.bayar_sebelum!))} WIB
                      </span>
                    </>
                  )}
                  {pay?.status === "paid" && (
                    <Link
                      href={`/receipt/${pay.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                    >
                      <Receipt className="h-3.5 w-3.5" aria-hidden="true" /> Receipt &amp; konfirmasi WA →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
