import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PREVIEW_MODE } from "@/lib/utils/preview-mode";
import { homeForRole, type Role } from "./roles";

/**
 * Guard untuk Server Component (halaman). Lapisan kedua setelah middleware.
 * Jangan panggil di dalam try/catch — redirect() bekerja dengan melempar error.
 */
export async function requirePageRole(allowed: Role[]): Promise<{ userId: string; role: Role }> {
  if (PREVIEW_MODE) return { userId: "preview", role: allowed[allowed.length - 1] };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  const role = (profile?.role ?? "user") as Role;
  if (!profile || profile.is_active === false) redirect("/login?error=account_disabled");
  if (!allowed.includes(role)) redirect(homeForRole(role));

  return { userId: user.id, role };
}
