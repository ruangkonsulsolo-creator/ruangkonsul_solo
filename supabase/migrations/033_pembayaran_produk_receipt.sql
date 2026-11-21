-- Migration: 033_pembayaran_produk_receipt
--
-- Pembayaran langsung via Midtrans untuk produk katalog (tabel `produk`):
--   1. payments          — satu baris per transaksi Midtrans (semua jenis)
--   2. Receipt           — nomor kwitansi unik otomatis saat lunas
--   3. pesanan_produk    — pesanan dari halaman /produk/[slug]
--   4. Reservasi stok    — untuk produk yang stoknya dihitung (stok NOT NULL)
--   5. rate_limits       — pembatas request lintas instance serverless
--
-- Bergantung pada fungsi dari migration sebelumnya: public.is_staff(), public.set_updated_at().

-- ─── 1. payments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  midtrans_order_id  TEXT        UNIQUE NOT NULL,
  user_id            UUID        NOT NULL REFERENCES public.profiles(id),
  purpose            TEXT        NOT NULL CHECK (purpose IN ('order', 'produk')),
  reference_id       UUID        NOT NULL,           -- orders.id | pesanan_produk.id
  amount_idr         INTEGER     NOT NULL CHECK (amount_idr > 0),
  status             TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded')),
  snap_token         TEXT,
  snap_redirect_url  TEXT,
  payment_type       TEXT,
  transaction_id     TEXT,
  raw_notification   JSONB,
  receipt_number     TEXT        UNIQUE,
  customer_snapshot  JSONB,                          -- {name, email, whatsapp}
  item_snapshot      JSONB,                          -- [{id, name, price, quantity}]
  paid_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user      ON public.payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(purpose, reference_id);
CREATE INDEX IF NOT EXISTS idx_payments_status    ON public.payments(status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payments_select_own   ON public.payments;
DROP POLICY IF EXISTS payments_select_staff ON public.payments;
CREATE POLICY payments_select_own   ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY payments_select_staff ON public.payments FOR SELECT USING (public.is_staff());
-- Tulis hanya lewat server (service role)

DROP TRIGGER IF EXISTS payments_updated_at ON public.payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 2. Receipt ──────────────────────────────────────────────────────────────
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

DROP TRIGGER IF EXISTS payments_assign_receipt ON public.payments;
CREATE TRIGGER payments_assign_receipt
  BEFORE INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.assign_receipt_number();

-- ─── 3. pesanan_produk ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pesanan_produk (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor               TEXT        UNIQUE NOT NULL,
  user_id             UUID        NOT NULL REFERENCES public.profiles(id),
  produk_id           UUID        NOT NULL REFERENCES public.produk(id) ON DELETE RESTRICT,
  -- snapshot saat checkout (harga/nama produk bisa berubah setelahnya)
  nama_produk         TEXT        NOT NULL,
  satuan              TEXT,
  harga_satuan        INTEGER     NOT NULL CHECK (harga_satuan > 0),
  jumlah              INTEGER     NOT NULL CHECK (jumlah BETWEEN 1 AND 100),
  subtotal            INTEGER     NOT NULL CHECK (subtotal > 0),
  ongkir              INTEGER     NOT NULL DEFAULT 0 CHECK (ongkir >= 0),
  total               INTEGER     NOT NULL CHECK (total > 0),
  whatsapp            TEXT        NOT NULL,
  catatan             TEXT,
  -- hanya untuk produk fisik (berat_gram NOT NULL)
  nama_penerima       TEXT,
  alamat              TEXT,
  kota                TEXT,
  kode_pos            TEXT,
  kurir               TEXT,
  no_resi             TEXT,
  status              TEXT        NOT NULL DEFAULT 'menunggu_pembayaran'
                      CHECK (status IN ('menunggu_pembayaran', 'dibayar', 'diproses', 'dikirim', 'selesai', 'dibatalkan')),
  stok_direservasi    BOOLEAN     NOT NULL DEFAULT false,
  midtrans_order_id   TEXT,
  midtrans_snap_token TEXT,
  catatan_admin       TEXT,
  paid_at             TIMESTAMPTZ,
  selesai_at          TIMESTAMPTZ,
  dibatalkan_at       TIMESTAMPTZ,
  alasan_batal        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pesanan_produk_user   ON public.pesanan_produk(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pesanan_produk_status ON public.pesanan_produk(status, created_at DESC);

DROP TRIGGER IF EXISTS pesanan_produk_updated_at ON public.pesanan_produk;
CREATE TRIGGER pesanan_produk_updated_at
  BEFORE UPDATE ON public.pesanan_produk
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.pesanan_produk ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pesanan_produk_select_own   ON public.pesanan_produk;
DROP POLICY IF EXISTS pesanan_produk_select_staff ON public.pesanan_produk;
CREATE POLICY pesanan_produk_select_own   ON public.pesanan_produk FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY pesanan_produk_select_staff ON public.pesanan_produk FOR SELECT USING (public.is_staff());

-- ─── 4. Reservasi stok (hanya produk dengan stok terhitung) ──────────────────
CREATE OR REPLACE FUNCTION public.reservasi_stok_produk(p_produk_id UUID, p_jumlah INTEGER)
RETURNS BOOLEAN   -- TRUE jika stok dikurangi, FALSE jika produk tanpa stok (dibuat setelah dipesan)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s INTEGER;
BEGIN
  SELECT stok INTO s FROM public.produk WHERE id = p_produk_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUK_TIDAK_AKTIF'; END IF;
  IF s IS NULL THEN RETURN false; END IF;
  IF s < p_jumlah THEN RAISE EXCEPTION 'STOK_TIDAK_CUKUP'; END IF;
  UPDATE public.produk SET stok = stok - p_jumlah WHERE id = p_produk_id;
  RETURN true;
END;
$$;

-- Kembalikan stok sekali saja per pesanan
CREATE OR REPLACE FUNCTION public.lepas_stok_pesanan(p_pesanan_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  UPDATE public.pesanan_produk
     SET stok_direservasi = false
   WHERE id = p_pesanan_id AND stok_direservasi = true
  RETURNING produk_id, jumlah INTO r;
  IF r.produk_id IS NOT NULL THEN
    UPDATE public.produk SET stok = stok + r.jumlah WHERE id = r.produk_id AND stok IS NOT NULL;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reservasi_stok_produk(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lepas_stok_pesanan(UUID)            FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reservasi_stok_produk(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.lepas_stok_pesanan(UUID)            TO service_role;

-- ─── 5. Rate limit ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key          TEXT        PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  hits         INTEGER     NOT NULL DEFAULT 0
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

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
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';
  END IF;
  RETURN current_hits <= p_max;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER) TO service_role;

DO $$ BEGIN
  RAISE NOTICE '033_pembayaran_produk_receipt: migration berhasil.';
END $$;
