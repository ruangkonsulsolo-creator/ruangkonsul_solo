-- Migration: 011_create_kelas_bimbingan
-- Tabel untuk manajemen kelas bimbingan yang bisa di-CRUD oleh admin

CREATE TYPE kelas_tab AS ENUM ('seminar', 'skripsi', 'lomba', 'data');
CREATE TYPE kelas_jadwal_type AS ENUM ('weekdays', 'weekend', 'fleksibel', 'sesuai_lomba');

CREATE TABLE public.kelas_bimbingan (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tab              kelas_tab NOT NULL,
  tag              TEXT NOT NULL,                    -- "GRATIS", "WEEKDAYS", dll
  tag_color        TEXT NOT NULL DEFAULT 'bg-brand text-white',
  title            TEXT NOT NULL,
  subtitle         TEXT,
  description      TEXT NOT NULL,
  image_url        TEXT,                             -- URL foto produk di Supabase Storage
  harga            INTEGER NOT NULL DEFAULT 0,       -- 0 = gratis
  harga_coret      INTEGER,                          -- harga asli sebelum diskon
  diskon_pct       INTEGER,                          -- persentase diskon (mis: 50)
  jadwal           TEXT NOT NULL,
  durasi           TEXT NOT NULL,
  peserta          TEXT NOT NULL,
  fitur            TEXT[] NOT NULL DEFAULT '{}',     -- array fitur
  cta_label        TEXT NOT NULL DEFAULT 'Daftar Sekarang',
  wa_message       TEXT NOT NULL,                    -- pesan WA yang pre-filled
  require_login    BOOLEAN NOT NULL DEFAULT true,
  badge            TEXT,                             -- "Best Seller", "Populer", dll
  badge_color      TEXT DEFAULT 'bg-brand text-white',
  rating           NUMERIC(2,1) DEFAULT 5.0,
  review_count     INTEGER DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  sort_order       INTEGER NOT NULL DEFAULT 0,       -- urutan tampil
  created_by       UUID REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kelas_bimbingan_tab ON public.kelas_bimbingan(tab);
CREATE INDEX idx_kelas_bimbingan_active ON public.kelas_bimbingan(is_active, sort_order);

-- Tabel modul untuk setiap kelas
CREATE TABLE public.kelas_modul (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kelas_id         UUID NOT NULL REFERENCES public.kelas_bimbingan(id) ON DELETE CASCADE,
  judul            TEXT NOT NULL,
  deskripsi        TEXT,
  urutan           INTEGER NOT NULL DEFAULT 0,
  is_free          BOOLEAN NOT NULL DEFAULT false,   -- preview gratis atau tidak
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kelas_modul_kelas ON public.kelas_modul(kelas_id, urutan);

-- RLS
ALTER TABLE public.kelas_bimbingan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas_modul ENABLE ROW LEVEL SECURITY;

-- Semua orang bisa baca kelas yang aktif
CREATE POLICY "Public bisa baca kelas aktif"
  ON public.kelas_bimbingan FOR SELECT
  USING (is_active = true);

-- Admin bisa CRUD semua
CREATE POLICY "Admin bisa kelola kelas"
  ON public.kelas_bimbingan FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Public bisa baca modul"
  ON public.kelas_modul FOR SELECT USING (true);

CREATE POLICY "Admin bisa kelola modul"
  ON public.kelas_modul FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Trigger updated_at
CREATE TRIGGER kelas_bimbingan_updated_at
  BEFORE UPDATE ON public.kelas_bimbingan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
