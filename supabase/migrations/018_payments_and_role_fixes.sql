-- Migration: 018_payments_and_role_fixes
--
-- 1. Helper fungsi role (SECURITY DEFINER) → menghindari infinite recursion
--    pada policy tabel profiles yang men-query profiles lagi.
-- 2. Perbaiki policy yang memakai 'super_admin' (typo; role yang valid 'superadmin').
-- 3. Cegah user biasa menaikkan role / saldo kredit dirinya sendiri.
-- 4. Policy agar mentor & publik bisa membaca data profil yang memang dibutuhkan.
-- 5. Tabel payments: satu sumber kebenaran untuk semua transaksi Midtrans
--    (pesanan per-file, paket hemat, booking mentor).
-- 6. Cegah double-booking slot mentor.
-- 7. RPC increment_credit_balance untuk komisi referral.

-- ─── 1. Helper role ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = true
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_user_role() IN ('admin', 'superadmin'), false)
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_user_role() = 'superadmin', false)
$$;

CREATE OR REPLACE FUNCTION public.my_mentor_profile_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.mentor_profiles WHERE user_id = auth.uid()
$$;

-- SECURITY DEFINER supaya policy profiles tidak memicu RLS bookings → mentor_profiles → profiles
CREATE OR REPLACE FUNCTION public.is_my_client(p_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.bookings b
      JOIN public.mentor_profiles mp ON mp.id = b.mentor_id
     WHERE b.customer_id = p_customer_id
       AND mp.user_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_my_client(UUID)     TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role()    TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_staff()             TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_superadmin()        TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.my_mentor_profile_id() TO authenticated, anon;

-- ─── 2. Profiles: ganti policy rekursif ──────────────────────────────────────
DROP POLICY IF EXISTS "Admin baca semua profil"            ON public.profiles;
DROP POLICY IF EXISTS "Admin update profil user"           ON public.profiles;
DROP POLICY IF EXISTS "Admin dapat membaca semua profil"   ON public.profiles;

CREATE POLICY "Staff baca semua profil"
  ON public.profiles FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Staff update profil"
  ON public.profiles FOR UPDATE
  USING (public.is_staff());

-- Publik boleh membaca profil mentor aktif (nama tampil di halaman booking)
DROP POLICY IF EXISTS "Publik baca profil mentor" ON public.profiles;
CREATE POLICY "Publik baca profil mentor"
  ON public.profiles FOR SELECT
  USING (role = 'mentor' AND is_active = true);

-- Mentor boleh membaca profil customer yang booking ke dia
DROP POLICY IF EXISTS "Mentor baca profil klien" ON public.profiles;
CREATE POLICY "Mentor baca profil klien"
  ON public.profiles FOR SELECT
  USING (public.is_my_client(id));

-- ─── 3. Cegah eskalasi role via "User update profil sendiri" ─────────────────
-- Kolom sensitif hanya boleh diubah oleh superadmin (role, is_active),
-- staff (credit_balance), atau service_role (server / webhook).
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role (API server) & koneksi tanpa JWT (SQL editor) bebas
  IF auth.uid() IS NULL OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active)
     AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Hanya superadmin yang boleh mengubah role / status akun.';
  END IF;

  IF NEW.credit_balance IS DISTINCT FROM OLD.credit_balance AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Saldo kredit tidak boleh diubah langsung.';
  END IF;

  IF (NEW.referral_code IS DISTINCT FROM OLD.referral_code OR NEW.referred_by IS DISTINCT FROM OLD.referred_by)
     AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Data referral tidak boleh diubah.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_columns ON public.profiles;
CREATE TRIGGER profiles_protect_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- ─── 4. Perbaiki policy 'super_admin' ────────────────────────────────────────
DROP POLICY IF EXISTS "Super admin dapat mengubah layanan" ON public.services;
CREATE POLICY "Superadmin kelola layanan"
  ON public.services FOR ALL
  USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Super admin dapat mengubah paket" ON public.quota_packages;
CREATE POLICY "Superadmin kelola paket"
  ON public.quota_packages FOR ALL
  USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

-- Staff perlu melihat paket nonaktif juga
CREATE POLICY "Staff baca semua paket"
  ON public.quota_packages FOR SELECT USING (public.is_staff());
CREATE POLICY "Staff baca semua layanan"
  ON public.services FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Admin dapat membaca semua kuota" ON public.user_quotas;
CREATE POLICY "Staff baca semua kuota"
  ON public.user_quotas FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Admin dapat membaca semua file" ON public.uploaded_files;
CREATE POLICY "Staff baca semua file"
  ON public.uploaded_files FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Admin dapat membaca semua pesanan" ON public.orders;
CREATE POLICY "Staff baca semua pesanan"
  ON public.orders FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Admin dapat mengupdate pesanan" ON public.orders;
CREATE POLICY "Staff update pesanan"
  ON public.orders FOR UPDATE USING (public.is_staff());

DROP POLICY IF EXISTS "Admin dapat membaca semua transaksi" ON public.transactions;
CREATE POLICY "Staff baca semua transaksi"
  ON public.transactions FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Admin bisa kelola kelas" ON public.kelas_bimbingan;
CREATE POLICY "Staff kelola kelas"
  ON public.kelas_bimbingan FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Admin bisa kelola modul" ON public.kelas_modul;
CREATE POLICY "Staff kelola modul"
  ON public.kelas_modul FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Admin bisa kelola blog" ON public.blog_posts;
