"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toast, useToast } from "@/components/ui/toast";
import { PaymentModal } from "./PaymentModal";

/**
 * Tombol "Bayar Sekarang" untuk pesanan menunggu_pembayaran.
 * Server memutuskan apakah token lama masih bisa dipakai atau perlu transaksi baru.
 */
export function RebayarButton({ orderId }: { orderId: string; snapToken?: string | null }) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<{ token: string; paymentId: string | null } | null>(null);

  async function handleRebayar() {
    setLoading(true);
    try {
      const res = await fetch(`/api/order/renew-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      const json = await res.json().catch(() => ({}));

      if (json.paid) {
        showToast("Pesanan ini sudah dibayar. Memuat ulang…", "success");
        router.refresh();
        return;
      }
      if (!res.ok || !json.data?.snap_token) {
        showToast(json.error ?? "Gagal membuat ulang pembayaran.", "error");
        return;
      }
      setActive({ token: json.data.snap_token, paymentId: json.data.payment_id ?? null });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={handleRebayar}
        disabled={loading || !!active}
        className="gap-1.5 border-brand text-brand hover:bg-brand-50"
      >
        {loading
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          : <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
        }
        {loading ? "Memuat..." : "Bayar Sekarang"}
      </Button>

      {active && (
        <PaymentModal
          snapToken={active.token}
          paymentId={active.paymentId}
          successPath={`/dashboard/riwayat-pesanan?order=${orderId}`}
          onError={(m) => showToast(m, "error")}
          onClose={() => { setActive(null); router.refresh(); }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
