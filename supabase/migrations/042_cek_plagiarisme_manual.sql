-- 042: Cek plagiarisme mode manual (laporan diunggah admin).
--
-- Customer mengunggah berkas naskah, memilih format laporan (tampilan baru /
-- lama) dan membayar per berkas lewat QRIS. Admin memeriksa, lalu
-- mengunggah PDF laporan + mengisi persentase kemiripan. Customer melihat
-- persentasenya dan mengunduh laporan dari Riwayat Pesanan.
-- Jalankan setelah 041.

-- ── Layanan & tarif per berkas ─────────────────────────────────────────────
INSERT INTO public.services (slug, name, description, price_idr, is_active, sla_hours)
VALUES
  ('plagiasi-manual', 'Cek Plagiarisme Manual (s.d. 100 halaman)',
   'Laporan kemiripan diperiksa & diunggah tim, per berkas sampai ±100 halaman (±25.000 kata).', 15000, true, 24),
  ('plagiasi-manual-besar', 'Cek Plagiarisme Manual (di atas 100 halaman)',
   'Laporan kemiripan diperiksa & diunggah tim, per berkas di atas ±100 halaman.', 20000, true, 24)
ON CONFLICT (slug) DO NOTHING;

-- ── Kolom tambahan pesanan ──────────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS format_laporan   TEXT CHECK (format_laporan IN ('baru', 'lama')),
  ADD COLUMN IF NOT EXISTS persen_kemiripan NUMERIC(5,2) CHECK (persen_kemiripan BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS jumlah_kata      INTEGER CHECK (jumlah_kata >= 0);

-- ── Bucket berkas (privat) ──────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documents', 'documents', false, 52428800,
   ARRAY['application/pdf', 'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('reports', 'reports', false, 31457280, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Naskah: pemilik mengunggah ke folder <user id>/..., staf boleh membaca.
DROP POLICY IF EXISTS "documents_pemilik_tulis" ON storage.objects;
CREATE POLICY "documents_pemilik_tulis" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "documents_pemilik_atau_staf_baca" ON storage.objects;
CREATE POLICY "documents_pemilik_atau_staf_baca" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff())
  );

-- Laporan: hanya staf yang menulis; unduhan customer lewat signed URL dari server.
DROP POLICY IF EXISTS "reports_staf_tulis" ON storage.objects;
CREATE POLICY "reports_staf_tulis" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'reports' AND public.is_staff());

DROP POLICY IF EXISTS "reports_staf_ubah" ON storage.objects;
CREATE POLICY "reports_staf_ubah" ON storage.objects
  FOR UPDATE USING (bucket_id = 'reports' AND public.is_staff());

DROP POLICY IF EXISTS "reports_staf_baca" ON storage.objects;
CREATE POLICY "reports_staf_baca" ON storage.objects
  FOR SELECT USING (bucket_id = 'reports' AND public.is_staff());
