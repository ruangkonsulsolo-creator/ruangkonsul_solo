-- Migration: 031_seed_katalog
--
-- Isi katalog dari lima dokumen produk yang diberikan pemilik pada
-- 8 November 2026: Merchandise_RK, Bimbingan_Online_Main_Home_Beranda_Layanan,
-- Bimbingan_Online_Bulanan_Subscription, Layanan_Utama_Sementara, dan
-- Paket_Hemat_Bimbingan_Kejar_Lulus.
--
-- Beberapa kolom sengaja dibiarkan kosong, bukan ditebak:
--
--   gambar      — belum ada foto produk. Diunggah lewat panel admin.
--   berat_gram  — tidak ada di dokumen. Angka karangan di sini akan jadi
--                 ongkir yang salah dan selisihnya ditanggung penjual.
--   stok        — NULL berarti "dibuat setelah dipesan". Semua produk
--                 merchandise buatan tangan, jadi ini default yang jujur
--                 sampai pemilik menghitung stok siap kirimnya.
--   fitur Paket Hemat — dokumen menulis "(isi sesuai di poster)" dan
--                 posternya tidak ikut dikirim.
--
-- Aman dijalankan ulang: ON CONFLICT (slug) DO UPDATE.

-- ═══ Etalase ═══════════════════════════════════════════════════════════════

INSERT INTO public.etalase (slug, nama, deskripsi, ikon, urutan) VALUES
  ('merchandise', 'Merchandise', 'Buket wisuda, buket uang, dan pernak-pernik buatan tangan untuk merayakan kelulusan.', 'ShoppingBag', 10),
  ('bimbingan-online', 'Bimbingan Online Harian', 'Bimbingan privat per jam lewat daring. Tersedia untuk Skripsi, Tesis, dan Disertasi.', 'Video', 20),
  ('bimbingan-bulanan', 'Bimbingan Online Bulanan', 'Langganan bimbingan sebulan penuh, dari penentuan topik sampai sidang hasil.', 'CalendarRange', 30),
  ('layanan-utama', 'Layanan Utama', 'Bimbingan tatap muka Solo-Jogja, penyusunan jurnal, dan olah data.', 'GraduationCap', 40),
  ('paket-hemat', 'Paket Hemat Kejar Lulus', 'Paket pendampingan BAB 1-5 sampai lulus.', 'Sparkles', 50)
ON CONFLICT (slug) DO UPDATE SET
  nama = EXCLUDED.nama, deskripsi = EXCLUDED.deskripsi,
  ikon = EXCLUDED.ikon, urutan = EXCLUDED.urutan;

-- ═══ Kategori ══════════════════════════════════════════════════════════════

INSERT INTO public.kategori_produk (etalase_id, slug, nama, urutan) VALUES
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'), 'buket-bunga', 'Buket Bunga', 10),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'), 'buket-uang', 'Buket Uang', 20),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'), 'buket-skripsi', 'Buket Skripsi', 30),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'), 'buket-snack', 'Buket Snack', 40),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'), 'aksesoris', 'Aksesoris', 50),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'), 'souvenir', 'Souvenir & Dekorasi', 60),
  ((SELECT id FROM public.etalase WHERE slug = 'bimbingan-online'), 'harian-private', 'Harian Private (per jam)', 10),
  ((SELECT id FROM public.etalase WHERE slug = 'bimbingan-bulanan'), 'langganan', 'Langganan Bulanan', 10),
  ((SELECT id FROM public.etalase WHERE slug = 'layanan-utama'), 'bimbingan-offline', 'Bimbingan Offline (Solo-Jogja)', 10),
  ((SELECT id FROM public.etalase WHERE slug = 'layanan-utama'), 'jurnal-olah-data', 'Jurnal & Olah Data', 20),
  ((SELECT id FROM public.etalase WHERE slug = 'paket-hemat'), 'kejar-lulus', 'Kejar Lulus', 10)
ON CONFLICT (etalase_id, slug) DO UPDATE SET
  nama = EXCLUDED.nama, urutan = EXCLUDED.urutan;

