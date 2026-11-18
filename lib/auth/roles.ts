import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type Role = "user" | "mentor" | "admin" | "superadmin";

export const STAFF_ROLES: Role[] = ["admin", "superadmin"];
export const MENTOR_AREA_ROLES: Role[] = ["mentor", "admin", "superadmin"];

/** Halaman awal default setiap role setelah login. */
export function homeForRole(role: string | null | undefined): string {
  switch (role) {
    case "superadmin":
      return "/admin/superadmin";
    case "admin":
      return "/admin";
    case "mentor":
      return "/mentor";
    default:
      return "/dashboard";
  }
}

export interface AuthContext {
  user: User;
  role: Role;
  fullName: string | null;
  supabase: ReturnType<typeof createClient>;
}

export type AuthResult =
  | { ok: true; ctx: AuthContext }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Pastikan request berasal dari user yang login (dan opsional: punya role tertentu).
 * Akun yang dinonaktifkan superadmin selalu ditolak.
 */
export async function requireUser(allowed?: Role[]): Promise<AuthResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, status: 401, error: "Tidak terautentikasi." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, is_active")
    .eq("id", user.id)
    .single();

  if (!profile) return { ok: false, status: 403, error: "Profil tidak ditemukan." };
  if (profile.is_active === false) return { ok: false, status: 403, error: "Akun dinonaktifkan." };

  const role = (profile.role ?? "user") as Role;
  if (allowed && !allowed.includes(role)) {
    return { ok: false, status: 403, error: "Akses ditolak." };
  }

  return { ok: true, ctx: { user, role, fullName: profile.full_name ?? null, supabase } };
}
