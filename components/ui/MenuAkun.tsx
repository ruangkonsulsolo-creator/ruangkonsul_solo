"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, MessageCircle, Clock, PackageOpen, User,
  LogOut, Loader2, Wallet, ShieldCheck, GraduationCap, ChevronDown,
  Bell, CalendarDays, ShoppingBag, Receipt, Users, Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils/format-currency";

/**
 * Menu akun di navbar halaman publik.
 *
 * Panel member tidak lagi jadi dunia terpisah yang harus dimasuki. Setelah
 * masuk, pengguna tetap menjelajah situs seperti biasa, dan semua yang
 * dulunya ada di sidebar dasbor kini terjangkau dari ikon profil di mana
 * pun dia berada.
 *
 * Alasannya sederhana: halaman jualan dan halaman member bukan dua produk
 * berbeda. Memaksa orang keluar dari katalog untuk memeriksa saldonya, lalu
 * kembali lagi untuk memesan, memutus alur yang seharusnya satu tarikan.
 *
 * Sesi diperiksa di peramban supaya halaman publiknya tetap statis — yang
 * dinamis hanya menu ini.
 */

type Profil = {
  nama: string;
  peran: string;
  saldo: number;
};

const MENU_MEMBER = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Chat Mentor", href: "/dashboard/chat", icon: MessageCircle },
  { label: "Riwayat Pesanan", href: "/dashboard/riwayat-pesanan", icon: Clock },
  { label: "Notifikasi", href: "/dashboard/notifikasi", icon: Bell },
  { label: "Sesi Saya", href: "/dashboard/sesi-saya", icon: CalendarDays },
  { label: "Isi Saldo", href: "/dashboard/isi-saldo", icon: Wallet },
  { label: "Pesanan Produk", href: "/dashboard/pesanan-produk", icon: ShoppingBag },
  { label: "Receipt", href: "/dashboard/receipt", icon: Receipt },
  { label: "Paket Saya", href: "/dashboard/paket-saya", icon: PackageOpen },
  { label: "Profil", href: "/dashboard/profil", icon: User },
];

// Halaman /dashboard khusus customer; mentor & staf punya panel sendiri.
const MENU_MENTOR = [
  { label: "Jadwal Saya", href: "/mentor/jadwal", icon: CalendarDays },
  { label: "Sesi & Klien", href: "/mentor/klien", icon: Users },
  { label: "Chat", href: "/mentor/chat", icon: MessageCircle },
  { label: "Notifikasi", href: "/mentor/notifikasi", icon: Bell },
  { label: "Profil Mentor", href: "/mentor/profil", icon: Settings },
];

const MENU_STAF = [
  { label: "Notifikasi", href: "/admin/notifikasi", icon: Bell },
];

function inisial(nama: string): string {
  const bagian = nama.trim().split(/\s+/).filter(Boolean);
  if (bagian.length === 0) return "?";
  return (bagian[0][0] + (bagian[1]?.[0] ?? "")).toUpperCase();
}

