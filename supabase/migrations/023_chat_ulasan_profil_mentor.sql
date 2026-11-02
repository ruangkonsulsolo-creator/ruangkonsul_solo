-- ─────────────────────────────────────────────────────────────────────────────
-- 023 — Chat mentor↔customer, ulasan, dan perluasan profil mentor
--
-- Sebelum ini, halaman Chat dan Ulasan di panel mentor hanya tampilan: tidak
-- ada tabelnya sama sekali, jadi tidak ada yang bisa disimpan atau dibaca.
-- Berkas ini membuat fondasinya.
--
-- Aman dijalankan berulang kali.
--
-- Bergantung pada fungsi pembantu dari migration 018 (is_staff, is_mentor,
-- current_mentor_id). Jalankan 018 lebih dulu kalau belum.
-- ─────────────────────────────────────────────────────────────────────────────

-- ══ 1. Perluasan profil mentor ═══════════════════════════════════════════════
-- Kolom untuk biodata lengkap: gelar, pencapaian, pengalaman, dan perjalanan
-- pendidikan. Pengalaman dan pendidikan disimpan sebagai JSONB array supaya
-- tiap entri bisa punya periode dan keterangan sendiri tanpa tabel terpisah.
--
--   pengalaman : [{"posisi":"...","instansi":"...","mulai":"2019","selesai":"2023","catatan":"..."}]
--   pendidikan : [{"jenjang":"S2","program":"...","kampus":"...","tahun":"2021"}]

ALTER TABLE public.mentor_profiles
  ADD COLUMN IF NOT EXISTS headline      TEXT,
  ADD COLUMN IF NOT EXISTS gelar         TEXT,
  ADD COLUMN IF NOT EXISTS pencapaian    TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pengalaman    JSONB   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pendidikan    JSONB   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS linkedin_url  TEXT;

COMMENT ON COLUMN public.mentor_profiles.pengalaman IS
  'Array JSON: posisi, instansi, mulai, selesai, catatan.';
COMMENT ON COLUMN public.mentor_profiles.pendidikan IS
  'Array JSON: jenjang, program, kampus, tahun.';

-- Mentor harus bisa menyunting profilnya sendiri. Tanpa kebijakan ini,
-- halaman Edit Profil tidak akan pernah bisa menyimpan apa pun.
DROP POLICY IF EXISTS "mentor_update_profil_sendiri" ON public.mentor_profiles;
CREATE POLICY "mentor_update_profil_sendiri"
  ON public.mentor_profiles FOR UPDATE
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ══ 2. Percakapan ════════════════════════════════════════════════════════════
-- Satu percakapan per pasangan mentor–customer. Konsultasi bimbingan adalah
-- hubungan yang berlanjut, bukan tiket sekali pakai, jadi riwayatnya menyatu
-- alih-alih terpecah per sesi booking.

