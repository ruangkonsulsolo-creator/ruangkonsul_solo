/**
 * Definisi role Ruang Konsul Solo.
 *
 * "native" bukan role di database — itu sebutan untuk pengunjung yang belum
 * login. Database hanya menyimpan role untuk akun terdaftar: user, mentor,
 * admin, superadmin. Kode di bawah menyatukan keduanya supaya pengecekan akses
 * di UI bisa memakai satu bahasa yang sama.
 */

export const ROLES = {
  NATIVE: "native",
  CUSTOMER: "user",
  MENTOR: "mentor",
  ADMIN: "admin",
  SUPERADMIN: "superadmin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Role yang benar-benar tersimpan di kolom profiles.role. */
export type DbRole = Exclude<Role, "native">;

export const ROLE_LABEL: Record<Role, string> = {
  native: "Pengunjung",
  user: "Customer",
  mentor: "Mentor",
  admin: "Admin",
  superadmin: "Superadmin",
};

/**
 * Urutan hak akses. Angka lebih tinggi mencakup yang lebih rendah untuk
 * kebutuhan umum, tapi jangan dipakai sebagai satu-satunya penentu: mentor
 * bukan "customer yang lebih tinggi", dia punya area sendiri.
 */
const RANK: Record<Role, number> = {
  native: 0,
  user: 1,
  mentor: 2,
  admin: 3,
  superadmin: 4,
};

export function atLeast(role: Role, minimum: Role): boolean {
  return RANK[role] >= RANK[minimum];
}

export function isStaff(role: Role): boolean {
  return role === ROLES.ADMIN || role === ROLES.SUPERADMIN;
}

/**
 * Apa yang boleh diakses tanpa login (role native).
 *
 * Pengunjung boleh menjelajah dan memesan bimbingan, tapi harga khusus,
 * diskon, katalog member dan notifikasi promo butuh akun.
 */
export const NATIVE_ALLOWED = {
  /** Halaman publik yang bisa dibuka siapa saja. */
  routes: [
    "/",
    "/bimbingan",
    "/mentor-kami",
    "/booking",
    "/layanan",
    "/blog",
    "/katalog-lomba",
    "/merchandise",
    "/tentang",
    "/kontak",
    "/syarat",
    "/kebijakan-privasi",
  ],
  /** Yang dikunci di balik login. */
  requiresAuth: [
    "harga khusus & diskon member",
    "riwayat sesi bimbingan",
    "notifikasi promo",
    "checkout merchandise",
    "unduh materi mentor",
  ],
} as const;

/** Halaman tujuan setelah login, per role. */
export function homeForRole(role: Role): string {
  switch (role) {
    case ROLES.SUPERADMIN:
      return "/admin/superadmin";
    case ROLES.ADMIN:
      return "/admin";
    case ROLES.MENTOR:
      return "/mentor";
    default:
      return "/dashboard";
  }
}

/** Prefix route yang hanya boleh diakses role tertentu. */
export const ROUTE_GUARDS: Array<{ prefix: string; allow: DbRole[] }> = [
  { prefix: "/admin/superadmin", allow: ["superadmin"] },
  { prefix: "/admin", allow: ["admin", "superadmin"] },
  { prefix: "/mentor", allow: ["mentor", "admin", "superadmin"] },
  { prefix: "/dashboard", allow: ["user", "mentor", "admin", "superadmin"] },
];

export function guardFor(pathname: string) {
  // Batas segmen: "/mentor-kami" (publik) tidak boleh dianggap "/mentor".
  return ROUTE_GUARDS.find((g) => pathname === g.prefix || pathname.startsWith(`${g.prefix}/`));
}
