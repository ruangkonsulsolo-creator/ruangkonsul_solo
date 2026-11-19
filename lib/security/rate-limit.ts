import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Rate limit berbasis Postgres (tabel rate_limits) — konsisten lintas instance serverless.
 * Return true jika request masih diizinkan.
 * Jika DB error, request diizinkan (fail-open) agar layanan tidak ikut mati.
 */
export async function rateLimit(key: string, windowSeconds: number, max: number): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: key.slice(0, 200),
      p_window_seconds: windowSeconds,
      p_max: max,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

/** IP klien (di belakang proxy Vercel/Cloudflare). */
export function clientIp(): string {
  const h = headers();
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
