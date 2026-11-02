/**
 * Pemeriksaan naskah: cek kemiripan, indikasi gaya AI, dan parafrase.
 *
 * Catatan penting soal penamaan: hasil di sini BUKAN laporan Turnitin.
 * Turnitin tidak menjual akses API untuk layanan pihak ketiga, dan
 * memakai namanya untuk hasil dari penyedia lain menyesatkan pembeli
 * sekaligus menyentuh merek dagang orang. Di seluruh kode dan antarmuka,
 * sebut apa adanya: "cek kemiripan" dan "indikasi gaya AI".
 *
 * Tidak ada "humanizer" di sini, dan itu disengaja. Alat semacam itu
 * gunanya satu: membuat tulisan mesin lolos dari pendeteksi AI kampus.
 * Menjualnya kepada mahasiswa yang sedang menyusun skripsi berarti
 * menjual alat bantu kecurangan akademik — bertentangan dengan janji
 * layanan ini sendiri ("kamu tetap penulis karyamu") dan dengan UU No. 20
 * Tahun 2003 Pasal 25 ayat (2) dan Pasal 70, yang mengancam pidana
 * perolehan gelar lewat kecurangan. Parafrase berbeda: menyusun ulang
 * kalimat sumber dengan bahasa sendiri lalu tetap menyitasinya adalah
 * keterampilan akademik yang memang diajarkan.
 */

export type JenisPeriksa = "kemiripan" | "ai" | "parafrase";

/** Tarif per 1.000 kata, dalam rupiah. */
export const TARIF: Record<JenisPeriksa, number> = {
  kemiripan: 500,
  ai: 1000,
  parafrase: 1000,
};

/** Di bawah ini teks terlalu pendek untuk memberi hasil yang berarti. */
export const MIN_KATA = 150;

/** Batas atas sekali kirim, supaya biaya dan waktu proses terkendali. */
export const MAKS_KATA = 20_000;

/** Pembulatan tagihan ke atas per 1.000 kata, minimal satu satuan. */
export function hitungBiaya(jumlahKata: number, jenis: JenisPeriksa): number {
  const satuan = Math.max(1, Math.ceil(jumlahKata / 1000));
  return satuan * TARIF[jenis];
}

export function hitungKata(teks: string): number {
  const bersih = teks.trim();
  if (!bersih) return 0;
  return bersih.split(/\s+/).length;
}

// ─── Hasil ───────────────────────────────────────────────────────────────────

export type SumberMirip = {
  judul: string;
  url: string | null;
  /** Persentase bagian naskah yang cocok dengan sumber ini. */
  persen: number;
  /** Kutipan yang cocok, untuk ditunjukkan ke pengguna. */
  cuplikan: string;
};

export type HasilKemiripan = {
  /** 0–100. Persentase teks yang punya padanan di sumber lain. */
  persen: number;
  sumber: SumberMirip[];
  /**
   * Bagian yang mirip TAPI sudah bersitasi. Ini penting: kutipan yang
   * dikutip dengan benar tetap terhitung mirip, dan mahasiswa sering
   * panik melihat angka totalnya tanpa tahu sebagian besar sah.
   */
  persenBersitasi: number;
};

export type HasilAI = {
  /**
   * 0–100, indikasi saja.
   *
   * Angka ini TIDAK boleh disajikan sebagai vonis. Detektor AI punya
   * tingkat salah-tuduh yang nyata, terutama pada penulis yang bahasa
   * Inggrisnya bukan bahasa pertama dan pada tulisan akademik yang
   * memang bergaya formal dan berpola. Selalu tampilkan bersama
   * `peringatan` di bawah.
   */
  skor: number;
  /** Kalimat-kalimat yang paling memicu skor, untuk ditinjau manusia. */
  bagianDitandai: { teks: string; skor: number }[];
  peringatan: string;
};

export type HasilParafrase = {
  /** Naskah yang sudah disusun ulang. */
  teks: string;
  /** Hal yang tetap jadi tanggung jawab penulis setelah parafrase. */
  catatan: string[];
};

export type HasilPeriksa = {
  id: string;
  jumlahKata: number;
  jenis: JenisPeriksa;
  biaya: number;
  kemiripan?: HasilKemiripan;
  ai?: HasilAI;
  parafrase?: HasilParafrase;
  /** Saran perbaikan konkret, inti dari produk ini. */
  saran: string[];
  diperiksaPada: string;
  penyedia: string;
};

export const PERINGATAN_AI =
  "Angka ini indikasi, bukan bukti. Alat pendeteksi AI kerap salah menandai " +
  "tulisan asli — terutama tulisan akademik yang gaya bahasanya memang formal " +
  "dan berpola, serta tulisan penulis yang bahasa Inggrisnya bukan bahasa " +
  "pertama. Pakai hasil ini untuk meninjau ulang bagian yang ditandai, bukan " +
  "untuk menyimpulkan tulisanmu bermasalah. Kalau kamu menulisnya sendiri, " +
  "skor tinggi tidak mengubah fakta itu.";

export const CATATAN_PARAFRASE = [
  "Parafrase tidak menghapus kewajiban menyitasi. Gagasan yang kamu susun " +
    "ulang tetap milik penulis aslinya, dan menyajikannya tanpa sitasi tetap " +
    "terhitung plagiarisme meski kalimatnya sudah berbeda.",
  "Baca ulang hasilnya sebelum dipakai. Mesin bisa menggeser makna, " +
    "menyalahartikan istilah teknis, atau membalik arah temuan.",
];
