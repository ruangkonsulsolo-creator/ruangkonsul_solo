/**
 * Katalog merchandise Ruang Konsul Solo.
 *
 * ── CARA MENGUBAH ─────────────────────────────────────────────────────────
 *
 * Seluruh isi toko diatur dari berkas ini. Tambah produk = tambah satu entri
 * di DAFTAR_PRODUK. Foto produk tidak didaftarkan di sini: taruh saja di
 * /public/merchandise/<slug>/ dan folder itu dipindai sendiri saat build
 * (lihat lib/merchandise/foto.ts).
 *
 * ── PERLU DIPERIKSA PEMILIK ───────────────────────────────────────────────
 *
 * Harga, berat, bahan, dan ukuran di bawah ini disalin dari katalog lama di
 * dasbor dan dilengkapi dengan angka yang masuk akal — BUKAN dari data
 * penjualan sungguhan. Periksa satu per satu sebelum toko ini dibuka:
 *
 *   - harga        : cocokkan dengan harga jual yang berlaku sekarang
 *   - beratGram    : dipakai pembeli memperkirakan ongkir; salah berat =
 *                    salah ongkir = komplain
 *   - spesifikasi  : bahan, ukuran, dan isi harus sesuai barang aslinya
 *
 * Sengaja TIDAK ada kolom rating dan jumlah terjual. Katalog lama memuat
 * angka seperti "4.8 · 67 terjual" yang tidak berasal dari transaksi mana
 * pun. Rating karangan adalah testimoni palsu: melanggar UU No. 8/1999
 * tentang Perlindungan Konsumen soal informasi menyesatkan, dan risikonya
 * jatuh ke bisnis ini. Kalau nanti sudah ada data ulasan sungguhan dari
 * tabel merchandise_orders, barulah kolomnya ditambahkan.
 */

export const KATEGORI = [
  "Semua",
  "Wisuda",
  "Pakaian",
  "Aksesoris",
  "Stationery",
  "Sticker",
] as const;

export type Kategori = Exclude<(typeof KATEGORI)[number], "Semua">;

export type Spesifikasi = { label: string; nilai: string };

export type Varian = {
  /** Nama pilihan, misal "Ukuran" atau "Warna". */
  label: string;
  pilihan: string[];
};

export type Produk = {
  slug: string;
  nama: string;
  kategori: Kategori;
  /** Satu baris untuk kartu di daftar produk. */
  ringkas: string;
  /** Paragraf untuk halaman detail. */
  deskripsi: string[];
  harga: number;
  /** Harga sebelum potongan. Kosongkan kalau tidak sedang diskon. */
  hargaCoret?: number;
  spesifikasi: Spesifikasi[];
  varian?: Varian[];
  /** Dipakai pembeli memperkirakan ongkir. */
  beratGram: number;
  /**
   * null = dibuat setelah dipesan (pre-order), bukan stok nol.
   * Angka = jumlah siap kirim.
   */
  stok: number | null;
  /** Catatan penting yang perlu dibaca sebelum memesan. */
  catatan?: string;
};

