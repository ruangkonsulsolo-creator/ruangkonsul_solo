import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Token akses pesanan cek plagiasi untuk tautan WhatsApp.
 *
 * Tamu (tanpa akun) memesan di satu browser, tapi notifikasi "laporan siap"
 * dibuka di HP — sering di browser lain tanpa sesi. Tautan berisi HMAC dari
 * id pesanan memberi akses baca ke pesanan itu saja (status + unduh laporan),
 * tanpa login. Token tidak bisa ditebak tanpa rahasia server.
 */
function rahasia(): string {
  const s = process.env.LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("LINK_SECRET / SUPABASE_SERVICE_ROLE_KEY belum diisi.");
  return s;
}

export function tokenPesanan(orderId: string): string {
  return createHmac("sha256", rahasia()).update(`pesanan-cek:${orderId}`).digest("base64url").slice(0, 32);
}

export function tokenPesananValid(orderId: string, token: string | null | undefined): boolean {
  if (!token || token.length !== 32) return false;
  try {
    const a = Buffer.from(tokenPesanan(orderId));
    const b = Buffer.from(token);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Tautan publik status pesanan (dipakai di WhatsApp). */
export function tautanPesanan(baseUrl: string, orderId: string): string {
  return `${baseUrl}/cek-plagiarisme/pesanan/${orderId}?t=${tokenPesanan(orderId)}`;
}
