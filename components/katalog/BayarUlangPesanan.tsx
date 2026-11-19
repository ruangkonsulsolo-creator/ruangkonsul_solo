"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { openSnap, syncPaymentStatus } from "@/lib/payment/use-snap";

/** Lanjutkan pembayaran pesanan produk yang belum dibayar (token Snap berlaku 24 jam). */
export function BayarUlangPesanan({ pesananId, snapToken, paymentId }: { pesananId: string; snapToken: string; paymentId: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const outcome = await openSnap(snapToken);
          const s = outcome === "closed" ? null : await syncPaymentStatus({ purpose: "produk", referenceId: pesananId });
          if (paymentId && (outcome === "success" || s === "paid")) router.push(`/receipt/${paymentId}`);
          else router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-light disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
      Bayar Sekarang
    </button>
  );
}
