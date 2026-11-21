import type { SupabaseClient } from "@supabase/supabase-js";

export interface StatusProfil {
  role: string;
  is_active: boolean | null;
  /** false = daftar via Google dan belum mengisi password/WhatsApp */
  registrasi_selesai: boolean;
}

/**
 * Baca role + status pendaftaran. Toleran bila migration 038 belum dijalankan
 * (kolom registrasi_selesai belum ada): dianggap selesai, supaya akun lama
 * tidak terkunci keluar.
 */
export async function ambilStatusProfil(supabase: SupabaseClient<any, any, any>, userId: string): Promise<StatusProfil | null> {
  const lengkap = await supabase
    .from("profiles")
    .select("role, is_active, registrasi_selesai")
    .eq("id", userId)
    .maybeSingle();

  if (!lengkap.error) {
    if (!lengkap.data) return null;
    return {
      role: lengkap.data.role ?? "user",
      is_active: lengkap.data.is_active,
      registrasi_selesai: lengkap.data.registrasi_selesai !== false,
    };
  }

  const dasar = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();
  if (dasar.error || !dasar.data) return null;
  return { role: dasar.data.role ?? "user", is_active: dasar.data.is_active, registrasi_selesai: true };
}

export const HALAMAN_LENGKAPI = "/lengkapi-profil";
