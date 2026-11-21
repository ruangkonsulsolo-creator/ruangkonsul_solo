-- ─────────────────────────────────────────────────────────────────────────────
-- 024 — Selaraskan isi basis data dengan produk yang dijual sekarang
--
-- Dua masalah yang diperbaiki berkas ini:
--
--  1. Konfigurasi Paket Hemat masih memuat produk lama "Cek Plagiasi" dengan
--     paket Starter/Popular/Pro warisan Kalibri. Produk itu sudah tidak ada.
--
--  2. Kelola Kelas Bimbingan menampilkan 0 kelas, padahal halaman /bimbingan
--     memperlihatkan tujuh kelas. Penyebabnya: halaman itu memakai daftar
--     tertanam di kode sebagai cadangan, dan tabel kelas_bimbingan tidak
--     pernah diisi. Admin membaca tabel, pengunjung membaca kode — keduanya
--     tidak pernah bertemu.
--
-- Aman dijalankan berulang kali.
-- ─────────────────────────────────────────────────────────────────────────────

-- ══ 1. Produk lama dinonaktifkan, bukan dihapus ══════════════════════════════
-- Dihapus akan memutus pesanan lama yang menunjuk ke sana.

UPDATE public.quota_packages SET is_active = false
 WHERE service_id IN (
   SELECT id FROM public.services
    WHERE slug NOT IN ('cek-plagiarisme','cek-ai','parafrase','bimbingan-sesi')
 );

UPDATE public.services SET is_active = false
 WHERE slug NOT IN ('cek-plagiarisme','cek-ai','parafrase','bimbingan-sesi');

-- ══ 2. Layanan yang dijual sekarang ══════════════════════════════════════════
-- price_idr adalah harga satuan: per 1.000 kata untuk tiga yang pertama,
-- per sesi untuk bimbingan. Angkanya harus sama dengan TARIF di
-- lib/periksa/types.ts — kalau berbeda, etalase dan tagihan tidak sejalan.

INSERT INTO public.services (slug, name, description, price_idr, is_active, sla_hours)
VALUES
  ('cek-plagiarisme', 'Cek Plagiarisme',
   'Seberapa mirip tulisanmu dengan karya lain. Harga per 1.000 kata.',
   3300, true, 1),
  ('cek-ai', 'Cek Indikasi AI',
   'Seberapa mirip gayanya dengan tulisan mesin. Harga per 1.000 kata.',
   4500, true, 1),
  ('parafrase', 'Parafrase',
   'Susun ulang kalimat dengan bahasa sendiri. Harga per 1.000 kata.',
   1500, true, 1),
  ('bimbingan-sesi', 'Bimbingan 1-on-1',
   'Sesi bimbingan bersama mentor, 1 jam per sesi.',
   150000, true, 24)
ON CONFLICT (slug) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      price_idr   = EXCLUDED.price_idr,
      is_active   = true;

-- ══ 3. Paket hemat ═══════════════════════════════════════════════════════════
--
-- CATATAN PENTING SOAL DISKON
--
-- Cek Plagiarisme TIDAK diberi diskon, dan itu disengaja. Modalnya sekitar
-- Rp1.800 per 1.000 kata; pada lantai margin 45% harga terendah yang masih
-- sehat adalah Rp3.315, sementara harga jualnya sudah Rp3.300. Tidak ada
-- satu rupiah pun ruang diskon. Paketnya tetap ditawarkan, tapi nilainya
-- ada pada masa aktif yang lebih panjang, bukan potongan harga.
--
-- Cek AI dan Parafrase punya ruang lebar, jadi paketnya memang lebih murah
-- per 1.000 kata dibanding beli satuan.
--
-- quota_amount dihitung dalam satuan 1.000 kata untuk tiga layanan periksa,
-- dan dalam jumlah sesi untuk bimbingan.

WITH l AS (SELECT slug, id FROM public.services)
INSERT INTO public.quota_packages
  (name, service_id, quota_amount, price_idr, validity_days, is_active, is_popular)
