"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Download, ExternalLink, FileText, Loader2, MessageCircle, Send, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils/format-currency";

export type BarisManual = {
  id: string;
  nomor: string;
  status: string;
  harga: number;
  dibuat: string;
  dibayar: string | null;
  selesai: string | null;
  jenis: "Turnitin" | "DrillBit";
  format: string | null;
  persen: number | null;
  kata: number | null;
  mesin: string | null;
  customer: string;
  wa: string | null;
  berkas: string;
  urlNaskah: string | null;
  urlLaporan: string | null;
};

const waktu = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) : "-";

/** Sisa waktu dari janji 1×24 jam sejak dibayar. */
function sisaSla(dibayar: string | null): { teks: string; telat: boolean } | null {
  if (!dibayar) return null;
  const sisa = new Date(dibayar).getTime() + 24 * 3600_000 - Date.now();
  const jam = Math.floor(Math.abs(sisa) / 3600_000);
  const menit = Math.floor((Math.abs(sisa) % 3600_000) / 60_000);
  return sisa >= 0 ? { teks: `sisa ${jam}j ${menit}m`, telat: false } : { teks: `telat ${jam}j ${menit}m`, telat: true };
}

/** Satu pesanan laporan manual: unduh naskah, unggah PDF laporan asli + persentase, kirim. */
export function BarisCekManual({ r }: { r: BarisManual }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [persen, setPersen] = useState(r.persen != null ? String(r.persen) : "");
  const [mesin, setMesin] = useState(r.mesin ?? r.jenis);
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState<{ teks: string; ok: boolean } | null>(null);
  const [ganti, setGanti] = useState(false);

  const bisaKirim = ["dibayar", "diproses", "processing_failed"].includes(r.status) || (r.status === "selesai" && ganti);
  const sla = r.status !== "selesai" ? sisaSla(r.dibayar) : null;
  const waLink = r.wa ? `https://wa.me/${r.wa}?text=${encodeURIComponent(`Halo ${r.customer}, laporan ${r.jenis} untuk pesanan ${r.nomor} sudah kami kirim. Silakan cek di Riwayat Pesanan Ruang Konsul ya.`)}` : null;

  async function kirim() {
    const nilai = Number(persen.replace(",", "."));
    if (persen.trim() === "" || Number.isNaN(nilai) || nilai < 0 || nilai > 100) return setPesan({ teks: "Isi persentase 0–100.", ok: false });
    if (!file && !r.urlLaporan) return setPesan({ teks: "Pilih PDF laporan dulu.", ok: false });
    if (file && file.type !== "application/pdf") return setPesan({ teks: "Laporan harus PDF.", ok: false });
    setBusy(true);
    setPesan(null);
    try {
      if (file) {
        const { error } = await createClient()
          .storage.from("reports")
          .upload(`${r.id}/laporan.pdf`, file, { contentType: "application/pdf", upsert: true });
        if (error) throw new Error(`Gagal mengunggah PDF: ${error.message}`);
      }
      const res = await fetch(`/api/admin/order/${r.id}/laporan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persen_kemiripan: nilai, selesaikan: true, mesin_laporan: mesin }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Gagal mengirim laporan.");
      setPesan({ teks: "Terkirim. Customer sudah diberi tahu.", ok: true });
      setFile(null);
      setGanti(false);
      router.refresh();
    } catch (e) {
      setPesan({ teks: e instanceof Error ? e.message : "Gagal mengirim laporan.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`rounded-2xl border bg-white p-4 ${sla?.telat ? "border-red-300" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.jenis === "DrillBit" ? "bg-indigo-100 text-indigo-700" : "bg-brand-50 text-brand"}`}>
              {r.jenis}{r.format ? ` · tampilan ${r.format}` : ""}
            </span>
            <span className="font-mono text-xs text-slate-500">{r.nomor}</span>
            {r.status === "selesai" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                <CheckCircle2 className="h-3 w-3" /> Terkirim {waktu(r.selesai)}
              </span>
            )}
            {sla && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${sla.telat ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                <Clock className="h-3 w-3" /> {sla.teks}
              </span>
            )}
          </div>
          <p className="mt-1 font-semibold text-slate-900">{r.customer}</p>
          <p className="flex items-center gap-1.5 truncate text-sm text-slate-600">
            <FileText className="h-3.5 w-3.5 shrink-0" /> {r.berkas}
            {r.kata ? <span className="text-slate-400"> · ±{r.kata.toLocaleString("id-ID")} kata</span> : null}
          </p>
          <p className="text-xs text-slate-400">
            {formatRupiah(r.harga)} · dipesan {waktu(r.dibuat)}{r.dibayar ? ` · dibayar ${waktu(r.dibayar)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {r.urlNaskah && (
            <a href={r.urlNaskah} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
              <Download className="h-3.5 w-3.5" /> Unduh naskah
            </a>
          )}
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          )}
        </div>
      </div>

      {r.status === "selesai" && !ganti && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-green-50 px-3 py-2 text-sm">
          <span className="font-bold text-green-800">{r.mesin ?? r.jenis}: {r.persen ?? "-"}%</span>
          {r.urlLaporan && (
            <a href={r.urlLaporan} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-green-800 underline">
              <ExternalLink className="h-3 w-3" /> Lihat PDF terkirim
            </a>
          )}
          <button type="button" onClick={() => setGanti(true)} className="text-xs font-semibold text-slate-600 underline">Ganti laporan</button>
        </div>
      )}

      {bisaKirim && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
            <Upload className="h-3.5 w-3.5" />
            <span className="max-w-[180px] truncate">{file ? file.name : "Pilih PDF laporan"}</span>
            <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <select value={mesin} onChange={(e) => setMesin(e.target.value)} className="rounded-lg border bg-white px-2 py-1.5 text-xs">
            {["Turnitin", "DrillBit", "iThenticate", "Copyleaks", "Lainnya"].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <label className="inline-flex items-center gap-1 text-xs text-slate-600">
            Similarity
            <input type="number" min={0} max={100} step="0.1" inputMode="decimal" value={persen} onChange={(e) => setPersen(e.target.value)}
              placeholder="0–100" className="w-20 rounded-lg border bg-white px-2 py-1.5 text-sm" />%
          </label>
          <button type="button" onClick={kirim} disabled={busy}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#8B0000] px-4 py-1.5 text-sm font-bold text-white hover:bg-[#6B0000] disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Kirim ke customer
          </button>
        </div>
      )}

      {pesan && <p className={`mt-2 text-xs font-semibold ${pesan.ok ? "text-green-700" : "text-red-600"}`}>{pesan.teks}</p>}
    </article>
  );
}
