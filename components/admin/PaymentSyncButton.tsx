"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { syncPaymentStatus } from "@/lib/payment/use-snap";

/** Admin: tarik status terbaru transaksi dari Midtrans (jika webhook terlewat). */
export function PaymentSyncButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const s = await syncPaymentStatus({ paymentId });
        setResult(s);
        setBusy(false);
        if (s && s !== "pending") router.refresh();
      }}
      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-60"
      title="Cek status di Midtrans"
    >
      <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} />
      {result === "pending" ? "Masih pending" : "Cek"}
    </button>
  );
}
