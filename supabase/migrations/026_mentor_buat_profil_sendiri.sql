-- ─────────────────────────────────────────────────────────────────────────────
-- 026 — Mentor bisa membuat baris profilnya sendiri
--
-- Masalahnya: halaman Edit Profil Mentor buntu dengan pesan "profil mentor
-- belum dibuat, hubungi admin". Akun yang perannya sudah 'mentor' tapi belum
-- punya baris di mentor_profiles tidak bisa berbuat apa-apa, dan satu-satunya
-- jalan keluar adalah admin menyisipkan barisnya manual lewat SQL.
--
-- Itu jalan buntu yang tidak perlu ada. Peran 'mentor' sudah ditetapkan admin
-- lewat panel Kinerja Mentor; baris profil hanyalah wadah kosong yang
-- menyusul. Kebijakan di bawah membuat mentor bisa membuatkannya sendiri
-- saat pertama kali membuka halaman profil.
--
-- Yang TIDAK diizinkan: membuat baris atas nama orang lain (user_id dipaksa
-- sama dengan auth.uid()), dan membuat baris kalau perannya bukan mentor.
--
-- Aman dijalankan berulang kali.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "mentor_insert_profil_sendiri" ON public.mentor_profiles;
CREATE POLICY "mentor_insert_profil_sendiri"
  ON public.mentor_profiles FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.current_user_role() IN ('mentor', 'admin', 'superadmin')
  );

GRANT SELECT, INSERT, UPDATE ON public.mentor_profiles TO authenticated;

-- Harga per jam tidak boleh diisi mentor sendiri. Baris baru lahir dengan
-- nilai bawaan 0, dan admin yang menetapkannya lewat panel Kinerja Mentor.
-- Tanpa penjaga ini, mentor bisa menyisipkan barisnya sendiri dengan tarif
-- berapa pun pada saat pembuatan.
CREATE OR REPLACE FUNCTION public.jaga_tarif_mentor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- auth.uid() NULL berarti dijalankan dari SQL Editor oleh pemilik tabel;
  -- biarkan lewat, sama seperti guard_role_change di migration 019.
  IF auth.uid() IS NULL OR public.is_staff() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.price_per_hour := 0;
    NEW.rating_avg     := 0;
    NEW.session_count  := 0;
  ELSE
    NEW.price_per_hour := OLD.price_per_hour;
    NEW.rating_avg     := OLD.rating_avg;
    NEW.session_count  := OLD.session_count;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mentor_jaga_tarif ON public.mentor_profiles;
CREATE TRIGGER mentor_jaga_tarif
  BEFORE INSERT OR UPDATE ON public.mentor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.jaga_tarif_mentor();
