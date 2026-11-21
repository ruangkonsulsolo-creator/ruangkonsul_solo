-- Migration: 032_testimoni_notif
--
-- Testimoni yang muncul sebagai notifikasi kecil di pojok kiri bawah
-- halaman publik.
--
-- Tabelnya sengaja dibuat kosong. Testimoni adalah keterangan tentang
-- pengalaman konsumen; mengisinya dengan kalimat karangan untuk "contoh"
-- adalah persis yang dilarang UU No. 8 Tahun 1999 Pasal 9 ayat (1), dan
-- contoh yang terlanjur tayang hampir tidak pernah sempat diganti. Isi
-- lewat panel admin dengan kalimat yang benar-benar dikirim orang.
--
-- Catatan privasi: kalau testimoninya diambil dari pesan WhatsApp, minta
-- izin pengirimnya dulu dan jangan menuliskan nama lengkap atau nomornya.
-- UU No. 27 Tahun 2022 memperlakukan keduanya sebagai data pribadi.

CREATE TABLE IF NOT EXISTS public.testimoni (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  isi         TEXT        NOT NULL CHECK (length(btrim(isi)) BETWEEN 3 AND 400),
  -- "Mahasiswa S1", "Alumni UNS" — bukan nama lengkap.
  penulis     TEXT,
  -- Layanan yang dipakai, mis. "Bimbingan Skripsi".
  layanan     TEXT,
  tautan      TEXT,       -- tujuan saat notifikasinya diklik
  urutan      INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_testimoni_aktif
  ON public.testimoni(is_active, urutan);

DROP TRIGGER IF EXISTS testimoni_updated_at ON public.testimoni;
CREATE TRIGGER testimoni_updated_at
  BEFORE UPDATE ON public.testimoni
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.testimoni ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS testimoni_select_public ON public.testimoni;
DROP POLICY IF EXISTS testimoni_all_staff     ON public.testimoni;

CREATE POLICY testimoni_select_public ON public.testimoni
  FOR SELECT USING (is_active = true OR public.is_staff());

CREATE POLICY testimoni_all_staff ON public.testimoni
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

GRANT SELECT ON public.testimoni TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.testimoni TO authenticated;
