-- Migration: 001_create_profiles
-- Extends auth.users dengan data profil tambahan

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  whatsapp      TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by   UUID REFERENCES public.profiles(id),
  credit_balance INTEGER NOT NULL DEFAULT 0,
  role          TEXT NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'admin', 'superadmin')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User dapat membaca profil sendiri"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "User dapat mengupdate profil sendiri"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admin dapat membaca semua profil"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create profile saat user mendaftar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_referral_code TEXT;
BEGIN
  LOOP
    new_referral_code := 'RKS-' || upper(substring(md5(random()::text), 1, 5));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE referral_code = new_referral_code
    );
  END LOOP;

  INSERT INTO public.profiles (id, full_name, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    new_referral_code
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Migration: 002_create_services

CREATE TABLE public.services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  price_idr         INTEGER NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  max_file_size_mb  INTEGER NOT NULL DEFAULT 50,
  allowed_formats   TEXT[] NOT NULL DEFAULT '{pdf,docx,doc}',
  sla_hours         INTEGER NOT NULL DEFAULT 24,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Public read (untuk landing page pricing tanpa auth)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Siapa saja dapat membaca layanan aktif"
  ON public.services FOR SELECT
  USING (is_active = true);

CREATE POLICY "Super admin dapat mengubah layanan"
  ON public.services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
-- Migration: 003_create_quota_packages

CREATE TABLE public.quota_packages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  service_id    UUID NOT NULL REFERENCES public.services(id),
  quota_amount  INTEGER NOT NULL CHECK (quota_amount > 0),
  price_idr     INTEGER NOT NULL CHECK (price_idr > 0),
  validity_days INTEGER NOT NULL CHECK (validity_days > 0),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  is_popular    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quota_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Siapa saja dapat membaca paket aktif"
  ON public.quota_packages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Super admin dapat mengubah paket"
  ON public.quota_packages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
-- Migration: 004_create_user_quotas

CREATE TABLE public.user_quotas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_id        UUID NOT NULL REFERENCES public.quota_packages(id),
  service_id        UUID NOT NULL REFERENCES public.services(id),
  quota_remaining   INTEGER NOT NULL CHECK (quota_remaining >= 0),
  quota_total       INTEGER NOT NULL,
  purchased_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL,
  is_expired        BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT quota_remaining_lte_total CHECK (quota_remaining <= quota_total)
);

CREATE INDEX idx_user_quotas_user_id ON public.user_quotas(user_id);
CREATE INDEX idx_user_quotas_expires_at ON public.user_quotas(expires_at);
CREATE INDEX idx_user_quotas_active ON public.user_quotas(user_id, service_id, is_expired);

ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User dapat membaca kuota sendiri"
  ON public.user_quotas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin dapat membaca semua kuota"
  ON public.user_quotas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
-- Migration: 005_create_uploaded_files

