"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, Download, FileText, Loader2, MessageCircle, Receipt, Send } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { PilihNaskah, unggahNaskahJasa, ukuranRingkas } from "@/components/katalog/NaskahJasa";
import { MAKS_NASKAH } from "@/lib/katalog/berkas-jasa";

type Berkas = { nama: string; ukuran: number };

/**
 * Isi halaman status pesanan jasa: kotak "diproses maks X", naskah yang
 * sudah dikirim (+ kirim susulan), file hasil untuk diunduh, dan tombol
 * Hubungi Admin ke WhatsApp.
 */
export function PanelJasa({
  pesananId, kode, namaProduk, namaPelanggan, tahap, estimasi, naskah, hasil, receiptHref, lunasBaru,
}: {
  pesananId: string;
  kode: string;
  namaProduk: string;
  namaPelanggan: string;
  tahap: "menunggu" | "diproses" | "selesai" | "batal";
  estimasi: string;
  naskah: Berkas[];
  hasil: Berkas[];
  receiptHref: string | null;
  lunasBaru: boolean;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState<{ teks: string; ok: boolean } | null>(null);
  const sisa = MAKS_NASKAH - naskah.length;
  const bolehKirim = (tahap === "diproses" || tahap === "menunggu") && sisa > 0;

  const teksWa =
    `Halo admin ${BRAND.name}, saya ${namaPelanggan || "…"} sudah membeli *${namaProduk}* ` +
    `(kode ${kode}). Mohon di-follow up untuk langkah berikutnya ya min, terima kasih!`;

  async function kirimNaskah() {
    if (files.length === 0) return;
    setBusy(true);
    setPesan(null);
    const up = await unggahNaskahJasa(files);
    if (!up.berkas) {
      setBusy(false);
      return setPesan({ teks: up.error ?? "Sesi habis, silakan login ulang.", ok: false });
    }
    const res = await fetch(`/api/pesanan-produk/${pesananId}/naskah`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ berkas: up.berkas }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setPesan({ teks: j.error ?? "Gagal mengirim naskah.", ok: false });
    setFiles([]);
    setPesan({ teks: "Naskah terkirim ke admin.", ok: true });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {lunasBaru && tahap === "diproses" && (
        <p className="rounded-2xl bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800">
          Pembayaran berhasil dan pesananmu sudah terkonfirmasi. Terima kasih!
        </p>
      )}

      {tahap === "diproses" && (
        <div className="rounded-2xl bg-slate-50 px-6 py-7 text-center">
          <Clock className="mx-auto h-10 w-10 text-brand" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Status</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">File diproses maksimal {estimasi}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Kami kabari lewat WhatsApp begitu file hasil siap. Tombol unduh juga akan muncul di halaman ini.
          </p>
        </div>
      )}

      {tahap === "menunggu" && (
        <div className="rounded-2xl bg-amber-50 px-6 py-6 text-center text-amber-900">
          <p className="text-lg font-extrabold">Menunggu pembayaran</p>
          <p className="mt-1 text-sm">Selesaikan pembayaran dari menu Pesanan Produk agar pesanan langsung diproses.</p>
        </div>
      )}

      {tahap === "batal" && (
        <div className="rounded-2xl bg-slate-100 px-6 py-6 text-center text-slate-700">
          <p className="text-lg font-extrabold">Pesanan dibatalkan</p>
          <p className="mt-1 text-sm">Hubungi admin bila ada pertanyaan soal refund.</p>
        </div>
      )}

      {tahap === "selesai" && (
        <div className="rounded-2xl bg-emerald-50 px-6 py-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">Selesai</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">File hasil sudah siap</p>
          <p className="mt-1 text-sm text-slate-600">File tersimpan permanen di halaman ini, bisa diunduh kapan saja.</p>
        </div>
      )}

      {hasil.length > 0 && (
        <div className="space-y-2">
          {hasil.map((b, i) => (
            <a key={i} href={`/api/pesanan-produk/${pesananId}/unduh?i=${i}`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-4 text-base font-bold text-white transition-colors hover:bg-brand-light sm:text-lg">
              <Download className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="truncate">Unduh {hasil.length > 1 ? b.nama : "File Hasil"}</span>
              <span className="shrink-0 text-xs font-normal opacity-80">{ukuranRingkas(b.ukuran)}</span>
            </a>
          ))}
        </div>
      )}

      <a href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(teksWa)}`} target="_blank" rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-4 text-base font-bold text-white transition-colors hover:bg-green-700 sm:text-lg">
        <MessageCircle className="h-5 w-5" aria-hidden="true" /> Hubungi Admin via WhatsApp
      </a>

      {(naskah.length > 0 || bolehKirim) && (
        <div className="space-y-2 rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-bold text-slate-900">Naskah yang kamu kirim</p>
          {naskah.length === 0 && <p className="text-sm text-slate-500">Belum ada. Unggah di bawah atau kirim lewat WhatsApp admin.</p>}
          {naskah.map((b, i) => (
            <p key={i} className="flex items-center gap-2 text-sm text-slate-700">
              <FileText className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{b.nama}</span>
              <span className="text-xs text-slate-400">{ukuranRingkas(b.ukuran)}</span>
            </p>
          ))}
          {bolehKirim && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <PilihNaskah files={files} ubah={setFiles} maks={sisa} judul="Kirim naskah tambahan"
                onGalat={(t) => setPesan(t ? { teks: t, ok: false } : null)} />
              {files.length > 0 && (
                <button type="button" onClick={kirimNaskah} disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Kirim ke admin
                </button>
              )}
            </div>
          )}
          {pesan && <p className={`text-sm ${pesan.ok ? "text-emerald-700" : "text-red-600"}`}>{pesan.teks}</p>}
        </div>
      )}

      {receiptHref && (
        <Link href={receiptHref} className="flex items-center justify-center gap-1.5 pt-1 text-sm font-bold text-slate-700 hover:text-brand">
          <Receipt className="h-4 w-4" aria-hidden="true" /> Lihat / unduh receipt
        </Link>
      )}
    </div>
  );
}
