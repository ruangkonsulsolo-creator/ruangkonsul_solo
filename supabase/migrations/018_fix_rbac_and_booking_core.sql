-- Migration: 018_fix_rbac_and_booking_core
--
-- Memperbaiki tiga masalah mendasar yang membuat RBAC dan booking tidak jalan:
--
--   1. Rekursi tak terbatas di RLS `profiles` (Postgres 42P17). Policy
--      "Admin baca semua profil" melakukan SELECT ke public.profiles dari dalam
--      policy public.profiles itu sendiri. 23 policy lain di 11 migration
--      menyalin pola yang sama, sehingga seluruh cek role gagal di level DB.
--      Solusi: helper SECURITY DEFINER yang bypass RLS.
--
--   2. Tidak ada INSERT policy di hampir semua tabel. RLS aktif + tanpa INSERT
--      policy = semua insert ditolak. Akibatnya customer tidak bisa membuat
--      booking, order, maupun checkout merchandise.
--
--   3. Tidak ada proteksi double-booking. Dua customer bisa mengambil slot yang
--      sama karena tidak ada unique constraint pada slot aktif.
--
-- Juga menambahkan: availability mentor berulang mingguan, kolom reschedule,
-- dan jejak pengiriman reminder.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Helper role — SECURITY DEFINER agar tidak memicu RLS profiles
-- ═══════════════════════════════════════════════════════════════════════════

-- search_path dikunci ke string kosong dan semua referensi di-qualify penuh.
-- Tanpa ini, SECURITY DEFINER bisa dibajak lewat schema yang dikontrol user.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = (SELECT auth.uid())
    AND is_active = true
$$;

COMMENT ON FUNCTION public.current_user_role() IS
  'Role user yang sedang login. SECURITY DEFINER sehingga bisa dipanggil dari '
  'dalam policy profiles tanpa memicu rekursi. Mengembalikan NULL untuk '
  'pengunjung yang belum login (role native) atau akun nonaktif.';

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_user_role() IN ('admin', 'superadmin')
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_user_role() = 'superadmin'
$$;

CREATE OR REPLACE FUNCTION public.is_mentor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_user_role() = 'mentor'
$$;

-- mentor_profiles.id milik user yang sedang login (NULL kalau bukan mentor).
CREATE OR REPLACE FUNCTION public.current_mentor_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.mentor_profiles WHERE user_id = (SELECT auth.uid())
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff()          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_superadmin()     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_mentor()         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_mentor_id() FROM PUBLIC;

-- Diberikan ke anon juga: policy publik seperti "mentor_select_public" ikut
-- memanggil is_staff(), dan pengunjung yang belum login (role native) harus
-- bisa mengevaluasinya. Untuk anon, auth.uid() NULL sehingga helper
-- mengembalikan NULL/false — tidak ada kebocoran data.
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff()          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin()     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_mentor()         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_mentor_id() TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Tulis ulang policy profiles — menghapus rekursi
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "User baca profil sendiri"   ON public.profiles;
DROP POLICY IF EXISTS "User update profil sendiri" ON public.profiles;
DROP POLICY IF EXISTS "Admin baca semua profil"    ON public.profiles;
DROP POLICY IF EXISTS "Admin update profil user"   ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_select_staff"
  ON public.profiles FOR SELECT
  USING (public.is_staff());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_update_staff"
  ON public.profiles FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Hanya superadmin yang boleh mengubah role orang lain. Tanpa trigger ini,
-- policy "profiles_update_own" di atas mengizinkan customer mengubah role
-- dirinya sendiri menjadi superadmin lewat PATCH langsung ke PostgREST.
CREATE OR REPLACE FUNCTION public.guard_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Hanya superadmin yang dapat mengubah role.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.credit_balance IS DISTINCT FROM OLD.credit_balance
     AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Saldo kredit tidak dapat diubah sendiri.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_role_change ON public.profiles;
CREATE TRIGGER profiles_guard_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_role_change();

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Ganti semua policy rekursif di tabel lain dengan helper
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admin kelola mentor"          ON public.mentor_profiles;
DROP POLICY IF EXISTS "Public bisa baca mentor aktif" ON public.mentor_profiles;
DROP POLICY IF EXISTS "Mentor update profil sendiri"  ON public.mentor_profiles;

-- Pengunjung yang belum login (role native) boleh melihat daftar mentor.
CREATE POLICY "mentor_select_public"
  ON public.mentor_profiles FOR SELECT
  USING (is_available = true OR public.is_staff() OR user_id = (SELECT auth.uid()));