CREATE TABLE public.uploaded_files (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_name     TEXT NOT NULL,
  storage_path      TEXT NOT NULL,
  file_size_bytes   BIGINT NOT NULL,
  mime_type         TEXT NOT NULL,
  page_count        INTEGER,
  word_count        INTEGER,
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted        BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_uploaded_files_user_id ON public.uploaded_files(user_id);

ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User dapat membaca file sendiri"
  ON public.uploaded_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "User dapat mengupload file"
  ON public.uploaded_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin dapat membaca semua file"
  ON public.uploaded_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
-- Migration: 006_create_orders

CREATE TYPE order_status AS ENUM (
  'menunggu_pembayaran',
  'dibayar',
  'diproses',
  'selesai',
  'dibatalkan'
);

CREATE TABLE public.orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number          TEXT UNIQUE NOT NULL,
  user_id               UUID NOT NULL REFERENCES public.profiles(id),
  service_id            UUID NOT NULL REFERENCES public.services(id),
  file_id               UUID NOT NULL REFERENCES public.uploaded_files(id),

  price_idr             INTEGER NOT NULL DEFAULT 0,
  used_quota_id         UUID REFERENCES public.user_quotas(id),

  status                order_status NOT NULL DEFAULT 'menunggu_pembayaran',
  payment_method        TEXT CHECK (payment_method IN ('quota', 'midtrans')),
  midtrans_order_id     TEXT UNIQUE,
  midtrans_snap_token   TEXT,
  paid_at               TIMESTAMPTZ,

  assigned_admin_id     UUID REFERENCES public.profiles(id),
  admin_notes           TEXT,
  processed_at          TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancel_reason         TEXT,

  report_storage_path   TEXT,
  report_uploaded_at    TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_orders_midtrans ON public.orders(midtrans_order_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User dapat membaca pesanan sendiri"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin dapat membaca semua pesanan"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin dapat mengupdate pesanan"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- Migration: 007_create_transactions

CREATE TYPE transaction_type AS ENUM (
  'order_payment',
  'package_purchase',
  'referral_credit',
  'credit_redemption'
);

CREATE TABLE public.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  type            transaction_type NOT NULL,
  amount_idr      INTEGER NOT NULL,
  reference_id    UUID,
  reference_type  TEXT CHECK (reference_type IN ('order', 'quota_package')),
  gateway_ref     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User dapat membaca transaksi sendiri"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin dapat membaca semua transaksi"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
-- Migration: 008_create_referrals

CREATE TABLE public.referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID NOT NULL REFERENCES public.profiles(id),
  referred_id     UUID NOT NULL REFERENCES public.profiles(id),
  order_id        UUID REFERENCES public.orders(id),
  commission_idr  INTEGER NOT NULL DEFAULT 0,
  is_credited     BOOLEAN NOT NULL DEFAULT false,
  credited_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(referrer_id, referred_id),
  CONSTRAINT referrer_ne_referred CHECK (referrer_id != referred_id)
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User dapat membaca referral sendiri"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);
-- Migration: 009_create_notifications

CREATE TYPE notification_channel AS ENUM ('in_app', 'whatsapp', 'email');

CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES public.orders(id),
  channel     notification_channel NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read)
  WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User dapat membaca notifikasi sendiri"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "User dapat menandai notifikasi sebagai dibaca"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);
-- Migration: 010_seed_services
-- Data awal layanan dan paket hemat

INSERT INTO public.services (slug, name, description, price_idr, sla_hours, max_file_size_mb, allowed_formats)
VALUES
  (
    'plagiasi',
    'Cek Plagiasi',
    'Deteksi kemiripan teks dokumen kamu dengan laporan persentase lengkap.',
    35000, 24, 50, '{pdf,docx,doc}'
  ),
  (
    'ai-detector',
    'AI Detector',
    'Identifikasi proporsi teks yang ditulis oleh AI dalam dokumenmu.',
    25000, 12, 50, '{pdf,docx,doc}'
  ),
  (
    'drillbit',
    'DrillBit Checker',
    'Cek plagiasi menggunakan mesin DrillBit, digunakan kampus-kampus Indonesia.',
    45000, 48, 20, '{pdf,docx}'
  ),
  (
    'parafrase',
    'Jasa Parafrase',
    'Penulisan ulang dokumen secara profesional oleh tim Kalibri.',
    75000, 72, 50, '{pdf,docx,doc}'
  );

-- Paket hemat untuk Cek Plagiasi
INSERT INTO public.quota_packages (name, service_id, quota_amount, price_idr, validity_days, is_active, is_popular)
SELECT
  p.name, s.id, p.quota_amount, p.price_idr, p.validity_days, true, p.is_popular
FROM (
  VALUES
    ('Starter',  10, 299000,  30, false),
    ('Popular',  25, 625000,  60, true),
    ('Pro',      50, 1100000, 90, false)
) AS p(name, quota_amount, price_idr, validity_days, is_popular)
CROSS JOIN public.services s
WHERE s.slug = 'plagiasi';

-- Paket hemat untuk AI Detector
INSERT INTO public.quota_packages (name, service_id, quota_amount, price_idr, validity_days, is_active, is_popular)
SELECT
  p.name, s.id, p.quota_amount, p.price_idr, p.validity_days, true, p.is_popular
FROM (
  VALUES
    ('AI Starter', 10, 199000, 30, false),
    ('AI Pro',     25, 450000, 60, true)
) AS p(name, quota_amount, price_idr, validity_days, is_popular)
CROSS JOIN public.services s
WHERE s.slug = 'ai-detector';
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
-- Migration: 012_create_blog_posts
-- Tabel untuk artikel blog yang bisa di-CRUD dari admin panel

CREATE TABLE public.blog_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  excerpt      TEXT,
  content      TEXT NOT NULL,          -- Markdown
  cover_url    TEXT,                   -- URL gambar cover
  category     TEXT NOT NULL DEFAULT 'Panduan Akademik',
  read_time    TEXT NOT NULL DEFAULT '5 menit',
  author       TEXT NOT NULL DEFAULT 'Tim Kalibri',
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by   UUID REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_published ON public.blog_posts(is_published, published_at DESC);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Semua orang bisa baca artikel yang dipublish
CREATE POLICY "Public bisa baca artikel published"
  ON public.blog_posts FOR SELECT
  USING (is_published = true);

-- Admin bisa CRUD semua
CREATE POLICY "Admin bisa kelola blog"
  ON public.blog_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── STORAGE BUCKETS ─────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('documents',     'documents',     false),
  ('reports',       'reports',       false),
  ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: user hanya bisa upload ke folder miliknya
CREATE POLICY "User upload dokumen sendiri"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "User baca dokumen sendiri"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public baca public-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-assets');

CREATE POLICY "Admin upload public-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'public-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- ─── SETUP SUPERADMIN ────────────────────────────────────────────────────────
-- Jalankan SETELAH mendaftar akun via /daftar di aplikasi.
-- Ganti 'EMAIL_ANDA@gmail.com' dengan email yang sudah didaftarkan.
--
-- UPDATE public.profiles
-- SET role = 'superadmin', full_name = 'Super Admin'
-- WHERE id = (
--   SELECT id FROM auth.users WHERE email = 'EMAIL_ANDA@gmail.com'
-- );
