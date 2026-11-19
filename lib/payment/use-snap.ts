"use client";

import { useCallback, useState } from "react";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
      hide: () => void;
    };
  }
}

export type SnapOutcome = "success" | "pending" | "error" | "closed";

let snapPromise: Promise<void> | null = null;

/** Muat snap.js sekali saja. */
export function loadSnap(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.snap) return Promise.resolve();
  if (snapPromise) return snapPromise;

  snapPromise = new Promise<void>((resolve, reject) => {
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
    if (!clientKey) {
      reject(new Error("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY belum di-set."));
      return;
    }
    const script = document.createElement("script");
    script.id = "midtrans-snap";
    script.src =
      process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", clientKey);
    script.onload = () => resolve();
    script.onerror = () => {
      snapPromise = null;
      reject(new Error("Gagal memuat Midtrans Snap. Periksa koneksi internet."));
    };
    document.body.appendChild(script);
  });
  return snapPromise;
}

/** Buka popup Snap; resolve saat user selesai / menutup popup. */
export async function openSnap(token: string): Promise<SnapOutcome> {
  await loadSnap();
  return new Promise<SnapOutcome>((resolve) => {
    window.snap!.pay(token, {
      onSuccess: () => resolve("success"),
      onPending: () => resolve("pending"),
      onError: () => resolve("error"),
      onClose: () => resolve("closed"),
    });
  });
}

/**
 * Minta server mengecek status langsung ke Midtrans (cadangan jika webhook
 * belum sampai). Mengembalikan status internal: paid | pending | failed | ...
 */
export async function syncPaymentStatus(
  args: { paymentId: string } | { purpose: "order" | "produk" | "booking" | "saldo"; referenceId: string }
): Promise<string | null> {
  const body =
    "paymentId" in args
      ? { payment_id: args.paymentId }
      : { purpose: args.purpose, reference_id: args.referenceId };
  try {
    const res = await fetch("/api/payment/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return json?.data?.status ?? null;
  } catch {
    return null;
  }
}

/**
 * Alur lengkap: buka Snap → sinkron status (retry singkat) → kembalikan status akhir.
 */
export function useSnapCheckout() {
  const [busy, setBusy] = useState(false);

  const pay = useCallback(async (token: string, paymentId?: string) => {
    setBusy(true);
    try {
      const outcome = await openSnap(token);
      let status: string | null = outcome === "success" ? "paid" : outcome === "pending" ? "pending" : null;

      if (paymentId && outcome !== "closed") {
        // Settlement e-wallet/QRIS biasanya instan; beri beberapa detik untuk Midtrans
        for (let i = 0; i < 3; i++) {
          const s = await syncPaymentStatus({ paymentId });
          if (s && s !== "pending") {
            status = s;
            break;
          }
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
      return { outcome, status };
    } finally {
      setBusy(false);
    }
  }, []);

  return { pay, busy };
}
