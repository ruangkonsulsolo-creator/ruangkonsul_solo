import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils/safe-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Jika ada next parameter yang valid, gunakan itu
      if (next !== "/dashboard") {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Redirect berdasarkan role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = profile?.role ?? "user";
        const destination = roleHomeUrl(role);
        return NextResponse.redirect(`${origin}${destination}`);
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

/** URL home sesuai role */
function roleHomeUrl(role: string): string {
  switch (role) {
    case "superadmin": return "/admin/superadmin";
    case "admin":      return "/admin";
    case "mentor":     return "/mentor";
    default:           return "/dashboard";
  }
}
