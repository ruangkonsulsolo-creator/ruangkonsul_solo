-- 040: Slide banner hero di beranda, dikelola admin.
--
-- Sebelumnya tiga slide promo di kanan hero ditulis langsung di kode
-- (components/landing/HeroSlider.tsx). Sekarang disimpan di tabel ini dan
-- bisa ditambah, diganti, diurutkan, dinonaktifkan atau dihapus dari
-- /admin/banner. Gambar diunggah ke bucket public-assets.

CREATE TABLE IF NOT EXISTS public.hero_slides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url   TEXT NOT NULL CHECK (char_length(image_url) BETWEEN 1 AND 500),
  alt         TEXT CHECK (char_length(alt) <= 200),
  badge       TEXT CHECK (char_length(badge) <= 60),
  hook        TEXT CHECK (char_length(hook) <= 80),
  cta_label   TEXT CHECK (char_length(cta_label) <= 40),
  cta_href    TEXT CHECK (char_length(cta_href) <= 300),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hero_slides_urut ON public.hero_slides (is_active, sort_order);

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hero_slides_public_select" ON public.hero_slides;
CREATE POLICY "hero_slides_public_select" ON public.hero_slides
  FOR SELECT USING (is_active = true OR public.is_staff());

DROP POLICY IF EXISTS "hero_slides_staff_all" ON public.hero_slides;
CREATE POLICY "hero_slides_staff_all" ON public.hero_slides
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP TRIGGER IF EXISTS hero_slides_updated_at ON public.hero_slides;
CREATE TRIGGER hero_slides_updated_at
  BEFORE UPDATE ON public.hero_slides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Isi awal = tiga slide yang selama ini tampil (hanya bila tabel masih kosong).
INSERT INTO public.hero_slides (image_url, alt, badge, hook, cta_label, cta_href, sort_order)
SELECT * FROM (VALUES
  ('/promo-bimbingan.jpeg',  'Kelas Bimbingan Private — Ruang Konsul Solo', '🎓 Bimbingan Private', 'Sampai ACC Sidang!',   'Daftar Sekarang',  '/jadwal',      1),
  ('/promo-bundling.jpeg',   'Paket Bundling Hemat — Ruang Konsul Solo',    '💰 Paket Bundling',    'Hemat Lebih Banyak!',  'Lihat Paket',      '/paket-hemat', 2),
  ('/promo-konsultasi.jpeg', 'Konsultasi Skripsi — Ruang Konsul Solo',      '💬 Konsultasi Akademik','Konsultasi Langsung!', 'Mulai Konsultasi', '/jadwal',      3)
) AS v(image_url, alt, badge, hook, cta_label, cta_href, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.hero_slides);

-- ── Bucket gambar publik (dipakai juga oleh kelas bimbingan) ───────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('public-assets', 'public-assets', true, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "public_assets_baca" ON storage.objects;
CREATE POLICY "public_assets_baca" ON storage.objects
  FOR SELECT USING (bucket_id = 'public-assets');

DROP POLICY IF EXISTS "public_assets_staf_tulis" ON storage.objects;
CREATE POLICY "public_assets_staf_tulis" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'public-assets' AND public.is_staff());

DROP POLICY IF EXISTS "public_assets_staf_ubah" ON storage.objects;
CREATE POLICY "public_assets_staf_ubah" ON storage.objects
  FOR UPDATE USING (bucket_id = 'public-assets' AND public.is_staff());

DROP POLICY IF EXISTS "public_assets_staf_hapus" ON storage.objects;
CREATE POLICY "public_assets_staf_hapus" ON storage.objects
  FOR DELETE USING (bucket_id = 'public-assets' AND public.is_staff());
