-- 043: Nama mesin pemeriksa pada laporan manual (mis. Turnitin), dipilih
-- admin saat mengunggah PDF laporan asli. Ditampilkan apa adanya ke
-- customer di halaman pratinjau laporan. Jalankan setelah 042.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS mesin_laporan TEXT CHECK (char_length(mesin_laporan) <= 40);
