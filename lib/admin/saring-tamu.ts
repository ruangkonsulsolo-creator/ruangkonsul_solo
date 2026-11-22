import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Jumlah pengguna (role user) tanpa sesi tamu. Sebelum migration 049 kolom
 * is_tamu belum ada → hitung tanpa saringan.
 */
export async function hitungPengguna(supabase: SupabaseClient<any, any, any>): Promise<number> {
  const r = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "user").eq("is_tamu", false);
  if (!r.error) return r.count ?? 0;
  const lama = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "user");
  return lama.count ?? 0;
}
