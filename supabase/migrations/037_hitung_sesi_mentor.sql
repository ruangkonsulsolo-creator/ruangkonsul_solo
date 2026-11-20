-- ═══════════════════════════════════════════════════════════════════════════
-- 037 — Jumlah sesi mentor dihitung otomatis + profil akun Google
--
-- mentor_profiles.session_count ditampilkan ke publik ("12 sesi" di kartu
-- mentor, profil, dan urutan mentor di halaman booking), tetapi tidak ada
-- yang pernah memperbaruinya sehingga selalu 0. Sekarang dihitung dari
-- bookings berstatus 'completed', sama seperti rating_avg dihitung dari ulasan.
--
-- Aman dijalankan ulang. Bergantung pada 018 (bookings), 016 (mentor_profiles).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.hitung_sesi_mentor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_mentor UUID;
BEGIN
  -- Hitung ulang mentor lama & baru (jika booking dipindah mentor).
  FOREACH v_mentor IN ARRAY ARRAY[
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD.mentor_id END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.mentor_id END
  ] LOOP
    CONTINUE WHEN v_mentor IS NULL;
    UPDATE public.mentor_profiles m
       SET session_count = (
             SELECT count(*) FROM public.bookings b
              WHERE b.mentor_id = v_mentor AND b.status = 'completed')
     WHERE m.id = v_mentor;
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS bookings_hitung_sesi_mentor ON public.bookings;
CREATE TRIGGER bookings_hitung_sesi_mentor
  AFTER INSERT OR DELETE OR UPDATE OF status, mentor_id ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.hitung_sesi_mentor();

-- Isi ulang untuk data yang sudah ada.
UPDATE public.mentor_profiles m
   SET session_count = (
         SELECT count(*) FROM public.bookings b
          WHERE b.mentor_id = m.id AND b.status = 'completed');

DO $$ BEGIN
  RAISE NOTICE '037_hitung_sesi_mentor: selesai.';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Bagian 2 — Profil otomatis untuk akun baru (termasuk Login Google)
--
-- Google mengirim nama di raw_user_meta_data sebagai 'full_name' dan/atau
-- 'name'. Versi lama hanya membaca 'full_name' sehingga nama bisa kosong.
-- search_path dikunci (praktik wajib untuk fungsi SECURITY DEFINER).
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_referral_code TEXT;
BEGIN
  LOOP
    new_referral_code := 'RKS-' || upper(substring(md5(random()::text), 1, 5));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE referral_code = new_referral_code
    );
  END LOOP;

  INSERT INTO public.profiles (id, full_name, referral_code)
  VALUES (
    NEW.id,
    left(COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
      ''
    ), 120),
    new_referral_code
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