SELECT v.name, l.id, v.kuota, v.harga, v.hari, true, v.populer
FROM (VALUES
  -- Cek Plagiarisme — harga satuan tetap Rp3.300, keuntungannya masa aktif
  ('Plagiarisme 10rb kata',  'cek-plagiarisme',  10,  33000,  60, false),
  ('Plagiarisme 30rb kata',  'cek-plagiarisme',  30,  99000, 120, false),
  ('Plagiarisme 100rb kata', 'cek-plagiarisme', 100, 330000, 365, false),
  -- Cek AI — Rp4.200 / Rp4.000 / Rp3.800 per 1.000 kata
  ('Cek AI 10rb kata',       'cek-ai',           10,  42000,  60, false),
  ('Cek AI 30rb kata',       'cek-ai',           30, 120000, 120,  true),
  ('Cek AI 100rb kata',      'cek-ai',          100, 380000, 365, false),
  -- Parafrase — Rp1.400 / Rp1.300 / Rp1.200 per 1.000 kata
  ('Parafrase 10rb kata',    'parafrase',        10,  14000,  60, false),
  ('Parafrase 30rb kata',    'parafrase',        30,  39000, 120, false),
  ('Parafrase 100rb kata',   'parafrase',       100, 120000, 365, false),
  -- Bimbingan — Rp140rb / Rp130rb / Rp125rb per sesi
  ('Bimbingan 4 sesi',       'bimbingan-sesi',    4, 560000,  60, false),
  ('Bimbingan 8 sesi',       'bimbingan-sesi',    8,1040000, 120,  true),
  ('Bimbingan 12 sesi',      'bimbingan-sesi',   12,1500000, 180, false)
) AS v(name, slug, kuota, harga, hari, populer)
JOIN l ON l.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.quota_packages q WHERE q.name = v.name
);

-- ══ 4. Kelas bimbingan ═══════════════════════════════════════════════════════
--
-- Disalin dari daftar cadangan di app/(marketing)/bimbingan/page.tsx supaya
-- panel admin dan halaman publik akhirnya membaca sumber yang sama.
--
-- rating dan review_count sengaja diisi 0, BUKAN angka yang tertulis di kode
-- (4.9 dengan 234 ulasan, dan seterusnya). Angka-angka itu tidak berasal dari
-- transaksi mana pun. Sejak migration 023 ada tabel ulasan yang sungguhan,
-- jadi biarkan angka ini terisi sendiri dari ulasan nyata. Kalau kamu ingin
-- angka lama dipakai lagi, ubah nilainya di bawah — tapi rating karangan
-- adalah informasi menyesatkan menurut UU No. 8/1999.

INSERT INTO public.kelas_bimbingan
  (tab, tag, tag_color, title, subtitle, description, image_url, harga,
   harga_coret, diskon_pct, jadwal, durasi, peserta, fitur, cta_label,
   wa_message, require_login, badge, badge_color, rating, review_count,
   is_active, sort_order)
