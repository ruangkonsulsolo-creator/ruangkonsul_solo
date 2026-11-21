import "server-only";

export type MentorPublik = {
  id: string;
  nama: string;
  gelar: string;
  headline: string;
  kampus: string;
  pendidikanTerakhir: string;
  bidang: string[];
  foto: string | null;
  rating: number;
  sesi: number;
  pengalamanTahun: number;
  tersedia: boolean;
  inisial: string;
};

type Pendidikan = { jenjang?: string; program?: string; kampus?: string };

/**
 * Data mentor untuk halaman publik (beranda, /mentor-kami).
 *
 * Nama diambil dari mentor_profiles.display_name. Sebelumnya dibaca lewat
 * embed ke tabel profiles, yang RLS-nya hanya membuka baris milik sendiri —
 * akibatnya pengunjung selalu melihat nama "Mentor". Untuk mentor yang
 * display_name-nya kosong, nama dilengkapi dari profiles dengan service role
 * (hanya kolom full_name, hanya untuk mentor yang tampil).
 */
export async function ambilMentorPublik(opsi: { limit?: number } = {}): Promise<MentorPublik[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    let q = createClient()
      .from("mentor_profiles")
      .select(
        "id, user_id, display_name, gelar, headline, education, pendidikan, specializations, " +
          "avatar_url, rating_avg, session_count, experience_years, is_available"
      )
      .order("is_available", { ascending: false })
      .order("rating_avg", { ascending: false });
    if (opsi.limit) q = q.limit(opsi.limit);
    const { data, error } = await q;
    if (error) {
      console.error("[mentor-publik]", error.message);
      return [];
    }
    const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;

    const tanpaNama = rows.filter((m) => !String(m.display_name ?? "").trim()).map((m) => m.user_id as string);
    const namaCadangan = new Map<string, string>();
    if (tanpaNama.length) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const { data: prof } = await createAdminClient().from("profiles").select("id, full_name").in("id", tanpaNama);
        for (const p of prof ?? []) if (p.full_name) namaCadangan.set(p.id, p.full_name);
      } catch {
        /* service role tidak tersedia saat build: biarkan nama cadangan kosong */
      }
    }

    return rows.map((m) => {
      const nama = String(m.display_name ?? "").trim() || namaCadangan.get(m.user_id as string)?.trim() || "Mentor";
      const pend = ((m.pendidikan as Pendidikan[] | null) ?? []).find((p) => p.program || p.kampus);
      const pendidikanTerakhir = pend
        ? [pend.jenjang, pend.program, pend.kampus].filter(Boolean).join(" ")
        : "";
      return {
        id: m.id as string,
        nama,
        gelar: (m.gelar as string | null) ?? "",
        headline: (m.headline as string | null) ?? "",
        kampus: (m.education as string | null) ?? "",
        pendidikanTerakhir,
        bidang: ((m.specializations as string[] | null) ?? []).slice(0, 6),
        foto: (m.avatar_url as string | null) || null,
        rating: Number(m.rating_avg ?? 0),
        sesi: Number(m.session_count ?? 0),
        pengalamanTahun: Number(m.experience_years ?? 0),
        tersedia: Boolean(m.is_available),
        inisial:
          nama.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "M",
      };
    });
  } catch (e) {
    // Biarkan Next menandai halaman sebagai dinamis (pemakaian cookies).
    if ((e as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE") throw e;
    console.error("[mentor-publik] tidak bisa diambil:", e);
    return [];
  }
}
