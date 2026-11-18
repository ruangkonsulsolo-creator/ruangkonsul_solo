import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PREVIEW_MODE } from "@/lib/utils/preview-mode";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Redirect artifact ────────────────────────────────────────────
  if (pathname === "/dashboard/dashboard") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ── PREVIEW MODE: bypass auth (NEXT_PUBLIC_PREVIEW_MODE=true) ─────
  if (PREVIEW_MODE) {
    // Semua route bisa diakses langsung
    return NextResponse.next();
  }

  // ── PRODUCTION: routing berdasarkan role ─────────────────────────
  const needsAuth =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/mentor");

  if (!needsAuth) return NextResponse.next();

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles").select("role, is_active").eq("id", user.id).single();
  const role = profile?.role ?? "user";

  // Akun dinonaktifkan superadmin → paksa keluar
  if (profile && profile.is_active === false) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "account_disabled");
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/dashboard")) {
    if (role === "mentor") return NextResponse.redirect(new URL("/mentor", request.url));
    if (role === "admin") return NextResponse.redirect(new URL("/admin", request.url));
    if (role === "superadmin") return NextResponse.redirect(new URL("/admin/superadmin", request.url));
  }

  if (pathname.startsWith("/mentor") && !["mentor","admin","superadmin"].includes(role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/admin")) {
    if (!["admin","superadmin"].includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    const superadminOnly = ["/admin/superadmin", "/admin/layanan", "/admin/paket"];
    if (superadminOnly.some((p) => pathname.startsWith(p)) && role !== "superadmin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|logo-rks\\.png|logo-rks\\.svg|promo-.*\\.jpeg|icon-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
