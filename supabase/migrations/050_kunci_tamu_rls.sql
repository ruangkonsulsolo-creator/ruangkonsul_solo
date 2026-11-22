-- 050: Batasi sesi tamu (anonymous sign-in) di RLS.
--
-- Tamu memakai role "authenticated", sama dengan akun biasa. Karena sesi tamu
-- bisa dibuat tanpa konfirmasi email, kebijakan "user boleh menulis datanya
-- sendiri" harus menolak tamu untuk fitur di luar pemeriksa naskah. Tanpa ini
-- tamu bisa, misalnya, membuat booking "pending" langsung lewat PostgREST dan
-- mengunci slot jadwal mentor.
--
-- Pola anjuran Supabase: kebijakan RESTRICTIVE yang mengecek klaim JWT
-- is_anonymous. Restrictive = harus lolos SELAIN kebijakan permisif yang ada.
-- Penulisan pemeriksa naskah (orders, uploaded_files, pembayaran) dilakukan
-- server dengan service role, jadi tidak terpengaruh. Unggah naskah ke bucket
-- "documents" dan RPC mulai_pemeriksaan tetap terbuka untuk tamu.

CREATE OR REPLACE FUNCTION public.bukan_tamu()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) IS NOT TRUE
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bookings', 'percakapan', 'pesan', 'ulasan', 'merchandise_orders',
    'orders', 'uploaded_files', 'booking_slots', 'mentor_availability', 'mentor_profiles'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS tamu_dilarang_tambah ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tamu_dilarang_tambah ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.bukan_tamu())', t);
    EXECUTE format('DROP POLICY IF EXISTS tamu_dilarang_ubah ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tamu_dilarang_ubah ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.bukan_tamu())', t);
  END LOOP;
END $$;

DO $$ BEGIN RAISE NOTICE '050_kunci_tamu_rls: migration berhasil.'; END $$;
