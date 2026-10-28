import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { PREVIEW_MODE } from "@/lib/utils/preview-mode";

async function getAdminProfile() {
  if (PREVIEW_MODE) {
    return { role: "superadmin", full_name: "Preview Admin" };
  }
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const { redirect } = await import("next/navigation");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: profile } = await supabase
      .from("profiles").select("role, full_name").eq("id", user!.id).single();
    if (!profile || !["admin", "superadmin"].includes(profile.role)) redirect("/dashboard");
    return profile!;
  } catch {
    return { role: "admin", full_name: "Admin" };
  }
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await getAdminProfile();
  const initials = (profile.full_name ?? "A")
    .split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-sm px-6 shadow-sm">
          <div />
          <div className="flex items-center gap-3">
            {profile.role === "superadmin" && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 border border-amber-200">
                Super Admin
              </span>
            )}
            <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient text-white text-[11px] font-bold shadow-brand-sm">
                {initials}
              </div>
              <span className="text-sm font-semibold text-slate-700">{profile.full_name}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
