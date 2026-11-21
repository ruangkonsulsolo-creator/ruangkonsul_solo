-- 044: Harga minimum per pemeriksaan + layanan DrillBit (laporan manual).
-- Jalankan setelah 043.

-- ── Harga minimum ───────────────────────────────────────────────────────────
-- Biaya cek instan = MAX(harga_minimum_idr, ceil(kata/1000) × price_idr).
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS harga_minimum_idr INTEGER NOT NULL DEFAULT 0
    CHECK (harga_minimum_idr >= 0);

-- Cek AI: di bawah 5.000 kata Rp5.000, di atasnya Rp1.000 per 1.000 kata.
UPDATE public.services
   SET price_idr = 1000, harga_minimum_idr = 5000, updated_at = now()
 WHERE slug = 'cek-ai';

-- ── DrillBit (laporan diunggah tim, per berkas) ───────────────────────────
INSERT INTO public.services (slug, name, description, price_idr, is_active, sla_hours)
VALUES ('drillbit-manual', 'Cek DrillBit (Plagiasi + AI)',
        'Laporan DrillBit diperiksa & diunggah tim, per berkas.', 10000, true, 24)
ON CONFLICT (slug) DO NOTHING;
