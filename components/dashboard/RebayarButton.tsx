"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toast, useToast } from "@/components/ui/toast";
import { PaymentModal } from "./PaymentModal";

export function RebayarButton({ orderId, snapToken }: { orderId: string; snapToken: string | null }) {
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeToken, setActiveToken] = useState<string | null>(null);

  async function handleRebayar() {
    // Kalau sudah ada snap token, langsung buka
    if (snapToken) {
      setActiveToken(snapToken);
      return;
    }

    // Minta token baru
    setLoading(true);
    const res = await fetch(`/api/order/renew-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId }),
    });
    const json = await res.json();

    if (!res.ok || !json.data?.snap_token) {
      showToast(json.error ?? "Gagal membuat ulang pembayaran.", "error");
      setLoading(false);
      return;
    }

    setActiveToken(json.data.snap_token);
    setLoading(false);
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={handleRebayar}
        disabled={loading}
        className="gap-1.5 border-brand text-brand hover:bg-brand-50"
      >
        {loading
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          : <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
        }
        {loading ? "Memuat..." : "Bayar Sekarang"}
      </Button>

      {activeToken && (
        <PaymentModal
          snapToken={activeToken}
          onClose={() => setActiveToken(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