-- ═══ Produk ════════════════════════════════════════════════════════════════

INSERT INTO public.produk
  (etalase_id, kategori_id, slug, nama, subjudul, deskripsi, spesifikasi,
   fitur, harga, harga_coret, harga_mulai, satuan, badge, urutan)
VALUES
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'buket-bunga'),
   'buket-satin-bestie-wisuda', 'Buket Bunga Satin "Bestie Wisuda"', 'Buket satin 7 tangkai', 'Bunga satin halus 7 tangkai, dirangkai untuk hadiah wisuda teman dekat.',
   '[{"label": "Bahan", "nilai": "Bunga satin halus"}, {"label": "Jumlah tangkai", "nilai": "7 tangkai"}, {"label": "Tinggi", "nilai": "±30 cm"}, {"label": "Diameter", "nilai": "±20 cm"}]'::jsonb, '{}',
   45000, NULL, false, NULL, NULL, 10),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'buket-bunga'),
   'buket-glitter-lulus-berkilau', 'Buket Glitter "Lulus Berkilau"', 'Buket satin glitter 10 tangkai', 'Bunga satin glitter 10 tangkai, lebih besar dan berkilau untuk foto wisuda.',
   '[{"label": "Bahan", "nilai": "Bunga satin glitter"}, {"label": "Jumlah tangkai", "nilai": "10 tangkai"}, {"label": "Tinggi", "nilai": "±35 cm"}, {"label": "Diameter", "nilai": "±25 cm"}]'::jsonb, '{}',
   65000, NULL, false, NULL, NULL, 20),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'buket-bunga'),
   'buket-pompom-fluffy-lulus', 'Buket Pompom "Fluffy Lulus"', 'Buket satin glitter dengan aksen pompom', 'Bunga satin glitter 7 tangkai dengan aksen pompom yang menambah volume.',
   '[{"label": "Bahan", "nilai": "Bunga satin glitter + pompom"}, {"label": "Jumlah tangkai", "nilai": "7 tangkai"}, {"label": "Tinggi", "nilai": "±35 cm"}, {"label": "Diameter", "nilai": "±25 cm"}]'::jsonb, '{}',
   75000, NULL, false, NULL, NULL, 30),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'buket-bunga'),
   'buket-kawat-awet-sampai-revisi', 'Buket Kawat "Awet Sampai Revisi"', 'Buket kawat lilit, warna bisa custom', 'Buket dari kawat lilit yang tidak layu. Warna bisa diminta sesuai selera.',
   '[{"label": "Bahan", "nilai": "Kawat lilit"}, {"label": "Jumlah kawat", "nilai": "20 kawat"}, {"label": "Tinggi", "nilai": "±30 cm"}, {"label": "Warna", "nilai": "Bisa custom"}]'::jsonb, '{}',
   45000, NULL, false, NULL, NULL, 40),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'buket-bunga'),
   'mini-buket-kawat-anak-kos-friendly', 'Mini Buket Kawat "Anak Kos Friendly"', 'Versi ringkas dan ramah kantong', 'Kawat lilit dalam ukuran lebih ringkas, untuk yang ingin memberi sesuatu tanpa menguras uang bulanan.',
   '[{"label": "Bahan", "nilai": "Kawat lilit"}, {"label": "Tinggi", "nilai": "±20 cm"}]'::jsonb, '{}',
   35000, NULL, false, NULL, NULL, 50),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'buket-bunga'),
   'buket-kawat-pelukan-dosen-pembimbing', 'Buket Kawat "Pelukan Dosen Pembimbing"', 'Satu bunga dominan, bisa request', 'Buket kawat lilit dengan satu bunga dominan di tengah. Jenis bunga dominannya bisa diminta.',
   '[{"label": "Bahan", "nilai": "Kawat lilit"}, {"label": "Bunga dominan", "nilai": "1 tangkai, bisa request"}, {"label": "Tinggi", "nilai": "±35 cm"}]'::jsonb, '{}',
   30000, NULL, false, NULL, NULL, 60),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'buket-uang'),
   'buket-uang-amplop-berjalan', 'Buket Uang "Amplop Berjalan"', 'Maksimal 10 tangkai uang', 'Buket uang dengan maksimal 10 tangkai. Nominal uang bebas diminta sesuai keinginan.',
   '[{"label": "Jumlah tangkai", "nilai": "Maksimal 10 tangkai"}, {"label": "Nominal", "nilai": "Bebas request"}]'::jsonb, '{}',
   87000, NULL, false, NULL, NULL, 10),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'buket-uang'),
   'buket-uang-jajan-lulus', 'Buket Uang "Uang Jajan Lulus"', '11-19 tangkai uang', 'Buket uang dengan lebih dari 10 dan kurang dari 20 tangkai. Nominal uang bebas diminta.',
   '[{"label": "Jumlah tangkai", "nilai": "11-19 tangkai"}, {"label": "Nominal", "nilai": "Bebas request"}]'::jsonb, '{}',
   99000, NULL, false, NULL, NULL, 20),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'buket-skripsi'),
   'buket-skripsi-acc-bab-terakhir', 'Buket Skripsi "ACC Bab Terakhir"', 'Kertas HVS polos dilipat jadi bunga', 'Lembar HVS dilipat satu per satu menjadi bunga. Versi polos tanpa pewarnaan.',
   '[{"label": "Bahan", "nilai": "Kertas HVS"}, {"label": "Jumlah tangkai", "nilai": "Maksimal 30 tangkai"}, {"label": "Pewarnaan", "nilai": "Polos"}]'::jsonb, '{}',
   110000, NULL, false, NULL, NULL, 10),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'buket-skripsi'),
   'buket-skripsi-revisi-berwarna', 'Buket Skripsi "Revisi Berwarna"', 'Kertas HVS dilipat dan diwarnai', 'Sama seperti versi polos, tapi tiap bunga diwarnai satu per satu.',
   '[{"label": "Bahan", "nilai": "Kertas HVS"}, {"label": "Jumlah tangkai", "nilai": "Maksimal 30 tangkai"}, {"label": "Pewarnaan", "nilai": "Diwarnai"}]'::jsonb, '{}',
   120000, NULL, false, NULL, NULL, 20),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'buket-snack'),
   'buket-snack-logistik-pejuang-skripsi', 'Buket Snack "Logistik Pejuang Skripsi"', 'Isi 8-10 snack', 'Aneka snack dirangkai dengan kotak atau wrap, pita, dan hiasan bunga. Harga akhir mengikuti jenis snack yang dipilih.',
   '[{"label": "Isi", "nilai": "8-10 snack"}, {"label": "Tinggi", "nilai": "±30 cm"}, {"label": "Kemasan", "nilai": "Kotak/wrap, pita, hiasan bunga"}]'::jsonb, '{}',
   45000, NULL, true, NULL, NULL, 10),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'buket-snack'),
   'buket-snack-ngemil-pas-sidang', 'Buket Snack "Ngemil Pas Sidang"', 'Isi 12-15 snack, ukuran lebih besar', 'Bahan sama dengan Logistik Pejuang Skripsi, dengan snack lebih besar supaya cukup dibagi ke teman. Harga akhir mengikuti jenis snack yang dipilih.',
   '[{"label": "Isi", "nilai": "12-15 snack"}, {"label": "Tinggi", "nilai": "±35 cm"}, {"label": "Kemasan", "nilai": "Kotak/wrap, pita, hiasan bunga"}]'::jsonb, '{}',
   65000, NULL, true, NULL, NULL, 20),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'aksesoris'),
   'gelang-satin', 'Gelang Satin', 'Simpul geser, ukuran menyesuaikan', 'Tali satin dengan simpul geser sehingga ukurannya bisa disesuaikan.',
   '[{"label": "Bahan", "nilai": "Tali satin"}, {"label": "Diameter", "nilai": "14-20 cm"}, {"label": "Pengait", "nilai": "Simpul geser (adjustable)"}]'::jsonb, '{}',
   7000, NULL, false, NULL, NULL, 10),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'aksesoris'),
   'keychain-bunga', 'Keychain Bunga', 'Bunga handmade satin/flanel', 'Gantungan kunci bunga yang dibuat tangan dari kain satin atau flanel.',
   '[{"label": "Bahan", "nilai": "Kain satin/flanel (handmade)"}, {"label": "Ring", "nilai": "Besi"}, {"label": "Panjang total", "nilai": "±9 cm"}]'::jsonb, '{}',
   7500, NULL, false, NULL, NULL, 20),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'aksesoris'),
   'keychain-kerang', 'Keychain Kerang', 'Resin motif kerang', 'Gantungan kunci resin bermotif kerang dengan rantai dan ring besi.',
   '[{"label": "Bahan", "nilai": "Resin"}, {"label": "Motif", "nilai": "Kerang"}, {"label": "Ring", "nilai": "Rantai dan ring besi"}, {"label": "Panjang total", "nilai": "±8 cm"}]'::jsonb, '{}',
   7700, NULL, false, NULL, NULL, 30),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'aksesoris'),
   'keychain-cherry', 'Keychain Cherry', 'Resin motif ceri', 'Gantungan kunci resin bermotif ceri dengan ring besi.',
   '[{"label": "Bahan", "nilai": "Resin"}, {"label": "Motif", "nilai": "Ceri"}, {"label": "Ring", "nilai": "Besi"}, {"label": "Panjang total", "nilai": "±8 cm"}]'::jsonb, '{}',
   7700, NULL, false, NULL, NULL, 40),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'aksesoris'),
   'kalung-mutiara', 'Kalung Mutiara', 'Panjang 40 cm + rantai pemanjang', 'Kalung mutiara dengan tali dan pengait stainless, dilengkapi rantai pemanjang 5 cm.',
   '[{"label": "Bahan", "nilai": "Mutiara, tali, pengait stainless"}, {"label": "Panjang", "nilai": "40 cm + 5 cm rantai pemanjang"}]'::jsonb, '{}',
   8000, NULL, false, NULL, NULL, 50),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'aksesoris'),
   'kalung-mutiara-imitasi', 'Kalung Mutiara Imitasi', 'Panjang 40 cm + rantai pemanjang', 'Kalung mutiara imitasi dengan tali dan pengait stainless, dilengkapi rantai pemanjang 5 cm.',
   '[{"label": "Bahan", "nilai": "Mutiara imitasi, tali, pengait stainless"}, {"label": "Panjang", "nilai": "40 cm + 5 cm rantai pemanjang"}]'::jsonb, '{}',
   8000, NULL, false, NULL, NULL, 60),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'aksesoris'),
   'anting-mutiara-juntai-2cm', 'Anting Mutiara Juntai 2 cm', 'Model menjuntai, kait stainless', 'Anting mutiara imitasi model menjuntai dengan kait stainless.',
   '[{"label": "Bahan", "nilai": "Mutiara imitasi"}, {"label": "Kait", "nilai": "Stainless"}, {"label": "Model", "nilai": "Menjuntai"}, {"label": "Panjang", "nilai": "±2 cm"}]'::jsonb, '{}',
   5000, NULL, false, NULL, NULL, 70),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'aksesoris'),
   'anting-mutiara-juntai-1cm', 'Anting Mutiara Juntai 1 cm', 'Model menjuntai, kait stainless', 'Anting mutiara imitasi model menjuntai dengan kait stainless, versi lebih pendek.',
   '[{"label": "Bahan", "nilai": "Mutiara imitasi"}, {"label": "Kait", "nilai": "Stainless"}, {"label": "Model", "nilai": "Menjuntai"}, {"label": "Panjang", "nilai": "±1 cm"}]'::jsonb, '{}',
   5500, NULL, false, NULL, NULL, 80),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'souvenir'),
   'lilin-aromaterapi', 'Lilin Aromaterapi', 'Gelas kaca 100 ml', 'Lilin wax beraroma dalam gelas kaca, dihias kain tile dan pita satin.',
   '[{"label": "Isi", "nilai": "Gelas 100 ml"}, {"label": "Tinggi", "nilai": "±7 cm"}, {"label": "Diameter", "nilai": "±6 cm"}, {"label": "Bahan", "nilai": "Gelas kaca, lilin wax, pewangi"}, {"label": "Hiasan", "nilai": "Kain tile dan pita satin"}]'::jsonb, '{}',
   10000, NULL, false, NULL, NULL, 10),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'souvenir'),
   'souvenir-lilin-aromaterapi-mini', 'Souvenir Lilin Aromaterapi Mini', 'Gelas kaca 50 ml, untuk meja belajar', 'Versi mini dari Lilin Aromaterapi, pas diletakkan di meja belajar.',
   '[{"label": "Isi", "nilai": "Gelas 50 ml"}, {"label": "Tinggi", "nilai": "±5 cm"}, {"label": "Bahan", "nilai": "Gelas kaca, lilin wax, pewangi"}, {"label": "Hiasan", "nilai": "Kain tile dan pita satin"}]'::jsonb, '{}',
   8000, NULL, false, NULL, NULL, 20),
  ((SELECT id FROM public.etalase WHERE slug = 'merchandise'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'merchandise' AND k.slug = 'souvenir'),
   'souvenir-sisir', 'Souvenir Sisir', 'Sisir kayu gigi halus', 'Sisir kayu bergigi halus, cocok sebagai souvenir acara.',
   '[{"label": "Bahan", "nilai": "Kayu"}, {"label": "Gigi", "nilai": "Halus"}, {"label": "Panjang", "nilai": "±12 cm"}]'::jsonb, '{}',
   8000, NULL, false, NULL, NULL, 30),
  ((SELECT id FROM public.etalase WHERE slug = 'bimbingan-online'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'bimbingan-online' AND k.slug = 'harian-private'),
   'daily-judul-outline', 'Paket Daily Bimbingan Online Judul + Outline', 'Tersedia untuk Skripsi, Tesis, dan Disertasi', 'Bimbingan privat per jam untuk menentukan judul dan menyusun kerangka penelitian dari nol.',
   '[]'::jsonb, ARRAY['Rekomendasi judul (maks. 3 judul) dan outline by mentor', 'Outline BAB 1-3 by mentor', 'Menentukan variabel penelitian', 'Menentukan desain penelitian', 'Free QnA 1x60 menit private']::TEXT[],
   60000, NULL, false, 'per jam', NULL, 10),
  ((SELECT id FROM public.etalase WHERE slug = 'bimbingan-online'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'bimbingan-online' AND k.slug = 'harian-private'),
   'daily-bab-1-3', 'Paket Daily Bimbingan Online BAB 1-3', 'Tersedia untuk Skripsi, Tesis, dan Disertasi', 'Bimbingan privat per jam untuk menggarap proposal BAB 1 sampai BAB 3.',
   '[]'::jsonb, ARRAY['Identifikasi masalah (BAB 1)', 'Menentukan kerangka konsep dan kerangka berpikir', 'Uji validitas dan reliabilitas', 'Free QnA 1x60 menit private']::TEXT[],
   65000, NULL, false, 'per jam', NULL, 20),
  ((SELECT id FROM public.etalase WHERE slug = 'bimbingan-online'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'bimbingan-online' AND k.slug = 'harian-private'),
   'daily-simulasi-sidang', 'Paket Daily Bimbingan Online Simulasi Ujian/Sidang', 'Sempro & Semhas - Tersedia untuk Skripsi, Tesis, dan Disertasi', 'Latihan sidang bersama mentor, lengkap dengan bedah naskah dan penyusunan script presentasi.',
   '[]'::jsonb, ARRAY['Bedah full naskah (BAB 1 sampai selesai)', 'Simulasi ujian dengan PowerPoint (PPTx)', 'Membuat script + tata cara presentasi yang baik', 'Free QnA 1x60 menit private']::TEXT[],
   65000, NULL, false, 'per jam', NULL, 30),
  ((SELECT id FROM public.etalase WHERE slug = 'bimbingan-online'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'bimbingan-online' AND k.slug = 'harian-private'),
   'daily-metode-olah-data', 'Paket Daily Bimbingan Online Metode Penelitian & Olah Data', 'Tersedia untuk Skripsi, Tesis, dan Disertasi', 'Bimbingan privat per jam untuk membedah metode penelitian dan proses olah datanya.',
   '[]'::jsonb, ARRAY['Bedah analisis, framework dan olah data penelitian', 'Bedah metode penelitian', 'Summary & resume by mentor', 'Free QnA 1x60 menit private']::TEXT[],
   65000, NULL, false, 'per jam', NULL, 40),
  ((SELECT id FROM public.etalase WHERE slug = 'bimbingan-online'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'bimbingan-online' AND k.slug = 'harian-private'),
   'daily-bab-4-5', 'Paket Daily Bimbingan Online BAB 4-5 (Olah Data)', 'Tersedia untuk Skripsi, Tesis, dan Disertasi', 'Bimbingan privat per jam untuk menyelesaikan BAB 4 dan BAB 5 sampai siap seminar hasil.',
   '[]'::jsonb, ARRAY['Review dan checking file BAB 4 & 5', 'Studi uji kelayakan hasil dan interpretasi', 'Persiapan seminar hasil', 'Summary & resume by mentor', 'Free QnA 1x60 menit private']::TEXT[],
   75000, NULL, false, 'per jam', NULL, 50),
  ((SELECT id FROM public.etalase WHERE slug = 'bimbingan-online'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'bimbingan-online' AND k.slug = 'harian-private'),
   'daily-full-naskah', 'Paket Daily Bimbingan Online Full Naskah (BAB 1-5)', 'Tersedia untuk Skripsi, Tesis, dan Disertasi', 'Bimbingan privat per jam untuk menyisir naskah dari BAB 1 sampai BAB 5 dan merapikannya.',
   '[]'::jsonb, ARRAY['Review detail BAB 1-5', 'Breakdown weakness per bab', 'Revisi after sidang (opsional)', 'Penyempurnaan naskah', 'Checking hasil olah data dan alur penelitian', 'Checking formatting', 'Summary & resume by mentor', 'Free QnA 1x60 menit private']::TEXT[],
   80000, NULL, false, 'per jam', NULL, 60),
  ((SELECT id FROM public.etalase WHERE slug = 'bimbingan-bulanan'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'bimbingan-bulanan' AND k.slug = 'langganan'),
   'bulanan-private-1-on-1', 'Paket Bimbingan Bulanan Private 1-on-1', 'Tersedia untuk Skripsi, Tesis, dan Disertasi', 'Sebulan penuh bimbingan berdua saja dengan mentor, dari penentuan topik sampai sidang hasil.',
   '[{"label": "Format", "nilai": "Private 1-on-1"}]'::jsonb, ARRAY['Bimbingan penentuan topik dan variabel penelitian', 'Perancangan judul dan outline', 'Menentukan novelty dan research gap', 'Mencari jurnal referensi', 'Perancangan proposal BAB 1-3', 'Pengerjaan revisi sidang', 'Olah data, tools, dan interpretasi', 'Finishing full proposal', 'Sidang hasil dan perancangan PowerPoint']::TEXT[],
   599000, NULL, false, 'per bulan', NULL, 10),
  ((SELECT id FROM public.etalase WHERE slug = 'bimbingan-bulanan'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'bimbingan-bulanan' AND k.slug = 'langganan'),
   'bulanan-couple', 'Paket Bimbingan Bulanan Couple', '2 orang per kelas - Tersedia untuk Skripsi, Tesis, dan Disertasi', 'Materi sama dengan paket private, dijalani berdua dalam satu kelas.',
   '[{"label": "Format", "nilai": "2 orang per kelas"}]'::jsonb, ARRAY['Bimbingan penentuan topik dan variabel penelitian', 'Perancangan judul dan outline', 'Menentukan novelty dan research gap', 'Mencari jurnal referensi', 'Perancangan proposal BAB 1-3', 'Pengerjaan revisi sidang', 'Olah data, tools, dan interpretasi', 'Finishing full proposal', 'Sidang hasil dan perancangan PowerPoint']::TEXT[],
   899000, NULL, false, 'per bulan', NULL, 20),
  ((SELECT id FROM public.etalase WHERE slug = 'bimbingan-bulanan'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'bimbingan-bulanan' AND k.slug = 'langganan'),
   'bulanan-grup-4', 'Paket Bimbingan Bulanan Grup', 'Maksimal 4 orang per kelas - Tersedia untuk Skripsi, Tesis, dan Disertasi', 'Materi sama dengan paket private, dijalani bersama maksimal empat orang dalam satu kelas.',
   '[{"label": "Format", "nilai": "Maksimal 4 orang per kelas"}]'::jsonb, ARRAY['Bimbingan penentuan topik dan variabel penelitian', 'Perancangan judul dan outline', 'Menentukan novelty dan research gap', 'Mencari jurnal referensi', 'Perancangan proposal BAB 1-3', 'Pengerjaan revisi sidang', 'Olah data, tools, dan interpretasi', 'Finishing full proposal', 'Sidang hasil dan perancangan PowerPoint']::TEXT[],
   1099000, NULL, false, 'per bulan', NULL, 30),
  ((SELECT id FROM public.etalase WHERE slug = 'layanan-utama'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'layanan-utama' AND k.slug = 'bimbingan-offline'),
   'offline-harian-solo-jogja', 'Paket Bimbingan Offline (Solo-Jogja) Harian', 'All Prodi (Skripsi, Tesis & Disertasi)', 'Bertemu langsung dengan mentor di Solo atau Jogja, satu sesi 100 menit.',
   '[{"label": "Lokasi", "nilai": "Solo - Jogja"}, {"label": "Durasi", "nilai": "1x100 menit per sesi"}, {"label": "Format", "nilai": "Private 1-on-1"}]'::jsonb, ARRAY['Bimbingan offline 1x100 menit intensif 1-on-1 private dengan mentor', 'Materi cetak dari mentor', 'Breakdown detail framework penelitian', 'Penentuan tools analisis data', 'Basic metode penelitian', 'QnA free 1x100 menit (dua arah)']::TEXT[],
   85000, NULL, false, 'per sesi', NULL, 10),
  ((SELECT id FROM public.etalase WHERE slug = 'layanan-utama'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'layanan-utama' AND k.slug = 'bimbingan-offline'),
   'offline-bulanan-solo-jogja', 'Paket Bimbingan Offline (Solo-Jogja) Bulanan', 'All Prodi (Skripsi, Tesis & Disertasi)', 'Sebulan penuh bimbingan tatap muka dengan materi yang sudah dijadwalkan dari sesi ke sesi.',
   '[{"label": "Lokasi", "nilai": "Solo - Jogja"}, {"label": "Durasi", "nilai": "1x100 menit per sesi"}, {"label": "Format", "nilai": "Private 1-on-1"}]'::jsonb, ARRAY['Bimbingan offline 1x100 menit per sesi intensif 1-on-1 private dengan mentor', 'Scheduling materi terstruktur dari semua sesi', 'Materi cetak dari mentor', 'Breakdown detail framework penelitian', 'Penentuan tools analisis data', 'Basic metode penelitian', 'QnA free 1x100 menit (dua arah)']::TEXT[],
   599000, NULL, false, 'per bulan', NULL, 20),
  ((SELECT id FROM public.etalase WHERE slug = 'layanan-utama'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'layanan-utama' AND k.slug = 'jurnal-olah-data'),
   'susun-jurnal-penelitian', 'Paket Susun Jurnal Penelitian', 'All Prodi (Skripsi, Tesis & Disertasi)', 'Penyusunan jurnal penelitian lengkap, dari pencarian data sampai kesimpulan.',
   '[]'::jsonb, ARRAY['Full journal', 'Referensi dan sitasi', 'Formatting & checking AI', 'Cari data real (sekunder)', 'Olah data & tools', 'Interpretasi hasil olah data', 'Uji analisis', 'Finishing & kesimpulan', 'Free revisi & konsultasi']::TEXT[],
   650000, NULL, false, NULL, NULL, 10),
  ((SELECT id FROM public.etalase WHERE slug = 'layanan-utama'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'layanan-utama' AND k.slug = 'jurnal-olah-data'),
   'olah-data-interpretasi-jurnal', 'Paket Olah Data dan Interpretasi Hasil Analisis Jurnal Penelitian', 'All Prodi (Skripsi, Tesis & Disertasi)', 'Pengolahan data dan penafsiran hasilnya untuk jurnal yang sedang kamu susun.',
   '[]'::jsonb, ARRAY['Referensi dan sitasi analisis', 'Formatting & checking AI', 'Olah data & tools', 'Interpretasi hasil olah data', 'Uji analisis', 'Free revisi & konsultasi']::TEXT[],
   350000, NULL, false, NULL, NULL, 20),
  ((SELECT id FROM public.etalase WHERE slug = 'paket-hemat'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'paket-hemat' AND k.slug = 'kejar-lulus'),
   'kejar-lulus-weekday', 'Paket Bimbingan Private Intensif Weekday BAB 1-5 Sampai Lulus', 'Sesi aktif Senin-Jumat', 'Pendampingan privat dari BAB 1 sampai BAB 5, dijalani pada hari kerja.',
   '[{"label": "Jadwal", "nilai": "Senin-Jumat"}, {"label": "Cakupan", "nilai": "BAB 1-5"}]'::jsonb, '{}',
   2800000, 3750000, false, NULL, 'Best Seller', 10),
  ((SELECT id FROM public.etalase WHERE slug = 'paket-hemat'),
   (SELECT k.id FROM public.kategori_produk k JOIN public.etalase e ON e.id = k.etalase_id
     WHERE e.slug = 'paket-hemat' AND k.slug = 'kejar-lulus'),
   'kejar-lulus-weekend', 'Paket Bimbingan Private Intensif Weekend BAB 1-5 Sampai Lulus', 'Sesi aktif Sabtu-Minggu', 'Pendampingan privat dari BAB 1 sampai BAB 5, dijalani pada akhir pekan.',
   '[{"label": "Jadwal", "nilai": "Sabtu-Minggu"}, {"label": "Cakupan", "nilai": "BAB 1-5"}]'::jsonb, '{}',
   3200000, 4499000, false, NULL, NULL, 20)
ON CONFLICT (slug) DO UPDATE SET
  etalase_id  = EXCLUDED.etalase_id,
  kategori_id = EXCLUDED.kategori_id,
  nama        = EXCLUDED.nama,
  subjudul    = EXCLUDED.subjudul,
  deskripsi   = EXCLUDED.deskripsi,
  spesifikasi = EXCLUDED.spesifikasi,
  fitur       = EXCLUDED.fitur,
  harga       = EXCLUDED.harga,
  harga_coret = EXCLUDED.harga_coret,
  harga_mulai = EXCLUDED.harga_mulai,
  satuan      = EXCLUDED.satuan,
  badge       = EXCLUDED.badge,
  urutan      = EXCLUDED.urutan;

-- ═══ Produk lama ═══════════════════════════════════════════════════════════
-- Kelas bimbingan lama (harga Rp3.750.000 dan Rp4.499.000, serta kelas lomba
-- dan olah data) digantikan oleh katalog di atas. Dinonaktifkan, bukan
-- dihapus: pesanan lama masih menunjuk ke baris-baris itu.
UPDATE public.kelas_bimbingan SET is_active = false WHERE is_active = true;
UPDATE public.merchandise     SET is_active = false WHERE is_active = true;

