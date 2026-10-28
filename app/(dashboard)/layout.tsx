import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeaderFallback } from "@/components/dashboard/DashboardHeaderFallback";
import { PREVIEW_MODE } from "@/lib/utils/preview-mode";

async function DashboardHeader() {
  if (PREVIEW_MODE) return <DashboardHeaderFallback />;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return <DashboardHeaderFallback />;

    const { count: unreadCount } = await supabase
      .from("notifications").select("*", { count: "exact", head: true })
      .eq("user_id", user.id).eq("is_read", false);

    const { data: profile } = await supabase
      .from("profiles").select("full_name").eq("id", user.id).single();

    const initials = profile?.full_name
      ? profile.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
      : user.email?.charAt(0).toUpperCase() ?? "U";

    return (
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-sm px-4 lg:px-6 shadow-sm">
        <div className="pl-12 lg:pl-0" />
        <div className="flex items-center gap-2">
          {(unreadCount ?? 0) > 0 && (
            <a href="/dashboard/riwayat-pesanan"
              className="relative flex h-9 items-center gap-1.5 rounded-xl bg-brand-50 border border-brand-200 px-3 text-xs font-semibold text-brand hover:bg-brand-100 transition-colors">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white">
                {(unreadCount ?? 0) > 9 ? "9+" : unreadCount}
              </span>
              Notifikasi baru
            </a>
          )}
          <a href="/dashboard/profil"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-xs font-bold text-white shadow-brand-sm hover:opacity-90 transition-opacity">
            {initials}
          </a>
        </div>
      </header>
    );
  } catch {
    return <DashboardHeaderFallback />;
  }
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 p-4 lg:p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
