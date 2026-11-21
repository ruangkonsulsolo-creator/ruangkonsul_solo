-- 039: Kode undangan mentor.
--
-- Admin membuat kode sekali pakai. Calon mentor mendaftar (Google) lalu
-- memasukkan kode di halaman Lengkapi Pendaftaran; bila valid, akunnya
-- langsung menjadi mentor. Tanpa kode, pendaftaran hanya menghasilkan
-- akun customer. Jalankan setelah 038.

CREATE TABLE IF NOT EXISTS public.kode_mentor (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode           TEXT NOT NULL UNIQUE CHECK (kode ~ '^MTR-[A-Z0-9]{6}$'),
  untuk_nama     TEXT CHECK (char_length(untuk_nama) <= 120),
  dibuat_oleh    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  kedaluwarsa_at TIMESTAMPTZ,
  aktif          BOOLEAN NOT NULL DEFAULT true,
  dipakai_oleh   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  dipakai_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kode_mentor_created ON public.kode_mentor (created_at DESC);

ALTER TABLE public.kode_mentor ENABLE ROW LEVEL SECURITY;

-- Hanya staf yang bisa melihat & mengelola kode. Customer tidak punya akses
-- sama sekali; penukaran kode berjalan lewat fungsi service role di bawah.
DROP POLICY IF EXISTS "kode_mentor_staff_select" ON public.kode_mentor;
CREATE POLICY "kode_mentor_staff_select" ON public.kode_mentor
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "kode_mentor_staff_insert" ON public.kode_mentor;
CREATE POLICY "kode_mentor_staff_insert" ON public.kode_mentor
  FOR INSERT WITH CHECK (public.is_staff() AND dipakai_oleh IS NULL);

DROP POLICY IF EXISTS "kode_mentor_staff_update" ON public.kode_mentor;
CREATE POLICY "kode_mentor_staff_update" ON public.kode_mentor
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ── Penukaran kode (atomik) ─────────────────────────────────────────────────
-- Mengembalikan: 'ok' | 'tidak_ditemukan' | 'terpakai' | 'kedaluwarsa' | 'nonaktif'
-- Idempoten untuk user yang sama (aman bila langkah berikutnya gagal lalu diulang).
CREATE OR REPLACE FUNCTION public.pakai_kode_mentor(p_kode TEXT, p_user UUID, p_nama TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v public.kode_mentor%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.kode_mentor
   WHERE kode = upper(trim(p_kode))
   FOR UPDATE;

  IF NOT FOUND THEN RETURN 'tidak_ditemukan'; END IF;
  IF v.dipakai_oleh IS NOT NULL AND v.dipakai_oleh <> p_user THEN RETURN 'terpakai'; END IF;
  IF v.dipakai_oleh IS NULL THEN
    IF NOT v.aktif THEN RETURN 'nonaktif'; END IF;
    IF v.kedaluwarsa_at IS NOT NULL AND v.kedaluwarsa_at < now() THEN RETURN 'kedaluwarsa'; END IF;
  END IF;

  UPDATE public.kode_mentor
     SET dipakai_oleh = p_user, dipakai_at = COALESCE(dipakai_at, now())
   WHERE id = v.id;

  -- auth.uid() NULL pada service role → guard_role_change mengizinkan.
  UPDATE public.profiles
     SET role = 'mentor'
   WHERE id = p_user AND role = 'user';

  INSERT INTO public.mentor_profiles (user_id, display_name, price_per_hour, is_available)
  VALUES (p_user, NULLIF(left(trim(p_nama), 120), ''), 150000, true)
  ON CONFLICT (user_id) DO UPDATE SET is_available = true;

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.pakai_kode_mentor(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pakai_kode_mentor(TEXT, UUID, TEXT) TO service_role;
