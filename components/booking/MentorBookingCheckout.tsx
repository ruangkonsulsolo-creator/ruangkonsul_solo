"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock, Loader2, Star, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toast, useToast } from "@/components/ui/toast";
import { useSnapCheckout } from "@/lib/payment/use-snap";
import { WhatsAppField, isValidWhatsApp } from "@/components/payment/WhatsAppField";
import { formatRupiah } from "@/lib/utils/format-currency";
import { cn } from "@/lib/utils";

interface Mentor {
  id: string;
  bio: string | null;
  specializations: string[];
  price_per_hour: number;
  rating_avg: number;
  session_count: number;
  profiles: { full_name: string } | { full_name: string }[] | null;
}

interface Slot {
  id: string;
  slot_date: string;
  slot_start: string;
  slot_end: string;
  price_idr: number;
}

function mentorName(m: Mentor) {
  const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
  return p?.full_name || "Mentor";
}

function fmtDate(d: string) {
  return new Date(`${d}T00:00:00+07:00`).toLocaleDateString("id-ID", {
    weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Jakarta",
  });
}

/**
 * Booking sesi mentor yang langsung terkonfirmasi setelah bayar via Midtrans.
 * Customer harus login (pembayaran terikat ke akun).
 */
export function MentorBookingCheckout({ mentors, isLoggedIn }: { mentors: Mentor[]; isLoggedIn: boolean }) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const { pay, busy } = useSnapCheckout();

  const [mentorId, setMentorId] = useState<string>(mentors[0]?.id ?? "");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotId, setSlotId] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [waError, setWaError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!mentorId) return;
    let cancelled = false;
    setLoadingSlots(true);
    setSlotId("");
    fetch(`/api/booking/slots?mentor_id=${mentorId}`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setSlots(j.data ?? []); })
      .catch(() => { if (!cancelled) setSlots([]); })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [mentorId]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) map.set(s.slot_date, [...(map.get(s.slot_date) ?? []), s]);
    return Array.from(map.entries());
  }, [slots]);

  const selected = slots.find((s) => s.id === slotId);

  async function handlePay() {
    if (!selected) return showToast("Pilih jadwal dulu.", "error");
    if (topic.trim().length < 3) return showToast("Isi topik bimbingan (min. 3 karakter).", "error");
    if (!isValidWhatsApp(whatsapp)) {
      setWaError("Nomor WhatsApp wajib diisi dengan benar.");
      return showToast("Nomor WhatsApp wajib diisi.", "error");
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/payment/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_id: selected.id, topic: topic.trim(), notes: notes.trim() || undefined, whatsapp }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent("/booking")}`);
        return;
      }
      if (!res.ok || !json.data?.snap_token) {
        if (json.code === "WHATSAPP_REQUIRED") setWaError(json.error);
        showToast(json.error ?? "Gagal membuat booking.", "error");
        if (res.status === 409) {
          setSlots((prev) => prev.filter((s) => s.id !== selected.id));
          setSlotId("");
        }
        return;
      }

      setSubmitting(false);
      const { status } = await pay(json.data.snap_token, json.data.payment_id);
      const q = status === "paid" ? "paid=1" : "pending=1";
      router.push(`/dashboard/bimbingan-saya?booking=${json.data.booking_id}&${q}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (mentors.length === 0) return null;

  const working = submitting || busy;

  return (
    <div className="rounded-2xl border-2 border-[#8B0000]/20 bg-white p-5 shadow-card space-y-5">
      <div>
        <p className="text-sm font-extrabold text-slate-900">Booking & Bayar Langsung</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pilih mentor dan jadwal yang tersedia — sesi langsung terkonfirmasi setelah pembayaran.
        </p>
      </div>

      {/* Mentor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {mentors.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMentorId(m.id)}
            className={cn(
              "rounded-xl border p-3 text-left transition-all",
              mentorId === m.id ? "border-[#8B0000] bg-brand-50 ring-1 ring-[#8B0000]" : "border-slate-200 hover:border-slate-300"
            )}
          >
            <p className="text-sm font-bold text-slate-900">{mentorName(m)}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{m.specializations?.join(", ") || m.bio || "Mentor akademik"}</p>
            <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-600">
              <span className="font-semibold text-[#8B0000]">{formatRupiah(m.price_per_hour)}/jam</span>
              {m.rating_avg > 0 && (
                <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{Number(m.rating_avg).toFixed(1)}</span>
              )}
              <span>{m.session_count} sesi</span>
            </div>
          </button>
        ))}
      </div>

      {/* Slot */}
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><CalendarDays className="h-3.5 w-3.5" /> Jadwal tersedia</p>
        {loadingSlots ? (
          <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat jadwal…</div>
        ) : slotsByDate.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-4 text-xs text-muted-foreground">
            Belum ada jadwal terbuka untuk mentor ini. Gunakan form di bawah — tim kami akan mencarikan jadwal.
          </p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {slotsByDate.map(([date, list]) => (
              <div key={date}>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">{fmtDate(date)}</p>
                <div className="flex flex-wrap gap-2">
                  {list.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSlotId(s.id)}
                      className={cn(
                        "flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                        slotId === s.id ? "border-[#8B0000] bg-[#8B0000] text-white" : "border-slate-200 text-slate-700 hover:border-[#8B0000]"
                      )}
                    >
                      <Clock className="h-3 w-3" /> {s.slot_start}–{s.slot_end}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Topik bimbingan *</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="mis. Revisi BAB 3 metodologi" maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Catatan untuk mentor</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Opsional"
            />
          </div>

          {isLoggedIn && <WhatsAppField value={whatsapp} onChange={(v) => { setWhatsapp(v); setWaError(null); }} error={waError} />}

          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-600">
              {fmtDate(selected.slot_date)} · {selected.slot_start}–{selected.slot_end} WIB
            </div>
            <div className="text-base font-extrabold text-slate-900">{formatRupiah(selected.price_idr)}</div>
          </div>

          {isLoggedIn ? (
            <button
              type="button"
              onClick={handlePay}
              disabled={working}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B0000] py-3 text-sm font-extrabold text-white hover:bg-brand-light disabled:opacity-70"
            >
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {working ? "Memproses…" : "Bayar & Konfirmasi"}
            </button>
          ) : (
            <Link
              href="/login?next=/booking"
              className="flex w-full items-center justify-center rounded-xl bg-[#8B0000] py-3 text-sm font-extrabold text-white hover:bg-brand-light"
            >
              Login untuk bayar & konfirmasi
            </Link>
          )}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
