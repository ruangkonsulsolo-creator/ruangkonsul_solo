/** Bentuk data katalog, dipakai bersama oleh halaman publik dan panel admin. */

export type Spesifikasi = { label: string; nilai: string };

export type Etalase = {
  id: string;
  slug: string;
  nama: string;
  deskripsi: string | null;
  ikon: string | null;
  urutan: number;
  is_active: boolean;
};

export type Kategori = {
  id: string;
  etalase_id: string;
  slug: string;
  nama: string;
  urutan: number;
  is_active: boolean;
};

export type Produk = {
  id: string;
  etalase_id: string;
  kategori_id: string | null;
  slug: string;
  nama: string;
  subjudul: string | null;
  deskripsi: string | null;
  spesifikasi: Spesifikasi[];
  fitur: string[];
  harga: number;
  harga_coret: number | null;
  harga_mulai: boolean;
  satuan: string | null;
  gambar: string[];
  berat_gram: number | null;
  stok: number | null;
  badge: string | null;
  catatan: string | null;
  wa_pesan: string | null;
  is_active: boolean;
  urutan: number;
  /** Jasa yang hasilnya file (migration 048). false bila kolom belum ada. */
  jasa_berkas: boolean;
  /** Mis. "1x24 jam". null → bawaan ESTIMASI_BAWAAN. */
  estimasi_proses: string | null;
};

export const ESTIMASI_BAWAAN = "1x24 jam";

/**
 * Sengaja "*": kolom jasa_berkas/estimasi_proses baru ada setelah migration
 * 048. Memilih kolom itu secara eksplisit akan membuat seluruh katalog gagal
 * dibaca sebelum migrasinya dijalankan; dengan "*" kolom yang belum ada
 * cukup bernilai bawaan di rapikanProduk().
 */
export const KOLOM_PRODUK = "*";

/** Lengkapi field yang mungkin belum ada di basis data lama. */
export function lengkapiProduk<T extends Record<string, unknown>>(b: T) {
  return {
    ...b,
    jasa_berkas: b.jasa_berkas === true,
    estimasi_proses: typeof b.estimasi_proses === "string" && b.estimasi_proses ? b.estimasi_proses : null,
  };
}

export const KOLOM_ETALASE =
  "id, slug, nama, deskripsi, ikon, urutan, is_active";

export const KOLOM_KATEGORI =
  "id, etalase_id, slug, nama, urutan, is_active";

/** Slug etalase yang punya halaman sendiri di situs. */
export const ETALASE = {
  merchandise: "merchandise",
  bimbinganOnline: "bimbingan-online",
  bimbinganBulanan: "bimbingan-bulanan",
  layananUtama: "layanan-utama",
  paketHemat: "paket-hemat",
} as const;

/**
 * Harga dalam rupiah, dengan "mulai dari" bila harganya belum pasti.
 *
 * Buket snack harganya mengikuti jenis snack yang dipilih, jadi menampilkan
 * satu angka bulat tanpa keterangan akan terbaca sebagai harga final dan
 * menimbulkan keluhan saat ditagih lebih.
 */
export function labelHarga(p: Pick<Produk, "harga" | "harga_mulai" | "satuan">): {
  awalan: string | null;
  akhiran: string | null;
} {
  return {
    awalan: p.harga_mulai ? "mulai dari" : null,
    akhiran: p.satuan,
  };
}

/** Mengubah nama produk jadi slug: "Buket Uang \"Lulus\"" -> buket-uang-lulus */
export function keSlug(teks: string): string {
  return teks
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110);
}
