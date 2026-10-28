-- Migration: 001_create_profiles
-- 5 role: native (guest), user (customer), mentor, admin, superadmin

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  whatsapp      TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by   UUID REFERENCES public.profiles(id),
  credit_balance INTEGER NOT NULL DEFAULT 0,
  -- 'user' = customer setelah daftar
  -- 'mentor', 'admin', 'superadmin' di-assign manual oleh superadmin
  role          TEXT NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'mentor', 'admin', 'superadmin')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User baca profil sendiri"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "User update profil sendiri"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admin baca semua profil"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admin update profil user"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create profile saat daftar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    new_referral_code
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
