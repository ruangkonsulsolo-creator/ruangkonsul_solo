-- ═══════════════════════════════════════════════════════════════════════════
-- 036 — Pengerasan dua fungsi yang bisa dipanggil langsung oleh user login
--
-- Ditemukan saat uji keamanan (memanggil API Supabase langsung dengan token
-- customer, melewati website):
--
-- 1. generate_slots_for_range(mentor, dari, sampai) — SECURITY DEFINER tanpa
--    cek pemanggil. Customer / mentor lain bisa membuat slot untuk mentor mana
--    pun. Sekarang hanya mentor pemilik atau staff.
--
-- 2. mulai_pemeriksaan(..., p_biaya, ...) — biaya dari pemanggil. Website
--    menghitung biaya di server, tapi pemanggilan langsung dengan p_biaya = 0
--    membuat catatan pemeriksaan tanpa memotong saldo. Mesin pemeriksa tidak
--    ikut jalan (hanya dari /api/periksa), jadi bukan layanan gratis, tetapi
--    pembukuan jadi kotor. Sekarang biaya minimum dihitung ulang di database
--    dari tarif layanan (sama dengan lib/periksa/tarif.ts).
--
-- Aman dijalankan ulang. Bergantung pada 018 (booking_slots), 021, 035.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Slot: hanya mentor pemilik atau staff ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_slots_for_range(p_mentor_id uuid, p_from date, p_to date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  inserted INTEGER := 0;
BEGIN
  -- service role (auth.uid() NULL) tetap boleh, untuk job/admin server.
  IF (SELECT auth.uid()) IS NOT NULL
     AND NOT public.is_staff()
     AND public.current_mentor_id() IS DISTINCT FROM p_mentor_id THEN
    RAISE EXCEPTION 'Hanya mentor pemilik jadwal atau admin.' USING ERRCODE = '42501';
  END IF;

  IF p_to < p_from THEN
    RAISE EXCEPTION 'Rentang tanggal tidak valid.' USING ERRCODE = '22023';
  END IF;

  IF p_to - p_from > 180 THEN
    RAISE EXCEPTION 'Maksimal 180 hari sekali generate.' USING ERRCODE = '22023';
  END IF;

  WITH days AS (
    SELECT d::DATE AS slot_date
    FROM generate_series(p_from, p_to, INTERVAL '1 day') d
  ),
  pattern AS (
    SELECT a.mentor_id, a.start_time, a.end_time, a.slot_minutes, a.day_of_week
    FROM public.mentor_availability a
    WHERE a.mentor_id = p_mentor_id AND a.is_active = true
  ),
  expanded AS (
    SELECT
      p.mentor_id,
      d.slot_date,
      t::TIME AS slot_start,
      (t + make_interval(mins => p.slot_minutes))::TIME AS slot_end
    FROM days d
    JOIN pattern p ON p.day_of_week = EXTRACT(DOW FROM d.slot_date)
    CROSS JOIN LATERAL generate_series(
      d.slot_date + p.start_time,
      d.slot_date + p.end_time - make_interval(mins => p.slot_minutes),
      make_interval(mins => p.slot_minutes)
    ) t
  )
  INSERT INTO public.booking_slots (mentor_id, slot_date, slot_start, slot_end)
  SELECT mentor_id, slot_date, slot_start, slot_end FROM expanded
  ON CONFLICT (mentor_id, slot_date, slot_start) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$function$;

-- 2. Pemeriksaan: biaya minimum dihitung di database ─────────────────────────
-- Tarif per 1.000 kata dari services (slug sama dengan lib/periksa/tarif.ts),
-- cadangan = TARIF bawaan di lib/periksa/types.ts.
CREATE OR REPLACE FUNCTION public.tarif_periksa_per_seribu(p_jenis public.jenis_periksa)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT COALESCE(
    (SELECT s.price_idr FROM public.services s
      WHERE s.slug = CASE p_jenis::text
                       WHEN 'kemiripan' THEN 'cek-plagiarisme'
                       WHEN 'ai'        THEN 'cek-ai'
                       WHEN 'parafrase' THEN 'parafrase'
                     END
        AND s.price_idr > 0),
    CASE p_jenis::text WHEN 'kemiripan' THEN 3300 WHEN 'ai' THEN 4500 ELSE 1500 END
  );
$$;

CREATE OR REPLACE FUNCTION public.mulai_pemeriksaan(p_jenis public.jenis_periksa, p_jumlah_kata integer, p_biaya integer, p_cuplikan text, p_sidik text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user    UUID := (SELECT auth.uid());
  v_saldo   INTEGER;
  v_id      UUID;
  v_minimum INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Harus masuk dulu.' USING ERRCODE = '42501';
  END IF;

  IF p_jumlah_kata <= 0 OR p_biaya < 0 THEN
    RAISE EXCEPTION 'Jumlah kata atau biaya tidak masuk akal.'
      USING ERRCODE = '22023';
  END IF;

  -- Biaya tidak boleh di bawah tarif resmi (pembulatan ke atas per 1.000 kata).
  v_minimum := GREATEST(1, CEIL(p_jumlah_kata / 1000.0))::INTEGER
               * public.tarif_periksa_per_seribu(p_jenis);
  IF p_biaya < v_minimum THEN
    RAISE EXCEPTION 'Biaya di bawah tarif (minimal %).', v_minimum
      USING ERRCODE = '22023';
  END IF;

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
$function$;

DO $$ BEGIN
  RAISE NOTICE '036_pengerasan_rpc: selesai.';
END $$;
