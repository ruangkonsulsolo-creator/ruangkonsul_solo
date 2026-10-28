import { createBrowserClient } from "@supabase/ssr";

// Types akan di-generate setelah `supabase gen types typescript` dijalankan.
// Sampai itu, gunakan `any` agar tidak blocking compile.
export function createClient() {
  return createBrowserClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