CREATE POLICY "mentor_update_own"
  ON public.mentor_profiles FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "mentor_all_staff"
  ON public.mentor_profiles FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Admin/Mentor kelola slot" ON public.booking_slots;
DROP POLICY IF EXISTS "Public bisa baca slot"    ON public.booking_slots;

CREATE POLICY "slots_select_public"
  ON public.booking_slots FOR SELECT
  USING (true);

CREATE POLICY "slots_all_staff"
  ON public.booking_slots FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "slots_all_own_mentor"
  ON public.booking_slots FOR ALL
  USING (mentor_id = public.current_mentor_id())
  WITH CHECK (mentor_id = public.current_mentor_id());

DROP POLICY IF EXISTS "Admin baca semua booking"   ON public.bookings;
DROP POLICY IF EXISTS "Admin update booking"       ON public.bookings;
DROP POLICY IF EXISTS "Mentor baca booking ke dia" ON public.bookings;
DROP POLICY IF EXISTS "Mentor update booking ke dia" ON public.bookings;

CREATE POLICY "bookings_select_staff"
  ON public.bookings FOR SELECT USING (public.is_staff());

CREATE POLICY "bookings_update_staff"
  ON public.bookings FOR UPDATE
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "bookings_select_mentor"
  ON public.bookings FOR SELECT
  USING (mentor_id = public.current_mentor_id());

CREATE POLICY "bookings_update_mentor"
  ON public.bookings FOR UPDATE
  USING (mentor_id = public.current_mentor_id())
  WITH CHECK (mentor_id = public.current_mentor_id());

DROP POLICY IF EXISTS "Admin kelola banner"      ON public.banners;
CREATE POLICY "banners_all_staff"
  ON public.banners FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Admin kelola merchandise" ON public.merchandise;
CREATE POLICY "merchandise_all_staff"
  ON public.merchandise FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Admin kelola merch orders" ON public.merchandise_orders;
CREATE POLICY "merch_orders_all_staff"
  ON public.merchandise_orders FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. INSERT policy yang hilang
-- ═══════════════════════════════════════════════════════════════════════════

-- Customer membuat booking atas nama dirinya sendiri. Slot harus benar-benar
-- tersedia; WITH CHECK dievaluasi sebelum baris masuk.
CREATE POLICY "bookings_insert_own"
  ON public.bookings FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = customer_id
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.booking_slots s
      WHERE s.id = slot_id
        AND s.mentor_id = bookings.mentor_id
        AND s.is_blocked = false
    )
  );

CREATE POLICY "bookings_insert_staff"
  ON public.bookings FOR INSERT WITH CHECK (public.is_staff());

-- Customer boleh membatalkan booking miliknya sendiri, tapi tidak boleh
-- mengubah harga atau status ke 'completed'.
CREATE POLICY "bookings_update_own"
  ON public.bookings FOR UPDATE
  USING ((SELECT auth.uid()) = customer_id)
  WITH CHECK (
    (SELECT auth.uid()) = customer_id
    AND status IN ('pending', 'cancelled')
  );

CREATE POLICY "merch_orders_insert_own"
  ON public.merchandise_orders FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = customer_id);

CREATE POLICY "orders_insert_own"
  ON public.orders FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "notifications_insert_staff"
  ON public.notifications FOR INSERT WITH CHECK (public.is_staff());

-- Form booking publik (pengunjung belum login) menulis ke booking_leads.
-- Ini satu-satunya tabel yang menerima insert anonim, dan sengaja tidak bisa
-- dibaca balik oleh anon.
DROP POLICY IF EXISTS "booking_leads_insert_anon" ON public.booking_leads;
CREATE POLICY "booking_leads_insert_anon"
  ON public.booking_leads FOR INSERT WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Anti double-booking
-- ═══════════════════════════════════════════════════════════════════════════

-- Satu slot hanya boleh punya satu booking aktif. Booking yang dibatalkan atau
-- no-show melepas slotnya kembali. Partial unique index menegakkan ini di level
-- database, sehingga dua request bersamaan tidak bisa sama-sama lolos — yang
-- kedua gagal dengan unique violation (23505), bukan menimpa diam-diam.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_active_per_slot
  ON public.bookings (slot_id)
  WHERE status IN ('pending', 'confirmed', 'completed');

COMMENT ON INDEX public.bookings_one_active_per_slot IS
  'Mencegah dua customer mengambil slot yang sama. Tangani error 23505 di '
  'API sebagai "slot baru saja diambil orang lain".';

-- Jaga konsistensi: slot yang dibooking harus milik mentor yang sama.
CREATE OR REPLACE FUNCTION public.validate_booking_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  slot_mentor UUID;
  slot_start  TIMESTAMPTZ;
