/**
 * Preview mode helper.
 *
 * Saat preview mode aktif, semua halaman bisa diakses tanpa login (pakai data dummy).
 * Sekarang dikontrol lewat env, bukan hardcode:
 *
 *   NEXT_PUBLIC_PREVIEW_MODE=true   → preview (tanpa auth)
 *   (tidak di-set / selain "true")  → production: auth + guard role aktif
 *
 * Satu sumber kebenaran — dipakai middleware.ts dan semua layout/halaman.
 */
export const PREVIEW_MODE = process.env.NEXT_PUBLIC_PREVIEW_MODE === "true";

/** Dummy user untuk preview */
export const PREVIEW_USER = {
  id:    "00000000-0000-0000-0000-000000000000",
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
