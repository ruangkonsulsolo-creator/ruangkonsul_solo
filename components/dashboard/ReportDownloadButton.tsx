"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReportDownloadButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/report/${orderId}`, { redirect: "manual" });

      if (res.type === "opaqueredirect" || res.status === 0) {
        // Fetch mengikuti redirect secara opaque — buka di tab baru
        window.open(`/api/report/${orderId}`, "_blank", "noopener,noreferrer");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Gagal mengunduh laporan.");
        setLoading(false);
        return;
      }

      // Jika response adalah redirect, buka URL-nya
      const finalUrl = res.url;
      if (finalUrl && finalUrl !== window.location.href) {
        window.open(finalUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleDownload}
        disabled={loading}
        className="gap-1.5"
        aria-label="Unduh laporan"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {loading ? "Menyiapkan..." : "Unduh Laporan"}
      </Button>
      {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
