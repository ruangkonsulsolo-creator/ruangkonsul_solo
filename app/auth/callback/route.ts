import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils/safe-redirect";
import { ambilStatusProfil, HALAMAN_LENGKAPI } from "@/lib/auth/status-profil";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  // Google/Supabase mengembalikan ?error=... bila user membatalkan atau
  // provider belum dikonfigurasi. Teruskan ke halaman masuk supaya terlihat.
  const errProvider = searchParams.get("error");
  if (errProvider) {
    const desc = searchParams.get("error_description") ?? errProvider;
    console.warn("[auth/callback] provider error:", errProvider, desc);
    const kode = errProvider === "access_denied" ? "dibatalkan" : "provider";
    // Alasan singkat dari Supabase/Google (tanpa data rahasia) agar mudah didiagnosis.
    const alasan = encodeURIComponent(desc.slice(0, 160));
    return NextResponse.redirect(`${origin}/login?error=${kode}&alasan=${alasan}`);
  }

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.warn("[auth/callback] exchange gagal:", error.message);

    if (!error) {
      // Akun baru dari Google: wajib lengkapi pendaftaran dulu.
      const { data: { user: baru } } = await supabase.auth.getUser();
      if (baru) {
        const status = await ambilStatusProfil(supabase, baru.id);
        if (status && !status.registrasi_selesai) {
          return NextResponse.redirect(
            `${origin}${HALAMAN_LENGKAPI}?next=${encodeURIComponent(next)}`
          );
        }
      }

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
