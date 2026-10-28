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
