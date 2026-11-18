import { randomBytes } from "crypto";

/**
 * Generate nomor unik dengan format: {PREFIX}-YYYYMMDD-XXXXX
 * Contoh: RKS-20261118-7K2QF
 *
 * Sebelumnya memakai hitungan pesanan hari ini sebagai sequence. Itu bentrok
 * karena RLS membuat tiap user hanya bisa menghitung pesanannya sendiri,
 * sehingga dua user berbeda bisa mendapat nomor yang sama. Sekarang memakai
 * suffix acak (32^5 ≈ 33 juta kombinasi per hari).
 */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // tanpa 0/O/1/I agar mudah dibaca

export function generateOrderNumber(_legacySequence?: number, prefix = "RKS"): string {
  const now = new Date();
  // tanggal versi WIB (UTC+7)
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const dateStr = wib.toISOString().slice(0, 10).replace(/-/g, "");
  const bytes = randomBytes(5);
  const rand = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${prefix}-${dateStr}-${rand}`;
}
