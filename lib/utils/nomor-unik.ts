import { randomBytes } from "crypto";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // tanpa 0/O/1/I

/** Nomor unik {PREFIX}-YYYYMMDD-XXXXX (tanggal WIB, suffix acak — aman lintas user). */
export function nomorUnik(prefix: string): string {
  const wib = new Date(Date.now() + 7 * 3600_000);
  const tgl = wib.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Array.from(randomBytes(5), (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${prefix}-${tgl}-${rand}`;
}
