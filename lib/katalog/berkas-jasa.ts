import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Berkas pada pesanan jasa.
 * - Naskah customer: bucket "documents", folder <user id>/jasa/<nama>.
 * - File hasil dari admin: bucket "hasil-jasa", folder <pesanan id>/<nama>.
 */
export type BerkasJasa = { path: string; nama: string; ukuran: number };

export const MAKS_NASKAH = 3;
export const MAKS_HASIL = 5;
export const BATAS_BYTE = 50 * 1024 * 1024;

export const skemaBerkas = z.object({
  path: z.string().min(3).max(400),
  nama: z.string().trim().min(1).max(200),
  ukuran: z.number().int().min(1).max(BATAS_BYTE),
});

export function bacaBerkas(v: unknown): BerkasJasa[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (b): b is BerkasJasa =>
      !!b && typeof b === "object" && typeof (b as BerkasJasa).path === "string" && typeof (b as BerkasJasa).nama === "string"
  );
}

/** Nama berkas aman untuk path storage. */
export function namaAman(nama: string): string {
  const titik = nama.lastIndexOf(".");
  const dasar = (titik > 0 ? nama.slice(0, titik) : nama).normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 60) || "berkas";
  const ext = titik > 0 ? nama.slice(titik + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "";
  return ext ? `${dasar}.${ext}` : dasar;
}

/**
 * Pastikan setiap naskah memang milik user (folder <uid>/jasa/) dan benar
 * ada di storage. Mengembalikan pesan galat atau null.
 */
export async function periksaNaskah(
  admin: SupabaseClient,
  userId: string,
  berkas: BerkasJasa[]
): Promise<string | null> {
  if (berkas.length > MAKS_NASKAH) return `Maksimal ${MAKS_NASKAH} naskah.`;
  for (const b of berkas) {
    const bagian = b.path.split("/");
    if (bagian.length !== 3 || bagian[0] !== userId || bagian[1] !== "jasa" || !bagian[2] || bagian.some((x) => x === ".." || x === "")) {
      return "Lokasi naskah tidak valid.";
    }
    const { data } = await admin.storage.from("documents").list(`${userId}/jasa`, { search: bagian[2], limit: 5 });
    if (!Array.isArray(data) || !data.some((o) => o.name === bagian[2])) return `Naskah "${b.nama}" belum terunggah.`;
  }
  return null;
}
