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

-- ══ Pembatasan kolom ═════════════════════════════════════════════════════════
--
-- Mendahulukan hak akses Postgres daripada trigger, dan itu disengaja.
--
-- Rancangan pertama berkas ini memakai trigger yang mengembalikan
-- price_per_hour ke nilai lama, dengan jalan keluar berupa tanda sesi
-- (set_config) supaya trigger rating tetap bisa menulis. Rancangan itu BOCOR:
-- diuji, ternyata mentor bisa menyalakan sendiri tanda yang sama lalu
-- menaikkan tarifnya menjadi berapa pun. Penjaga yang bisa dinyalakan oleh
-- pihak yang dijaga bukan penjaga.
--
-- Pembatasan di bawah ditegakkan Postgres sendiri: peran authenticated tidak
-- punya hak menulis ke price_per_hour, rating_avg, dan session_count sama
-- sekali, jadi tidak ada tanda atau akal-akalan apa pun yang bisa
-- melewatinya. Trigger hitung_rating_mentor tetap bisa menulis karena
-- SECURITY DEFINER membuatnya berjalan sebagai pemilik tabel.

GRANT SELECT ON public.mentor_profiles TO authenticated, anon;

REVOKE INSERT, UPDATE ON public.mentor_profiles FROM authenticated;

-- Kolom yang boleh diisi mentor saat membuat barisnya sendiri.
GRANT INSERT (
  user_id, bio, headline, gelar, education, specializations,
  experience_years, is_available, avatar_url, linkedin_url,
  pencapaian, pengalaman, pendidikan
) ON public.mentor_profiles TO authenticated;

-- Kolom yang boleh disunting mentor. price_per_hour, rating_avg, dan
-- session_count sengaja TIDAK ada di daftar ini.
GRANT UPDATE (
  bio, headline, gelar, education, specializations,
  experience_years, is_available, avatar_url, linkedin_url,
  pencapaian, pengalaman, pendidikan, updated_at
) ON public.mentor_profiles TO authenticated;

-- Trigger penjaga dari rancangan pertama dibuang: tidak diperlukan lagi,
-- dan membiarkannya berarti membiarkan jalan keluar yang bocor itu hidup.
DROP TRIGGER IF EXISTS mentor_jaga_tarif ON public.mentor_profiles;
DROP FUNCTION IF EXISTS public.jaga_tarif_mentor();
