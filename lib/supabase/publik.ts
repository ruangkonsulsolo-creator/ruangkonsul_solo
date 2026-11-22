import "server-only";
import { createClient as buatKlien } from "@supabase/supabase-js";

/**
 * Klien Supabase anonim TANPA cookie, untuk data publik (artikel blog yang
 * sudah terbit). Karena tidak membaca cookie, halaman yang memakainya bisa
 * di-cache statis dan diperbarui berkala (ISR) — tidak dirender ulang per
 * pengunjung. RLS tetap berlaku: hanya baris yang boleh dibaca publik.
 */
export function createPublicClient() {
  return buatKlien(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
