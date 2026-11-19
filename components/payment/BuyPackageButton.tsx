"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Toast, useToast } from "@/components/ui/toast";
import { useSnapCheckout } from "@/lib/payment/use-snap";
import { cn } from "@/lib/utils";

interface Props {
  packageId: string;
  label?: string;
  className?: string;
  /** halaman untuk kembali setelah login */
  returnTo?: string;
}

/** Beli paket hemat → popup Midtrans → kuota aktif setelah lunas. */
export function BuyPackageButton({ packageId, label = "Beli sekarang", className, returnTo = "/paket-hemat" }: Props) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const { pay, busy } = useSnapCheckout();
  const [loading, setLoading] = useState(false);

  async function handleBuy() {
    setLoading(true);
    try {
      const res = await fetch("/api/payment/package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: packageId }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(returnTo)}`);
        return;
      }
      if (!res.ok || !json.data?.snap_token) {
        showToast(json.error ?? "Gagal memulai pembayaran.", "error");
        return;
      }

      setLoading(false);
      const { outcome, status } = await pay(json.data.snap_token, json.data.payment_id);

      if (status === "paid") {
        // Lunas → receipt + tombol "Konfirmasi via WhatsApp"
        router.push(`/receipt/${json.data.payment_id}`);
        router.refresh();
      } else if (outcome === "pending" || status === "pending") {
        router.push("/dashboard/paket-saya?pending=1");
      } else if (outcome === "error") {
        showToast("Pembayaran gagal. Silakan coba lagi.", "error");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal memulai pembayaran.", "error");
    } finally {
      setLoading(false);
    }
  }

  const working = loading || busy;

  return (
    <>
      <button
        type="button"
        onClick={handleBuy}
        disabled={working}
        className={cn("flex w-full items-center justify-center gap-2 disabled:opacity-70", className)}
      >
        {working && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {working ? "Memproses…" : label}
      </button>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
