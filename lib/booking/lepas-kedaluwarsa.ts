import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Batalkan booking yang tidak dibayar sebelum batas waktu sehingga slotnya
 * tampil lagi. Dipanggil sebelum menampilkan jadwal, jadi tidak bergantung
 * pada notifikasi "expire" Midtrans (yang bisa telat / tidak sampai).
 * Gagal diam-diam: menampilkan jadwal lebih penting daripada bersih-bersih.
 */
export async function lepasBookingKedaluwarsa(): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await createAdminClient().rpc("lepas_booking_belum_dibayar");
  } catch (err) {
    console.warn("[booking] gagal melepas booking kedaluwarsa:", err);
  }
}
