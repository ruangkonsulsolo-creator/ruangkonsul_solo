import { createClient } from "@/lib/supabase/server";
import { Bell } from "lucide-react";
import Link from "next/link";

interface DashboardHeaderProps {
  title?: string;
}

export async function DashboardHeader({ title }: DashboardHeaderProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user?.id ?? "")
    .eq("is_read", false);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id ?? "")
    .single();

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-sm px-4 lg:px-6 shadow-sm">
      {/* Title — padding kiri untuk hamburger di mobile */}
      <div className="pl-12 lg:pl-0">
        {title && <h1 className="text-base font-bold text-slate-800">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        {/* Notifikasi */}
        <Link
          href="/dashboard/notifikasi"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl hover:bg-brand-50 transition-colors"
          aria-label={`${unreadCount ?? 0} notifikasi belum dibaca`}
        >
          <Bell className="h-4.5 w-4.5 text-slate-500" />
          {(unreadCount ?? 0) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white ring-2 ring-white">
              {(unreadCount ?? 0) > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Avatar */}
        <Link
          href="/dashboard/profil"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-xs font-bold text-white shadow-brand-sm hover:opacity-90 transition-opacity"
          aria-label="Profil saya"
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}
