-- 048: Jasa dengan file hasil (mis. parafrase, olah data, formatting).
-- Alur: customer pilih jasa → bayar → (opsional) unggah naskah →
-- status "diproses maks 1x24 jam" → admin unggah file hasil → customer unduh.
-- Jalankan setelah 042 (bucket documents) dan 033 (pesanan_produk).

-- ── 1. Penanda jasa di produk katalog ───────────────────────────────────────
ALTER TABLE public.produk
  ADD COLUMN IF NOT EXISTS jasa_berkas     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimasi_proses TEXT CHECK (char_length(estimasi_proses) <= 40);

COMMENT ON COLUMN public.produk.jasa_berkas IS
  'true = jasa yang hasilnya berupa file; admin mengunggah hasil di Pesanan Produk.';

-- ── 2. Berkas di pesanan ────────────────────────────────────────────────────
-- Isi JSONB: [{ "path": "...", "nama": "...", "ukuran": 12345 }]
ALTER TABLE public.pesanan_produk
  ADD COLUMN IF NOT EXISTS jasa_berkas      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimasi_proses  TEXT,
  ADD COLUMN IF NOT EXISTS berkas_pelanggan JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS berkas_hasil     JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hasil_at         TIMESTAMPTZ;

-- ── 3. Bucket hasil jasa (privat) ───────────────────────────────────────────
-- Customer mengunduh lewat signed URL dari server, bukan akses langsung.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hasil-jasa', 'hasil-jasa', false, 52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip', 'application/x-zip-compressed',
    'text/csv', 'text/plain',
    'image/jpeg', 'image/png'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "hasil_jasa_staf_tulis" ON storage.objects;
CREATE POLICY "hasil_jasa_staf_tulis" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'hasil-jasa' AND public.is_staff());

DROP POLICY IF EXISTS "hasil_jasa_staf_ubah" ON storage.objects;
CREATE POLICY "hasil_jasa_staf_ubah" ON storage.objects
  FOR UPDATE USING (bucket_id = 'hasil-jasa' AND public.is_staff());

DROP POLICY IF EXISTS "hasil_jasa_staf_baca" ON storage.objects;
CREATE POLICY "hasil_jasa_staf_baca" ON storage.objects
  FOR SELECT USING (bucket_id = 'hasil-jasa' AND public.is_staff());

DROP POLICY IF EXISTS "hasil_jasa_staf_hapus" ON storage.objects;
CREATE POLICY "hasil_jasa_staf_hapus" ON storage.objects
  FOR DELETE USING (bucket_id = 'hasil-jasa' AND public.is_staff());

DO $$ BEGIN RAISE NOTICE '048_jasa_berkas: migration berhasil.'; END $$;
