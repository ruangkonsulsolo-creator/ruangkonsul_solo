"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { syncPaymentStatus } from "@/lib/payment/use-snap";

/**
 * Pemantau senyap untuk halaman pesanan yang belum lunas: cek status ke
 * server tiap 5 detik selama tab aktif dan saat pengguna kembali ke tab,
 * lalu muat ulang halaman begitu status berubah (lunas/kedaluwarsa).
 * Berhenti sendiri setelah 40 menit.
 */
export function PantauPembayaran({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  useEffect(() => {
    let selesai = false;
    const cek = async () => {
      if (selesai || document.visibilityState !== "visible") return;
      const st = await syncPaymentStatus({ paymentId });
      if (!selesai && st && st !== "pending") {
        selesai = true;
        router.refresh();
      }
    };
    const t = window.setInterval(cek, 5000);
    const henti = window.setTimeout(() => { selesai = true; }, 40 * 60 * 1000);
    document.addEventListener("visibilitychange", cek);
    window.addEventListener("focus", cek);
    void cek();
    return () => {
      selesai = true;
      window.clearInterval(t);
      window.clearTimeout(henti);
      document.removeEventListener("visibilitychange", cek);
      window.removeEventListener("focus", cek);
    };
  }, [paymentId, router]);
  return null;
}