export const DAFTAR_PRODUK: Produk[] = [
  {
    slug: "buket-wisuda",
    nama: "Buket Wisuda",
    kategori: "Wisuda",
    ringkas: "Bunga, snack, atau boneka untuk hari kelulusan",
    deskripsi: [
      "Buket untuk hari yang sudah lama ditunggu. Bisa dirangkai dari bunga " +
        "artificial, snack, boneka, atau gabungan ketiganya sesuai permintaan.",
      "Pesan paling lambat tiga hari sebelum hari-H supaya sempat dirangkai " +
        "dan dikirim. Untuk wisuda di Solo bisa diantar langsung ke lokasi.",
    ],
    harga: 85000,
    spesifikasi: [
      { label: "Ukuran", nilai: "Diameter ±25 cm, tinggi ±35 cm" },
      { label: "Isi", nilai: "Bunga artificial / snack / boneka" },
      { label: "Pembungkus", nilai: "Kertas buket premium + pita satin" },
      { label: "Kartu ucapan", nilai: "Termasuk, teks bebas" },
      { label: "Waktu pengerjaan", nilai: "2–3 hari kerja" },
    ],
    varian: [
      { label: "Jenis", pilihan: ["Bunga", "Snack", "Boneka", "Campur"] },
      { label: "Ukuran", pilihan: ["Reguler", "Jumbo"] },
    ],
    beratGram: 600,
    stok: null,
    catatan:
      "Dirangkai setelah pesanan masuk. Pesan minimal 3 hari sebelum acara.",
  },
  {
    slug: "hoodie-skripsi-survivor",
    nama: "Hoodie Skripsi Survivor",
    kategori: "Pakaian",
    ringkas: "Hoodie fleece tebal untuk begadang revisi",
    deskripsi: [
      "Hoodie berbahan fleece cotton yang cukup tebal untuk dipakai begadang " +
        "di kamar kos ber-AC, tapi tidak gerah dipakai di perpustakaan.",
      "Sablon plastisol di bagian dada, tidak retak setelah dicuci berulang " +
        "kali selama tidak disetrika langsung di atas sablonnya.",
    ],
    harga: 125000,
    spesifikasi: [
      { label: "Bahan", nilai: "Fleece cotton 280 gsm" },
      { label: "Sablon", nilai: "Plastisol, tahan cuci" },
      { label: "Ukuran", nilai: "M, L, XL, XXL" },
      { label: "Lebar dada", nilai: "M 52 cm · L 54 cm · XL 56 cm · XXL 58 cm" },
      { label: "Panjang badan", nilai: "M 68 cm · L 70 cm · XL 72 cm · XXL 74 cm" },
      { label: "Perawatan", nilai: "Cuci balik, jangan setrika di atas sablon" },
    ],
    varian: [
      { label: "Ukuran", pilihan: ["M", "L", "XL", "XXL"] },
      { label: "Warna", pilihan: ["Hitam", "Maroon", "Navy"] },
    ],
    beratGram: 700,
    stok: null,
    catatan: "Ukuran berbeda tiap orang — cocokkan dulu dengan tabel di atas.",
  },
  {
    slug: "tumbler-ruang-konsul-solo",
    nama: "Tumbler Ruang Konsul Solo",
    kategori: "Aksesoris",
    ringkas: "Stainless 500 ml, tahan panas dan dingin",
    deskripsi: [
      "Tumbler stainless dinding ganda. Air dingin bertahan dingin sampai " +
        "sekitar 12 jam, air panas tetap hangat sekitar 6 jam.",
      "Mulutnya cukup lebar untuk dimasuki es batu dan disikat sampai dasar.",
    ],
    harga: 45000,
    spesifikasi: [
      { label: "Kapasitas", nilai: "500 ml" },
      { label: "Bahan", nilai: "Stainless steel 304, dinding ganda" },
      { label: "Tinggi", nilai: "±21 cm, diameter ±7 cm" },
      { label: "Tahan dingin", nilai: "±12 jam" },
      { label: "Tahan panas", nilai: "±6 jam" },
      { label: "Logo", nilai: "Laser engraving, tidak mengelupas" },
    ],
    varian: [{ label: "Warna", pilihan: ["Hitam", "Silver", "Maroon"] }],
    beratGram: 350,
    stok: null,
  },
  {
    slug: "tote-bag-ruang-konsul-solo",
    nama: "Tote Bag Ruang Konsul Solo",
    kategori: "Aksesoris",
    ringkas: "Kanvas tebal, kuat menahan tumpukan buku",
    deskripsi: [
      "Tote bag kanvas 12 oz dengan jahitan rangkap di bagian tali — bagian " +
        "yang paling sering jebol kalau dipakai membawa buku tebal.",
      "Muat laptop 14 inci beserta map dan botol minum.",
    ],
    harga: 38000,
    spesifikasi: [
      { label: "Bahan", nilai: "Kanvas 12 oz" },
      { label: "Ukuran", nilai: "35 × 40 cm" },
      { label: "Panjang tali", nilai: "60 cm" },
      { label: "Jahitan", nilai: "Rangkap pada sambungan tali" },
      { label: "Muatan", nilai: "Laptop sampai 14 inci" },
    ],
    varian: [{ label: "Warna", pilihan: ["Natural", "Hitam"] }],
    beratGram: 250,
    stok: null,
  },
  {
    slug: "mug-bikin-dosen-happy",
    nama: 'Mug "Bikin Dosen Happy"',
    kategori: "Aksesoris",
    ringkas: "Mug keramik, pas jadi hadiah dosen pembimbing",
    deskripsi: [
      "Mug keramik putih dengan cetak sublim. Aman masuk microwave dan mesin " +
        "cuci piring.",
      "Dikirim dalam kotak busa karena keramik gampang pecah di perjalanan.",
    ],
    harga: 30000,
    spesifikasi: [
      { label: "Kapasitas", nilai: "325 ml" },
      { label: "Bahan", nilai: "Keramik putih" },
      { label: "Cetak", nilai: "Sublim, satu sisi" },
      { label: "Microwave", nilai: "Aman" },
      { label: "Kemasan", nilai: "Kotak busa" },
    ],
    beratGram: 400,
    stok: null,
  },
  {
    slug: "notebook-bimbingan",
    nama: "Notebook Bimbingan",
    kategori: "Stationery",
    ringkas: "A5 dengan halaman catatan revisi per bab",
    deskripsi: [
      "Notebook A5 dengan halaman khusus untuk mencatat revisi: kolom bab, " +
        "catatan dosen, dan tanggal tindak lanjut.",
      "Sisanya halaman bergaris biasa, jadi tetap bisa dipakai mencatat apa " +
        "saja.",
    ],
    harga: 35000,
    spesifikasi: [
      { label: "Ukuran", nilai: "A5 (14,8 × 21 cm)" },
      { label: "Jumlah halaman", nilai: "120 halaman" },
      { label: "Kertas", nilai: "HVS 80 gsm, bergaris" },
      { label: "Halaman khusus", nilai: "20 halaman lembar revisi" },
      { label: "Jilid", nilai: "Spiral kawat" },
    ],
    beratGram: 300,
    stok: null,
  },
  {
    slug: "sticker-pack-akademik",
    nama: "Sticker Pack Akademik",
    kategori: "Sticker",
    ringkas: "10 lembar stiker vinyl tahan air",
    deskripsi: [
      "Sepuluh lembar stiker vinyl dengan tema keseharian mahasiswa tingkat " +
        "akhir. Tahan air, jadi aman ditempel di botol minum dan laptop.",
      "Sudah dipotong per gambar (kiss cut), tinggal dikelupas.",
    ],
    harga: 20000,
    spesifikasi: [
      { label: "Jumlah", nilai: "10 lembar" },
      { label: "Bahan", nilai: "Vinyl, tahan air" },
      { label: "Ukuran lembar", nilai: "10 × 15 cm" },
      { label: "Potongan", nilai: "Kiss cut, siap kelupas" },
      { label: "Laminasi", nilai: "Doff, tidak memantul" },
    ],
    beratGram: 80,
    stok: null,
  },
];

/** Produk berdasarkan slug, atau undefined kalau tidak ada. */
export function cariProduk(slug: string): Produk | undefined {
  return DAFTAR_PRODUK.find((p) => p.slug === slug);
}

/** Produk pada satu kategori. "Semua" mengembalikan seluruh katalog. */
export function produkKategori(kategori: string): Produk[] {
  if (kategori === "Semua") return DAFTAR_PRODUK;
  return DAFTAR_PRODUK.filter((p) => p.kategori === kategori);
}

/** Harga termurah di katalog, untuk teks "Mulai Rp…". */
export function hargaTermurah(): number {
  return Math.min(...DAFTAR_PRODUK.map((p) => p.harga));
}
