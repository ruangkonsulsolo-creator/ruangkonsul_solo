-- ═══════════════════════════════════════════════════════════════════════════
-- 035 — Paket Isi Saldo (top-up kredit via Midtrans) + tarif periksa dari DB
--
-- Masalah yang diperbaiki:
--  * Cek naskah real-time memotong saldo kredit, tapi customer TIDAK PUNYA
--    cara mengisi saldo. Tombol "Isi saldo" berujung ke katalog Paket Hemat.
--  * Menu admin "Paket Kuota" (quota_packages) dan "Tarif Pemeriksaan" lama
--    tidak lagi dipakai alur mana pun.
--
-- Isi:
--  1. payments.purpose menerima 'saldo'
--  2. Tabel paket_saldo (bayar X → saldo Y; Y boleh > X sebagai bonus)
--  3. tambah_saldo(): satu-satunya jalan server menambah saldo + mencatat mutasi
--  4. Pastikan 3 layanan periksa (tarif per 1.000 kata) ada — sama dengan 024,
--     untuk basis data yang belum menjalankan 024. Harga yang sudah diubah
--     admin TIDAK ditimpa.
--
-- Bergantung pada: 021 (mutasi_kredit, guard saldo), 033 (payments).
-- Aman dijalankan ulang.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. payments.purpose
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_purpose_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_purpose_check
  CHECK (purpose IN ('order', 'produk', 'booking', 'saldo'));

-- 2. Paket isi saldo
CREATE TABLE IF NOT EXISTS public.paket_saldo (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama        TEXT NOT NULL,
  harga_idr   INTEGER NOT NULL CHECK (harga_idr >= 10000),
  saldo_idr   INTEGER NOT NULL CHECK (saldo_idr >= harga_idr),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  is_populer  BOOLEAN NOT NULL DEFAULT false,
  urutan      INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.paket_saldo IS
  'Paket top-up saldo kredit untuk cek naskah. saldo_idr - harga_idr = bonus.';

DROP TRIGGER IF EXISTS paket_saldo_updated_at ON public.paket_saldo;
CREATE TRIGGER paket_saldo_updated_at
  BEFORE UPDATE ON public.paket_saldo
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.paket_saldo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS paket_saldo_select_aktif ON public.paket_saldo;
CREATE POLICY paket_saldo_select_aktif ON public.paket_saldo
  FOR SELECT USING (is_active OR public.is_staff());

DROP POLICY IF EXISTS paket_saldo_all_staff ON public.paket_saldo;
CREATE POLICY paket_saldo_all_staff ON public.paket_saldo
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

GRANT SELECT ON public.paket_saldo TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.paket_saldo TO authenticated;

-- Contoh awal — silakan ubah di Admin > Paket Isi Saldo.
INSERT INTO public.paket_saldo (nama, harga_idr, saldo_idr, is_populer, urutan)
SELECT * FROM (VALUES
  ('Saldo 25rb',  25000,  25000, false, 1),
  ('Saldo 50rb',  50000,  52500, true,  2),
  ('Saldo 100rb', 100000, 110000, false, 3)
) AS v(nama, harga_idr, saldo_idr, is_populer, urutan)
WHERE NOT EXISTS (SELECT 1 FROM public.paket_saldo);

-- 3. Tambah saldo (server / service role saja)
CREATE OR REPLACE FUNCTION public.tambah_saldo(
  p_user_id    UUID,
  p_jumlah     INTEGER,
  p_keterangan TEXT,
  p_ref_id     UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_saldo INTEGER;
BEGIN
  IF p_jumlah IS NULL OR p_jumlah <= 0 THEN
    RAISE EXCEPTION 'Jumlah saldo harus positif.' USING ERRCODE = '22023';
  END IF;

  -- Idempoten per referensi: satu pembayaran hanya bisa menambah saldo sekali.
  IF p_ref_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.mutasi_kredit WHERE ref_id = p_ref_id AND jumlah > 0
  ) THEN
    SELECT credit_balance INTO v_saldo FROM public.profiles WHERE id = p_user_id;
    RETURN v_saldo;
  END IF;

  PERFORM set_config('rks.lewati_guard_saldo', 'on', true);
  UPDATE public.profiles
     SET credit_balance = COALESCE(credit_balance, 0) + p_jumlah
   WHERE id = p_user_id
  RETURNING credit_balance INTO v_saldo;
  PERFORM set_config('rks.lewati_guard_saldo', 'off', true);

  IF v_saldo IS NULL THEN
    RAISE EXCEPTION 'Profil tidak ditemukan.' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.mutasi_kredit (user_id, jumlah, saldo_akhir, keterangan, ref_id)
  VALUES (p_user_id, p_jumlah, v_saldo, p_keterangan, p_ref_id);

  RETURN v_saldo;
END;
$$;

REVOKE ALL ON FUNCTION public.tambah_saldo(UUID, INTEGER, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tambah_saldo(UUID, INTEGER, TEXT, UUID) TO service_role;

-- 4. Layanan periksa (tarif per 1.000 kata). Tidak menimpa harga yang ada.
INSERT INTO public.services (slug, name, description, price_idr, is_active, sla_hours)
VALUES
  ('cek-plagiarisme', 'Cek Plagiarisme',
   'Seberapa mirip tulisanmu dengan karya lain. Harga per 1.000 kata.', 3300, true, 1),
  ('cek-ai', 'Cek Indikasi AI',
   'Seberapa mirip gayanya dengan tulisan mesin. Harga per 1.000 kata.', 4500, true, 1),
  ('parafrase', 'Parafrase',
   'Susun ulang kalimat dengan bahasa sendiri. Harga per 1.000 kata.', 1500, true, 1)
ON CONFLICT (slug) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE '035_paket_isi_saldo: selesai.';
END $$;
