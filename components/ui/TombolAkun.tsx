"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Tombol akun di navbar halaman publik.
 *
 * Masalah yang diperbaikinya: halaman publik menulis tombol "Daftar" dan
 * "Login" secara mati, tanpa pernah memeriksa sesi. Pengguna yang sudah
 * masuk lalu membuka Bimbingan atau Layanan dari dasbor melihat kedua
 * tombol itu dan menyimpulkan dirinya ter-logout — padahal sesinya masih
 * hidup. Tidak ada yang rusak, tapi orangnya tidak punya cara tahu itu.
 *
 * Pemeriksaan sesi dilakukan di peramban, bukan di server, supaya halaman
 * publiknya tetap statis. Halaman statis jauh lebih cepat dibuka dan lebih
 * ramah mesin pencari — dan untuk halaman jualan, keduanya penting. Yang
 * dibuat dinamis hanya tombol ini.
 *
 * Selama sesi masih diperiksa, yang tampil ruang kosong seukuran tombol,
 * bukan "Login". Menampilkan "Login" lebih dulu lalu menggantinya dengan
 * "Dashboard" membuat navbar berkedip dan sempat membuat pengguna yang
 * sudah masuk mengira dirinya keluar — persis masalah yang ingin dihindari.
 */
export function TombolAkun() {
  const [masuk, setMasuk] = useState<boolean | null>(null);
  const [tujuan, setTujuan] = useState("/dashboard");

  useEffect(() => {
    const supabase = createClient();
    let batal = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (batal) return;

      if (!user) {
        setMasuk(false);
        return;
      }

      // Tiap peran punya beranda panelnya sendiri. Mengirim mentor ke
      // /dashboard membuatnya memantul ke panel mentor, dan pantulan itu
      // terlihat sebagai kedipan.
      const { data: profil } = await supabase
        .from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (batal) return;

      const peran = profil?.role ?? "user";
      setTujuan(
        peran === "admin" || peran === "superadmin" ? "/admin"
        : peran === "mentor" ? "/mentor"
        : "/dashboard"
      );
      setMasuk(true);
    })();

    // Navbar ikut berubah saat pengguna masuk atau keluar di tab lain.
    const { data: langganan } = supabase.auth.onAuthStateChange((_e, sesi) => {
      if (!batal) setMasuk(Boolean(sesi?.user));
    });

    return () => {
      batal = true;
      langganan.subscription.unsubscribe();
    };
  }, []);

  if (masuk === null) {
    return (
      <span
        className="flex h-8 w-24 items-center justify-center"
        aria-label="Memeriksa sesi"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" aria-hidden="true" />
      </span>
    );
  }

  if (masuk) {
    return (
      <Link
        href={tujuan}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-bold text-white transition-colors hover:bg-brand-light"
      >
        <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
        Dashboard
      </Link>
    );
  }

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
