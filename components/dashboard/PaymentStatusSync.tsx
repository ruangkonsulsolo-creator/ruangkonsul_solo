"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Clock } from "lucide-react";
import { syncPaymentStatus } from "@/lib/payment/use-snap";

interface Props {
  purpose: "order" | "package" | "booking" | "merch";
  /** referensi yang masih menunggu pembayaran (order id / booking id / package id) */
  referenceIds: string[];
  /** tampilkan banner "pembayaran sedang dicek" (mis. saat ?paid=1 di URL) */
  showBanner?: boolean;
}

/**
 * Saat user kembali dari Midtrans, cek status pembayaran yang masih pending
 * langsung ke Midtrans (via server) lalu refresh halaman jika ada perubahan.
 * Cadangan untuk webhook yang terlambat / tidak bisa menjangkau localhost.
 */
export function PaymentStatusSync({ purpose, referenceIds, showBanner = false }: Props) {
  const router = useRouter();
  const ran = useRef(false);
  const [state, setState] = useState<"idle" | "checking" | "paid" | "pending">(showBanner ? "checking" : "idle");

  useEffect(() => {
    if (ran.current || referenceIds.length === 0) {
      if (referenceIds.length === 0 && showBanner) setState("paid");
      return;
    }
    ran.current = true;

    (async () => {
      setState((s) => (s === "idle" ? s : "checking"));
      const results = await Promise.all(
        referenceIds.slice(0, 5).map((id) => syncPaymentStatus({ purpose, referenceId: id }))
      );
      const anyPaid = results.some((r) => r === "paid");
      const anyChanged = results.some((r) => r && r !== "pending");
      if (anyChanged) router.refresh();
      if (showBanner) setState(anyPaid ? "paid" : "pending");
    })();
  }, [purpose, referenceIds, router, showBanner]);

  if (!showBanner || state === "idle") return null;

  const cfg = {
    checking: { icon: Loader2, cls: "border-slate-200 bg-slate-50 text-slate-700", text: "Mengecek status pembayaran…", spin: true },
    paid: { icon: CheckCircle2, cls: "border-green-200 bg-green-50 text-green-800", text: "Pembayaran berhasil diterima. Terima kasih!", spin: false },
    pending: {
      icon: Clock,
      cls: "border-amber-200 bg-amber-50 text-amber-800",
      text: "Pembayaran belum kami terima. Selesaikan pembayaran sesuai instruksi (VA/QRIS) — status akan diperbarui otomatis.",
      spin: false,
    },
  }[state];
  const Icon = cfg.icon;

  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${cfg.cls}`} role="status">
      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${cfg.spin ? "animate-spin" : ""}`} aria-hidden="true" />
      <span>
        {cfg.text}
        {state === "paid" && (
          <> <a href="/dashboard/receipt" className="font-semibold underline">Lihat receipt</a></>
        )}
      </span>
    </div>
  );
}
