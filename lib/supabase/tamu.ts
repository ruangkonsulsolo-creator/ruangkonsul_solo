import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Sesi tamu = Supabase anonymous sign-in (auth.users.is_anonymous = true).
 * Dipakai khusus layanan pemeriksa naskah. Di tempat lain tamu harus
 * terlihat seperti pengunjung yang belum login, jadi getUser() dibungkus.
 */
export function adalahTamu(user: Pick<User, "is_anonymous"> | null | undefined): boolean {
  return user?.is_anonymous === true;
}

type DenganAsli = { __getUserAsli?: SupabaseClient["auth"]["getUser"] };

export function sembunyikanTamu<K extends SupabaseClient<any, any, any>>(klien: K): K {
  const auth = klien.auth as K["auth"] & DenganAsli;
  if (auth.__getUserAsli) return klien;
  const asli = auth.getUser.bind(auth);
  auth.__getUserAsli = asli;
  auth.getUser = (async (jwt?: string) => {
    const r = await asli(jwt);
    if (adalahTamu(r.data.user)) return { data: { user: null }, error: null };
    return r;
  }) as typeof auth.getUser;
  return klien;
}

/** getUser() termasuk sesi tamu (untuk komponen pemeriksa di peramban). */
export async function getUserTermasukTamu(klien: SupabaseClient<any, any, any>): Promise<User | null> {
  const auth = klien.auth as SupabaseClient["auth"] & DenganAsli;
  const f = auth.__getUserAsli ?? auth.getUser.bind(auth);
  const { data } = await f();
  return data.user ?? null;
}