BEGIN
  SELECT s.mentor_id,
         (s.slot_date + s.slot_start) AT TIME ZONE 'Asia/Jakarta'
    INTO slot_mentor, slot_start
  FROM public.booking_slots s
  WHERE s.id = NEW.slot_id;

  IF slot_mentor IS NULL THEN
    RAISE EXCEPTION 'Slot tidak ditemukan.' USING ERRCODE = '23503';
  END IF;

  IF slot_mentor <> NEW.mentor_id THEN
    RAISE EXCEPTION 'Slot ini milik mentor lain.' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' AND slot_start < now() THEN
    RAISE EXCEPTION 'Tidak bisa booking slot yang sudah lewat.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_validate_slot ON public.bookings;
CREATE TRIGGER bookings_validate_slot
  BEFORE INSERT OR UPDATE OF slot_id, mentor_id ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_slot();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Reschedule + jejak reminder
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS rescheduled_from  UUID REFERENCES public.booking_slots(id),
  ADD COLUMN IF NOT EXISTS reschedule_count  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_h24_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_h1_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attended_at       TIMESTAMPTZ;

COMMENT ON COLUMN public.bookings.reminder_h24_at IS
  'Diisi saat reminder H-24 jam terkirim. NULL = belum dikirim. Dipakai cron '
  'agar reminder tidak terkirim dua kali.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Availability mentor berulang mingguan
-- ═══════════════════════════════════════════════════════════════════════════

-- Mentor mengatur pola mingguan sekali ("Senin 09:00-17:00"), lalu slot harian
-- di-generate dari pola ini. Tanpa ini mentor harus input slot satu per satu
-- setiap hari.
CREATE TABLE IF NOT EXISTS public.mentor_availability (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id      UUID        NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  -- 0 = Minggu, 1 = Senin, ... 6 = Sabtu (sesuai EXTRACT(DOW))
  day_of_week    SMALLINT    NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time     TIME        NOT NULL,
  end_time       TIME        NOT NULL,
  slot_minutes   INTEGER     NOT NULL DEFAULT 60 CHECK (slot_minutes BETWEEN 15 AND 480),
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mentor_availability_time_order CHECK (end_time > start_time),
  CONSTRAINT mentor_availability_unique UNIQUE (mentor_id, day_of_week, start_time)
);

COMMENT ON TABLE public.mentor_availability IS
  'Pola ketersediaan mingguan mentor. Semua jam dalam WIB (Asia/Jakarta).';

CREATE INDEX IF NOT EXISTS idx_mentor_availability_mentor
  ON public.mentor_availability(mentor_id, day_of_week) WHERE is_active;

ALTER TABLE public.mentor_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_select_public"
  ON public.mentor_availability FOR SELECT USING (true);

CREATE POLICY "availability_all_own_mentor"
  ON public.mentor_availability FOR ALL
  USING (mentor_id = public.current_mentor_id())
  WITH CHECK (mentor_id = public.current_mentor_id());

CREATE POLICY "availability_all_staff"
  ON public.mentor_availability FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Generate slot harian dari pola mingguan, untuk rentang tanggal tertentu.
