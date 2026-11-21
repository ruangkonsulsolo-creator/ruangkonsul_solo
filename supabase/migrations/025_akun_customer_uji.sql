-- ─────────────────────────────────────────────────────────────────────────────
-- 025 — Menyiapkan akun customer untuk dipakai menguji
--
-- ⚠ SEBAGIAN ISI BERKAS INI KELIRU. Lihat 027_buat_akun_lewat_sql.sql.
--
-- Berkas ini menyatakan akun tidak bisa dibuat lewat SQL. Itu salah:
-- bisa, asal kata sandinya di-hash bcrypt dan baris auth.identities
-- ikut dibuat. Migration 027 melakukan keduanya dan sudah diuji.
--
-- Langkah lewat Dashboard di bawah tetap benar dan tetap cara yang
-- paling tahan perubahan versi Supabase, jadi berkas ini dipertahankan.
--
-- Akun pengguna tidak bisa dibuat lewat SQL BIASA. Tabel auth.users
-- milik Supabase menyimpan kata sandi dalam bentuk hash beserta baris
-- pendamping di auth.identities; menyisipkannya manual menghasilkan akun yang
-- ada di basis data tapi tidak bisa dipakai masuk, dan itu lebih
-- membingungkan daripada tidak ada akun sama sekali.
--
-- ── LANGKAH YANG BENAR ────────────────────────────────────────────────────
--
--  1. Buka Supabase Dashboard -> Authentication -> Users -> "Add user"
--       Email    : (pakai email yang benar-benar bisa kamu buka)
--       Password : (isi bebas)
--       Centang  : "Auto Confirm User"
--
--     Memakai email yang sungguhan penting. Email fiktif seperti
--     agusbudiono@gmail.com tidak bisa menerima tautan atur ulang kata sandi,
--     jadi begitu kata sandinya lupa, akunnya hilang untuk selamanya.
--
--  2. Trigger handle_new_user (migration 001) otomatis membuat baris di
--     public.profiles dengan role 'user'. Tidak ada yang perlu dikerjakan.
--
--  3. Jalankan bagian VERIFIKASI di bawah untuk memastikan akunnya benar.
--
-- ── MEMBERSIHKAN AKUN FIKTIF LAMA ─────────────────────────────────────────
--
-- Hapus akun agusbudiono@gmail.com lewat Dashboard -> Authentication -> Users
-- -> titik tiga -> Delete user. Baris profilnya ikut terhapus karena
-- ON DELETE CASCADE.
--
-- Jangan menghapusnya lewat SQL kalau akun itu sudah punya pesanan atau
-- booking: yang terhapus bukan cuma akunnya.
-- ─────────────────────────────────────────────────────────────────────────────


-- ══ VERIFIKASI ═══════════════════════════════════════════════════════════════
-- Jalankan setelah membuat akun lewat Dashboard. Harus menampilkan akun baru
-- dengan role 'user' dan is_active true.

SELECT
  -- Email tinggal di auth.users, bukan di profiles. "p.email" membuat
  -- seluruh berkas ini berhenti dengan 42703 di baris terakhirnya.
  u.email,
  p.full_name,
  p.role,
  p.is_active,
  p.credit_balance,
  u.email_confirmed_at IS NOT NULL AS email_terkonfirmasi,
  p.created_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at DESC
LIMIT 10;


-- ══ OPSIONAL: beri saldo awal untuk menguji fitur periksa naskah ═════════════
-- Fitur Cek Plagiarisme, Cek AI, dan Parafrase memotong credit_balance.
-- Tanpa saldo, yang muncul hanya pesan "saldo belum cukup" dan alurnya tidak
-- bisa diuji sampai selesai.
--
-- Ganti alamat email di bawah lebih dulu, lalu hapus tanda komentarnya.
--
-- Rp50.000 cukup untuk beberapa kali pemeriksaan naskah pendek.

-- UPDATE public.profiles
--    SET credit_balance = 50000
--  WHERE email = 'ganti-dengan-email-aslimu@gmail.com';


-- ══ OPSIONAL: jadikan akun tertentu sebagai mentor ═══════════════════════════
-- Berguna kalau kamu ingin menguji chat dua arah: satu akun customer dan satu
-- akun mentor, lalu buka keduanya di dua peramban berbeda.
--
-- Dijalankan lewat SQL Editor, guard_role_change melewatkannya karena
-- auth.uid() bernilai NULL di sana (lihat migration 019).

-- UPDATE public.profiles SET role = 'mentor' WHERE email = 'email-mentor@gmail.com';
--
-- INSERT INTO public.mentor_profiles (user_id, bio, price_per_hour, is_available)
-- SELECT id, 'Mentor penguji', 150000, true FROM public.profiles
--  WHERE email = 'email-mentor@gmail.com'
-- ON CONFLICT (user_id) DO NOTHING;
