"use client";

import { useState } from "react";
import Link from "next/link";
import { AjakSimpanWa } from "@/components/periksa/AjakSimpanWa";
import { Check, Copy, Download, ExternalLink, MessageCircle, Plus, Clock } from "lucide-react";

export const WA_ADMIN = "62882007483223";

export type TahapPesanan = "menunggu" | "dibayar" | "diproses" | "selesai" | "batal" | "gagal";
type JenisSkor = "kemiripan" | "ai" | "parafrase";

const TAHAP = ["Dibuat", "Dibayar", "Diproses", "Selesai"] as const;
const URUTAN: Record<TahapPesanan, number> = {
  menunggu: 0, dibayar: 1, diproses: 2, selesai: 3, batal: 0, gagal: 2,
};
const LENCANA: Record<TahapPesanan, { teks: string; kelas: string }> = {
  menunggu: { teks: "Menunggu bayar", kelas: "bg-amber-50 text-amber-700" },
  dibayar: { teks: "Dibayar", kelas: "bg-brand-50 text-brand" },
  diproses: { teks: "Diproses", kelas: "bg-brand-50 text-brand" },
  selesai: { teks: "Selesai", kelas: "bg-emerald-50 text-emerald-700" },
  batal: { teks: "Dibatalkan", kelas: "bg-slate-100 text-slate-600" },
  gagal: { teks: "Perlu dicek admin", kelas: "bg-red-50 text-red-700" },
};

/** Warna skor: hijau = aman, kuning = perlu diperhatikan, merah brand = tinggi. */
function warna(jenis: JenisSkor, p: number) {
  const tingkat =
    jenis === "parafrase"
      ? p >= 60 ? 0 : p >= 30 ? 1 : 2
      : jenis === "ai"
        ? p < 20 ? 0 : p < 60 ? 1 : 2
        : p <= 20 ? 0 : p <= 30 ? 1 : 2;
  return [
    { teks: "text-emerald-600", bar: "bg-emerald-500" },
    { teks: "text-amber-600", bar: "bg-amber-500" },
    { teks: "text-brand", bar: "bg-brand" },
  ][tingkat];
}

export function formatWaktuWIB(iso: string) {
  const d = new Date(iso);
  const tgl = d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
  const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).replace(".", ":");
  return `${tgl} ${jam} WIB`;
}

/**
 * Halaman status satu pesanan cek naskah: kepala pesanan, langkah
 * Dibuat → Dibayar → Diproses → Selesai, kode order, lalu kartu skor
 * dengan bar dan tombol unduh. Dipakai untuk Cek AI, Parafrase,
 * Turnitin, dan DrillBit agar customer selalu melihat bentuk yang sama.
 */
