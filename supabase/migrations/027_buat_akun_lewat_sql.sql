-- ─────────────────────────────────────────────────────────────────────────────
-- 027 — Membuat akun pengguna langsung lewat SQL
--
-- Di migration 025 saya menulis bahwa akun tidak bisa dibuat lewat SQL.
-- Itu KELIRU, dan berkas ini menggantikannya. Akun bisa dibuat lewat SQL
-- asal dua hal dikerjakan dengan benar:
--
--   1. Kata sandi disimpan sebagai hash bcrypt, bukan teks biasa. GoTrue
--      memverifikasi sandi dengan bcrypt, jadi kolom yang diisi teks polos
--      menghasilkan akun yang ada tapi tidak bisa login.
--
--   2. Baris pendamping di auth.identities harus ikut dibuat. Tanpa itu,
--      GoTrue tidak menemukan metode masuk apa pun untuk akun tersebut dan
--      login ditolak meski sandinya benar.
--
-- Keduanya ditangani di bawah.
--
-- ── CARA PAKAI ────────────────────────────────────────────────────────────
--
--   1. Ubah tiga nilai di blok "ISI DI SINI".
--   2. Salin SELURUH berkas ini ke SQL Editor Supabase, lalu Run.
--   3. Jalankan bagian VERIFIKASI di bawah untuk memastikan hasilnya benar.
--
-- Aman dijalankan berulang kali: kalau emailnya sudah ada, tidak terjadi
-- apa-apa dan muncul pemberitahuan.
--
-- ── PERINGATAN YANG PERLU KAMU TAHU ───────────────────────────────────────
--
-- Cara ini menulis langsung ke tabel internal Supabase. Susunan kolom
-- auth.users berubah antarversi GoTrue, jadi skrip yang jalan hari ini bisa
-- gagal setelah Supabase memperbarui layanannya. Kalau muncul galat tentang
-- kolom yang tidak dikenal, pakai Dashboard → Authentication → Add user;
-- cara itu selalu mengikuti versi yang sedang berjalan.
--
-- Untuk akun sungguhan milik pelanggan, biarkan mereka mendaftar sendiri
-- lewat halaman /daftar. Skrip ini untuk akun uji dan akun internal.
-- ─────────────────────────────────────────────────────────────────────────────

-- pgcrypto menyediakan crypt() dan gen_salt(). Di Supabase biasanya sudah
-- terpasang di skema extensions.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  -- ══════════════════ ISI DI SINI ══════════════════
  v_email TEXT := 'ganti.dengan.emailmu@gmail.com';
  v_sandi TEXT := 'GantiSandiIni123';
  v_nama  TEXT := 'Nama Lengkap Customer';
  -- Peran: 'user' untuk customer, 'mentor', 'admin', atau 'superadmin'.
  v_peran TEXT := 'user';
  -- Saldo awal untuk menguji fitur periksa naskah. Isi 0 kalau tidak perlu.
  v_saldo INTEGER := 50000;
  -- ═════════════════════════════════════════════════

  v_id UUID := gen_random_uuid();
BEGIN
  v_email := lower(btrim(v_email));

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE NOTICE 'Email % sudah terdaftar. Tidak ada yang diubah.', v_email;
    RETURN;
  END IF;

  IF length(v_sandi) < 8 THEN
    RAISE EXCEPTION 'Kata sandi minimal 8 karakter.';
  END IF;

  IF v_peran NOT IN ('user', 'mentor', 'admin', 'superadmin') THEN
    RAISE EXCEPTION 'Peran "%" tidak dikenal. Pilih: user, mentor, admin, superadmin.', v_peran;
  END IF;

  -- email_confirmed_at diisi now() supaya akunnya langsung bisa dipakai
  -- tanpa menunggu email verifikasi. Kolom confirmed_at TIDAK diisi: itu
  -- kolom generated, dan mengisinya menyebabkan galat.
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(v_sandi, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', v_nama),
    false
  );

  -- Tanpa baris ini, login ditolak meski sandinya benar.
  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_id::text, v_id,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  -- Trigger handle_new_user (migration 001) sudah membuat baris profiles
  -- berikut referral_code-nya saat INSERT ke auth.users di atas. Jadi di
  -- sini cukup DIPERBARUI, bukan disisipkan lagi.
  --
  -- Catatan: tabel profiles tidak punya kolom email (emailnya ada di
  -- auth.users), dan kolom role bertipe TEXT dengan CHECK, bukan enum.
  UPDATE public.profiles
     SET full_name      = v_nama,
         role           = v_peran,
         credit_balance = v_saldo,
         is_active      = true,
         updated_at     = now()
   WHERE id = v_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Baris profiles tidak terbentuk. Trigger on_auth_user_created dari '
      'migration 001 kemungkinan belum terpasang.';
  END IF;

  RAISE NOTICE 'Akun dibuat: % | peran: % | saldo: Rp%', v_email, v_peran, v_saldo;
END $$;


-- ══ VERIFIKASI ═══════════════════════════════════════════════════════════════
-- Kolom "siap_login" harus true. Kalau false, akunnya tidak akan bisa masuk.

SELECT
  u.email,
  p.full_name,
  p.role,
  p.credit_balance,
  u.email_confirmed_at IS NOT NULL                    AS email_terkonfirmasi,
  EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id) AS punya_identity,
  (u.encrypted_password LIKE '$2%')                   AS sandi_ter_hash,
  (u.email_confirmed_at IS NOT NULL
   AND u.encrypted_password LIKE '$2%'
   AND EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id)) AS siap_login
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;


-- ══ MENGHAPUS AKUN FIKTIF LAMA ═══════════════════════════════════════════════
--
-- Hapus tanda komentar untuk menjalankan. Periksa dulu apakah akun itu punya
-- pesanan atau booking — ON DELETE CASCADE akan ikut menghapusnya, dan itu
-- tidak bisa dibatalkan.
--
-- Cek dulu:
-- SELECT
--   (SELECT count(*) FROM public.orders   WHERE user_id = p.id) AS pesanan,
--   (SELECT count(*) FROM public.bookings WHERE user_id = p.id) AS booking
-- FROM public.profiles p WHERE p.email = 'agusbudiono@gmail.com';
--
-- Kalau dua-duanya 0, barulah hapus:
-- DELETE FROM auth.users WHERE email = 'agusbudiono@gmail.com';


-- ══ MENGUBAH SANDI AKUN YANG SUDAH ADA ═══════════════════════════════════════
-- Berguna kalau kamu lupa sandi akun uji.
--
-- UPDATE auth.users
--    SET encrypted_password = extensions.crypt('SandiBaru123', extensions.gen_salt('bf')),
--        updated_at = now()
--  WHERE email = 'email-yang-mau-diganti@gmail.com';
