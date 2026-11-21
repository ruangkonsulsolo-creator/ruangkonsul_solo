-- Migration: 019_admin_kelola_mentor
--
-- Melonggarkan guard_role_change supaya admin bisa mengangkat dan
-- menonaktifkan mentor, tanpa membuka jalan menuju eskalasi hak.
--
-- Aturan barunya:
--   superadmin : bebas mengubah role apa pun
--   admin      : hanya boleh menggeser antara 'user' dan 'mentor'
--   lainnya    : tidak boleh mengubah role sama sekali
--
-- Batas ini penting. Kalau admin boleh menetapkan role apa saja, satu akun
-- admin yang bocor cukup untuk mengangkat dirinya sendiri jadi superadmin
-- dan membuka seluruh laporan keuangan. Mengangkat mentor adalah pekerjaan
-- operasional harian; membuat admin baru bukan.

CREATE OR REPLACE FUNCTION public.guard_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Tanpa JWT sama sekali: akses langsung ke database (SQL Editor, service
    -- role, skrip migrasi). Ini jalur sah dan harus dibiarkan lewat.
    --
    -- Versi 018 tidak punya cabang ini, dan akibatnya trigger ikut memblokir
    -- SQL Editor: trigger tetap berjalan untuk pemilik tabel, sementara
    -- auth.uid() di sana NULL sehingga is_superadmin() bernilai false. Praktis
    -- superadmin pertama jadi mustahil dibuat - tidak bisa dari aplikasi
    -- karena belum ada superadmin, tidak bisa pula dari SQL Editor.
    --
    -- Membiarkannya lewat tidak membuka celah: anon juga ber-auth.uid() NULL,
    -- tapi RLS tetap menghadangnya karena policy update profiles mensyaratkan
    -- auth.uid() = id, dan NULL tidak pernah sama dengan id apa pun.
    IF (SELECT auth.uid()) IS NULL THEN
      NULL;

    ELSIF public.is_superadmin() THEN
      NULL;  -- superadmin bebas

    ELSIF public.current_user_role() = 'admin' THEN
      -- Admin hanya boleh menggeser antara user dan mentor, dua arah.
      IF NOT (OLD.role IN ('user', 'mentor') AND NEW.role IN ('user', 'mentor')) THEN
        RAISE EXCEPTION
          'Admin hanya dapat mengubah role antara user dan mentor.'
          USING ERRCODE = '42501';
      END IF;

    ELSE
      RAISE EXCEPTION 'Tidak berhak mengubah role.' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.credit_balance IS DISTINCT FROM OLD.credit_balance
     AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Saldo kredit tidak dapat diubah sendiri.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- ── Ringkasan kinerja mentor ────────────────────────────────────────────────
--
-- Dihitung di database, bukan di aplikasi: angka ini dipakai beberapa halaman
-- dan menghitungnya di satu tempat mencegah dua halaman menampilkan angka
-- berbeda untuk hal yang sama.
--
-- security_invoker agar RLS pemanggil tetap berlaku. Hanya staf yang punya
-- policy baca penuh ke bookings, jadi view ini otomatis kosong untuk orang
-- lain tanpa perlu pengecekan tambahan.
CREATE OR REPLACE VIEW public.mentor_performa
WITH (security_invoker = true) AS
SELECT
  mp.id                        AS mentor_id,
  mp.user_id,
  mp.display_name,
  mp.avatar_url,
  mp.specializations,
  mp.price_per_hour,
  mp.is_available,
  p.whatsapp,

  COUNT(b.id) FILTER (WHERE b.status = 'completed')               AS sesi_selesai,
  COUNT(b.id) FILTER (WHERE b.status = 'confirmed')               AS sesi_terkonfirmasi,
  COUNT(b.id) FILTER (WHERE b.status = 'pending')                 AS sesi_menunggu,
  COUNT(b.id) FILTER (WHERE b.status = 'cancelled')               AS sesi_batal,
  COUNT(b.id) FILTER (WHERE b.status = 'no_show')                 AS sesi_bolos,

  COUNT(b.id) FILTER (
    WHERE b.status = 'completed'
      AND b.completed_at >= date_trunc('month', now())
  )                                                               AS selesai_bulan_ini,

  COALESCE(SUM(b.price_idr) FILTER (WHERE b.status = 'completed'), 0)
                                                                  AS pendapatan_total,
  COALESCE(SUM(b.price_idr) FILTER (
    WHERE b.status = 'completed'
      AND b.completed_at >= date_trunc('month', now())
  ), 0)                                                           AS pendapatan_bulan_ini,

  ROUND(AVG(b.rating) FILTER (WHERE b.rating IS NOT NULL), 2)     AS rating_rata,
  COUNT(b.rating) FILTER (WHERE b.rating IS NOT NULL)             AS jumlah_penilaian,

  MAX(b.completed_at)                                             AS sesi_terakhir,

  -- Slot yang masih terbuka ke depan: mentor dengan nol slot tidak akan
  -- pernah dapat booking baru, dan itu yang perlu dikejar admin.
  (SELECT COUNT(*) FROM public.booking_slots s
    WHERE s.mentor_id = mp.id
      AND s.is_blocked = false
      AND s.is_booked  = false
      AND (s.slot_date + s.slot_start) AT TIME ZONE 'Asia/Jakarta' > now()
  )                                                               AS slot_terbuka

FROM public.mentor_profiles mp
JOIN public.profiles p ON p.id = mp.user_id
LEFT JOIN public.bookings b ON b.mentor_id = mp.id
GROUP BY mp.id, mp.user_id, mp.display_name, mp.avatar_url,
         mp.specializations, mp.price_per_hour, mp.is_available, p.whatsapp;

COMMENT ON VIEW public.mentor_performa IS
  'Ringkasan kinerja per mentor untuk panel admin. Kosong bagi non-staf '
  'karena mengikuti RLS pemanggil.';

GRANT SELECT ON public.mentor_performa TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '019_admin_kelola_mentor: selesai.';
END $$;
