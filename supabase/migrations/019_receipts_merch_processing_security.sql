-- Migration: 019_receipts_merch_processing_security
--
-- 1. Receipt: nomor kwitansi unik otomatis saat pembayaran lunas + snapshot data
-- 2. Merchandise: produk, pesanan merch, reservasi stok atomik
-- 3. Engine layanan: kolom pemrosesan di orders + repositori fingerprint similarity
-- 4. Rate limit berbasis DB (berlaku lintas instance serverless)
-- 5. Storage buckets yang dibutuhkan aplikasi

-- ─── 1. Receipt ──────────────────────────────────────────────────────────────
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS receipt_number    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS customer_snapshot JSONB,  -- {name, email, whatsapp}
  ADD COLUMN IF NOT EXISTS item_snapshot     JSONB;  -- [{id, name, price, quantity}]

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_purpose_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_purpose_check CHECK (purpose IN ('order', 'package', 'booking', 'merch'));

-- Format: RCP-YYYYMMDD-XXXXXXXX (tanggal WIB + 8 karakter acak tanpa 0/O/1/I)
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet CONSTANT TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  code TEXT;
  i INT;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(alphabet, 1 + floor(random() * 32)::int, 1);
    END LOOP;
    code := 'RCP-' || to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD') || '-' || code;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.payments WHERE receipt_number = code);
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_receipt_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'paid' AND NEW.receipt_number IS NULL THEN
    NEW.receipt_number := public.generate_receipt_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill pembayaran lunas sebelum migration ini
UPDATE public.payments SET receipt_number = public.generate_receipt_number()
 WHERE status = 'paid' AND receipt_number IS NULL;

DROP TRIGGER IF EXISTS payments_assign_receipt ON public.payments;
CREATE TRIGGER payments_assign_receipt
  BEFORE INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.assign_receipt_number();

