-- 041: Slide "Paket Layanan" di beranda + unggah foto mentor.
-- Jalankan setelah 040 (memakai bucket public-assets).

-- ── 1. Paket promo (khusus jasa) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.paket_promo (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul        TEXT NOT NULL CHECK (char_length(judul) BETWEEN 2 AND 120),
  harga_mulai  INTEGER NOT NULL CHECK (harga_mulai >= 0),
  satuan       TEXT NOT NULL DEFAULT 'per-paket' CHECK (char_length(satuan) <= 40),
  kategori     TEXT CHECK (char_length(kategori) <= 60),
  image_url    TEXT NOT NULL CHECK (char_length(image_url) BETWEEN 1 AND 500),
  fitur        TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(fitur) <= 8),
  cta_label    TEXT NOT NULL DEFAULT 'Lihat Detail' CHECK (char_length(cta_label) <= 40),
  cta_href     TEXT NOT NULL DEFAULT '/jadwal' CHECK (char_length(cta_href) <= 300),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paket_promo_urut ON public.paket_promo (is_active, sort_order);
ALTER TABLE public.paket_promo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paket_promo_public_select" ON public.paket_promo;
CREATE POLICY "paket_promo_public_select" ON public.paket_promo
  FOR SELECT USING (is_active = true OR public.is_staff());

DROP POLICY IF EXISTS "paket_promo_staff_all" ON public.paket_promo;
CREATE POLICY "paket_promo_staff_all" ON public.paket_promo
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP TRIGGER IF EXISTS paket_promo_updated_at ON public.paket_promo;
CREATE TRIGGER paket_promo_updated_at
  BEFORE UPDATE ON public.paket_promo
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Isi awal dari poster yang sudah ada (bisa diganti admin).
INSERT INTO public.paket_promo (judul, harga_mulai, satuan, kategori, image_url, fitur, cta_label, cta_href, sort_order)
SELECT * FROM (VALUES
  ('Bimbingan Skripsi & Tesis', 50000, 'per-jam', 'Layanan Utama', '/promo-bimbingan.jpeg',
   ARRAY['Untuk skripsi, tesis & disertasi', 'Pilih mentor sesuai bidang', 'Sesi online atau tatap muka', 'Dibimbing sampai paham'],
   'Pilih Jadwal', '/jadwal', 1),
  ('Paket Bundling Hemat', 150000, 'per-paket', 'Layanan Utama', '/promo-bundling.jpeg',
   ARRAY['Gabungan beberapa sesi', 'Lebih hemat dari per jam', 'Jadwal diatur bersama mentor'],
   'Lihat Paket', '/paket-hemat', 2),
  ('Konsultasi Akademik', 50000, 'per-sesi', 'Layanan Pendukung', '/promo-konsultasi.jpeg',
   ARRAY['Judul, outline & metode', 'Olah data & interpretasi', 'Simulasi sidang'],
   'Mulai Konsultasi', '/jadwal', 3),
  ('Parafrase & Cek Naskah', 1500, 'per-1000 kata', 'Layanan Pendukung', '/promo-parafrase.jpeg',
   ARRAY['Cek plagiarisme & AI', 'Parafrase real-time', 'Bayar sesuai jumlah kata'],
   'Coba Sekarang', '/layanan', 4)
) AS v(judul, harga_mulai, satuan, kategori, image_url, fitur, cta_label, cta_href, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.paket_promo);

-- ── 2. Mentor boleh mengunggah fotonya sendiri ─────────────────────────────
-- Hanya ke folder mentor/<user id>/ di bucket public-assets.
DROP POLICY IF EXISTS "public_assets_mentor_foto_tulis" ON storage.objects;
CREATE POLICY "public_assets_mentor_foto_tulis" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'public-assets'
    AND name LIKE 'mentor/' || auth.uid()::text || '/%'
    AND public.is_mentor()
  );

DROP POLICY IF EXISTS "public_assets_mentor_foto_hapus" ON storage.objects;
CREATE POLICY "public_assets_mentor_foto_hapus" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'public-assets'
    AND name LIKE 'mentor/' || auth.uid()::text || '/%'
  );
