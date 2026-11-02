-- ─────────────────────────────────────────────────────────────────────────────
-- Menambah 'parafrase' ke enum jenis_periksa.
--
-- HARUS dijalankan SENDIRI, terpisah dari migration lain.
--
-- PostgreSQL tidak mengizinkan nilai enum yang baru ditambahkan dipakai di
-- dalam transaksi yang sama dengan penambahannya. SQL Editor Supabase
-- membungkus tiap jalankan dalam satu transaksi, jadi menggabungkan berkas
-- ini dengan migration yang memakai 'parafrase' akan gagal dengan
-- "unsafe use of new value of enum type".
--
-- Jalankan berkas ini, tunggu sampai selesai, baru jalankan yang lain.
--
-- 'keduanya' sengaja dibiarkan di dalam enum meski tidak lagi dipakai
-- antarmuka: baris lama di tabel pemeriksaan masih memakainya, dan
-- menghapus nilai enum berarti menulis ulang kolomnya.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TYPE jenis_periksa ADD VALUE IF NOT EXISTS 'parafrase';
