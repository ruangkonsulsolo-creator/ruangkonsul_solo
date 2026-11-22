import "server-only";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { DbRole } from "./roles";

export const STAFF_ROLES: DbRole[] = ["admin", "superadmin"];

export type AuthResult =
  | { ok: true; ctx: { user: User; role: DbRole; fullName: string | null } }
  | { ok: false; status: 401 | 403; error: string };

/** Pastikan request berasal dari user yang login (opsional: dengan role tertentu). */
export async function requireUser(allowed?: DbRole[], opsi: { tamu?: boolean } = {}): Promise<AuthResult> {
  // Bawaan: sesi tamu dianggap belum login. { tamu: true } khusus rute pemeriksa.
  const supabase = createClient({ tamu: opsi.tamu });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Silakan login terlebih dahulu." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, is_active")
    .eq("id", user.id)
    .single();

  if (!profile) return { ok: false, status: 403, error: "Profil tidak ditemukan." };
  if (profile.is_active === false) return { ok: false, status: 403, error: "Akun dinonaktifkan." };
  const role = (profile.role ?? "user") as DbRole;
  if (allowed && !allowed.includes(role)) return { ok: false, status: 403, error: "Akses ditolak." };
  return { ok: true, ctx: { user, role, fullName: profile.full_name ?? null } };
}
