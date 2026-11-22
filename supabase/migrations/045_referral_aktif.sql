-- 045_referral_aktif.sql
-- Menghidupkan program referral yang dijanjikan di halaman /referral:
--   1. pasang_referral  — mencatat siapa yang mengajak (profiles.referred_by)
--   2. kredit_referral  — komisi 10% dari pembayaran pertama teman masuk ke saldo pengajak
-- Keduanya hanya bisa dipanggil server (service_role). Idempoten: aman dijalankan ulang.

-- Pengajak dicatat sekali, hanya untuk akun baru (≤30 hari) yang belum pernah membayar.
CREATE OR REPLACE FUNCTION public.pasang_referral(p_user UUID, p_kode TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ref UUID;
BEGIN
  IF p_user IS NULL OR p_kode IS NULL OR btrim(p_kode) = '' THEN
    RETURN false;
  END IF;

  SELECT id INTO v_ref FROM public.profiles WHERE referral_code = upper(btrim(p_kode));
  IF v_ref IS NULL OR v_ref = p_user THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
     SET referred_by = v_ref
   WHERE id = p_user
     AND referred_by IS NULL
     AND created_at > now() - interval '30 days'
     AND NOT EXISTS (
       SELECT 1 FROM public.payments pm WHERE pm.user_id = p_user AND pm.status = 'paid'
     );
  RETURN FOUND;
END;
$$;

-- Komisi dikreditkan sekali per pasangan (pengajak, teman) — pembayaran lunas pertama.
-- Mengembalikan jumlah komisi yang baru dikreditkan (0 bila tidak ada / sudah pernah).
CREATE OR REPLACE FUNCTION public.kredit_referral(
  p_referred UUID,
  p_jumlah   INTEGER,
  p_persen   INTEGER DEFAULT 10
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ref    UUID;
  v_komisi INTEGER;
  v_id     UUID;
BEGIN
  SELECT referred_by INTO v_ref FROM public.profiles WHERE id = p_referred;
  IF v_ref IS NULL OR p_jumlah IS NULL OR p_jumlah <= 0 THEN
    RETURN 0;
  END IF;

  v_komisi := floor(p_jumlah * LEAST(GREATEST(COALESCE(p_persen, 10), 0), 50) / 100.0);
  IF v_komisi <= 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.referrals (referrer_id, referred_id, commission_idr, is_credited, credited_at)
  VALUES (v_ref, p_referred, v_komisi, true, now())
  ON CONFLICT (referrer_id, referred_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN 0; -- komisi untuk teman ini sudah pernah dikreditkan
  END IF;

  -- ref_id = id baris referral → idempoten di tambah_saldo dan tidak bentrok
  -- dengan pembayaran milik teman.
  PERFORM public.tambah_saldo(v_ref, v_komisi, 'Komisi referral', v_id);
  RETURN v_komisi;
END;
$$;

REVOKE ALL ON FUNCTION public.pasang_referral(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.kredit_referral(UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pasang_referral(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.kredit_referral(UUID, INTEGER, INTEGER) TO service_role;

-- Pengajak boleh melihat daftar referral miliknya (untuk halaman profil/promo).
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS referrals_select_own ON public.referrals;
CREATE POLICY referrals_select_own ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR public.is_staff());