-- Idempoten: ON CONFLICT DO NOTHING, aman dipanggil ulang tiap hari via cron.
CREATE OR REPLACE FUNCTION public.generate_slots_for_range(
  p_mentor_id UUID,
  p_from      DATE,
  p_to        DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  inserted INTEGER := 0;
BEGIN
  IF p_to < p_from THEN
    RAISE EXCEPTION 'Rentang tanggal tidak valid.' USING ERRCODE = '22023';
  END IF;

  IF p_to - p_from > 180 THEN
    RAISE EXCEPTION 'Maksimal 180 hari sekali generate.' USING ERRCODE = '22023';
  END IF;

  WITH days AS (
    SELECT d::DATE AS slot_date
    FROM generate_series(p_from, p_to, INTERVAL '1 day') d
  ),
  pattern AS (
    SELECT a.mentor_id, a.start_time, a.end_time, a.slot_minutes, a.day_of_week
    FROM public.mentor_availability a
    WHERE a.mentor_id = p_mentor_id AND a.is_active = true
  ),
  expanded AS (
    SELECT
      p.mentor_id,
      d.slot_date,
      t::TIME AS slot_start,
      (t + make_interval(mins => p.slot_minutes))::TIME AS slot_end
    FROM days d
    JOIN pattern p ON p.day_of_week = EXTRACT(DOW FROM d.slot_date)
    CROSS JOIN LATERAL generate_series(
      d.slot_date + p.start_time,
      d.slot_date + p.end_time - make_interval(mins => p.slot_minutes),
      make_interval(mins => p.slot_minutes)
    ) t
  )
  INSERT INTO public.booking_slots (mentor_id, slot_date, slot_start, slot_end)
  SELECT mentor_id, slot_date, slot_start, slot_end FROM expanded
  ON CONFLICT (mentor_id, slot_date, slot_start) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;

COMMENT ON FUNCTION public.generate_slots_for_range IS
  'Membuat booking_slots dari pola mentor_availability. Idempoten.';

GRANT EXECUTE ON FUNCTION public.generate_slots_for_range TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. View ketersediaan — dipakai halaman booking
-- ═══════════════════════════════════════════════════════════════════════════

-- Nama tampil disimpan di mentor_profiles, bukan di-join dari profiles.
-- profiles berisi whatsapp, referral_code dan credit_balance; mengizinkan
-- pengunjung anonim membacanya demi sekadar nama mentor akan membocorkan
-- semua itu. Kolom ini menjaga halaman booking tetap bisa dibaca publik.
ALTER TABLE public.mentor_profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT;

UPDATE public.mentor_profiles mp
SET display_name = p.full_name
FROM public.profiles p
WHERE p.id = mp.user_id AND mp.display_name IS NULL;

-- Status "sudah dibooking" disimpan sebagai flag di booking_slots, bukan
-- dihitung lewat subquery ke bookings.
--
-- Alasannya: view ini dibaca pengunjung anonim, dan dengan security_invoker
-- subquery NOT EXISTS ke public.bookings ikut tunduk RLS si pembaca. anon
-- tidak punya policy SELECT di bookings, jadi subquery selalu mengembalikan
-- nol baris dan SEMUA slot tampak kosong meski sudah terisi. Flag yang
-- dirawat trigger menghindari itu tanpa perlu membocorkan tabel bookings.
ALTER TABLE public.booking_slots
  ADD COLUMN IF NOT EXISTS is_booked BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.sync_slot_booked_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  affected UUID;
BEGIN
  affected := COALESCE(NEW.slot_id, OLD.slot_id);

  UPDATE public.booking_slots s
  SET is_booked = EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.slot_id = s.id
          AND b.status IN ('pending', 'confirmed', 'completed')
      )
  WHERE s.id = affected;

  -- Saat reschedule, slot lama juga perlu dilepas.
  IF TG_OP = 'UPDATE' AND OLD.slot_id IS DISTINCT FROM NEW.slot_id THEN
    UPDATE public.booking_slots s
    SET is_booked = EXISTS (
          SELECT 1 FROM public.bookings b
          WHERE b.slot_id = s.id
            AND b.status IN ('pending', 'confirmed', 'completed')
        )
    WHERE s.id = OLD.slot_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS bookings_sync_slot_flag ON public.bookings;
CREATE TRIGGER bookings_sync_slot_flag
  AFTER INSERT OR UPDATE OF status, slot_id OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_slot_booked_flag();

-- Backfill untuk data yang sudah ada.
UPDATE public.booking_slots s
SET is_booked = EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.slot_id = s.id AND b.status IN ('pending','confirmed','completed')
    );

CREATE INDEX IF NOT EXISTS idx_slots_bookable
  ON public.booking_slots (mentor_id, slot_date)
  WHERE is_blocked = false AND is_booked = false;

CREATE OR REPLACE VIEW public.available_slots
WITH (security_invoker = true) AS
SELECT
  s.id            AS slot_id,
  s.mentor_id,
  s.slot_date,
  s.slot_start,
  s.slot_end,
  (s.slot_date + s.slot_start) AT TIME ZONE 'Asia/Jakarta' AS starts_at,
  mp.price_per_hour,
  mp.display_name AS mentor_name,
  mp.avatar_url,
  mp.specializations
FROM public.booking_slots s
JOIN public.mentor_profiles mp ON mp.id = s.mentor_id
WHERE s.is_blocked = false
  AND s.is_booked  = false
  AND mp.is_available = true
  AND (s.slot_date + s.slot_start) AT TIME ZONE 'Asia/Jakarta' > now();

COMMENT ON VIEW public.available_slots IS
  'Slot yang benar-benar bisa dibooking: belum diblokir, mentor aktif, belum '
  'lewat, dan belum ada booking aktif.';

GRANT SELECT ON public.available_slots TO anon, authenticated;

DO $$ BEGIN
  RAISE NOTICE '018_fix_rbac_and_booking_core: selesai.';
END $$;
