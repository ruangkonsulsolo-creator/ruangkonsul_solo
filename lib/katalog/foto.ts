import fs from "node:fs";
import path from "node:path";

/**
 * Foto produk yang diambil dari folder, bukan dari basis data.
 *
 * ── CARA MENGISI ──────────────────────────────────────────────────────────
 *
 * Taruh foto di  /public/produk/<slug>/  — selesai.
 *
 *   contoh:  /public/produk/buket-glitter-lulus-berkilau/1.jpg
 *            /public/produk/buket-glitter-lulus-berkilau/2.jpg
 *
 * <slug> harus sama persis dengan slug produk di panel katalog.
 *
 *   Ukuran yang pas:  1000 × 1000 piksel (persegi)
 *   Format:           .jpg, .jpeg, .png, .webp, atau .avif
 *   Ukuran berkas:    usahakan di bawah 200 KB per foto
 *
 * Urutannya mengikuti nama berkas, jadi foto utama sebaiknya dinamai 1.
 *
 * Cara ini pelengkap, bukan pengganti. Kolom "Foto" di panel admin selalu
 * menang kalau diisi — supaya admin yang tidak punya akses ke kode tetap
 * bisa memasang foto, dan yang punya akses tetap bisa menaruhnya lewat
 * folder tanpa membuka panel.
 */

const AKAR = [
  path.join(process.cwd(), "public", "produk"),
  // Folder lama dari sebelum katalog disatukan. Dipertahankan supaya foto
  // yang sudah terlanjur ditaruh di sana tidak mendadak hilang.
  path.join(process.cwd(), "public", "merchandise"),
];

const EKSTENSI = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

/** Foto satu produk, urut berdasarkan nama berkas. Kosong kalau belum ada. */
export function fotoDariFolder(slug: string): string[] {
  // Jaga-jaga terhadap slug yang mengandung ".." atau garis miring: tanpa ini
  // slug karangan bisa dipakai membaca folder di luar /public.
  if (!/^[a-z0-9-]+$/.test(slug)) return [];

  for (const akar of AKAR) {
    try {
      const berkas = fs
        .readdirSync(path.join(akar, slug))
        .filter((nama) => EKSTENSI.has(path.extname(nama).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, "id", { numeric: true }));

      if (berkas.length > 0) {
        const publik = path.basename(akar);
        return berkas.map((nama) => `/${publik}/${slug}/${nama}`);
      }
    } catch {
      // Foldernya belum ada — lanjut ke akar berikutnya.
    }
  }
  return [];
}
