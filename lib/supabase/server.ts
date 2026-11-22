import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sembunyikanTamu } from "@/lib/supabase/tamu";

/**
 * Klien Supabase untuk server.
 *
 * Sesi tamu (anonymous sign-in, dipakai agar Cek AI/Plagiasi/DrillBit/
 * Parafrase bisa tanpa daftar) DISEMBUNYIKAN secara bawaan: getUser()
 * mengembalikan null untuk tamu, jadi dashboard, booking, pembelian produk,
 * dll. tetap memperlakukan tamu sebagai belum login. Hanya rute pemeriksa
 * yang memanggil createClient({ tamu: true }).
 */
// Types akan di-generate setelah `supabase gen types typescript` dijalankan.
export function createClient(opsi: { tamu?: boolean } = {}) {
  const cookieStore = cookies();

  const klien = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Dipanggil dari Server Component — tidak bisa set cookie
          }
        },
      },
    }
  );
  return opsi.tamu ? klien : sembunyikanTamu(klien);
}
