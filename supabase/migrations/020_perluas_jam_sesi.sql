-- Migration: 020_perluas_jam_sesi
--
-- Memperluas jam bimbingan dari 09.00–17.00 jadi 09.00–21.00 WIB,
-- tetap satu jam per sesi. Dari 8 slot per hari jadi 12.
--
-- Aman dijalankan ulang.

-- ── 1. Perbarui pola mingguan semua mentor ──────────────────────────────────
--
-- ON CONFLICT dipakai karena mentor_availability punya unique
-- (mentor_id, day_of_week, start_time): kalau pola jam 09.00 untuk hari itu
-- sudah ada, yang diperbarui adalah jam selesainya.
UPDATE public.mentor_availability
SET end_time = '21:00',
    slot_minutes = 60
WHERE is_active = true;

-- Mentor yang belum punya pola sama sekali: beri Senin–Sabtu 09.00–21.00.
-- Sabtu diikutkan karena jam malam dan akhir pekan justru yang paling dicari
-- mahasiswa yang kuliah atau bekerja di siang hari.
INSERT INTO public.mentor_availability
  (mentor_id, day_of_week, start_time, end_time, slot_minutes, is_active)
SELECT mp.id, d, '09:00', '21:00', 60, true
FROM public.mentor_profiles mp
CROSS JOIN generate_series(1, 6) AS d
WHERE NOT EXISTS (
  SELECT 1 FROM public.mentor_availability a
  WHERE a.mentor_id = mp.id AND a.day_of_week = d
)
ON CONFLICT (mentor_id, day_of_week, start_time) DO NOTHING;

-- ── 2. Buat slot baru dari pola yang diperbarui ─────────────────────────────
--
-- generate_slots_for_range idempoten (ON CONFLICT DO NOTHING), jadi slot
-- 09.00–17.00 yang sudah ada tidak diduplikasi; yang ditambahkan hanya jam
-- 17.00–21.00 yang belum pernah dibuat.
--
-- Slot yang sudah terlanjur dibooking tidak tersentuh sama sekali.
DO $$
DECLARE
  m RECORD;
  total INTEGER := 0;
  n INTEGER;
BEGIN
  FOR m IN SELECT id, display_name FROM public.mentor_profiles LOOP
    SELECT public.generate_slots_for_range(
      m.id,
      (now() AT TIME ZONE 'Asia/Jakarta')::date,
      (now() AT TIME ZONE 'Asia/Jakarta')::date + 30
    ) INTO n;
    total := total + n;
    RAISE NOTICE 'Mentor %: % slot baru', COALESCE(m.display_name, m.id::text), n;
  END LOOP;
  RAISE NOTICE 'Total slot baru: %', total;
END $$;

-- ── 3. Verifikasi ───────────────────────────────────────────────────────────
DO $$
DECLARE
  tersedia INTEGER;
  jam_akhir TIME;
BEGIN
  SELECT count(*) INTO tersedia FROM public.available_slots;
  SELECT max(slot_start) INTO jam_akhir FROM public.booking_slots;
  RAISE NOTICE '020_perluas_jam_sesi: % slot tersedia, slot terakhir mulai %',
    tersedia, jam_akhir;
END $$;
