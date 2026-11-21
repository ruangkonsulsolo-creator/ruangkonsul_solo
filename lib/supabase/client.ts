import { createBrowserClient } from "@supabase/ssr";

/**
 * Klien Supabase untuk peramban — satu saja, dipakai bersama.
 *
 * Sebelumnya fungsi ini membuat klien baru setiap kali dipanggil. Selama
 * hanya satu komponen yang memanggilnya per halaman, itu tidak terasa.
 * Begitu ada dua — MenuAkun di navbar dan notifikasi testimoni — dua klien
 * auth hidup berdampingan di satu tab, berebut kunci yang sama lewat Web
 * Locks API untuk menyegarkan token. Yang terjadi: getUser() menggantung
 * dan tidak pernah selesai, dan ikon profil berputar selamanya.
 *
 * Satu instance menghapus perebutan itu. Ini juga anjuran resmi Supabase;
 * pustakanya sendiri memperingatkan "Multiple GoTrueClient instances
 * detected in the same browser context" di konsol.
 *
 * Catatan penting: yang disimpan hanya instance di peramban. Komponen
 * "use client" juga dirender sekali di server, dan menyimpan instance di
 * sana berarti satu variabel modul dipakai bersama oleh semua permintaan
 * yang masuk — sesi satu pengguna bisa terbawa ke pengguna lain. Jadi di
 * server selalu dibuat yang baru.
 */

type Klien = ReturnType<typeof createBrowserClient<any>>;

let klienPeramban: Klien | undefined;

function buat(): Klien {
  return createBrowserClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function createClient(): Klien {
  if (typeof window === "undefined") return buat();
  if (!klienPeramban) klienPeramban = buat();
  return klienPeramban;
}
