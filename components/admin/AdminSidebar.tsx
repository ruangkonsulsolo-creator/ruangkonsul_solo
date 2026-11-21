"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import {
  KeyRound, Bell,
  LayoutDashboard, ClipboardList, Users,
  BarChart3, Settings, Package, LogOut, ChevronRight,
  GraduationCap, FileText, ShieldCheck, Phone, ShoppingBag, Store, Quote, CalendarDays } from "lucide-react";

const navItems = [
  { label: "Dashboard",       href: "/admin",              icon: LayoutDashboard, exact: true },
  { label: "Pesanan",         href: "/admin/pesanan",      icon: ClipboardList },
  { label: "Pesanan Produk",  href: "/admin/pesanan-produk", icon: ShoppingBag },
  { label: "Sesi Bimbingan",  href: "/admin/sesi",         icon: CalendarDays },
  { label: "Notifikasi",      href: "/admin/notifikasi",   icon: Bell },
  { label: "Booking Leads",   href: "/admin/booking-leads",icon: Phone },
  { label: "Users",           href: "/admin/users",        icon: Users },
  { label: "Kinerja Mentor",  href: "/admin/mentor",       icon: GraduationCap },
  { label: "Kode Mentor",     href: "/admin/kode-mentor",  icon: KeyRound },
  { label: "Laporan",         href: "/admin/laporan",      icon: BarChart3 },
  // Semua yang dijual — merchandise, bimbingan, layanan utama, paket hemat —
  // dikelola di satu tempat: Katalog Produk. Entri "Kelas Bimbingan" dan
  // pengelolaan produk di "Merchandise" sudah dihapus dari sini karena
  // keduanya membaca tabel yang sudah dipensiunkan dan selalu menampilkan
  // nol. Dua pintu ke barang yang sama, satu di antaranya kosong, adalah
  // cara tercepat membuat orang mengira datanya hilang.
  { type: "section" as const, label: "Katalog" },
  { label: "Katalog Produk",   href: "/admin/katalog",     icon: Store },
  { label: "Penjualan Merch",  href: "/admin/merchandise", icon: ShoppingBag },
  { type: "section" as const, label: "Konten" },
  { label: "Blog",             href: "/admin/blog",        icon: FileText },
  { label: "Testimoni",        href: "/admin/testimoni",   icon: Quote },
  // Dua entri di bawah bukan bagian katalog: keduanya mengatur fitur periksa
  // naskah (tabel services dan quota_packages), yang masih dipakai alur
  // pesanan di /api/order. Namanya diperjelas supaya tidak tertukar dengan
  // etalase "Layanan Utama" dan "Paket Hemat" di katalog.
  { type: "section" as const, label: "Periksa Naskah" },
  { label: "Tarif Pemeriksaan", href: "/admin/layanan",    icon: Settings },
  { label: "Paket Isi Saldo",   href: "/admin/paket",      icon: Package },
  { type: "section" as const, label: "Konfigurasi" },
  { label: "Superadmin",       href: "/admin/superadmin",  icon: ShieldCheck },
];

export function AdminSidebar({ role = "admin" }: { role?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col" style={{ background: "#6B0000" }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <Logo href="/admin" size="sm" showText={false} />
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-sm font-extrabold text-white truncate">Ruang Konsul</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Admin Panel</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5" aria-label="Admin navigation">
        {navItems.filter((item) => item.href !== "/admin/superadmin" || role === "superadmin").map((item, i) => {
          if (item.type === "section") {
            return (
              <p key={i} className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">
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
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-white text-[#8B0000] shadow-sm font-semibold"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className="flex items-center gap-3">
                <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-[#8B0000]" : "text-white/40")} aria-hidden="true" />
                {item.label}
              </span>
              {active && <ChevronRight className="h-3.5 w-3.5 text-[#8B0000] opacity-60" aria-hidden="true" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/40 hover:bg-red-900/30 hover:text-red-400 transition-all"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
