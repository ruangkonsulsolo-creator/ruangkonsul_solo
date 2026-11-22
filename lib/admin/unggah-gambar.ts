"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Unggah gambar ke bucket publik `public-assets` (dibuat migration 040).
 * Policy storage hanya mengizinkan staf menulis, jadi fungsi ini cuma
 * berhasil kalau dipanggil dari panel admin.
 */
export const TIPE_GAMBAR = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const MAKS_GAMBAR = 5 * 1024 * 1024;

export async function unggahGambarPublik(
  file: File,
  folder: string
): Promise<{ url?: string; error?: string }> {
  if (!TIPE_GAMBAR.includes(file.type)) return { error: "Format gambar harus JPG, PNG, WebP, atau AVIF." };
  if (file.size > MAKS_GAMBAR) return { error: `"${file.name}" lebih dari 5 MB.` };
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("public-assets")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    const pesan = /bucket not found/i.test(error.message)
      ? "Tempat penyimpanan gambar belum dibuat. Jalankan migration 040 di Supabase."
      : /row-level security|unauthorized|403/i.test(error.message)
        ? "Akun ini tidak punya izin mengunggah gambar (khusus admin)."
        : error.message;
    return { error: `Gagal mengunggah: ${pesan}` };
  }
  return { url: supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl };
}
