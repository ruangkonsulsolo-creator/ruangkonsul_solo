"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Tombol aksi admin untuk satu pesanan produk. */
export function AksiPesananAdmin({ id, status, fisik, jasa = false }: { id: string; status: string; fisik: boolean; jasa?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [kurir, setKurir] = useState("JNE");
  const [resi, setResi] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function aksi(body: Record<string, unknown>) {
    setBusy(true); setErr(null);
    const res = await fetch(`/api/admin/pesanan-produk/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "Gagal.");
    router.refresh();
  }

  const btn = "rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-40";
  const cell = "rounded-md border border-slate-200 px-2 py-1 text-xs";
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1.5">
        {status === "dibayar" && <button disabled={busy} onClick={() => aksi({ aksi: "proses" })} className={`${btn} bg-slate-900 text-white`}>Proses</button>}
        {fisik && ["dibayar", "diproses", "dikirim"].includes(status) && (
          <>
            <select className={cell} value={kurir} onChange={(e) => setKurir(e.target.value)}>
              {["JNE", "J&T", "SiCepat", "AnterAja", "POS", "Ninja", "GoSend", "GrabExpress"].map((k) => <option key={k}>{k}</option>)}
            </select>
            <input className={`${cell} w-28`} placeholder="No. resi" value={resi} onChange={(e) => setResi(e.target.value)} />
            <button disabled={busy || resi.length < 4} onClick={() => aksi({ aksi: "kirim", kurir, no_resi: resi })} className={`${btn} bg-blue-600 text-white`}>Kirim</button>
          </>
        )}
        {!jasa && ["dibayar", "diproses", "dikirim"].includes(status) && (
          <button disabled={busy} onClick={() => aksi({ aksi: "selesai" })} className={`${btn} bg-green-600 text-white`}>Selesai</button>
        )}
        {["dibayar", "diproses"].includes(status) && (
          <button disabled={busy} onClick={() => { const a = prompt("Alasan pembatalan (refund manual):"); if (a) aksi({ aksi: "batal", alasan: a }); }}
            className={`${btn} border border-red-200 text-red-600`}>Batal</button>
        )}
        {busy && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}
