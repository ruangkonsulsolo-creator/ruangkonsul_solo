/**
 * Preview mode helper.
 * Saat PREVIEW_MODE = true, semua halaman bisa diakses tanpa login.
 * Set ke false di middleware.ts dan sini sekaligus setelah DB aktif.
 */
/**
 * DIMATIKAN.
 *
 * Selama ini true, dan itulah sebabnya tiap panel menampilkan "Preview
 * Admin"/"Preview Mentor" dengan angka contoh: setiap layout mengembalikan
 * profil palsu alih-alih memeriksa sesi yang sebenarnya. Tidak ada satu pun
 * peran yang benar-benar terhubung ke basis data selama ini.
 *
 * Konstanta dan data contoh di bawah sengaja dipertahankan supaya halaman
 * yang belum ditulis ulang tetap bisa dibangun. Halaman yang masih
 * memakainya kini menampilkan keadaan kosong, bukan angka karangan — itu
 * yang benar, karena angka karangan di panel admin membuat seluruh panel
 * kehilangan kepercayaan.
 */
export const PREVIEW_MODE = false;

/** Dummy user untuk preview */
export const PREVIEW_USER = {
  id:    "preview-user-id",
  email: "preview@ruangkonsulsolo.id",
};

/** Dummy profile untuk preview */
export const PREVIEW_PROFILE = {
  full_name:      "Preview User",
  role:           "user",
  credit_balance: 50000,
  referral_code:  "RKS-DEMO",
  whatsapp:       "62882007483223",
};