SELECT * FROM (VALUES
  ('seminar'::kelas_tab, 'GRATIS', 'bg-brand text-white',
   'Seminar Online: Tips Lolos Sidang Skripsi', 'by Ruang Konsul Solo',
   'Seminar intensif 3 jam bersama mentor berpengalaman. Pelajari strategi lolos sidang, cara menurunkan plagiasi, dan persiapan mental.',
   NULL, 0, NULL, NULL, 'Setiap bulan', '3 jam', 'Terbuka umum',
   ARRAY['Materi eksklusif mentor','Sesi tanya jawab live','Rekaman acara','Sertifikat digital'],
   'Daftar Gratis', 'Halo Ruang Konsul Solo, saya ingin daftar seminar gratis',
   false, 'Populer', 'bg-amber-500 text-white', 0.0, 0, true, 1),

  ('skripsi'::kelas_tab, 'WEEKDAYS', 'bg-brand text-white',
   'Bimbingan Skripsi & Thesis — Paket Weekdays', 'Pendampingan BAB 1–5 sampai ACC Sidang',
   'Bimbingan intensif step by step dari judul, BAB 1–5, analisis data, hingga simulasi sidang. Aktif Senin–Jumat.',
   '/promo-bimbingan.jpeg', 3750000, 7500000, 50, 'Senin–Jumat', '1–3 bulan', 'Maks. 5 orang / mentor',
   ARRAY['Pendampingan judul + 5 literatur','Bimbingan BAB 1–3','Bimbingan BAB 4–5','8–20× Zoom','WA Coaching 09.00–20.30','Unlimited Revisi','Cek Turnitin 3×','PPTx Sidang + Script'],
   'Daftar Sekarang', 'Halo Ruang Konsul Solo, saya ingin bimbingan skripsi weekdays',
   true, 'Best Seller', 'bg-brand text-white', 0.0, 0, true, 2),

  ('skripsi'::kelas_tab, 'WEEKEND', 'bg-slate-700 text-white',
   'Bimbingan Skripsi & Thesis — Paket Weekend', 'Pendampingan BAB 1–5 sampai ACC Sidang',
   'Sama lengkapnya dengan paket Weekdays namun sesi bimbingan aktif di akhir pekan (Sabtu–Minggu).',
   '/promo-bimbingan.jpeg', 4499000, NULL, NULL, 'Sabtu–Minggu', '1–3 bulan', 'Maks. 5 orang / mentor',
   ARRAY['Semua fitur Paket Weekdays','Rekaman Zoom setiap sesi','Cek Turnitin 3×','PPTx Sidang + Script'],
   'Daftar Sekarang', 'Halo Ruang Konsul Solo, saya ingin bimbingan skripsi weekend',
   true, NULL, '', 0.0, 0, true, 3),

  ('lomba'::kelas_tab, 'KOMPETISI', 'bg-amber-600 text-white',
   'Bimbingan Lomba BPC & BCC', 'Business Plan & Business Case Competition',
   'Bimbingan intensif untuk memenangkan lomba BPC dan BCC. Dibimbing mentor berpengalaman juara kompetisi bisnis.',
   NULL, 1500000, NULL, NULL, 'Sesuai timeline lomba', '2–6 minggu', 'Tim 2–5 mahasiswa',
   ARRAY['Analisis brief dan strategi','Penyusunan business plan','Review feedback intensif','Latihan presentasi & pitch'],
   'Daftar Bimbingan', 'Halo Ruang Konsul Solo, saya ingin bimbingan BPC',
   true, NULL, '', 0.0, 0, true, 4),

  ('lomba'::kelas_tab, 'AKADEMIK', 'bg-brand text-white',
   'Bimbingan Lomba KTI, Essay & Paper', 'Karya Tulis Ilmiah · Essay Kompetisi · Paper Jurnal',
   'Bimbingan untuk lomba KTI, essay kompetisi, dan penulisan paper. Dari pemilihan topik hingga presentasi oral.',
   NULL, 999000, NULL, NULL, 'Sesuai deadline lomba', '1–4 minggu', 'Individu atau Tim',
   ARRAY['Konsultasi topik dan outline','Bimbingan penulisan per bab','Review tata bahasa','Cek plagiasi','Persiapan presentasi'],
   'Daftar Bimbingan', 'Halo Ruang Konsul Solo, saya ingin bimbingan KTI',
   true, NULL, '', 0.0, 0, true, 5),

  ('data'::kelas_tab, 'TEKNIS', 'bg-brand text-white',
   'Bimbingan SPSS & SmartPLS', 'Analisis Statistik untuk Skripsi & Tesis',
   'Kuasai SPSS dan SmartPLS untuk analisis regresi, SEM, path analysis. Interpretasi hasil dan penulisan BAB 4 termasuk.',
   NULL, 750000, NULL, NULL, 'Fleksibel', '2–4 sesi (2 jam/sesi)', 'Individu',
   ARRAY['SPSS: uji asumsi, regresi, korelasi','SmartPLS: SEM & path analysis','Interpretasi output','Penulisan BAB 4 & 5','Recording sesi'],
   'Daftar Bimbingan', 'Halo Ruang Konsul Solo, saya ingin bimbingan SPSS',
   true, 'Terlaris', 'bg-brand text-white', 0.0, 0, true, 6),

  ('data'::kelas_tab, 'TEKNIS', 'bg-brand text-white',
   'Bimbingan Python & R Studio', 'Data Processing, Visualisasi & Machine Learning',
   'Bimbingan penggunaan Python dan R untuk penelitian akademik, analisis data lanjutan, dan visualisasi ilmiah.',
   NULL, 850000, NULL, NULL, 'Fleksibel', '2–6 sesi (2 jam/sesi)', 'Individu',
   ARRAY['Python: pandas, numpy, matplotlib','R Studio: ggplot2, dplyr','Analisis data skripsi','Visualisasi & interpretasi','Recording sesi'],
   'Daftar Bimbingan', 'Halo Ruang Konsul Solo, saya ingin bimbingan Python',
   true, NULL, '', 0.0, 0, true, 7)
) AS v(tab, tag, tag_color, title, subtitle, description, image_url, harga,
       harga_coret, diskon_pct, jadwal, durasi, peserta, fitur, cta_label,
       wa_message, require_login, badge, badge_color, rating, review_count,
       is_active, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.kelas_bimbingan k WHERE k.title = v.title
);
