-- 038: Pendaftaran via Google wajib dilengkapi (nama, password, WhatsApp).
--
-- Login Google pertama kali otomatis membuat akun di auth.users. Akun seperti
-- itu ditandai registrasi_selesai = false dan diarahkan ke /lengkapi-profil
-- sampai pengguna mengisi nama, password dan nomor WhatsApp.
-- Akun lama dan pendaftaran via email tetap true (DEFAULT).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registrasi_selesai BOOLEAN NOT NULL DEFAULT true;

-- ── Profil baru: tandai belum selesai bila daftar lewat Google ──────────────
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

  INSERT INTO public.profiles (id, full_name, referral_code, registrasi_selesai)
  VALUES (
    NEW.id,
    left(COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
      ''
    ), 120),
    new_referral_code,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email') = 'email'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── Kolom hanya boleh diubah server (service role) atau staf ───────────────
-- Tanpa ini, pengguna bisa PATCH registrasi_selesai = true langsung lewat
-- PostgREST dan melewati pengisian password & WhatsApp.
CREATE OR REPLACE FUNCTION public.kunci_registrasi_selesai()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.registrasi_selesai IS DISTINCT FROM OLD.registrasi_selesai
     AND COALESCE(auth.role(), '') <> 'service_role'
     AND NOT COALESCE(public.is_staff(), false) THEN
    RAISE EXCEPTION 'Status pendaftaran tidak dapat diubah sendiri.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_kunci_registrasi ON public.profiles;
CREATE TRIGGER profiles_kunci_registrasi
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.kunci_registrasi_selesai();
