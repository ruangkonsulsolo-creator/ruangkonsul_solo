"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { MenuAkun } from "@/components/ui/MenuAkun";

/**
 * Navbar tunggal untuk semua halaman publik.
 *
 * Sebelumnya tiap halaman menulis navbar-nya sendiri. Akibatnya dua hal:
 * daftar tautannya berbeda-beda di tiap halaman (Mentor cuma ada di beranda,
 * Bimbingan hilang di halaman Blog), dan di beranda sepuluh tautan dipaksa
 * berbaris dalam satu baris sampai saling bertabrakan dan nama brand-nya
 * patah jadi dua baris.
 *
 * Sepuluh tautan memang tidak muat. Jadi lima yang paling sering dipakai
 * tetap terlihat, sisanya masuk "Lainnya". Di bawah lg semuanya pindah ke
 * menu hamburger — bukan disembunyikan, hanya ditumpuk ke bawah di tempat
 * yang memang punya ruang.
 *
 * "Cek Pesanan" dikeluarkan dari sini karena itu halaman member, dan sudah
 * ada di menu profil sebagai "Riwayat Pesanan". Menaruhnya di navbar publik
 * berarti menawarkan pintu yang terkunci untuk pengunjung yang belum masuk.
 */

type Tautan = { label: string; href: string };

const UTAMA: Tautan[] = [
  { label: "Layanan", href: "/layanan" },
  { label: "Bimbingan", href: "/bimbingan" },
  { label: "Jadwal", href: "/jadwal" },
  { label: "Merchandise", href: "/merchandise" },
  { label: "Mentor", href: "/mentor-kami" },
];

const LAINNYA: Tautan[] = [
  { label: "Paket Hemat", href: "/paket-hemat" },
  { label: "Event", href: "/event" },
  { label: "Blog", href: "/blog" },
  { label: "Referral", href: "/referral" },
];

function aktif(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavbarUtama() {
  const pathname = usePathname() || "/";
  const [bukaLain, setBukaLain] = useState(false);
  const [bukaPonsel, setBukaPonsel] = useState(false);
  const wadahLain = useRef<HTMLDivElement>(null);

  // Tutup dropdown saat klik di luar atau tekan Escape.
  useEffect(() => {
    if (!bukaLain) return;
    function klikLuar(e: MouseEvent) {
      if (wadahLain.current && !wadahLain.current.contains(e.target as Node)) {
        setBukaLain(false);
      }
    }
    function tekanEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setBukaLain(false);
        setBukaPonsel(false);
      }
    }
    document.addEventListener("mousedown", klikLuar);
    document.addEventListener("keydown", tekanEsc);
    return () => {
      document.removeEventListener("mousedown", klikLuar);
      document.removeEventListener("keydown", tekanEsc);
    };
  }, [bukaLain]);

  // Pindah halaman harus menutup menu. Tanpa ini menu ponsel tetap
  // menempel di layar setelah tautannya diklik.
  useEffect(() => {
    setBukaLain(false);
    setBukaPonsel(false);
  }, [pathname]);

  const adaLainAktif = LAINNYA.some((t) => aktif(pathname, t.href));

  return (
    <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="shrink-0">
          <Logo href="/" size="sm" />
        </div>

        {/* ── Tautan layar lebar ── */}
        <div className="hidden min-w-0 items-center gap-4 text-sm font-medium text-slate-600 lg:flex xl:gap-5">
          {UTAMA.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`whitespace-nowrap transition-colors hover:text-brand ${
                aktif(pathname, t.href) ? "font-bold text-brand" : ""
              }`}
            >
              {t.label}
            </Link>
          ))}

          <div ref={wadahLain} className="relative">
            <button
              type="button"
              onClick={() => setBukaLain((b) => !b)}
              aria-expanded={bukaLain}
              aria-haspopup="menu"
              className={`flex items-center gap-1 whitespace-nowrap transition-colors hover:text-brand ${
                adaLainAktif ? "font-bold text-brand" : ""
              }`}
            >
              Lainnya
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${bukaLain ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {bukaLain && (
              <ul
                role="menu"
                className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-card-hover"
              >
                {LAINNYA.map((t) => (
                  <li key={t.href}>
                    <Link
                      href={t.href}
                      role="menuitem"
                      onClick={() => setBukaLain(false)}
                      className={`block px-4 py-2 text-sm transition-colors hover:bg-brand-50 hover:text-brand ${
                        aktif(pathname, t.href)
                          ? "font-bold text-brand"
                          : "text-slate-700"
                      }`}
                    >
                      {t.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Kanan ── */}
        <div className="flex shrink-0 items-center gap-2">
          <MenuAkun />
          <button
            type="button"
            onClick={() => setBukaPonsel((b) => !b)}
            aria-expanded={bukaPonsel}
            aria-label={bukaPonsel ? "Tutup menu" : "Buka menu"}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-brand hover:text-brand lg:hidden"
          >
            {bukaPonsel ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* ── Menu ponsel ── */}
      {bukaPonsel && (
        <div className="border-t border-slate-100 bg-white lg:hidden">
          <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 px-4 py-3">
            {[...UTAMA, ...LAINNYA].map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  onClick={() => setBukaPonsel(false)}
                  className={`block border-b border-slate-50 py-2.5 text-sm transition-colors hover:text-brand ${
                    aktif(pathname, t.href)
                      ? "font-bold text-brand"
                      : "font-medium text-slate-700"
                  }`}
                >
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
