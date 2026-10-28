-- Migration: 016_add_roles_mentor_banners
-- Rebrand Kalibri → Ruang Konsul Solo.
-- 1. Tambah role 'superadmin' dan 'mentor' ke tabel profiles
-- 2. Tabel mentor_profiles
-- 3. Tabel booking_slots + bookings
-- 4. Tabel banners
-- 5. Tabel merchandise + merchandise_orders

-- ─── 1. Update role constraint profiles ──────────────────────────────────────
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('superadmin', 'admin', 'mentor', 'user'));

COMMENT ON COLUMN public.profiles.role IS
  'superadmin = owner, admin = operator, mentor = pengajar, user = customer';

-- ─── 2. mentor_profiles ──────────────────────────────────────────────────────
CREATE TABLE public.mentor_profiles (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio               TEXT,
  specializations   TEXT[]      NOT NULL DEFAULT '{}',
  education         TEXT,
  experience_years  INTEGER     NOT NULL DEFAULT 0,
  price_per_hour    INTEGER     NOT NULL DEFAULT 0,
  is_available      BOOLEAN     NOT NULL DEFAULT true,
  rating_avg        NUMERIC(3,2) NOT NULL DEFAULT 0,
  session_count     INTEGER     NOT NULL DEFAULT 0,
  avatar_url        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.mentor_profiles IS
  'Data profil mentor yang bisa dilihat customer saat booking bimbingan.';

CREATE INDEX idx_mentor_profiles_user_id   ON public.mentor_profiles(user_id);
CREATE INDEX idx_mentor_profiles_available ON public.mentor_profiles(is_available);

ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;

-- Customer bisa baca semua mentor aktif
CREATE POLICY "Public bisa baca mentor aktif"
  ON public.mentor_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_id AND p.is_active = true
    )
  );

-- Mentor hanya bisa update profil sendiri
CREATE POLICY "Mentor update profil sendiri"
  ON public.mentor_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin/superadmin bisa semua
CREATE POLICY "Admin kelola mentor"
  ON public.mentor_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE TRIGGER mentor_profiles_updated_at
  BEFORE UPDATE ON public.mentor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 3. booking_slots ────────────────────────────────────────────────────────
CREATE TABLE public.booking_slots (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id    UUID    NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  slot_date    DATE    NOT NULL,
  slot_start   TIME    NOT NULL,
  slot_end     TIME    NOT NULL,
  is_blocked   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT booking_slots_unique UNIQUE (mentor_id, slot_date, slot_start)
);

COMMENT ON TABLE public.booking_slots IS
  'Slot waktu per mentor per hari. is_blocked=true = Full/tidak tersedia.';

CREATE INDEX idx_booking_slots_mentor_date ON public.booking_slots(mentor_id, slot_date);

ALTER TABLE public.booking_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public bisa baca slot"
  ON public.booking_slots FOR SELECT USING (true);

CREATE POLICY "Admin/Mentor kelola slot"
  ON public.booking_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      LEFT JOIN public.mentor_profiles mp ON mp.user_id = p.id
      WHERE p.id = auth.uid()
        AND (p.role IN ('admin', 'superadmin') OR mp.id = mentor_id)
    )
  );

-- ─── 4. bookings ─────────────────────────────────────────────────────────────
CREATE TYPE booking_status AS ENUM (
  'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
);

CREATE TABLE public.bookings (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number  TEXT           UNIQUE NOT NULL,
  customer_id     UUID           NOT NULL REFERENCES public.profiles(id),
  mentor_id       UUID           NOT NULL REFERENCES public.mentor_profiles(id),
  slot_id         UUID           NOT NULL REFERENCES public.booking_slots(id),
  service_id      UUID           REFERENCES public.services(id),
  status          booking_status NOT NULL DEFAULT 'pending',
  topic           TEXT,
  notes           TEXT,
  price_idr       INTEGER        NOT NULL DEFAULT 0,
  payment_method  TEXT,
  midtrans_order_id TEXT         UNIQUE,
  midtrans_snap_token TEXT,
  paid_at         TIMESTAMPTZ,
  confirmed_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT,
  meeting_link    TEXT,
  session_notes   TEXT,
  rating          INTEGER        CHECK (rating BETWEEN 1 AND 5),
  review          TEXT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_customer    ON public.bookings(customer_id);
CREATE INDEX idx_bookings_mentor      ON public.bookings(mentor_id);
CREATE INDEX idx_bookings_slot        ON public.bookings(slot_id);
CREATE INDEX idx_bookings_status      ON public.bookings(status);
CREATE INDEX idx_bookings_created_at  ON public.bookings(created_at DESC);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer baca booking sendiri"
  ON public.bookings FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Mentor baca booking ke dia"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mentor_profiles mp
      WHERE mp.id = mentor_id AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin baca semua booking"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admin update booking"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Mentor update booking ke dia"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.mentor_profiles mp
      WHERE mp.id = mentor_id AND mp.user_id = auth.uid()
    )
  );

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 5. banners ──────────────────────────────────────────────────────────────
CREATE TABLE public.banners (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  image_url   TEXT        NOT NULL,
  link_url    TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  created_by  UUID        REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.banners IS
  'Banner iklan horizontal di landing page. Upload via admin panel.';

CREATE INDEX idx_banners_active ON public.banners(is_active, sort_order);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public baca banner aktif"
  ON public.banners FOR SELECT
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at   IS NULL OR ends_at   >= now())
  );

CREATE POLICY "Admin kelola banner"
  ON public.banners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE TRIGGER banners_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 6. merchandise ──────────────────────────────────────────────────────────
CREATE TABLE public.merchandise (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  category    TEXT,
  price_idr   INTEGER     NOT NULL,
  stock       INTEGER     NOT NULL DEFAULT 0,
  images      TEXT[]      NOT NULL DEFAULT '{}',
  weight_gram INTEGER,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merchandise ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public baca merchandise aktif"
  ON public.merchandise FOR SELECT USING (is_active = true);

CREATE POLICY "Admin kelola merchandise"
  ON public.merchandise FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE TRIGGER merchandise_updated_at
  BEFORE UPDATE ON public.merchandise
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.merchandise_orders (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     TEXT        UNIQUE NOT NULL,
  customer_id      UUID        NOT NULL REFERENCES public.profiles(id),
  items            JSONB       NOT NULL,
  total_idr        INTEGER     NOT NULL,
  shipping_name    TEXT,
  shipping_address TEXT,
  shipping_phone   TEXT,
  status           TEXT        NOT NULL DEFAULT 'menunggu_pembayaran'
                   CHECK (status IN ('menunggu_pembayaran','dibayar','diproses','dikirim','selesai','dibatalkan')),
  midtrans_order_id TEXT       UNIQUE,
  midtrans_snap_token TEXT,
  paid_at          TIMESTAMPTZ,
  shipped_at       TIMESTAMPTZ,
  tracking_number  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_merch_orders_customer ON public.merchandise_orders(customer_id);

ALTER TABLE public.merchandise_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer baca order merch sendiri"
  ON public.merchandise_orders FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Admin kelola merch orders"
  ON public.merchandise_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE TRIGGER merch_orders_updated_at
  BEFORE UPDATE ON public.merchandise_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 7. Verifikasi ───────────────────────────────────────────────────────────
DO $$ BEGIN
  RAISE NOTICE '016_add_roles_mentor_banners: migration berhasil.';
END $$;
