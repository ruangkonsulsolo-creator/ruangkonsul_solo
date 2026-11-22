"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Clock, FileSearch, History, Info, Loader2, RefreshCw } from "lucide-react";
import type { ItemRiwayat } from "@/app/api/periksa/riwayat/route";

const LABEL_JENIS: Record<ItemRiwayat["jenis"], string> = {
  ai: "Cek AI",
  parafrase: "Jasa Parafrase",
  kemiripan: "Cek Kemiripan",
  turnitin: "Cek Plagiasi",
  drillbit: "Cek DrillBit",
};

const LABEL_SKOR: Record<ItemRiwayat["jenis"], string> = {
  ai: "AI",
  parafrase: "berubah",
  kemiripan: "mirip",
  turnitin: "similarity",
  drillbit: "similarity",
};

const STATUS: Record<ItemRiwayat["tahap"], { label: string; kelas: string }> = {
  menunggu: { label: "Menunggu bayar", kelas: "bg-amber-50 text-amber-800" },
  diproses: { label: "Diproses", kelas: "bg-blue-50 text-blue-800" },
  selesai: { label: "Selesai", kelas: "bg-emerald-50 text-emerald-800" },
  batal: { label: "Dibatalkan", kelas: "bg-slate-100 text-slate-600" },
  gagal: { label: "Gagal · saldo dikembalikan", kelas: "bg-red-50 text-red-700" },
};

function waktuWIB(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Sub tab "Riwayat Pesanan" di halaman Cek Plagiarisme. Berlaku untuk akun
 * biasa maupun tamu (sesi tanpa daftar yang tersimpan di browser ini).
 */
export function RiwayatPeriksa({
  tertunda = null,
  onLanjut,
}: {
  /** Cek AI/Parafrase yang sedang menunggu pembayaran (belum tercatat di server). */
  tertunda?: { layanan: string; nominal: number; nama: string; waktu: number } | null;
  onLanjut?: () => void;
} = {}) {
  const [data, setData] = useState<{ item: ItemRiwayat[]; sesi: boolean; tamu: boolean } | null>(null);
  const [galat, setGalat] = useState(false);
  const [muat, setMuat] = useState(0);

  useEffect(() => {
    let batal = false;
    setGalat(false);
    fetch("/api/periksa/riwayat", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (!batal) setData(j.data); })
      .catch(() => { if (!batal) setGalat(true); });
    return () => { batal = true; };
  }, [muat]);

  return (
    <section className="mt-6 space-y-4" aria-labelledby="judul-riwayat">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="judul-riwayat" className="flex items-center gap-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            <History className="h-6 w-6 text-brand" aria-hidden="true" /> Riwayat Pesanan
          </h3>
          <p className="mt-1 text-sm text-slate-600">Cek AI, plagiasi, DrillBit, dan parafrase yang pernah kamu pesan.</p>
        </div>
        <button type="button" onClick={() => { setData(null); setMuat((n) => n + 1); }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Muat ulang
        </button>
      </div>

      {data?.tamu && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Kamu memesan <b>tanpa akun</b>, jadi riwayat ini tersimpan di <b>browser ini saja</b>. Kalau pindah perangkat,
            login, atau menghapus data browser, riwayat ini tidak ikut terbawa. Link laporan juga kami kirim ke WhatsApp-mu,
            dan link itu bisa dibuka dari perangkat mana pun.
          </p>
        </div>
      )}

      {tertunda && (
        <button type="button" onClick={onLanjut}
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-4 text-left transition-colors hover:border-amber-400">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-brand">{tertunda.layanan}</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">Menunggu bayar</span>
            </div>
            <p className="mt-1 truncate font-semibold text-slate-900">{tertunda.nama}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3 w-3" aria-hidden="true" /> {waktuWIB(new Date(tertunda.waktu).toISOString())} WIB ·
              Rp{tertunda.nominal.toLocaleString("id-ID")} · ketuk untuk lanjut bayar / batalkan
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
        </button>
      )}

      {galat ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">Gagal memuat riwayat. Coba muat ulang.</p>
      ) : !data ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-12 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Memuat riwayat…
        </div>
      ) : data.item.length === 0 && tertunda ? null : data.item.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <FileSearch className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
          <p className="mt-3 font-bold text-slate-800">Belum ada pesanan</p>
          <p className="mt-1 text-sm text-slate-500">
            Pesanan yang kamu buat di browser ini akan muncul di sini.{" "}
            {!data.sesi || data.tamu ? (
              <>
                Punya akun?{" "}
                <Link href="/login?next=/cek-plagiarisme?tab=riwayat" className="font-semibold text-brand hover:underline">Masuk</Link>{" "}
                untuk melihat riwayat akunmu.
              </>
            ) : null}
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {data.item.map((it) => {
            const st = STATUS[it.tahap];
            const isi = (
              <>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-brand">{LABEL_JENIS[it.jenis]}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${st.kelas}`}>{st.label}</span>
                  </div>
                  <p className="mt-1 truncate font-semibold text-slate-900">{it.judul}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {waktuWIB(it.waktu)} WIB
                    {it.kode && <span className="font-mono">· {it.kode}</span>}
                  </p>
                </div>
                {it.skor != null && (
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-extrabold text-slate-900">{it.skor}%</p>
                    <p className="text-[11px] text-slate-500">{LABEL_SKOR[it.jenis]}</p>
                  </div>
                )}
                {it.href && <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" aria-hidden="true" />}
              </>
            );
            return (
              <li key={`${it.jenis}-${it.id}`}>
                {it.href ? (
                  <Link href={it.href} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand">
                    {isi}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">{isi}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
