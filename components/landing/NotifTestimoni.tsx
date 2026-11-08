"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Quote, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Notifikasi testimoni di pojok kiri bawah.
 *
 * Muncul beberapa detik setelah halaman terbuka, bergantian antar testimoni,
 * dan bisa ditutup. Penutupannya diingat selama satu sesi peramban — notifikasi
 * yang sudah ditutup lalu muncul lagi di halaman berikutnya bukan pemasaran,
 * itu gangguan.
 *
 * Kalau tabel testimoni kosong atau belum dibuat, komponen ini tidak
 * menampilkan apa pun. Tidak ada testimoni contoh: kalimat karangan tentang
 * pengalaman konsumen melanggar UU No. 8 Tahun 1999 Pasal 9, dan contoh yang
 * terlanjur tayang jarang sempat diganti.
 */

type Testimoni = {
  id: string;
  isi: string;
  penulis: string | null;
  layanan: string | null;
  tautan: string | null;
};

const KUNCI_TUTUP = "rks_notif_testimoni_ditutup";
const JEDA_MUNCUL = 6000;   // sebelum yang pertama tampil
const JEDA_GANTI = 12000;   // antar testimoni

export function NotifTestimoni() {
  const [daftar, setDaftar] = useState<Testimoni[]>([]);
  const [indeks, setIndeks] = useState(0);
  const [tampil, setTampil] = useState(false);
  const [ditutup, setDitutup] = useState(true);

  // Periksa penutupan lebih dulu. sessionStorage bisa melempar di mode
  // penyamaran atau saat cookie situs diblokir, jadi dibungkus try.
  useEffect(() => {
    let sudah = false;
    try {
      sudah = sessionStorage.getItem(KUNCI_TUTUP) === "1";
    } catch {
      sudah = false;
    }
    setDitutup(sudah);
  }, []);

  useEffect(() => {
    if (ditutup) return;
    let batal = false;

    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("testimoni")
          .select("id, isi, penulis, layanan, tautan")
          .eq("is_active", true)
          .order("urutan")
          .limit(12);
        if (error || batal || !data || data.length === 0) return;
        setDaftar(data as Testimoni[]);
      } catch {
        // Tabelnya belum ada — diamkan saja, tidak ada yang perlu ditampilkan.
      }
    })();

    return () => {
      batal = true;
    };
  }, [ditutup]);

  // Muncul setelah jeda, supaya tidak menabrak pembaca begitu halaman dibuka.
  useEffect(() => {
    if (ditutup || daftar.length === 0) return;
    const t = setTimeout(() => setTampil(true), JEDA_MUNCUL);
    return () => clearTimeout(t);
  }, [ditutup, daftar.length]);

  // Bergantian, hanya kalau testimoninya lebih dari satu.
  useEffect(() => {
    if (!tampil || daftar.length < 2) return;
    const t = setInterval(
      () => setIndeks((i) => (i + 1) % daftar.length),
      JEDA_GANTI
    );
    return () => clearInterval(t);
  }, [tampil, daftar.length]);

  function tutup() {
    setTampil(false);
    setDitutup(true);
    try {
      sessionStorage.setItem(KUNCI_TUTUP, "1");
    } catch {
      // Tidak bisa diingat — paling buruk muncul lagi di halaman berikutnya.
    }
  }

  if (ditutup || !tampil || daftar.length === 0) return null;

  const t = daftar[indeks];
  const keterangan = [t.penulis, t.layanan && `Layanan: ${t.layanan}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-5 z-40 w-[min(21rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl bg-brand text-white shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <div className="flex items-start gap-2 px-4 pt-3.5">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/80">
          <Quote className="h-3.5 w-3.5" aria-hidden="true" />
          Testimoni
        </span>
        <button
          type="button"
          onClick={tutup}
          aria-label="Tutup notifikasi testimoni"
          className="ml-auto -mr-1 rounded-lg p-1 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="px-4 pb-4 pt-2">
        <p className="text-sm leading-relaxed text-white">&ldquo;{t.isi}&rdquo;</p>
        {keterangan && (
          <p className="mt-2 text-xs text-white/70">— {keterangan}</p>
        )}

        <Link
          href={t.tautan || "/bimbingan"}
          className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-white underline-offset-2 hover:underline"
        >
          Lihat layanannya
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      {daftar.length > 1 && (
        <div className="flex gap-1 px-4 pb-3">
          {daftar.map((x, i) => (
            <span
              key={x.id}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i === indeks ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
