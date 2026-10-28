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
