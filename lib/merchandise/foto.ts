import fs from "node:fs";
import path from "node:path";

/**
 * Foto produk dipindai dari folder, bukan didaftarkan di katalog.
 *
 * ── CARA MENGISI ──────────────────────────────────────────────────────────
 *
 * Taruh foto di  /public/merchandise/<slug>/  — selesai.
 *
 *   contoh:  /public/merchandise/tumbler-ruang-konsul-solo/1.jpg
 *            /public/merchandise/tumbler-ruang-konsul-solo/2.jpg
 *
 * <slug> harus sama persis dengan `slug` produk di katalog.ts.
 *
 *   Ukuran yang pas:  1000 × 1000 piksel (persegi, seperti Shopee)
 *   Format:           .jpg, .jpeg, .png, .webp, atau .avif
 *   Ukuran berkas:    usahakan di bawah 200 KB per foto
 *
 * Urutannya mengikuti nama berkas, jadi foto utama sebaiknya dinamai 1.
 * Berkas non-gambar diabaikan.
 *
 * CATATAN: pemindaian terjadi saat build. Setelah menambah foto, jalankan
 * ulang `npm run dev` atau `npm run build` supaya terbaca.
 */

const AKAR = path.join(process.cwd(), "public", "merchandise");
const EKSTENSI = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

/** Foto satu produk, urut berdasarkan nama berkas. Kosong kalau belum ada. */
export function fotoProduk(slug: string): string[] {
  // Jaga-jaga terhadap slug yang mengandung ".." atau garis miring: tanpa ini
  // slug karangan bisa dipakai membaca folder di luar /public/merchandise.
  if (!/^[a-z0-9-]+$/.test(slug)) return [];

  try {
    return fs
      .readdirSync(path.join(AKAR, slug))
      .filter((nama) => EKSTENSI.has(path.extname(nama).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "id", { numeric: true }))
      .map((nama) => `/merchandise/${slug}/${nama}`);
  } catch {
    // Folder belum dibuat — bukan galat, cukup anggap belum ada fotonya.
    return [];
  }
}

/** Foto pertama satu produk, untuk kartu di daftar. */
export function fotoUtama(slug: string): string | null {
  return fotoProduk(slug)[0] ?? null;
}
