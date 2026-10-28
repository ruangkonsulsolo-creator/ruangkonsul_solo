-- Migration: 017_booking_leads
-- Tabel untuk lead booking dari Native (tanpa login)

CREATE TABLE public.booking_leads (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nama       TEXT        NOT NULL,
  prodi      TEXT,
  whatsapp   TEXT        NOT NULL,
  mentor_id  UUID        REFERENCES public.mentor_profiles(id),
  tanggal    DATE,
  jam        TEXT,
  kebutuhan  TEXT[]      NOT NULL DEFAULT '{}',
  catatan    TEXT,
  source     TEXT        NOT NULL DEFAULT 'website',
  is_processed BOOLEAN   NOT NULL DEFAULT false,
  processed_by UUID      REFERENCES public.profiles(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_leads_unprocessed ON public.booking_leads(created_at DESC) WHERE is_processed = false;

ALTER TABLE public.booking_leads ENABLE ROW LEVEL SECURITY;

-- Tidak ada akses publik — hanya admin yang bisa baca via service_role
CREATE POLICY "Admin baca booking leads"
  ON public.booking_leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admin update booking leads"
  ON public.booking_leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

COMMENT ON TABLE public.booking_leads IS
  'Lead booking dari native user (tanpa akun). Admin follow-up via WhatsApp.';
