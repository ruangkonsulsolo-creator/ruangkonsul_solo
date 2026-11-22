-- 047_pesanan_multi_berkas.sql
-- Satu pembayaran QRIS untuk beberapa file laporan manual (maks 5).
-- Tiap file tetap menjadi satu baris orders (antrean admin per file);
-- orders.grup_bayar menunjuk ke pesanan pertama yang menjadi reference_id
-- pada tabel payments. Idempoten.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS grup_bayar UUID REFERENCES public.orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_grup_bayar ON public.orders(grup_bayar) WHERE grup_bayar IS NOT NULL;

COMMENT ON COLUMN public.orders.grup_bayar IS
  'Pesanan pertama dalam satu pembayaran multi-file (payments.reference_id). NULL = pesanan tunggal.';
