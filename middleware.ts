import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { guardFor, homeForRole, type DbRole } from "@/lib/auth/roles";

/**
 * Guard route berbasis role.
 *
 * Versi sebelumnya punya `const PREVIEW_MODE = true` yang mengembalikan
 * NextResponse.next() untuk SEMUA route terproteksi — termasuk
 * /admin/superadmin. Itu membuka laporan keuangan ke siapa pun yang tahu URL-
 * nya. Flag itu dihapus; tidak ada lagi jalan pintas yang bisa tertinggal
 * menyala saat deploy.
 *
 * Middleware hanya lapis pertama. Otorisasi sebenarnya ditegakkan RLS di
 * database (migration 018), sehingga bug routing di sini tidak bisa berubah
 * menjadi kebocoran data.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/dashboard/dashboard") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const guard = guardFor(pathname);
  if (!guard) return NextResponse.next();

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() memverifikasi JWT ke server Auth. Jangan ganti dengan
  // getSession(), yang hanya membaca cookie dan bisa dipalsukan.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  // Profil belum terbentuk atau akun dinonaktifkan admin.
  if (!profile || profile.is_active === false) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "akun-nonaktif");
    return NextResponse.redirect(loginUrl);
  }

  const role = (profile.role ?? "user") as DbRole;

  if (!guard.allow.includes(role)) {
    // Diarahkan ke beranda miliknya sendiri, bukan ke halaman error, supaya
    // tidak membocorkan route mana yang ada.
    return NextResponse.redirect(new URL(homeForRole(role), request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/mentor/:path*"],
};
