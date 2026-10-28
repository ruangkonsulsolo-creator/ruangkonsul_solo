/**
 * Preview mode helper.
 * Saat PREVIEW_MODE = true, semua halaman bisa diakses tanpa login.
 * Set ke false di middleware.ts dan sini sekaligus setelah DB aktif.
 */
export const PREVIEW_MODE = true;

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
