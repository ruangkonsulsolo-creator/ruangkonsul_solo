-- 049: Sesi tamu untuk layanan pemeriksa naskah (Cek AI, Plagiasi, DrillBit,
-- Parafrase) tanpa daftar akun.
--
-- Tamu memakai Supabase anonymous sign-in: auth.users.is_anonymous = true.
-- Trigger handle_new_user tetap membuat baris profiles untuknya (dibutuhkan
-- saldo, pesanan, pembayaran). Kolom is_tamu dipakai panel admin agar tamu
-- tidak tercampur di daftar & hitungan pengguna.
--
-- WAJIB juga: Supabase Dashboard → Authentication → Sign In / Providers →
-- aktifkan "Allow anonymous sign-ins".

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_tamu BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_bukan_tamu ON public.profiles (created_at DESC) WHERE is_tamu = false;

-- Isi untuk tamu yang mungkin sudah terlanjur dibuat.
UPDATE public.profiles p
SET is_tamu = true
FROM auth.users u
WHERE u.id = p.id AND u.is_anonymous = true AND p.is_tamu = false;

-- Salinan handle_new_user dari 038 + penanda is_tamu.
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

  INSERT INTO public.profiles (id, full_name, referral_code, registrasi_selesai, is_tamu)
  VALUES (
    NEW.id,
    left(COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
      ''
    ), 120),
    new_referral_code,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email') = 'email' AND NOT COALESCE(NEW.is_anonymous, false),
    COALESCE(NEW.is_anonymous, false)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Tamu yang kelak menautkan email (berubah jadi akun biasa) → bukan tamu lagi.
CREATE OR REPLACE FUNCTION public.sinkron_status_tamu()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE(OLD.is_anonymous, false) AND NOT COALESCE(NEW.is_anonymous, false) THEN
    UPDATE public.profiles SET is_tamu = false WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_bukan_tamu ON auth.users;
CREATE TRIGGER on_auth_user_bukan_tamu
  AFTER UPDATE OF is_anonymous ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sinkron_status_tamu();

-- Penanda tamu hanya boleh diubah server/trigger, bukan lewat PostgREST oleh
-- pengguna sendiri (pola sama dengan kunci_registrasi_selesai di 038).
CREATE OR REPLACE FUNCTION public.kunci_is_tamu()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_tamu IS DISTINCT FROM OLD.is_tamu
     AND COALESCE(auth.role(), '') IN ('authenticated', 'anon')
     AND NOT COALESCE(public.is_staff(), false) THEN
    RAISE EXCEPTION 'Status tamu tidak dapat diubah sendiri.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_kunci_is_tamu ON public.profiles;
CREATE TRIGGER profiles_kunci_is_tamu
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.kunci_is_tamu();

DO $$ BEGIN RAISE NOTICE '049_sesi_tamu: migration berhasil. Jangan lupa aktifkan anonymous sign-ins.'; END $$;
