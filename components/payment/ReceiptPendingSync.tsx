"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { syncPaymentStatus } from "@/lib/payment/use-snap";

/** Receipt dibuka sebelum webhook tiba → cek status ke Midtrans beberapa kali lalu refresh. */
export function ReceiptPendingSync({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  useEffect(() => {
    let stop = false;
    (async () => {
      for (let i = 0; i < 6 && !stop; i++) {
        const s = await syncPaymentStatus({ paymentId });
        if (s && s !== "pending") { router.refresh(); return; }
        await new Promise((r) => setTimeout(r, 2500));
      }
    })();
    return () => { stop = true; };
  }, [paymentId, router]);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 print:hidden">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      Menunggu konfirmasi pembayaran dari Midtrans… Halaman akan diperbarui otomatis.
    </div>
  );
}