export function StatusPesanan({
  layanan,
  waktu,
  tahap,
  judul,
  namaBerkas,
  keterangan,
  kode,
  skor,
  info,
  unduh,
  lanjut,
  bukaTab,
  orderBaru,
  onOrderBaru,
  kembali,
  ajakSimpanWa = false,
  children,
  hubungiKecil = true,
}: {
  layanan: string;
  /** ISO timestamp pesanan dibuat. */
  waktu: string;
  tahap: TahapPesanan;
  judul: string;
  namaBerkas: string;
  keterangan: string;
  kode: string;
  /** Tanpa skor (mis. pesanan jasa) → kartu skor diganti `children`. */
  skor?: { label: string; persen: number | null; vonis: string; jenis: JenisSkor };
  children?: React.ReactNode;
  /** Tampilkan tautan kecil "Hubungi Admin" di bawah (default ya). */
  hubungiKecil?: boolean;
  /** Kotak keterangan di bawah skor, mis. "laporan sedang diperiksa". */
  info?: { judul: string; teks: string };
  unduh?: { href: string; label: string };
  /** Tombol utama selain unduh, mis. "Bayar sekarang". */
  lanjut?: { href: string; label: string };
  bukaTab?: { href: string; label: string };
  orderBaru?: string;
  onOrderBaru?: () => void;
  kembali?: { href: string; label: string };
  /** Tampilkan ajakan menyimpan nomor notifikasi (pesanan yang masih menunggu laporan). */
  ajakSimpanWa?: boolean;
}) {
  const [tersalin, setTersalin] = useState(false);
  const posisi = URUTAN[tahap];
  const lencana = LENCANA[tahap];
  const w = skor && skor.persen != null ? warna(skor.jenis, skor.persen) : null;

  async function salin() {
    try {
      await navigator.clipboard.writeText(kode);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 1500);
    } catch {
      /* clipboard tidak tersedia */
    }
  }

  const tombolOrderBaru = (
    <>
      <Plus className="h-5 w-5" aria-hidden="true" /> Order Baru
    </>
  );
  const kelasSekunder =
    "flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-brand px-5 py-3.5 text-base font-bold text-brand transition-colors hover:bg-brand-50";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {kembali && (
        <Link href={kembali.href} className="inline-flex items-center gap-2 font-semibold text-slate-700 hover:text-brand">
          <span aria-hidden="true">←</span> {kembali.label}
        </Link>
      )}

      {/* ── Kepala pesanan ── */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="bg-slate-50 px-6 py-7 sm:px-10">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-medium text-slate-600">
              {layanan} · {formatWaktuWIB(waktu)}
            </p>
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${lencana.kelas}`}>{lencana.teks}</span>
          </div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{judul}</h2>
          <p className="mt-2 text-slate-600">
            <span className="font-bold text-slate-800">{namaBerkas}</span> · {keterangan}
          </p>
        </div>

        <div className="px-6 sm:px-10">
          <ol className="grid grid-cols-4 py-7" aria-label="Tahap pesanan">
            {TAHAP.map((t, i) => {
              const lewat = tahap !== "batal" && i <= posisi;
              return (
                <li key={t} className="relative flex flex-col items-center text-center">
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className={`absolute right-1/2 top-[9px] h-0.5 w-full ${tahap !== "batal" && i <= posisi ? "bg-brand" : "bg-slate-200"}`}
                    />
                  )}
                  <span
                    className={`relative z-10 h-5 w-5 rounded-full border-4 ${
                      lewat ? "border-brand-100 bg-brand" : "border-slate-100 bg-slate-300"
                    }`}
                  />
                  <span className={`mt-3 text-sm sm:text-base ${lewat ? "font-semibold text-slate-800" : "text-slate-400"}`}>{t}</span>
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 py-5">
            <span className="text-slate-500">Kode order</span>
            <span className="font-mono text-lg font-bold tracking-wide text-slate-900">{kode}</span>
            <button
              type="button"
              onClick={salin}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {tersalin ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {tersalin ? "Tersalin" : "Salin"}
            </button>
          </div>
        </div>
      </section>

      {/* ── Skor & unduh ── */}
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        {children}
        {skor && (
        <div className="rounded-2xl bg-slate-50 px-6 py-7 text-center">
          <p className="text-base font-semibold uppercase tracking-[0.12em] text-slate-600">{skor.label}</p>
          {skor.persen != null && w ? (
            <p className={`mt-2 text-6xl font-extrabold tracking-tight sm:text-7xl ${w.teks}`}>{skor.persen}%</p>
          ) : (
            <p className="mt-3 flex items-center justify-center gap-2 text-4xl font-extrabold text-slate-300">
              <Clock className="h-8 w-8" aria-hidden="true" /> —
            </p>
          )}
          <div className="mx-auto mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            {skor.persen != null && w && (
              <div className={`h-full rounded-full ${w.bar}`} style={{ width: `${Math.max(2, Math.min(100, skor.persen))}%` }} />
            )}
          </div>
          <p className="mt-4 text-slate-600">{skor.vonis}</p>
        </div>
        )}

        {info && (
          <div className="rounded-2xl border border-brand-100 bg-brand-50 px-5 py-4">
            <p className="font-bold text-brand-dark">{info.judul}</p>
            <p className="mt-0.5 text-brand-dark/90">{info.teks}</p>
          </div>
        )}

        {ajakSimpanWa && <AjakSimpanWa kode={kode} />}

        {unduh && (
          <a
            href={unduh.href}
            download=""
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-4 text-lg font-bold text-white transition-colors hover:bg-brand-light"
          >
            <Download className="h-5 w-5" aria-hidden="true" /> {unduh.label}
          </a>
        )}
        {lanjut && (
          <Link
            href={lanjut.href}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-4 text-lg font-bold text-white transition-colors hover:bg-brand-light"
          >
            {lanjut.label}
          </Link>
        )}
        {bukaTab && (
          <a href={bukaTab.href} target="_blank" rel="noopener noreferrer" className={kelasSekunder}>
            <ExternalLink className="h-5 w-5" aria-hidden="true" /> {bukaTab.label}
          </a>
        )}
        {onOrderBaru ? (
          <button type="button" onClick={onOrderBaru} className={kelasSekunder}>
            {tombolOrderBaru}
          </button>
        ) : orderBaru ? (
          <Link href={orderBaru} className={kelasSekunder}>
            {tombolOrderBaru}
          </Link>
        ) : null}

        {hubungiKecil && <a
          href={`https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(`Halo admin, saya mau tanya pesanan ${kode}.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 pt-1 text-sm font-bold text-slate-700 hover:text-brand"
        >
          <MessageCircle className="h-4 w-4 text-green-600" aria-hidden="true" /> Hubungi Admin
        </a>}
      </section>
    </div>
  );
}
