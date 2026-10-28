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
