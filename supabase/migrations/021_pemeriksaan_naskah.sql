-- Migration: 021_pemeriksaan_naskah
--
-- Fitur pemeriksaan naskah: cek kemiripan dan indikasi gaya AI, dibayar
-- dari saldo kredit pengguna.
--
-- Catatan penamaan: tabel dan kolom di sini sengaja TIDAK menyebut
-- "turnitin". Hasil pemeriksaan berasal dari penyedia API pihak ketiga,
-- bukan dari Turnitin, dan menamainya begitu akan menyesatkan — baik bagi
-- pengguna maupun bagi siapa pun yang membaca kode ini nanti.
--
-- Aman dijalankan ulang.

-- ── 1. Jenis dan status ─────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE jenis_periksa AS ENUM ('kemiripan', 'ai', 'keduanya');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE status_periksa AS ENUM ('antre', 'diproses', 'selesai', 'gagal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. Tabel pemeriksaan ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pemeriksaan (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  jenis          jenis_periksa  NOT NULL,
  status         status_periksa NOT NULL DEFAULT 'antre',

  jumlah_kata    INTEGER NOT NULL CHECK (jumlah_kata > 0),
  biaya_idr      INTEGER NOT NULL CHECK (biaya_idr >= 0),

  -- Naskah tidak disimpan utuh. Yang disimpan hanya cuplikan awal untuk
  -- membantu pengguna mengenali kiriman mana ini, plus sidik jarinya untuk
  -- mendeteksi kiriman ganda. Menyimpan draf skripsi orang secara utuh
  -- adalah tanggung jawab yang tidak perlu dipikul: kalau basis data bocor,
  -- yang bocor adalah karya yang belum terbit milik ribuan mahasiswa.
  cuplikan       TEXT,
  sidik_teks     TEXT NOT NULL,

  hasil          JSONB,
  pesan_galat    TEXT,
  penyedia       TEXT,

  dibuat_pada    TIMESTAMPTZ NOT NULL DEFAULT now(),
  selesai_pada   TIMESTAMPTZ
);

COMMENT ON COLUMN public.pemeriksaan.sidik_teks IS
  'SHA-256 dari naskah. Dipakai mengenali kiriman ulang yang sama persis, '
  'bukan untuk merekonstruksi isinya.';

COMMENT ON COLUMN public.pemeriksaan.hasil IS
  'Hasil dari penyedia, bentuknya mengikuti HasilPeriksa di lib/periksa/types.ts.';

CREATE INDEX IF NOT EXISTS idx_pemeriksaan_user
  ON public.pemeriksaan (user_id, dibuat_pada DESC);
CREATE INDEX IF NOT EXISTS idx_pemeriksaan_status
  ON public.pemeriksaan (status) WHERE status IN ('antre', 'diproses');

ALTER TABLE public.pemeriksaan ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename='pemeriksaan'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.pemeriksaan', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "pemeriksaan_select_own"
  ON public.pemeriksaan FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "pemeriksaan_select_staff"
  ON public.pemeriksaan FOR SELECT USING (public.is_staff());

