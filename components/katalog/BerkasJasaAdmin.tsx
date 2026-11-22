"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, FileText, Loader2, Save, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BATAS_BYTE, MAKS_HASIL, namaAman, type BerkasJasa } from "@/lib/katalog/berkas-jasa";
import { ukuranRingkas } from "@/components/katalog/NaskahJasa";

const TERIMA = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.csv,.txt,.jpg,.jpeg,.png";

/**
 * Panel admin untuk pesanan jasa berkas: unduh naskah customer, unggah file
 * hasil (ke bucket hasil-jasa/<id pesanan>/), lalu selesaikan pesanan.
 */
export function BerkasJasaAdmin({
  id, status, estimasi, naskah, hasilAwal,
}: {
  id: string;
  status: string;
  estimasi: string;
  naskah: { nama: string; ukuran: number }[];
  hasilAwal: BerkasJasa[];
}) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [hasil, setHasil] = useState<BerkasJasa[]>(hasilAwal);
  const [busy, setBusy] = useState<string | null>(null);
  const [pesan, setPesan] = useState<{ teks: string; ok: boolean } | null>(null);
  const berubah = JSON.stringify(hasil) !== JSON.stringify(hasilAwal);
  const selesai = status === "selesai";
  const aktif = ["dibayar", "diproses", "dikirim", "selesai"].includes(status);

  async function unggah(files: FileList | null) {
    const daftar = Array.from(files ?? []).slice(0, MAKS_HASIL - hasil.length);
    if (!daftar.length) return;
    setBusy("unggah");
    setPesan(null);
    const supabase = createClient();
    const baru: BerkasJasa[] = [];
    for (const [i, f] of daftar.entries()) {
      if (f.size > BATAS_BYTE) { setPesan({ teks: `"${f.name}" lebih dari 50 MB.`, ok: false }); continue; }
      const path = `${id}/${Date.now()}_${i}_${namaAman(f.name)}`;
      const { error } = await supabase.storage.from("hasil-jasa").upload(path, f, { contentType: f.type || undefined, upsert: false });
      if (error) {
        const t = /bucket not found/i.test(error.message) ? "Bucket hasil-jasa belum ada — jalankan migration 048." : error.message;
        setPesan({ teks: `Gagal mengunggah "${f.name}": ${t}`, ok: false });
        continue;
      }
      baru.push({ path, nama: f.name.slice(0, 200), ukuran: f.size });
    }
    setHasil((h) => [...h, ...baru]);
    setBusy(null);
    if (baru.length) setPesan({ teks: `${baru.length} file terunggah. Klik "Selesaikan & kabari customer" bila sudah lengkap.`, ok: true });
  }

  async function simpan(selesaikan: boolean) {
    setBusy(selesaikan ? "selesai" : "simpan");
    setPesan(null);
    const res = await fetch(`/api/admin/pesanan-produk/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aksi: "hasil", berkas: hasil, selesaikan }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setPesan({ teks: j.error ?? "Gagal menyimpan.", ok: false });
    setPesan({ teks: selesaikan ? "Pesanan selesai, customer sudah dikabari." : "Daftar file hasil disimpan.", ok: true });
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-xl border border-brand/20 bg-brand-50/40 p-3 md:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-wide text-brand">Jasa berkas · target maks {estimasi}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-bold text-slate-700">Naskah dari customer</p>
          {naskah.length === 0 ? (
            <p className="text-xs text-slate-500">Belum ada — minta lewat WhatsApp, atau customer unggah di halaman pesanannya.</p>
          ) : (
            <ul className="space-y-1">
              {naskah.map((b, i) => (
                <li key={i}>
                  <a href={`/api/pesanan-produk/${id}/unduh?naskah=${i}`} className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-brand">
                    <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{b.nama}</span>
                    <span className="shrink-0 font-normal text-slate-400">{ukuranRingkas(b.ukuran)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-1 text-xs font-bold text-slate-700">File hasil untuk customer</p>
          <ul className="space-y-1">
            {hasil.map((b, i) => (
              <li key={b.path} className="flex items-center gap-1.5 text-xs text-slate-800">
                <FileText className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{b.nama}</span>
                <span className="shrink-0 text-slate-400">{ukuranRingkas(b.ukuran)}</span>
                <button type="button" onClick={() => setHasil((h) => h.filter((_, j) => j !== i))} aria-label={`Hapus ${b.nama}`}
                  className="rounded p-0.5 text-slate-400 hover:text-red-600" disabled={!!busy}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <input ref={ref} type="file" multiple accept={TERIMA} className="hidden"
            onChange={(e) => { unggah(e.target.files); e.target.value = ""; }} />
          {aktif && hasil.length < MAKS_HASIL && (
            <button type="button" onClick={() => ref.current?.click()} disabled={!!busy}
              className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-400 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand hover:text-brand disabled:opacity-60">
              {busy === "unggah" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Unggah file hasil
            </button>
          )}
          <p className="mt-1 text-[11px] text-slate-500">PDF, Word, Excel, PPT, ZIP, gambar · maks 50 MB · maks {MAKS_HASIL} file</p>
        </div>
      </div>

      {aktif && (
        <div className="flex flex-wrap gap-2">
          {!selesai && (
            <button type="button" onClick={() => simpan(true)} disabled={!!busy || hasil.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-40">
              {busy === "selesai" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Selesaikan &amp; kabari customer
            </button>
          )}
          {berubah && (
            <button type="button" onClick={() => simpan(false)} disabled={!!busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40">
              {busy === "simpan" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {selesai ? "Simpan perubahan file" : "Simpan dulu (belum selesai)"}
            </button>
          )}
        </div>
      )}
      {pesan && <p className={`text-xs ${pesan.ok ? "text-emerald-700" : "text-red-600"}`}>{pesan.teks}</p>}
    </div>
  );
}
