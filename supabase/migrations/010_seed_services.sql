-- Migration: 010_seed_services
-- Data awal layanan dan paket hemat

INSERT INTO public.services (slug, name, description, price_idr, sla_hours, max_file_size_mb, allowed_formats)
VALUES
  (
    'plagiasi',
    'Cek Plagiasi',
    'Deteksi kemiripan teks dokumen kamu dengan laporan persentase lengkap.',
    35000, 24, 50, '{pdf,docx,doc}'
  ),
  (
    'ai-detector',
    'AI Detector',
    'Identifikasi proporsi teks yang ditulis oleh AI dalam dokumenmu.',
    25000, 12, 50, '{pdf,docx,doc}'
  ),
  (
    'drillbit',
    'DrillBit Checker',
    'Cek plagiasi menggunakan mesin DrillBit, digunakan kampus-kampus Indonesia.',
    45000, 48, 20, '{pdf,docx}'
  ),
  (
    'parafrase',
    'Jasa Parafrase',
    'Penulisan ulang dokumen secara profesional oleh tim Kalibri.',
    75000, 72, 50, '{pdf,docx,doc}'
  );

-- Paket hemat untuk Cek Plagiasi
INSERT INTO public.quota_packages (name, service_id, quota_amount, price_idr, validity_days, is_active, is_popular)
SELECT
  p.name, s.id, p.quota_amount, p.price_idr, p.validity_days, true, p.is_popular
FROM (
  VALUES
    ('Starter',  10, 299000,  30, false),
    ('Popular',  25, 625000,  60, true),
    ('Pro',      50, 1100000, 90, false)
) AS p(name, quota_amount, price_idr, validity_days, is_popular)
CROSS JOIN public.services s
WHERE s.slug = 'plagiasi';

-- Paket hemat untuk AI Detector
INSERT INTO public.quota_packages (name, service_id, quota_amount, price_idr, validity_days, is_active, is_popular)
SELECT
  p.name, s.id, p.quota_amount, p.price_idr, p.validity_days, true, p.is_popular
FROM (
  VALUES
    ('AI Starter', 10, 199000, 30, false),
    ('AI Pro',     25, 450000, 60, true)
) AS p(name, quota_amount, price_idr, validity_days, is_popular)
CROSS JOIN public.services s
WHERE s.slug = 'ai-detector';
