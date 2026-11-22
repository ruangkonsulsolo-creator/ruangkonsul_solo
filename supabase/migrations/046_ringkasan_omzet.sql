-- 046_ringkasan_omzet.sql
-- Ringkasan omzet untuk dashboard admin, dihitung dari SEMUA pembayaran lunas
-- (cek naskah, bimbingan, produk, isi saldo) per tanggal WIB.
-- Agregasi di database supaya tidak terpotong batas baris PostgREST.

CREATE OR REPLACE FUNCTION public.omzet_harian(p_dari TIMESTAMPTZ)
RETURNS TABLE (hari DATE, purpose TEXT, jumlah BIGINT, transaksi BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (pm.paid_at AT TIME ZONE 'Asia/Jakarta')::date AS hari,
         pm.purpose,
         sum(pm.amount_idr)::bigint,
         count(*)::bigint
    FROM public.payments pm
   WHERE pm.status = 'paid'
     AND pm.paid_at >= p_dari
     AND public.is_staff()
   GROUP BY 1, 2
   ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.omzet_bulanan()
RETURNS TABLE (bulan DATE, purpose TEXT, jumlah BIGINT, transaksi BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT date_trunc('month', pm.paid_at AT TIME ZONE 'Asia/Jakarta')::date AS bulan,
         pm.purpose,
         sum(pm.amount_idr)::bigint,
         count(*)::bigint
    FROM public.payments pm
   WHERE pm.status = 'paid'
     AND public.is_staff()
   GROUP BY 1, 2
   ORDER BY 1;
$$;

REVOKE ALL ON FUNCTION public.omzet_harian(TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.omzet_bulanan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.omzet_harian(TIMESTAMPTZ) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.omzet_bulanan() TO authenticated, service_role;

-- Sisa nama brand lama pada penulis bawaan artikel blog.
ALTER TABLE public.blog_posts ALTER COLUMN author SET DEFAULT 'Tim Ruang Konsul Solo';
UPDATE public.blog_posts SET author = 'Tim Ruang Konsul Solo' WHERE author = 'Tim Kalibri';
