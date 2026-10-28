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
