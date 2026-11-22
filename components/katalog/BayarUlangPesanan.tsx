"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { openSnap, syncPaymentStatus } from "@/lib/payment/use-snap";

/** Lanjutkan pembayaran pesanan produk yang belum dibayar (token Snap berlaku 24 jam). */
export function BayarUlangPesanan({
  pesananId,
  snapToken,
  paymentId,
  purpose = "produk",
  setelahLunas = "receipt",
}: {
  pesananId: string;
  snapToken: string;
  paymentId: string | null;
  purpose?: "produk" | "booking" | "order";
  /** "receipt" = buka receipt; "refresh" = muat ulang halaman ini (mis. halaman status tamu). */
  setelahLunas?: "receipt" | "refresh";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await openSnap(snapToken);
          // Selalu cek ke server (popup bisa ditutup setelah membayar).
          const args = paymentId ? { paymentId } : { purpose, referenceId: pesananId };
          let st = await syncPaymentStatus(args);
          for (let i = 0; i < 3 && st === "pending"; i++) {
            await new Promise((r) => setTimeout(r, 2000));
            st = await syncPaymentStatus(args);
          }
          if (st === "paid" && paymentId && setelahLunas === "receipt") router.push(`/receipt/${paymentId}`);
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
