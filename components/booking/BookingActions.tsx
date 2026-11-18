"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Star, Check, UserX, Link2 } from "lucide-react";
import { Toast, useToast } from "@/components/ui/toast";
import { openSnap, syncPaymentStatus } from "@/lib/payment/use-snap";
import { cn } from "@/lib/utils";

/** Customer: lanjutkan pembayaran booking yang masih pending. */
export function BookingPayButton({ bookingId, snapToken }: { bookingId: string; snapToken: string | null }) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function handle() {
    if (!snapToken) return showToast("Token pembayaran tidak tersedia. Buat booking baru.", "error");
    setBusy(true);
    try {
      const outcome = await openSnap(snapToken);
      if (outcome !== "closed") await syncPaymentStatus({ purpose: "booking", referenceId: bookingId });
      router.refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal membuka pembayaran.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={handle} disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#8B0000] px-3 py-1.5 text-xs font-semibold text-[#8B0000] hover:bg-brand-50 disabled:opacity-60">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
        Bayar
      </button>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}

/** Customer: beri rating sesi yang sudah selesai. */
export function BookingReviewForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (rating < 1) return showToast("Pilih rating dulu.", "error");
    setBusy(true);
    const res = await fetch(`/api/booking/${bookingId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, review: review.trim() || undefined }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return showToast(json.error ?? "Gagal mengirim ulasan.", "error");
    showToast("Terima kasih atas ulasannya!", "success");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} bintang`}>
            <Star className={cn("h-5 w-5", n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={review} onChange={(e) => setReview(e.target.value)} maxLength={1000}
          placeholder="Ulasan singkat (opsional)"
          className="flex-1 rounded-md border border-input px-2.5 py-1.5 text-xs" />
        <button onClick={submit} disabled={busy}
          className="rounded-md bg-[#8B0000] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
          {busy ? "…" : "Kirim"}
        </button>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}

/** Mentor: link meeting + tandai selesai / tidak hadir. */
export function MentorBookingActions({
  bookingId, status, meetingLink,
}: { bookingId: string; status: string; meetingLink: string | null }) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [link, setLink] = useState(meetingLink ?? "");
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>, key: string, okMsg: string) {
    setBusy(key);
    const res = await fetch(`/api/mentor/booking/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return showToast(json.error ?? "Gagal menyimpan.", "error");
    showToast(okMsg, "success");
    router.refresh();
  }

  if (status !== "confirmed") return null;

  return (
    <div className="flex flex-col gap-2 min-w-[220px]">
      <div className="flex gap-1.5">
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/…"
          className="flex-1 min-w-0 rounded-md border border-input px-2 py-1 text-xs" />
        <button onClick={() => patch({ meeting_link: link }, "link", "Link meeting disimpan.")} disabled={!!busy}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-slate-50" title="Simpan link">
          {busy === "link" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
        </button>
      </div>
      <div className="flex gap-1.5">
        <button onClick={() => patch({ status: "completed" }, "done", "Sesi ditandai selesai.")} disabled={!!busy}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60">
          {busy === "done" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Selesai
        </button>
        <button onClick={() => patch({ status: "no_show" }, "noshow", "Sesi ditandai tidak hadir.")} disabled={!!busy}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
          {busy === "noshow" ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3 w-3" />} Tidak hadir
        </button>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