-- Sengaja tidak ada policy INSERT untuk pengguna. Baris hanya boleh dibuat
-- lewat fungsi mulai_pemeriksaan() di bawah, yang memotong saldo dalam satu
-- transaksi. Kalau pengguna boleh menyisipkan sendiri, dia bisa membuat
-- pemeriksaan tanpa membayar.
CREATE POLICY "pemeriksaan_all_staff"
  ON public.pemeriksaan FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ── 3. Mutasi saldo ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mutasi_kredit (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  jumlah      INTEGER NOT NULL,          -- negatif = potong, positif = isi
  saldo_akhir INTEGER NOT NULL,
  keterangan  TEXT NOT NULL,
  ref_id      UUID,
  dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.mutasi_kredit IS
  'Riwayat perubahan saldo. Tanpa ini, selisih saldo tidak bisa ditelusuri '
  'saat ada keluhan pengguna.';

CREATE INDEX IF NOT EXISTS idx_mutasi_user
  ON public.mutasi_kredit (user_id, dibuat_pada DESC);

ALTER TABLE public.mutasi_kredit ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename='mutasi_kredit'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.mutasi_kredit', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "mutasi_select_own"
  ON public.mutasi_kredit FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "mutasi_all_staff"
  ON public.mutasi_kredit FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ── 4. Memulai pemeriksaan: potong saldo dan buat baris, satu transaksi ─────
--
-- Pemotongan saldo dan pembuatan baris harus menyatu. Kalau dipisah di
-- aplikasi, dua permintaan yang datang bersamaan bisa sama-sama lolos
-- pengecekan saldo lalu sama-sama memotong — pengguna dapat dua pemeriksaan
-- dengan bayaran satu. SELECT ... FOR UPDATE mengunci baris profil sampai
-- transaksi ini selesai, sehingga permintaan kedua menunggu dan melihat
-- saldo yang sudah berkurang.

CREATE OR REPLACE FUNCTION public.mulai_pemeriksaan(
  p_jenis       jenis_periksa,
  p_jumlah_kata INTEGER,
  p_biaya       INTEGER,
  p_cuplikan    TEXT,
  p_sidik       TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user   UUID := (SELECT auth.uid());
  v_saldo  INTEGER;
  v_id     UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Harus masuk dulu.' USING ERRCODE = '42501';
  END IF;

  IF p_jumlah_kata <= 0 OR p_biaya < 0 THEN
    RAISE EXCEPTION 'Jumlah kata atau biaya tidak masuk akal.'
      USING ERRCODE = '22023';
  END IF;

  -- Kunci baris profil sampai transaksi selesai.
  SELECT credit_balance INTO v_saldo
  FROM public.profiles WHERE id = v_user
  FOR UPDATE;

  IF v_saldo IS NULL THEN
    RAISE EXCEPTION 'Profil tidak ditemukan.' USING ERRCODE = 'P0002';
  END IF;

  IF v_saldo < p_biaya THEN
    RAISE EXCEPTION 'Saldo tidak cukup. Butuh %, tersedia %.', p_biaya, v_saldo
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.pemeriksaan
    (user_id, jenis, status, jumlah_kata, biaya_idr, cuplikan, sidik_teks)
  VALUES
    (v_user, p_jenis, 'diproses', p_jumlah_kata, p_biaya,
     left(COALESCE(p_cuplikan, ''), 200), p_sidik)
  RETURNING id INTO v_id;

  -- Lewat pembaruan langsung: guard_role_change menolak perubahan saldo oleh
  -- bukan staf, dan fungsi ini berjalan atas nama pengguna biasa.
  -- SECURITY DEFINER membuat is_staff() tetap false, jadi triggernya harus
  -- dilewati dengan sengaja lewat session setting.
  PERFORM set_config('rks.lewati_guard_saldo', 'on', true);

  UPDATE public.profiles
  SET credit_balance = credit_balance - p_biaya
  WHERE id = v_user;

  PERFORM set_config('rks.lewati_guard_saldo', 'off', true);

  INSERT INTO public.mutasi_kredit
    (user_id, jumlah, saldo_akhir, keterangan, ref_id)
  VALUES
    (v_user, -p_biaya, v_saldo - p_biaya,
     format('Pemeriksaan naskah (%s, %s kata)', p_jenis, p_jumlah_kata), v_id);

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mulai_pemeriksaan TO authenticated;

-- ── 5. Guard saldo disesuaikan ──────────────────────────────────────────────
--
-- guard_role_change melarang pengguna mengubah saldonya sendiri. Larangan itu
-- tetap berlaku; yang ditambahkan hanya jalan keluar untuk fungsi
-- mulai_pemeriksaan, yang memotong saldo atas permintaan pengguna sendiri.
--
-- Jalan keluarnya lewat setelan transaksi, bukan lewat peran, sehingga hanya
-- berlaku di dalam transaksi yang memang menyetelnya dan hilang begitu
-- transaksi selesai. Pengguna tidak bisa menyetelnya sendiri lewat PostgREST.

CREATE OR REPLACE FUNCTION public.guard_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF (SELECT auth.uid()) IS NULL THEN
      NULL;  -- akses langsung ke basis data (SQL Editor, service role)
    ELSIF public.is_superadmin() THEN
      NULL;
    ELSIF public.current_user_role() = 'admin' THEN
      IF NOT (OLD.role IN ('user','mentor') AND NEW.role IN ('user','mentor')) THEN
        RAISE EXCEPTION 'Admin hanya dapat mengubah role antara user dan mentor.'
          USING ERRCODE = '42501';
      END IF;
    ELSE
      RAISE EXCEPTION 'Tidak berhak mengubah role.' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.credit_balance IS DISTINCT FROM OLD.credit_balance THEN
    IF current_setting('rks.lewati_guard_saldo', true) = 'on' THEN
      NULL;  -- dipotong oleh mulai_pemeriksaan dalam transaksi yang sama
    ELSIF (SELECT auth.uid()) IS NULL OR public.is_staff() THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Saldo kredit tidak dapat diubah sendiri.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 6. Menyimpan hasil ──────────────────────────────────────────────────────
--
-- Dipanggil server setelah penyedia menjawab. Kalau gagal, saldo
-- dikembalikan — pengguna tidak boleh membayar untuk kegagalan di pihak kami.

CREATE OR REPLACE FUNCTION public.selesaikan_pemeriksaan(
  p_id        UUID,
  p_hasil     JSONB,
  p_penyedia  TEXT,
  p_galat     TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.pemeriksaan%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.pemeriksaan WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pemeriksaan tidak ditemukan.' USING ERRCODE = 'P0002';
  END IF;

  IF v_row.status IN ('selesai', 'gagal') THEN
    RETURN;  -- sudah diselesaikan, jangan kembalikan saldo dua kali
  END IF;

  IF p_galat IS NOT NULL THEN
    UPDATE public.pemeriksaan
    SET status = 'gagal', pesan_galat = p_galat,
        penyedia = p_penyedia, selesai_pada = now()
    WHERE id = p_id;

    PERFORM set_config('rks.lewati_guard_saldo', 'on', true);
    UPDATE public.profiles
    SET credit_balance = credit_balance + v_row.biaya_idr
    WHERE id = v_row.user_id;
    PERFORM set_config('rks.lewati_guard_saldo', 'off', true);

    INSERT INTO public.mutasi_kredit
      (user_id, jumlah, saldo_akhir, keterangan, ref_id)
    SELECT v_row.user_id, v_row.biaya_idr, credit_balance,
           'Pengembalian: pemeriksaan gagal', p_id
    FROM public.profiles WHERE id = v_row.user_id;
  ELSE
    UPDATE public.pemeriksaan
    SET status = 'selesai', hasil = p_hasil,
        penyedia = p_penyedia, selesai_pada = now()
    WHERE id = p_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.selesaikan_pemeriksaan FROM PUBLIC;

DO $$ BEGIN
  RAISE NOTICE '021_pemeriksaan_naskah: selesai.';
END $$;