-- ─── 2. Merchandise ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.merch_products (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT        UNIQUE NOT NULL,
  name          TEXT        NOT NULL,
  description   TEXT,
  category      TEXT,
  price_idr     INTEGER     NOT NULL CHECK (price_idr > 0),
  stock         INTEGER     NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url     TEXT,
  weight_grams  INTEGER     NOT NULL DEFAULT 200 CHECK (weight_grams > 0),
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER merch_products_updated_at
  BEFORE UPDATE ON public.merch_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.merch_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Publik baca produk aktif" ON public.merch_products FOR SELECT USING (is_active = true);
CREATE POLICY "Staff kelola produk" ON public.merch_products FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TABLE IF NOT EXISTS public.merch_orders (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number      TEXT        UNIQUE NOT NULL,
  user_id           UUID        NOT NULL REFERENCES public.profiles(id),
  -- [{product_id, name, price_idr, quantity}] — snapshot harga saat checkout
  items             JSONB       NOT NULL,
  subtotal_idr      INTEGER     NOT NULL CHECK (subtotal_idr > 0),
  shipping_fee_idr  INTEGER     NOT NULL DEFAULT 0 CHECK (shipping_fee_idr >= 0),
  total_idr         INTEGER     NOT NULL CHECK (total_idr > 0),
  recipient_name    TEXT        NOT NULL,
  recipient_phone   TEXT        NOT NULL,
  shipping_address  TEXT        NOT NULL,
  city              TEXT        NOT NULL,
  postal_code       TEXT        NOT NULL,
  notes             TEXT,
  status            TEXT        NOT NULL DEFAULT 'menunggu_pembayaran'
                    CHECK (status IN ('menunggu_pembayaran', 'dibayar', 'dikirim', 'selesai', 'dibatalkan')),
  courier           TEXT,
  tracking_number   TEXT,
  midtrans_order_id TEXT,
  midtrans_snap_token TEXT,
  stock_released    BOOLEAN     NOT NULL DEFAULT false,
  paid_at           TIMESTAMPTZ,
  shipped_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merch_orders_user   ON public.merch_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merch_orders_status ON public.merch_orders(status);

CREATE TRIGGER merch_orders_updated_at
  BEFORE UPDATE ON public.merch_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.merch_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User baca pesanan merch sendiri" ON public.merch_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff baca pesanan merch" ON public.merch_orders FOR SELECT USING (public.is_staff());
-- Tulis hanya lewat server (service role)

-- Reservasi stok atomik: semua item berhasil atau tidak sama sekali
CREATE OR REPLACE FUNCTION public.reserve_merch_stock(p_items JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it JSONB;
  updated INT;
BEGIN
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    UPDATE public.merch_products
       SET stock = stock - (it->>'quantity')::int
     WHERE id = (it->>'product_id')::uuid
       AND is_active = true
       AND stock >= (it->>'quantity')::int;
    GET DIAGNOSTICS updated = ROW_COUNT;
    IF updated = 0 THEN
      RAISE EXCEPTION 'OUT_OF_STOCK:%', it->>'product_id';
    END IF;
  END LOOP;
END;
$$;

-- Kembalikan stok (sekali saja per pesanan, ditandai stock_released)
CREATE OR REPLACE FUNCTION public.release_merch_stock(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  items_json JSONB;
  it JSONB;
BEGIN
  UPDATE public.merch_orders
     SET stock_released = true
   WHERE id = p_order_id AND stock_released = false
  RETURNING items INTO items_json;

  IF items_json IS NULL THEN RETURN; END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(items_json) LOOP
    UPDATE public.merch_products
       SET stock = stock + (it->>'quantity')::int
     WHERE id = (it->>'product_id')::uuid;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_merch_stock(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_merch_stock(UUID)  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_merch_stock(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_merch_stock(UUID)  TO service_role;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_reference_type_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_reference_type_check
  CHECK (reference_type IN ('order', 'quota_package', 'booking', 'merch'));
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'merch_payment';

-- Contoh produk (bisa diubah/dihapus dari Admin → Merchandise)
INSERT INTO public.merch_products (slug, name, description, category, price_idr, stock, sort_order) VALUES
  ('tumbler-rk-solo',         'Tumbler RK Solo',         'Tumbler stainless 500 ml dengan logo RK Solo.',                 'Aksesoris',  45000,  50, 1),
  ('hoodie-skripsi-survivor', 'Hoodie Skripsi Survivor', 'Hoodie premium bertuliskan "Skripsi Survivor".',               'Pakaian',    125000, 30, 2),
  ('notebook-bimbingan',      'Notebook Bimbingan',      'Notebook A5 120 halaman dengan template catatan bimbingan.',   'Stationery', 35000,  80, 3),
  ('sticker-pack-akademik',   'Sticker Pack Akademik',   '10 lembar stiker akademik untuk laptop dan botol minum.',      'Sticker',    20000,  150, 4),
  ('tote-bag-rk-solo',        'Tote Bag RK Solo',        'Tote bag kanvas tebal, kuat untuk buku dan laptop.',           'Aksesoris',  38000,  60, 5),
  ('mug-dosen-happy',         'Mug "Dosen Happy"',       'Mug keramik 330 ml, cocok jadi hadiah dosen pembimbing.',     'Aksesoris',  30000,  40, 6)
ON CONFLICT (slug) DO NOTHING;

-- ─── 3. Engine layanan ───────────────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS processing_attempts  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS output_storage_path  TEXT,   -- hasil parafrase (.docx)
  ADD COLUMN IF NOT EXISTS detection_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_processing
  ON public.orders(status, detection_started_at)
  WHERE status IN ('diproses', 'processing_failed');

-- Repositori fingerprint (seperti repositori Turnitin): hanya hash shingle per
-- chunk, TANPA teks dokumen — dokumen user lain tidak pernah bisa dibaca ulang.
CREATE TABLE IF NOT EXISTS public.document_fingerprints (
  id          BIGSERIAL   PRIMARY KEY,
  order_id    UUID        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chunk_index INTEGER     NOT NULL,
  hashes      INTEGER[]   NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_fingerprints_hashes ON public.document_fingerprints USING GIN (hashes);

ALTER TABLE public.document_fingerprints ENABLE ROW LEVEL SECURITY;
-- Tidak ada policy: hanya service role yang bisa membaca/menulis.

-- Cari chunk repositori yang paling banyak berbagi shingle dengan p_hashes
CREATE OR REPLACE FUNCTION public.match_fingerprints(
  p_hashes   INTEGER[],
  p_exclude_order UUID,
  p_exclude_user  UUID,
  p_limit    INTEGER DEFAULT 3
)
RETURNS TABLE (order_id UUID, chunk_index INTEGER, overlap INTEGER, total INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.order_id, f.chunk_index,
         cardinality(ARRAY(SELECT unnest(f.hashes) INTERSECT SELECT unnest(p_hashes)))::int AS overlap,
         cardinality(f.hashes) AS total
    FROM public.document_fingerprints f
   WHERE f.hashes && p_hashes
     AND f.order_id <> p_exclude_order
     AND f.user_id  <> p_exclude_user
   ORDER BY overlap DESC
   LIMIT p_limit
$$;

REVOKE ALL ON FUNCTION public.match_fingerprints(INTEGER[], UUID, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_fingerprints(INTEGER[], UUID, UUID, INTEGER) TO service_role;

-- ─── 4. Rate limit ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key          TEXT        PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  hits         INTEGER     NOT NULL DEFAULT 0
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- TRUE = masih boleh; FALSE = melebihi batas dalam jendela waktu
CREATE OR REPLACE FUNCTION public.rate_limit_hit(p_key TEXT, p_window_seconds INTEGER, p_max INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_hits INTEGER;
BEGIN
  INSERT INTO public.rate_limits AS r (key, window_start, hits)
  VALUES (p_key, now(), 1)
  ON CONFLICT (key) DO UPDATE
    SET hits = CASE WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN 1 ELSE r.hits + 1 END,
        window_start = CASE WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN now() ELSE r.window_start END
  RETURNING hits INTO current_hits;

  -- Bersihkan entri lama sesekali
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';
  END IF;

  RETURN current_hits <= p_max;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER) TO service_role;

-- ─── 5. Storage buckets (privat) ─────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit)
    VALUES ('documents', 'documents', false, 52428800),
           ('reports',   'reports',   false, 52428800)
    ON CONFLICT (id) DO UPDATE SET public = false;
  END IF;
END $$;

DO $$ BEGIN
  RAISE NOTICE '019_receipts_merch_processing_security: migration berhasil.';
END $$;
