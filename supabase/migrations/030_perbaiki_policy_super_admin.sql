-- Migration: 030_perbaiki_policy_super_admin
--
-- Memperbaiki policy yang selama ini tidak pernah berlaku untuk siapa pun.
--
-- profiles.role dibatasi CHECK (role IN ('user','mentor','admin','superadmin')).
-- Tidak ada 'super_admin' dengan garis bawah, dan tidak akan pernah ada —
-- constraint-nya menolak. Tapi sembilan policy di migration 002 sampai 012
-- menulis 'super_admin'. Subquery-nya selalu mengembalikan nol baris, jadi
-- policy-nya selalu salah, jadi aksinya selalu ditolak.
--
-- Akibat nyatanya:
--
--   services, quota_packages   -> admin tidak bisa menambah/mengubah layanan
--                                 maupun paket sama sekali
--   kelas_bimbingan, kelas_modul -> kelas bimbingan selalu kosong di panel
--   blog_posts                 -> artikel tidak bisa ditulis dari panel
--   orders, transactions       -> admin tidak bisa melihat pesanan dan
--                                 transaksi milik customer
--   user_quotas, uploaded_files -> sama, admin tidak bisa melihat milik user
--
-- Ini menjelaskan "Kelas Bimbingan masih 0" dan "Paket Hemat sudah expired"
-- yang tidak bisa diperbaiki dari panel: datanya memang tidak pernah bisa
-- ditulis.
--
-- Semua diganti memakai public.is_staff() dari migration 018, yang membaca
-- role dengan SECURITY DEFINER sehingga tidak memicu rekursi RLS di profiles.

-- ═══════════════════════════════════════════════════════════════════════════
-- Hapus policy lama. Namanya dicocokkan persis seperti di migration asalnya.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Super admin dapat mengubah layanan"   ON public.services;
DROP POLICY IF EXISTS "Super admin dapat mengubah paket"     ON public.quota_packages;
DROP POLICY IF EXISTS "Admin dapat membaca semua kuota"      ON public.user_quotas;
DROP POLICY IF EXISTS "Admin dapat membaca semua file"       ON public.uploaded_files;
DROP POLICY IF EXISTS "Admin dapat membaca semua pesanan"    ON public.orders;
DROP POLICY IF EXISTS "Admin dapat mengupdate pesanan"       ON public.orders;
DROP POLICY IF EXISTS "Admin dapat membaca semua transaksi"  ON public.transactions;
DROP POLICY IF EXISTS "Admin bisa kelola kelas"              ON public.kelas_bimbingan;
DROP POLICY IF EXISTS "Admin bisa kelola modul"              ON public.kelas_modul;
DROP POLICY IF EXISTS "Admin bisa kelola blog"               ON public.blog_posts;

-- Nama baru juga dihapus dulu supaya berkas ini aman dijalankan dua kali.
DROP POLICY IF EXISTS services_all_staff      ON public.services;
DROP POLICY IF EXISTS paket_all_staff         ON public.quota_packages;
DROP POLICY IF EXISTS kuota_select_staff      ON public.user_quotas;
DROP POLICY IF EXISTS kuota_all_staff         ON public.user_quotas;
DROP POLICY IF EXISTS berkas_select_staff     ON public.uploaded_files;
DROP POLICY IF EXISTS pesanan_select_staff    ON public.orders;
DROP POLICY IF EXISTS pesanan_update_staff    ON public.orders;
DROP POLICY IF EXISTS transaksi_select_staff  ON public.transactions;
DROP POLICY IF EXISTS transaksi_all_staff     ON public.transactions;
DROP POLICY IF EXISTS kelas_all_staff         ON public.kelas_bimbingan;
DROP POLICY IF EXISTS kelas_modul_all_staff   ON public.kelas_modul;
DROP POLICY IF EXISTS blog_all_staff          ON public.blog_posts;

-- ═══════════════════════════════════════════════════════════════════════════
-- Tulis ulang
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY services_all_staff ON public.services
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY paket_all_staff ON public.quota_packages
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY kelas_all_staff ON public.kelas_bimbingan
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY kelas_modul_all_staff ON public.kelas_modul
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY blog_all_staff ON public.blog_posts
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Kuota, berkas, dan transaksi: staf cukup boleh membaca. Saldo kuota diubah
-- lewat fungsi pembelian, bukan disunting tangan; memberi admin UPDATE di
-- sini berarti saldo bisa berubah tanpa jejak transaksi.
CREATE POLICY kuota_select_staff ON public.user_quotas
  FOR SELECT USING (public.is_staff());

CREATE POLICY berkas_select_staff ON public.uploaded_files
  FOR SELECT USING (public.is_staff());

CREATE POLICY transaksi_select_staff ON public.transactions
  FOR SELECT USING (public.is_staff());

-- Pesanan perlu bisa diubah statusnya oleh admin (dibayar -> diproses ->
-- dikirim), jadi di sini SELECT dan UPDATE, tetap tanpa DELETE: riwayat
-- pesanan tidak boleh hilang.
CREATE POLICY pesanan_select_staff ON public.orders
  FOR SELECT USING (public.is_staff());

CREATE POLICY pesanan_update_staff ON public.orders
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ═══════════════════════════════════════════════════════════════════════════
-- Hak tabel
-- ═══════════════════════════════════════════════════════════════════════════
-- RLS menyaring baris; GRANT menentukan apakah tabelnya boleh disentuh sama
-- sekali. Policy di atas tidak ada gunanya kalau PostgREST sudah menolak di
-- lapis sebelumnya.

GRANT SELECT ON
  public.services, public.quota_packages, public.kelas_bimbingan,
  public.kelas_modul, public.blog_posts
  TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON
  public.services, public.quota_packages, public.kelas_bimbingan,
  public.kelas_modul, public.blog_posts
  TO authenticated;

GRANT SELECT ON
  public.user_quotas, public.uploaded_files, public.transactions, public.orders
  TO authenticated;

GRANT UPDATE ON public.orders TO authenticated;
