"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Transisi antarhalaman: bilah kemajuan tipis di atas dan isi halaman yang
 * muncul perlahan.
 *
 * Dibangun dengan CSS dan sedikit state, tanpa pustaka animasi. Menambah
 * framer-motion untuk sekadar fade dan satu bilah kemajuan berarti menambah
 * puluhan kilobyte JavaScript ke setiap halaman — mahal untuk pengunjung
 * yang membuka situs ini dari ponsel dengan sinyal pas-pasan, dan itu
 * sebagian besar pasarmu.
 *
 * prefers-reduced-motion dihormati lewat globals.css: di sana seluruh
 * animasi dipangkas, dan bilah ini ikut diam.
 */
export function TransisiHalaman({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [memuat, setMemuat] = useState(false);
  const [kunci, setKunci] = useState(pathname);
  const pathSebelumnya = useRef(pathname);

  // Menyalakan bilah saat pengguna menekan tautan internal. Next.js tidak
  // memberi kait "navigasi dimulai" di App Router, jadi klik tautan yang
  // dipantau, bukan router-nya.
  useEffect(() => {
    function onKlik(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey ||
          e.shiftKey || e.altKey) return;

      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;

      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") ||
          href.startsWith("tel:")) return;
      if (a.target && a.target !== "_self") return;

      // Hanya tautan di dalam situs ini.
      try {
        const tujuan = new URL(href, window.location.href);
        if (tujuan.origin !== window.location.origin) return;
        if (tujuan.pathname === window.location.pathname) return;
      } catch {
        return;
      }

      setMemuat(true);
    }

    document.addEventListener("click", onKlik);
    return () => document.removeEventListener("click", onKlik);
  }, []);

  // Halaman baru sudah terpasang: matikan bilah, ganti kunci agar animasi
  // masuk berjalan ulang.
  useEffect(() => {
    if (pathSebelumnya.current !== pathname) {
      pathSebelumnya.current = pathname;
      setKunci(pathname);
      setMemuat(false);
    }
  }, [pathname]);

  // Jaring pengaman: kalau navigasi dibatalkan pengguna atau gagal, bilah
  // tidak boleh menggantung selamanya.
  useEffect(() => {
    if (!memuat) return;
    const t = setTimeout(() => setMemuat(false), 8000);
    return () => clearTimeout(t);
  }, [memuat]);

  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] transition-opacity duration-200 ${
          memuat ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className={memuat ? "bilah-muat h-full bg-brand" : "h-full w-0"} />
      </div>

      <div key={kunci} className="halaman-masuk">
        {children}
      </div>
    </>
  );
}
