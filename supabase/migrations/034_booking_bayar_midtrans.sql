-- ═══════════════════════════════════════════════════════════════════════════
-- 034 — Booking sesi mentor dibayar lewat Midtrans
--
-- Alur: customer pilih mentor + jam → booking dibuat (status 'pending',
-- paid_at NULL) → bayar Snap → lunas: status 'confirmed' + paid_at.
-- Selama menunggu bayar slot dikunci (status 'pending' sudah dihitung oleh
-- bookings_one_active_per_slot & is_booked). Jika tidak dibayar dalam batas
-- waktu, booking dibatalkan dan slot kembali tersedia.
--
-- Bergantung pada: 018 (bookings, booking_slots), 033 (payments).
-- Aman dijalankan ulang.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. payments.purpose menerima 'booking'
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_purpose_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_purpose_check
  CHECK (purpose IN ('order', 'produk', 'booking'));

-- 2. Kolom bantu di bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS whatsapp           TEXT,
  ADD COLUMN IF NOT EXISTS bayar_sebelum      TIMESTAMPTZ;

COMMENT ON COLUMN public.bookings.bayar_sebelum IS
  'Batas waktu pembayaran Midtrans. NULL = booking tanpa pembayaran online '
  '(mis. dibuat admin / harga 0). Lewat batas & belum dibayar → dibatalkan.';

CREATE INDEX IF NOT EXISTS idx_bookings_menunggu_bayar
  ON public.bookings (bayar_sebelum)
  WHERE status = 'pending' AND paid_at IS NULL AND bayar_sebelum IS NOT NULL;

-- 3. Lepas booking yang tidak dibayar tepat waktu.
--    Dipanggil server (service role) sebelum menampilkan / membuat booking,
--    jadi slot kembali tersedia walau notifikasi expire Midtrans tidak sampai.
CREATE OR REPLACE FUNCTION public.lepas_booking_belum_dibayar()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  jumlah INTEGER;
BEGIN
  WITH batal AS (
    UPDATE public.bookings
       SET status        = 'cancelled',
           cancelled_at  = now(),
           cancel_reason = 'Tidak dibayar sebelum batas waktu'
     WHERE status = 'pending'
       AND paid_at IS NULL
       AND bayar_sebelum IS NOT NULL
       AND bayar_sebelum < now() - interval '5 minutes'  -- toleransi notifikasi telat
    RETURNING id
  ), tandai AS (
    UPDATE public.payments p
       SET status = 'expired'
      FROM batal
     WHERE p.purpose = 'booking'
       AND p.reference_id = batal.id
       AND p.status = 'pending'
    RETURNING p.id
  )
  SELECT count(*) INTO jumlah FROM batal;

  RETURN jumlah;
END;
$$;

REVOKE ALL ON FUNCTION public.lepas_booking_belum_dibayar() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lepas_booking_belum_dibayar() TO service_role;

-- 4. Customer tidak boleh mengubah kolom harga / pembayaran booking-nya.
--    Policy bookings_update_own (018) mengizinkan customer meng-update baris
--    miliknya (untuk membatalkan). Tanpa trigger ini customer bisa mengosongkan
--    bayar_sebelum dan menahan slot selamanya, atau mengubah harga.
--    Service role (auth.uid() NULL) dan staff tidak dibatasi.
CREATE OR REPLACE FUNCTION public.kunci_kolom_booking_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL AND NOT public.is_staff() THEN
    NEW.price_idr           := OLD.price_idr;
    NEW.paid_at             := OLD.paid_at;
    NEW.confirmed_at        := OLD.confirmed_at;
    NEW.bayar_sebelum       := OLD.bayar_sebelum;
    NEW.midtrans_order_id   := OLD.midtrans_order_id;
    NEW.midtrans_snap_token := OLD.midtrans_snap_token;
    NEW.payment_method      := OLD.payment_method;
    NEW.slot_id             := OLD.slot_id;
    NEW.mentor_id           := OLD.mentor_id;
    -- Booking berbayar yang belum lunas tidak bisa "dikonfirmasi" manual oleh
    -- mentor/customer; konfirmasi datang dari pembayaran.
    IF OLD.bayar_sebelum IS NOT NULL AND OLD.paid_at IS NULL
       AND NEW.status IN ('confirmed', 'completed') THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_kunci_kolom_customer ON public.bookings;
CREATE TRIGGER bookings_kunci_kolom_customer
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.kunci_kolom_booking_customer();

DO $$ BEGIN
  RAISE NOTICE '034_booking_bayar_midtrans: selesai.';
END $$;
