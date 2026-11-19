import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeRedirectPath } from "@/lib/utils/safe-redirect";
import { homeForRole } from "@/lib/auth/roles";

/**
 * Callback OAuth (Google), verifikasi email, dan link reset password (PKCE).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next");
  const next = safeRedirectPath(nextRaw);

  // User membatalkan di layar Google / error dari provider
  const oauthError = searchParams.get("error");
  if (oauthError) {
    const reason = oauthError === "access_denied" ? "oauth_cancelled" : "oauth_failed";
    return NextResponse.redirect(`${origin}/login?error=${reason}`);
  }

  if (!code) return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const banned = /banned/i.test(error.message);
    return NextResponse.redirect(`${origin}/login?error=${banned ? "account_disabled" : "auth_callback_failed"}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, referred_by, created_at")
    .eq("id", user.id)
    .single();

  if (profile && profile.is_active === false) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=account_disabled`);
  }

  // Referral untuk akun baru via Google (signup email sudah ditangani trigger DB)
  const ref = searchParams.get("ref");
  if (ref && profile && !profile.referred_by && Date.now() - new Date(profile.created_at).getTime() < 15 * 60_000) {
    const admin = createAdminClient();
    const { data: referrer } = await admin.from("profiles").select("id").eq("referral_code", ref.toUpperCase()).maybeSingle();
    if (referrer && referrer.id !== user.id) {
      await admin.from("profiles").update({ referred_by: referrer.id }).eq("id", user.id).is("referred_by", null);
    }
  }

  if (nextRaw && next !== "/dashboard") return NextResponse.redirect(`${origin}${next}`);
  return NextResponse.redirect(`${origin}${homeForRole(profile?.role)}`);
}
