-- Migration: 014_orders_add_detection_fields
-- Tambah kolom untuk menyimpan hasil detection engine dan status baru.
--
-- Strategi: ALTER TABLE non-destructive — hanya tambah kolom baru.
-- Tidak ada kolom yang dihapus atau diubah tipenya.

-- ─── 1. Tambah status baru ke enum order_status ───────────────────────────────
--
-- PostgreSQL tidak bisa DROP nilai ENUM yang sudah ada, tapi bisa ADD VALUE.
-- 'processing_failed' dipakai ketika detection engine gagal (timeout/down)
-- tapi order tetap tersimpan — admin bisa trigger retry manual.

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'processing_failed'
  AFTER 'diproses';

-- ─── 2. Tambah kolom result (jsonb) ──────────────────────────────────────────
--
-- Menyimpan full DetectionResult dari engine.
-- jsonb dipilih karena:
--   - Bisa di-query dengan operator @>, ?, dll. (misal cari semua order dengan
--     overall_similarity > 30: result->>'overall_similarity' > '30')
--   - Terkompresi lebih efisien dari json biasa
--   - NULL jika belum diproses atau processing_failed

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS result jsonb DEFAULT NULL;

COMMENT ON COLUMN public.orders.result IS
  'Hasil DetectionResult dari detection-engine. NULL jika belum diproses. '
  'Struktur: { overall_similarity, word_count, segments, top_sources, metadata }';

-- ─── 3. Tambah kolom detection_started_at ────────────────────────────────────
-- Untuk tracking durasi dan debugging (kapan detection dimulai vs selesai)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS detection_started_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.orders.detection_started_at IS
  'Timestamp saat detection engine mulai memproses. NULL jika belum dimulai.';

-- ─── 4. Tambah kolom detection_error ─────────────────────────────────────────
-- Simpan pesan error jika status = 'processing_failed', untuk keperluan debugging
-- dan retry manual oleh admin.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS detection_error text DEFAULT NULL;

COMMENT ON COLUMN public.orders.detection_error IS
  'Pesan error dari detection engine jika status = processing_failed. '
  'Format: "errorType: message". NULL jika tidak ada error.';

-- ─── 5. Index untuk query result ─────────────────────────────────────────────
-- Membantu query analitik: cari order dengan similarity tinggi, dll.

-- Index pada kolom result untuk GIN (General Inverted Index) — mendukung
-- operator @>, ?, ?|, ?& pada jsonb
CREATE INDEX IF NOT EXISTS idx_orders_result_gin
  ON public.orders
  USING gin (result)
  WHERE result IS NOT NULL;

-- Index untuk filter orders yang processing_failed (untuk retry queue admin)
CREATE INDEX IF NOT EXISTS idx_orders_processing_failed
  ON public.orders (created_at DESC)
  WHERE status = 'processing_failed';

COMMENT ON INDEX public.idx_orders_result_gin IS
  'GIN index untuk query jsonb pada kolom result. '
  'Contoh: SELECT * FROM orders WHERE result @> ''{"overall_similarity": 80}'';';

-- ─── 6. Update RLS (tidak ada perubahan) ─────────────────────────────────────
-- Policy yang ada di migration 006 sudah cover semua kolom baru:
--   - User hanya bisa SELECT order milik sendiri → kolom result ikut terbaca
--   - Admin bisa SELECT + UPDATE semua → bisa update result
-- Tidak perlu policy tambahan.

-- ─── Verifikasi ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  -- Pastikan semua kolom berhasil ditambahkan
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'result'
  ) THEN
    RAISE EXCEPTION 'Kolom result tidak ditemukan di tabel orders';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'detection_error'
  ) THEN
    RAISE EXCEPTION 'Kolom detection_error tidak ditemukan di tabel orders';
  END IF;

  RAISE NOTICE '014_orders_add_detection_fields: migration berhasil.';
END $$;
