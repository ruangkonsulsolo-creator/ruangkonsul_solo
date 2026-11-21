"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
const JEDA_MUNCUL = 3000;   // sebelum yang pertama tampil
const JEDA_GANTI = 12000;   // antar testimoni

export function NotifTestimoni() {
  const [daftar, setDaftar] = useState<Testimoni[]>([]);
  const [indeks, setIndeks] = useState(0);
  const [tampil, setTampil] = useState(false);
  const [ditutup, setDitutup] = useState(true);
  // Portal hanya boleh dibuat setelah komponen hidup di peramban;
  // document tidak ada saat dirender di server.
  const [terpasang, setTerpasang] = useState(false);
  useEffect(() => setTerpasang(true), []);

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

        // Batas waktu supaya satu permintaan yang menggantung tidak membuat
        // komponen ini menunggu selamanya tanpa jejak apa pun.
        const { data, error } = await Promise.race([
          supabase
            .from("testimoni")
            .select("id, isi, penulis, layanan, tautan")
            .eq("is_active", true)
            .order("urutan")
            .limit(12),
          new Promise<never>((_, tolak) =>
            setTimeout(() => tolak(new Error("Supabase tidak menjawab")), 8000)
          ),
        ]);
        if (batal) return;

        // Bagi pengunjung komponen ini memang harus diam kalau tidak ada
        // testimoni. Tapi diam juga membuat pemiliknya tidak bisa
        // membedakan "belum diisi" dari "rusak", jadi alasannya dicatat
        // di konsol. Pengunjung biasa tidak pernah membuka konsol.
        if (error) {
          console.warn(
            "[notif-testimoni] tidak bisa membaca tabel testimoni:",
            error.message,
            "\nKalau pesannya menyebut relation \"testimoni\" does not exist, " +
              "migration 032_testimoni_notif.sql belum dijalankan."
          );
          return;
        }
        if (!data || data.length === 0) {
          console.info(
            "[notif-testimoni] tabelnya ada tapi belum ada testimoni aktif. " +
              "Isi di /admin/testimoni, dan pastikan centang \"Tampilkan di situs\"."
          );
          return;
        }

        setDaftar(data as Testimoni[]);
      } catch (e) {
        console.warn("[notif-testimoni]", e);
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

  if (!terpasang || ditutup || !tampil || daftar.length === 0) return null;

  const t = daftar[indeks];
  const keterangan = [t.penulis, t.layanan && `Layanan: ${t.layanan}`]
    .filter(Boolean)
    .join(" · ");

  /*
    Dipasang lewat portal langsung ke <body>, bukan di tempatnya berada
    dalam pohon komponen.

    position: fixed berpatokan pada layar — kecuali kalau ada satu saja
    elemen induk yang punya transform, filter, backdrop-filter, perspective,
    atau contain. Satu properti itu diam-diam mengubah patokannya jadi
    elemen tersebut, dan notifikasinya ikut menggulir bersama halaman.
    Hari ini tidak ada induk seperti itu, tapi satu kelas Tailwind yang
    ditambahkan kapan saja di masa depan sudah cukup untuk merusaknya, dan
    gejalanya tidak akan terlihat seperti sebab-akibat.

    Portal ke <body> membuat pertanyaan itu tidak pernah perlu diajukan
    lagi: tidak ada induk sama sekali.
  */
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      style={{
        // Di iPhone, bagian bawah layar tertutup batang gestur Safari.
        bottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
      className="fixed left-4 z-50 w-[min(16.5rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-brand text-white shadow-2xl ring-1 ring-black/10 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <div className="flex items-center gap-2 px-3 pt-2.5">
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/80">
          <Quote className="h-3 w-3" aria-hidden="true" />
          Testimoni
        </span>
        <button
          type="button"
          onClick={tutup}
          aria-label="Tutup notifikasi testimoni"
          className="ml-auto -mr-1 rounded-lg p-1 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="px-3 pb-2.5 pt-1.5">
        <p className="line-clamp-3 text-[13px] leading-snug text-white">&ldquo;{t.isi}&rdquo;</p>
        {keterangan && (
          <p className="mt-1 truncate text-[11px] text-white/70">— {keterangan}</p>
        )}

        <Link
          href={t.tautan || "/bimbingan"}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-white underline-offset-2 hover:underline"
        >
          Lihat layanannya
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      {daftar.length > 1 && (
        <div className="flex gap-1 px-3 pb-2">
          {daftar.map((x, i) => (
            <span
              key={x.id}
              className={`h-0.5 flex-1 rounded-full transition-colors ${
                i === indeks ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
