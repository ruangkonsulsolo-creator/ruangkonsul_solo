-- ─────────────────────────────────────────────────────────────────────────────
-- 028 — Perbaiki "Database error querying schema" saat login
--
-- GEJALA
--   Login gagal dengan pesan "Database error querying schema", padahal
--   akunnya ada di auth.users dan sandinya benar.
--
-- PENYEBAB
--   Akun yang dibuat lewat INSERT manual meninggalkan sejumlah kolom token
--   di auth.users bernilai NULL. GoTrue membaca kolom-kolom itu sebagai
--   string biasa, bukan string yang boleh kosong, sehingga NULL membuat
--   pembacaan baris gagal sebelum sandinya sempat diperiksa.
--
--   Akun yang dibuat lewat Dashboard atau halaman /daftar tidak kena, karena
--   GoTrue mengisinya dengan string kosong.
--
--   Ini bug pada migration 027 versi pertama. Berkas 027 sudah diperbaiki,
--   tapi akun yang terlanjur dibuat dengannya perlu dirapikan di sini.
--
-- AMAN
--   Hanya mengubah NULL menjadi string kosong. Baris yang sudah benar tidak
--   tersentuh, dan tidak ada sandi, email, atau peran yang diubah.
--   Aman dijalankan berulang kali.
-- ─────────────────────────────────────────────────────────────────────────────

-- ══ 1. Lihat dulu akun mana yang bermasalah ══════════════════════════════════

SELECT
  email,
  created_at,
  (confirmation_token         IS NULL) AS confirmation_token_null,
  (recovery_token             IS NULL) AS recovery_token_null,
  (email_change_token_new     IS NULL) AS email_change_token_new_null,
  (email_change               IS NULL) AS email_change_null,
  (email_change_token_current IS NULL) AS email_change_token_current_null,
  (phone_change               IS NULL) AS phone_change_null,
  (phone_change_token         IS NULL) AS phone_change_token_null,
  (reauthentication_token     IS NULL) AS reauthentication_token_null
FROM auth.users
WHERE confirmation_token         IS NULL
   OR recovery_token             IS NULL
   OR email_change_token_new     IS NULL
   OR email_change               IS NULL
   OR email_change_token_current IS NULL
   OR phone_change               IS NULL
   OR phone_change_token         IS NULL
   OR reauthentication_token     IS NULL
ORDER BY created_at DESC;


-- ══ 2. Perbaiki ══════════════════════════════════════════════════════════════

UPDATE auth.users
   SET confirmation_token         = COALESCE(confirmation_token, ''),
       recovery_token             = COALESCE(recovery_token, ''),
       email_change_token_new     = COALESCE(email_change_token_new, ''),
       email_change               = COALESCE(email_change, ''),
       email_change_token_current = COALESCE(email_change_token_current, ''),
       phone_change               = COALESCE(phone_change, ''),
       phone_change_token         = COALESCE(phone_change_token, ''),
       reauthentication_token     = COALESCE(reauthentication_token, '')
 WHERE confirmation_token         IS NULL
    OR recovery_token             IS NULL
    OR email_change_token_new     IS NULL
    OR email_change               IS NULL
    OR email_change_token_current IS NULL
    OR phone_change               IS NULL
    OR phone_change_token         IS NULL
    OR reauthentication_token     IS NULL;


-- ══ 3. Pastikan sudah bersih ═════════════════════════════════════════════════
-- Harus mengembalikan 0 baris. Kalau masih ada, kirim hasilnya.

SELECT email FROM auth.users
WHERE confirmation_token         IS NULL
   OR recovery_token             IS NULL
   OR email_change_token_new     IS NULL
   OR email_change               IS NULL
   OR email_change_token_current IS NULL
   OR phone_change               IS NULL
   OR phone_change_token         IS NULL
   OR reauthentication_token     IS NULL;


-- ══ 4. Periksa kesiapan login ════════════════════════════════════════════════
-- siap_login harus true untuk akun yang ingin kamu pakai.

SELECT
  u.email,
  p.role,
  p.credit_balance,
  u.email_confirmed_at IS NOT NULL AS email_terkonfirmasi,
  (u.encrypted_password LIKE '$2%') AS sandi_ter_hash,
  EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id) AS punya_identity,
  (u.email_confirmed_at IS NOT NULL
   AND u.encrypted_password LIKE '$2%'
   AND EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id)
   AND u.confirmation_token IS NOT NULL) AS siap_login
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC
LIMIT 10;
