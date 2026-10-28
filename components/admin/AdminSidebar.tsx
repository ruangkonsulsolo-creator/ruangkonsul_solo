"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import {
  LayoutDashboard, ClipboardList, Users,
  BarChart3, Settings, Package, LogOut, ChevronRight,
  GraduationCap, FileText, ShieldCheck, Phone,
} from "lucide-react";

const navItems = [
  { label: "Dashboard",       href: "/admin",              icon: LayoutDashboard, exact: true },
  { label: "Pesanan",         href: "/admin/pesanan",      icon: ClipboardList },
  { label: "Booking Leads",   href: "/admin/booking-leads",icon: Phone },
  { label: "Users",           href: "/admin/users",        icon: Users },
  { label: "Laporan",         href: "/admin/laporan",      icon: BarChart3 },
  { type: "section" as const, label: "Konten" },
  { label: "Kelas Bimbingan", href: "/admin/bimbingan",    icon: GraduationCap },
  { label: "Blog",            href: "/admin/blog",         icon: FileText },
  { type: "section" as const, label: "Konfigurasi" },
  { label: "Layanan & Harga", href: "/admin/layanan",      icon: Settings },
  { label: "Paket Hemat",     href: "/admin/paket",        icon: Package },
  { label: "⚡ Superadmin",   href: "/admin/superadmin",   icon: ShieldCheck },
];

export function AdminSidebar() {
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
        {navItems.map((item, i) => {
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
