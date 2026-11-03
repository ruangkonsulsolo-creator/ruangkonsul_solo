import type { ReactNode } from "react";
import { MentorSidebar } from "@/components/mentor/MentorSidebar";
import { MenuAkun } from "@/components/ui/MenuAkun";
import { TautanBeranda } from "@/components/ui/TautanBeranda";
import { PREVIEW_MODE } from "@/lib/utils/preview-mode";

async function getMentorProfile() {
  if (PREVIEW_MODE) return { full_name: "Preview Mentor", role: "mentor" };
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const { redirect } = await import("next/navigation");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: profile } = await supabase
      .from("profiles").select("role, full_name").eq("id", user!.id).single();
    if (!profile || !["mentor","admin","superadmin"].includes(profile.role)) redirect("/dashboard");
    return profile!;
  } catch {
    return { full_name: "Mentor", role: "mentor" };
  }
}

export default async function MentorLayout({ children }: { children: ReactNode }) {
  const profile = await getMentorProfile();
  return (
    <div className="flex min-h-screen bg-slate-50">
      <MentorSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-sm px-4 lg:px-6 shadow-sm">
          <div className="flex items-center gap-2 pl-12 lg:pl-0">
            <TautanBeranda />
          </div>
          <MenuAkun />
        </header>
        <main className="flex-1 p-4 lg:p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