export function MenuAkun() {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [buka, setBuka] = useState(false);
  const [keluar, setKeluar] = useState(false);
  const wadah = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let batal = false;

    /**
     * Apa pun yang terjadi, pemuatan harus berakhir.
     *
     * Versi sebelumnya tidak punya try/catch dan tidak punya batas waktu:
     * satu panggilan yang menggantung atau menolak membuat setMemuat(false)
     * tidak pernah dijalankan, dan ikon profil berputar selamanya. Lebih
     * baik jatuh ke tampilan "belum masuk" — pengguna masih bisa mengklik
     * Login — daripada memutar tanpa akhir tanpa memberi tahu apa pun.
     */
    async function muat() {
      const batasWaktu = new Promise<never>((_, tolak) =>
        setTimeout(() => tolak(new Error("Supabase tidak menjawab")), 8000)
      );

      try {
        const { data: { user } } = await Promise.race([
          supabase.auth.getUser(),
          batasWaktu,
        ]);
        if (batal) return;
        if (!user) {
          setProfil(null);
          return;
        }

        const { data } = await Promise.race([
          supabase
            .from("profiles")
            .select("full_name, role, credit_balance")
            .eq("id", user.id)
            .maybeSingle(),
          batasWaktu,
        ]);
        if (batal) return;

        setProfil({
          nama: data?.full_name?.trim() || user.email?.split("@")[0] || "Akun",
          peran: data?.role ?? "user",
          saldo: data?.credit_balance ?? 0,
        });
      } catch (e) {
        console.error("[menu-akun] gagal memuat sesi:", e);
        if (!batal) setProfil(null);
      } finally {
        if (!batal) setMemuat(false);
      }
    }

    void muat();

    const { data: langganan } = supabase.auth.onAuthStateChange(() => {
      void muat();
    });
    return () => {
      batal = true;
      langganan.subscription.unsubscribe();
    };
  }, []);

  // Menu ditutup saat klik di luar atau tekan Escape. Tanpa ini, menu
  // menggantung terbuka dan menutupi isi halaman di belakangnya.
  useEffect(() => {
    if (!buka) return;
    function klikLuar(e: MouseEvent) {
      if (wadah.current && !wadah.current.contains(e.target as Node)) setBuka(false);
    }
    function tekanEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setBuka(false);
    }
    document.addEventListener("mousedown", klikLuar);
    document.addEventListener("keydown", tekanEsc);
    return () => {
      document.removeEventListener("mousedown", klikLuar);
      document.removeEventListener("keydown", tekanEsc);
    };
  }, [buka]);

  async function logout() {
    setKeluar(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setBuka(false);
    // refresh() membuang cache router, supaya halaman yang sudah dirender
    // dengan sesi lama tidak tertinggal di layar.
    router.refresh();
    router.push("/");
  }

  if (memuat) {
    return (
      <span className="flex h-9 w-9 items-center justify-center" aria-label="Memeriksa sesi">
        <Loader2 className="h-4 w-4 animate-spin text-slate-300" aria-hidden="true" />
      </span>
    );
  }

  if (!profil) {
    return (
      <>
        <Link
          href="/daftar"
          className="inline-flex h-8 items-center rounded-lg border border-brand px-3 text-sm font-bold text-brand transition-colors hover:bg-brand-50"
        >
          Daftar
        </Link>
        <Link
          href="/login"
          className="inline-flex h-8 items-center rounded-lg bg-brand px-3 text-sm font-bold text-white transition-colors hover:bg-brand-light"
        >
          Login
        </Link>
      </>
    );
  }

  const staf = ["admin", "superadmin"].includes(profil.peran);

  return (
    <div ref={wadah} className="relative">
      <button
        type="button"
        onClick={() => setBuka((b) => !b)}
        aria-expanded={buka}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-xl border border-slate-200 py-1 pl-1 pr-2 transition-colors hover:border-brand"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-white">
          {inisial(profil.nama)}
        </span>
        <span className="hidden max-w-28 truncate text-sm font-semibold text-slate-700 sm:block">
          {profil.nama.split(" ")[0]}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${buka ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {buka && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card-hover"
        >
          <div className="border-b border-slate-100 bg-brand-50 p-4">
            <p className="truncate font-bold text-slate-900">{profil.nama}</p>
            <p className="mt-0.5 text-xs capitalize text-slate-500">
              {profil.peran === "user" ? "Member" : profil.peran}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-sm">
              <Wallet className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              <span className="text-slate-500">Saldo</span>
              <span className="font-extrabold text-brand">
                {formatRupiah(profil.saldo)}
              </span>
            </p>
          </div>

          <ul className="py-1.5">
            {staf && (
              <li>
                <Link
                  href="/admin"
                  role="menuitem"
                  onClick={() => setBuka(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-50"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Panel Admin
                </Link>
              </li>
            )}
            {(profil.peran === "mentor" || staf) && (
              <li>
                <Link
                  href="/mentor"
                  role="menuitem"
                  onClick={() => setBuka(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-50"
                >
                  <GraduationCap className="h-4 w-4" aria-hidden="true" />
                  Panel Mentor
                </Link>
              </li>
            )}

            {(staf ? MENU_STAF : profil.peran === "mentor" ? MENU_MENTOR : MENU_MEMBER).map((m) => (
              <li key={m.href}>
                <Link
                  href={m.href}
                  role="menuitem"
                  onClick={() => setBuka(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-brand"
                >
                  <m.icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  {m.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="border-t border-slate-100 p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => void logout()}
              disabled={keluar}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {keluar ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <LogOut className="h-4 w-4" aria-hidden="true" />
              )}
              Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
