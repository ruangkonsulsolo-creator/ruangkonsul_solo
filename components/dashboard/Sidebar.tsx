"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import {
  FileSearch, Bot, BookOpenCheck, PenLine,
  ClockIcon, PackageOpen, User, LogOut,
  LayoutDashboard, Menu, X, ChevronRight,
  GraduationCap,
} from "lucide-react";
import { useState } from "react";

/**
 * Struktur navigasi Kalibri:
 *
 * Layanan (halaman PUBLIK — bisa diakses tanpa login):
 *   /cek-plagiasi, /cek-ai, /cek-drillbit, /jasa-parafrase, /bimbingan
 *   → User upload file → diminta login hanya saat checkout
 *
 * Akun (halaman PRIVAT — wajib login):
 *   /dashboard, /dashboard/riwayat-pesanan, /dashboard/paket-saya, /dashboard/profil
 */
const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },

  { type: "section" as const, label: "Layanan" },

  // Halaman publik — tidak butuh login untuk upload & lihat harga
  { label: "Cek Plagiasi",     href: "/cek-plagiasi",   icon: FileSearch },
  { label: "AI Detector",      href: "/cek-ai",          icon: Bot },
  { label: "DrillBit Checker", href: "/cek-drillbit",    icon: BookOpenCheck },
  { label: "Jasa Parafrase",   href: "/jasa-parafrase",  icon: PenLine },
  { label: "Bimbingan",        href: "/bimbingan",       icon: GraduationCap },

  { type: "section" as const, label: "Akun" },

  // Halaman privat — butuh login
  { label: "Riwayat Pesanan", href: "/dashboard/riwayat-pesanan", icon: ClockIcon },
  { label: "Paket Saya",      href: "/dashboard/paket-saya",      icon: PackageOpen },
  { label: "Profil",          href: "/dashboard/profil",           icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  /**
   * Tentukan apakah item nav aktif.
   * - exact=true  → hanya cocok jika path persis sama
   * - exact=false → cocok jika path dimulai dengan href
   */
  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  const NavContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-brand-800">
        <Logo href="/dashboard" size="sm" showText={false} />
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-sm font-extrabold text-white truncate">Ruang Konsul</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Member Panel</span>
        </div>
      </div>

      {/* Nav */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5"
        aria-label="Menu navigasi dashboard"
      >
        {navItems.map((item, i) => {
          if (item.type === "section") {
            return (
              <p
                key={i}
                className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-300"
              >
                {item.label}
              </p>
            );
          }

          const Icon = item.icon!;
          const active = isActive(item.href!, item.exact);

          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-white text-brand shadow-sm"
                  : "text-white/70 hover:bg-brand-800 hover:text-white"
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    active ? "text-brand" : "text-white/60"
                  )}
                  aria-hidden="true"
                />
                {item.label}
              </span>
              {active && (
                <ChevronRight
                  className="h-3.5 w-3.5 text-brand opacity-60"
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-brand-800 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-red-900/40 hover:text-red-300 transition-all"
          aria-label="Keluar dari akun"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col bg-brand-dark">
        <NavContent />
      </aside>

      {/* Mobile hamburger */}
      <button
        className="fixed top-3.5 left-4 z-40 lg:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-brand-sm"
        onClick={() => setMobileOpen(true)}
        aria-label="Buka menu navigasi"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed left-0 top-0 z-50 h-full w-64 flex flex-col bg-brand-dark lg:hidden shadow-2xl">
            <button
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800 text-white/70 hover:text-white"
              onClick={() => setMobileOpen(false)}
              aria-label="Tutup menu"
            >
              <X className="h-4 w-4" />
            </button>
            <NavContent />
          </aside>
        </>
      )}
    </>
  );
}
