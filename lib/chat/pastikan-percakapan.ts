import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Buka (atau pakai ulang) percakapan customer ↔ mentor. Dipanggil setelah
 * sesi bimbingan lunas supaya mentor langsung muncul di Chat Mentor tanpa
 * customer harus membuka halaman profil mentor dulu.
 * Aman dipanggil berulang: UNIQUE (mentor_id, customer_id).
 */
export async function pastikanPercakapan(db: SupabaseClient<any, any, any>, mentorId: string, customerId: string) {
  const { error } = await db
    .from("percakapan")
    .upsert({ mentor_id: mentorId, customer_id: customerId }, { onConflict: "mentor_id,customer_id", ignoreDuplicates: true });
  if (error) console.warn("[chat] gagal membuka percakapan otomatis:", error.message);
}