CREATE TABLE IF NOT EXISTS public.percakapan (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id            UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  customer_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dibuat_pada          TIMESTAMPTZ NOT NULL DEFAULT now(),
  pesan_terakhir_pada  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mentor_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_percakapan_mentor
  ON public.percakapan(mentor_id, pesan_terakhir_pada DESC);
CREATE INDEX IF NOT EXISTS idx_percakapan_customer
  ON public.percakapan(customer_id, pesan_terakhir_pada DESC);

ALTER TABLE public.percakapan ENABLE ROW LEVEL SECURITY;

-- ══ 3. Pesan ═════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.pesan (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  percakapan_id  UUID NOT NULL REFERENCES public.percakapan(id) ON DELETE CASCADE,
  pengirim_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  isi            TEXT NOT NULL
                 CHECK (length(btrim(isi)) > 0 AND length(isi) <= 4000),
  dibaca_pada    TIMESTAMPTZ,
  dibuat_pada    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pesan_percakapan
  ON public.pesan(percakapan_id, dibuat_pada);
-- Dipakai menghitung lencana "belum dibaca" tanpa memindai seluruh tabel.
CREATE INDEX IF NOT EXISTS idx_pesan_belum_dibaca
  ON public.pesan(percakapan_id) WHERE dibaca_pada IS NULL;

ALTER TABLE public.pesan ENABLE ROW LEVEL SECURITY;

-- ══ 4. Penjaga akses ═════════════════════════════════════════════════════════
-- SECURITY DEFINER dengan search_path dikunci. Tanpa ini, kebijakan pada
-- tabel pesan harus menanyai percakapan, yang kebijakannya menanyai
-- mentor_profiles — jalan pintas menuju rekursi tak berujung (42P17) yang
-- sudah pernah melumpuhkan basis data ini sebelumnya.

CREATE OR REPLACE FUNCTION public.peserta_percakapan(p_percakapan UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.percakapan c
    JOIN public.mentor_profiles m ON m.id = c.mentor_id
    WHERE c.id = p_percakapan
      AND (c.customer_id = auth.uid() OR m.user_id = auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.peserta_percakapan(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peserta_percakapan(UUID) TO authenticated;

-- ══ 5. Kebijakan percakapan ══════════════════════════════════════════════════

DROP POLICY IF EXISTS "percakapan_select_peserta" ON public.percakapan;
CREATE POLICY "percakapan_select_peserta"
  ON public.percakapan FOR SELECT
  USING (
    customer_id = auth.uid()
    OR mentor_id = public.current_mentor_id()
    OR public.is_staff()
  );

-- Customer yang memulai percakapan. Mentor tidak bisa membuka percakapan
-- lebih dulu: itu membuka jalan bagi mentor menghubungi siapa saja.
DROP POLICY IF EXISTS "percakapan_insert_customer" ON public.percakapan;
CREATE POLICY "percakapan_insert_customer"
  ON public.percakapan FOR INSERT
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "percakapan_update_peserta" ON public.percakapan;
CREATE POLICY "percakapan_update_peserta"
  ON public.percakapan FOR UPDATE
  USING (customer_id = auth.uid() OR mentor_id = public.current_mentor_id());

-- ══ 6. Kebijakan pesan ═══════════════════════════════════════════════════════

DROP POLICY IF EXISTS "pesan_select_peserta" ON public.pesan;
CREATE POLICY "pesan_select_peserta"
  ON public.pesan FOR SELECT
  USING (public.peserta_percakapan(percakapan_id) OR public.is_staff());

-- pengirim_id dipaksa sama dengan pengguna yang masuk: tanpa ini, peserta
-- bisa menyisipkan pesan atas nama lawan bicaranya.
DROP POLICY IF EXISTS "pesan_insert_peserta" ON public.pesan;
CREATE POLICY "pesan_insert_peserta"
  ON public.pesan FOR INSERT
  WITH CHECK (
    pengirim_id = auth.uid()
    AND public.peserta_percakapan(percakapan_id)
  );

-- Hanya untuk menandai sudah dibaca. Isi pesan tidak boleh diubah setelah
-- terkirim — percakapan yang bisa disunting diam-diam tidak ada gunanya
-- sebagai catatan kesepakatan bimbingan.
DROP POLICY IF EXISTS "pesan_update_dibaca" ON public.pesan;
CREATE POLICY "pesan_update_dibaca"
  ON public.pesan FOR UPDATE
  USING (public.peserta_percakapan(percakapan_id))
  WITH CHECK (public.peserta_percakapan(percakapan_id));

-- ══ 7. Jaga isi pesan tidak berubah ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.jaga_isi_pesan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.isi IS DISTINCT FROM OLD.isi
     OR NEW.pengirim_id IS DISTINCT FROM OLD.pengirim_id
     OR NEW.percakapan_id IS DISTINCT FROM OLD.percakapan_id THEN
    RAISE EXCEPTION 'Isi pesan tidak bisa diubah setelah terkirim.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pesan_jaga_isi ON public.pesan;
CREATE TRIGGER pesan_jaga_isi
  BEFORE UPDATE ON public.pesan
  FOR EACH ROW EXECUTE FUNCTION public.jaga_isi_pesan();

-- ══ 8. Perbarui penanda waktu percakapan ═════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sentuh_percakapan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.percakapan
     SET pesan_terakhir_pada = NEW.dibuat_pada
   WHERE id = NEW.percakapan_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pesan_sentuh_percakapan ON public.pesan;
CREATE TRIGGER pesan_sentuh_percakapan
  AFTER INSERT ON public.pesan
  FOR EACH ROW EXECUTE FUNCTION public.sentuh_percakapan();

-- ══ 9. Ulasan ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ulasan (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id    UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id   UUID UNIQUE REFERENCES public.bookings(id) ON DELETE SET NULL,
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  komentar     TEXT CHECK (komentar IS NULL OR length(komentar) <= 2000),
  balasan      TEXT CHECK (balasan IS NULL OR length(balasan) <= 2000),
  dibuat_pada  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ulasan_mentor
  ON public.ulasan(mentor_id, dibuat_pada DESC);

ALTER TABLE public.ulasan ENABLE ROW LEVEL SECURITY;

-- Ulasan tampil di halaman mentor yang bisa dilihat siapa saja.
DROP POLICY IF EXISTS "ulasan_select_publik" ON public.ulasan;
CREATE POLICY "ulasan_select_publik"
  ON public.ulasan FOR SELECT USING (true);

-- Hanya customer yang benar-benar pernah menyelesaikan sesi dengan mentor
-- itu yang boleh menulis ulasan. Tanpa syarat ini, rating bisa diisi siapa
-- saja, dan rating yang bisa dikarang tidak ada nilainya bagi pembeli.
DROP POLICY IF EXISTS "ulasan_insert_setelah_sesi" ON public.ulasan;
CREATE POLICY "ulasan_insert_setelah_sesi"
  ON public.ulasan FOR INSERT
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = ulasan.booking_id
        AND b.user_id = auth.uid()
        AND b.mentor_id = ulasan.mentor_id
        AND b.status = 'completed'
    )
  );

-- Customer menyunting ulasannya sendiri; mentor hanya boleh mengisi balasan.
DROP POLICY IF EXISTS "ulasan_update_penulis" ON public.ulasan;
CREATE POLICY "ulasan_update_penulis"
  ON public.ulasan FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "ulasan_balas_mentor" ON public.ulasan;
CREATE POLICY "ulasan_balas_mentor"
  ON public.ulasan FOR UPDATE
  USING (mentor_id = public.current_mentor_id())
  WITH CHECK (mentor_id = public.current_mentor_id());

-- ══ 10. Rating mentor dihitung ulang otomatis ════════════════════════════════
-- rating_avg dan session_count di mentor_profiles tidak boleh diisi tangan:
-- angka yang bisa diketik manual adalah angka yang bisa dikarang.

CREATE OR REPLACE FUNCTION public.hitung_rating_mentor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_mentor UUID := COALESCE(NEW.mentor_id, OLD.mentor_id);
BEGIN
  UPDATE public.mentor_profiles m
     SET rating_avg = COALESCE((
           SELECT ROUND(AVG(u.rating)::numeric, 2)
           FROM public.ulasan u WHERE u.mentor_id = v_mentor
         ), 0)
   WHERE m.id = v_mentor;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS ulasan_hitung_rating ON public.ulasan;
CREATE TRIGGER ulasan_hitung_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.ulasan
  FOR EACH ROW EXECUTE FUNCTION public.hitung_rating_mentor();

-- ══ 11. Hak akses tabel ══════════════════════════════════════════════════════
-- RLS menyaring BARIS, tapi hanya setelah peran punya hak atas TABELNYA.
-- Tanpa GRANT di bawah, setiap permintaan ditolak lebih dulu dengan
-- "permission denied for table" dan kebijakan di atas tidak pernah diuji.
-- Supabase memang memasang default privileges untuk tabel baru di skema
-- public, tapi menuliskannya eksplisit membuat migration ini benar di mana
-- pun dijalankan, bukan hanya di proyek yang kebetulan sudah tersetel.

GRANT SELECT, INSERT, UPDATE ON public.percakapan TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pesan      TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ulasan     TO authenticated;

-- Ulasan tampil di halaman mentor yang terbuka untuk umum, jadi pengunjung
-- yang belum masuk pun perlu bisa membacanya.
GRANT SELECT ON public.ulasan TO anon;
