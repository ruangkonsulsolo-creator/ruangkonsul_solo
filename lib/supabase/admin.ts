import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client dengan SERVICE ROLE key — melewati RLS.
 *
 * HANYA dipakai di server (route handler / server action) untuk operasi yang
 * memang tidak boleh dilakukan langsung oleh user, misalnya:
 *   - webhook Midtrans (tidak ada sesi login)
 *   - membuat pesanan / pembayaran (harga ditentukan server, bukan client)
 *   - memberi kuota, kredit referral, notifikasi lintas user
 *
 * Selalu lakukan pengecekan auth & role SEBELUM memakai client ini.
 */
let cached: SupabaseClient<any> | null = null;

export function createAdminClient(): SupabaseClient<any> {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL belum di-set. " +
        "Tambahkan di .env.local (lihat .env.example)."
    );
  }

  cached = createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
