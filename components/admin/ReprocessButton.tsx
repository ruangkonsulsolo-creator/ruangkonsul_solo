"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCw } from "lucide-react";

/** Admin: jalankan ulang engine otomatis untuk pesanan ini. */
export function ReprocessButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <button
        disabled={busy}
        onClick={async () => {
          if (!confirm("Proses ulang pesanan ini? Hasil lama akan ditimpa.")) return;
          setBusy(true); setMsg(null);
          const res = await fetch(`/api/process/${orderId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force: true }) });
          const j = await res.json().catch(() => ({}));
          setBusy(false);
          setMsg(j.data?.status === "selesai" ? "Selesai ✓" : j.data?.reason ?? j.error ?? "Gagal");
          router.refresh();
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
        {busy ? "Memproses… (bisa beberapa menit)" : "Proses ulang otomatis"}
      </button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}
