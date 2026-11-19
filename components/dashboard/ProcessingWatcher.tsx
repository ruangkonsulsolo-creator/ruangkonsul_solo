"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Saat pesanan sedang diproses: refresh halaman berkala, dan jika terlihat
 * macet (> 90 detik tanpa mulai / > 12 menit berjalan) minta server memproses.
 */
export function ProcessingWatcher({ orderId, startedAt }: { orderId: string; startedAt: string | null }) {
  const router = useRouter();
  useEffect(() => {
    const started = startedAt ? new Date(startedAt).getTime() : 0;
    const age = Date.now() - started;
    if (!startedAt || age > 12 * 60_000) {
      const t = setTimeout(() => {
        fetch(`/api/process/${orderId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
          .finally(() => router.refresh());
      }, startedAt ? 0 : 90_000);
      return () => clearTimeout(t);
    }
  }, [orderId, startedAt, router]);

  useEffect(() => {
    const i = setInterval(() => router.refresh(), 6000);
    return () => clearInterval(i);
  }, [router]);

  return null;
}
