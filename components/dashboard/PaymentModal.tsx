"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { openSnap, syncPaymentStatus } from "@/lib/payment/use-snap";

interface PaymentModalProps {
  snapToken: string;
  /** id baris `payments` — dipakai untuk sinkron status setelah popup ditutup */
  paymentId?: string | null;
  onClose: () => void;
  /** Halaman tujuan setelah bayar (default: riwayat pesanan) */
  successPath?: string;
  onError?: (message: string) => void;
}

/**
 * Membuka popup Midtrans Snap. Komponen ini tidak merender UI sendiri —
 * Snap menampilkan overlay-nya di atas halaman.
 */
export function PaymentModal({
  snapToken,
  paymentId,
  onClose,
  successPath = "/dashboard/riwayat-pesanan",
  onError,
}: PaymentModalProps) {
  const router = useRouter();
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;

    (async () => {
      try {
        const outcome = await openSnap(snapToken);
        if (outcome === "closed" || outcome === "error") {
          if (outcome === "error") onError?.("Pembayaran gagal. Silakan coba lagi.");
          onClose();
          return;
        }
        if (paymentId) await syncPaymentStatus({ paymentId });
        const sep = successPath.includes("?") ? "&" : "?";
        router.push(`${successPath}${sep}${outcome === "success" ? "paid=1" : "pending=1"}`);
        router.refresh();
      } catch (err) {
        onError?.(err instanceof Error ? err.message : "Gagal membuka pembayaran.");
        onClose();
      }
    })();

    return () => {
      window.snap?.hide?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapToken]);

  return null;
}
