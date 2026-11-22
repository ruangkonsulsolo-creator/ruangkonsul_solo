"use client";

import { useRef } from "react";
import { FileText, Paperclip, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BATAS_BYTE, MAKS_NASKAH, namaAman, type BerkasJasa } from "@/lib/katalog/berkas-jasa";

export const EKSTENSI_NASKAH = [".pdf", ".doc", ".docx"];

export function ukuranRingkas(b: number): string {
  return b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
}

/** Unggah naskah ke documents/<uid>/jasa/. Null uid → belum login. */
export async function unggahNaskahJasa(files: File[]): Promise<{ berkas?: BerkasJasa[]; error?: string; perluLogin?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { perluLogin: true };
  const hasil: BerkasJasa[] = [];
  for (const [i, f] of files.entries()) {
    const path = `${user.id}/jasa/${Date.now()}_${i}_${namaAman(f.name)}`;
    const { error } = await supabase.storage.from("documents").upload(path, f, { contentType: f.type || undefined, upsert: false });
    if (error) return { error: `Gagal mengunggah "${f.name}": ${error.message}` };
    hasil.push({ path, nama: f.name.slice(0, 200), ukuran: f.size });
  }
  return { berkas: hasil };
}

/** Pilih naskah (belum diunggah); validasi ekstensi & ukuran di sini. */
export function PilihNaskah({
  files, ubah, onGalat, maks = MAKS_NASKAH, judul = "Naskah / file pendukung (opsional)",
}: {
  files: File[];
  ubah: (f: File[]) => void;
  onGalat: (pesan: string | null) => void;
  maks?: number;
  judul?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function tambah(daftar: FileList | null) {
    const baru: File[] = [];
    for (const f of Array.from(daftar ?? [])) {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      if (!EKSTENSI_NASKAH.includes(ext)) { onGalat(`"${f.name}" bukan PDF/DOC/DOCX. File lain bisa dikirim lewat WhatsApp admin.`); continue; }
      if (f.size > BATAS_BYTE) { onGalat(`"${f.name}" lebih dari 50 MB.`); continue; }
      if (files.some((x) => x.name === f.name && x.size === f.size)) continue;
      baru.push(f);
    }
    const gabung = [...files, ...baru].slice(0, maks);
    if (baru.length) onGalat(null);
    ubah(gabung);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-600">{judul}</p>
      <input ref={ref} type="file" multiple accept={EKSTENSI_NASKAH.join(",")} className="hidden"
        onChange={(e) => { tambah(e.target.files); e.target.value = ""; }} />
      {files.map((f, i) => (
        <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-slate-800">{f.name}</span>
          <span className="shrink-0 text-xs text-slate-400">{ukuranRingkas(f.size)}</span>
          <button type="button" onClick={() => ubah(files.filter((_, j) => j !== i))} aria-label={`Hapus ${f.name}`}
            className="rounded p-0.5 text-slate-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      {files.length < maks && (
        <button type="button" onClick={() => ref.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-3 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-brand hover:text-brand">
          <Paperclip className="h-4 w-4" aria-hidden="true" />
          {files.length ? "Tambah file lagi" : "Lampirkan naskah (PDF/DOC/DOCX)"}
        </button>
      )}
      <p className="text-[11px] text-slate-500">Maks {maks} file, 50 MB per file. Bisa juga dikirim setelah bayar.</p>
    </div>
  );
}
