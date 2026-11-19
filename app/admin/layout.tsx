import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MenuAkun } from "@/components/ui/MenuAkun";
import { TautanBeranda } from "@/components/ui/TautanBeranda";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PREVIEW_MODE } from "@/lib/utils/preview-mode";

async function getAdminProfile() {
  if (PREVIEW_MODE) {
    return { role: "superadmin", full_name: "Preview Admin" };
  }
  // redirect() melempar error khusus Next.js — JANGAN dibungkus try/catch,
  // kalau tidak, penjagaan role tertelan dan role lain bisa melihat panel ini.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles").select("role, full_name, is_active").eq("id", user.id).single();
  if (!profile || profile.is_active === false || !["admin", "superadmin"].includes(profile.role)) redirect("/dashboard");
  return profile;
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await getAdminProfile();
  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-sm px-6 shadow-sm">
          <TautanBeranda />
          <div className="flex items-center gap-3">
            {profile.role === "superadmin" && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 border border-amber-200">
                Super Admin
              </span>
            )}
            <MenuAkun />
          </div>
        </header>
        <main className="flex-1 p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
