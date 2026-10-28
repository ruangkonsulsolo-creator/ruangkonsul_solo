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
