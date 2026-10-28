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
