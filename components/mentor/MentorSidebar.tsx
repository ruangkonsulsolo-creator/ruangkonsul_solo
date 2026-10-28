"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import {
  LayoutDashboard, CalendarDays, Users, MessageCircle,
  BookOpen, Star, Settings, LogOut, ChevronRight, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { BRAND } from "@/lib/brand";

const navItems = [
  { label: "Dashboard",       href: "/mentor",          icon: LayoutDashboard, exact: true },
  { type: "section" as const, label: "Bimbingan" },
  { label: "Jadwal Saya",     href: "/mentor/jadwal",   icon: CalendarDays },
  { label: "Daftar Klien",    href: "/mentor/klien",    icon: Users },
  { label: "Materi & Modul",  href: "/mentor/materi",   icon: BookOpen },
  { type: "section" as const, label: "Komunikasi" },
  { label: "Chat",            href: "/mentor/chat",     icon: MessageCircle },
  { label: "Ulasan",          href: "/mentor/ulasan",   icon: Star },
  { type: "section" as const, label: "Akun" },
  { label: "Profil Mentor",   href: "/mentor/profil",   icon: Settings },
];

export function MentorSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  const NavContent = () => (
    <div className="flex h-full flex-col" style={{ background: "#6B0000" }}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <Logo href="/mentor" size="sm" showText={false} />
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-sm font-extrabold text-white truncate">Ruang Konsul</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Mentor Panel</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item, i) => {
          if (item.type === "section") {
            return <p key={i} className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30">{item.label}</p>;
          }
          const Icon = item.icon!;
          const active = isActive(item.href!, item.exact);
          return (
            <Link key={item.href} href={item.href!} onClick={() => setMobileOpen(false)}
              className={cn("flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active ? "bg-white text-[#8B0000] shadow-sm" : "text-white/60 hover:bg-white/10 hover:text-white"
              )} aria-current={active ? "page" : undefined}>
              <span className="flex items-center gap-3">
                <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-[#8B0000]" : "text-white/40")} />
                {item.label}
              </span>
              {active && <ChevronRight className="h-3.5 w-3.5 text-[#8B0000] opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/40 hover:bg-red-900/30 hover:text-red-400 transition-all">
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col" style={{ background: "#6B0000" }}>
        <NavContent />
      </aside>
      <button className="fixed top-3.5 left-4 z-40 lg:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B0000] text-white shadow-brand-sm"
        onClick={() => setMobileOpen(true)} aria-label="Buka menu">
        <Menu className="h-4 w-4" />
      </button>
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 z-50 h-full w-56 flex flex-col lg:hidden shadow-2xl">
            <button className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 hover:text-white" onClick={() => setMobileOpen(false)}>
              <X className="h-4 w-4" />
            </button>
            <NavContent />
          </aside>
        </>
      )}
    </>
  );
}