CREATE POLICY "Staff kelola blog"
  ON public.blog_posts FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Notifikasi: staff boleh baca semua
CREATE POLICY "Staff baca semua notifikasi"
  ON public.notifications FOR SELECT USING (public.is_staff());

-- Referral: staff boleh baca semua
CREATE POLICY "Staff baca semua referral"
  ON public.referrals FOR SELECT USING (public.is_staff());

-- Mentor boleh INSERT slot miliknya (policy FOR ALL lama tidak punya WITH CHECK eksplisit)
DROP POLICY IF EXISTS "Admin/Mentor kelola slot" ON public.booking_slots;
CREATE POLICY "Staff/Mentor kelola slot"
  ON public.booking_slots FOR ALL
  USING (public.is_staff() OR mentor_id = public.my_mentor_profile_id())
  WITH CHECK (public.is_staff() OR mentor_id = public.my_mentor_profile_id());

-- Mentor boleh INSERT mentor_profiles miliknya sendiri (kalau belum ada)
DROP POLICY IF EXISTS "Mentor buat profil sendiri" ON public.mentor_profiles;
CREATE POLICY "Mentor buat profil sendiri"
  ON public.mentor_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.current_user_role() = 'mentor');

-- Mentor baca profil sendiri walau sedang tidak aktif
DROP POLICY IF EXISTS "Mentor baca profil sendiri" ON public.mentor_profiles;
CREATE POLICY "Mentor baca profil sendiri"
  ON public.mentor_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- ─── 5. Tabel payments ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  midtrans_order_id  TEXT        UNIQUE NOT NULL,
  user_id            UUID        NOT NULL REFERENCES public.profiles(id),
  purpose            TEXT        NOT NULL CHECK (purpose IN ('order', 'package', 'booking')),
  -- orders.id | quota_packages.id | bookings.id
  reference_id       UUID        NOT NULL,
  amount_idr         INTEGER     NOT NULL CHECK (amount_idr > 0),
  status             TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded')),
  snap_token         TEXT,
  snap_redirect_url  TEXT,
  payment_type       TEXT,
  transaction_id     TEXT,
  raw_notification   JSONB,
  -- id hasil fulfilment (mis. user_quotas.id untuk pembelian paket)
  fulfilled_ref_id   UUID,
  paid_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payments IS
  'Semua transaksi Midtrans. Ditulis hanya oleh server (service_role).';

CREATE INDEX IF NOT EXISTS idx_payments_user      ON public.payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(purpose, reference_id);
CREATE INDEX IF NOT EXISTS idx_payments_status    ON public.payments(status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User baca pembayaran sendiri"
  ON public.payments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Staff baca semua pembayaran"
  ON public.payments FOR SELECT USING (public.is_staff());

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Transaksi untuk booking mentor
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_reference_type_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_reference_type_check
  CHECK (reference_type IN ('order', 'quota_package', 'booking'));

ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'booking_payment';

-- Pembelian paket menyimpan payment yang membuatnya
ALTER TABLE public.user_quotas
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id);

-- ─── 6. Cegah double-booking slot ────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_active_slot
  ON public.bookings(slot_id)
  WHERE status IN ('pending', 'confirmed', 'completed');

-- Rating/ulasan customer ditulis lewat /api/booking/[id]/review (service role),
-- bukan policy UPDATE, agar customer tidak bisa mengubah status/harga booking.

-- ─── 7. RPC kredit referral ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_credit_balance(user_id UUID, amount INTEGER)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET credit_balance = credit_balance + amount
   WHERE id = increment_credit_balance.user_id;
$$;

REVOKE ALL ON FUNCTION public.increment_credit_balance(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_credit_balance(UUID, INTEGER) TO service_role;

-- ─── 8. Atomik: kurangi kuota (dipakai /api/order) ───────────────────────────
CREATE OR REPLACE FUNCTION public.consume_quota(p_quota_id UUID, p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining INTEGER;
BEGIN
  UPDATE public.user_quotas
     SET quota_remaining = quota_remaining - 1
   WHERE id = p_quota_id
     AND user_id = p_user_id
     AND is_expired = false
     AND expires_at > now()
     AND quota_remaining > 0
  RETURNING quota_remaining INTO remaining;

  IF remaining IS NULL THEN
    RAISE EXCEPTION 'QUOTA_UNAVAILABLE';
  END IF;
  RETURN remaining;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_quota(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_quota(UUID, UUID) TO service_role;

-- ─── 9. Signup: simpan referred_by dari kode referral (?ref=RKS-XXXXX) ───────
-- Sebelumnya raw_user_meta_data.referral_code_used diabaikan sehingga komisi
-- referral tidak pernah bisa dikreditkan.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_referral_code TEXT;
  referrer UUID;
BEGIN
  LOOP
    new_referral_code := 'RKS-' || upper(substring(md5(random()::text), 1, 5));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE referral_code = new_referral_code
    );
  END LOOP;

  SELECT id INTO referrer
    FROM public.profiles
   WHERE referral_code = upper(trim(NEW.raw_user_meta_data->>'referral_code_used'))
   LIMIT 1;

  INSERT INTO public.profiles (id, full_name, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    new_referral_code,
    referrer
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$ BEGIN
  RAISE NOTICE '018_payments_and_role_fixes: migration berhasil.';
END $$;
