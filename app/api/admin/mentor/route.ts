import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  user_id: z.string().uuid(),
  aksi: z.enum(["angkat", "turunkan", "aktifkan", "nonaktifkan"]),
  display_name: z.string().trim().min(2).max(120).optional(),
  price_per_hour: z.coerce.number().int().min(0).max(100_000_000).optional(),
  specializations: z.array(z.string().trim().min(1).max(60)).max(8).optional(),
});

/**
 * Mengelola mentor dari panel admin.
 *
 * Otorisasi tidak dicek di sini melainkan ditegakkan database: trigger
 * guard_role_change membatasi admin hanya boleh menggeser antara 'user' dan
 * 'mentor', dan RLS mentor_profiles hanya membuka tulis untuk staf. Kalau
 * pengecekan hanya ada di route ini, satu bug routing cukup untuk
 * melewatinya.
 */
export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Data tidak terbaca." }, { status: 400 });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data belum lengkap." },
      { status: 422 }
    );
  }

  const { user_id, aksi, display_name, price_per_hour, specializations } =
    parsed.data;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sesi berakhir." }, { status: 401 });
  }

  // Pemanggil harus staff. Perubahan role tetap lewat klien user supaya
  // trigger guard_role_change menegakkan batas admin vs superadmin.
  const { data: pemanggil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!pemanggil || !["admin", "superadmin"].includes(pemanggil.role)) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }
  // mentor_profiles: kolom display_name & price_per_hour sengaja tidak bisa
  // ditulis user login (migration 026, agar mentor tak mengubah tarif sendiri),
  // jadi setelah pemanggil terbukti staff, tulis lewat service role.
  const admin = createAdminClient();

  const tolak = (error: { code?: string; message: string }) => {
    if (error.code === "42501") {
      return NextResponse.json(
        {
          error:
            "Kamu tidak berhak melakukan ini. Admin hanya dapat mengangkat " +
            "dan menurunkan mentor.",
        },
        { status: 403 }
      );
    }
    console.error("[admin/mentor]", error);
    return NextResponse.json(
      { error: "Gagal menyimpan. Coba lagi sebentar lagi." },
      { status: 500 }
    );
  };

  if (aksi === "angkat") {
    const { error: eRole } = await supabase
      .from("profiles")
      .update({ role: "mentor" })
      .eq("id", user_id);
    if (eRole) return tolak(eRole);

    // Nama tampil disimpan di mentor_profiles, bukan dibaca dari profiles,
    // supaya halaman booking tetap bisa dibuka pengunjung tanpa membuka
    // tabel profiles ke publik.
    const { data: profil } = await admin
      .from("profiles")
      .select("full_name, role")
      .eq("id", user_id)
      .maybeSingle();

    const { error: eMentor } = await admin.from("mentor_profiles").upsert(
      {
        user_id,
        display_name: display_name ?? profil?.full_name ?? "Mentor Ruang Konsul",
        price_per_hour: price_per_hour ?? 150000,
        specializations: specializations ?? [],
        is_available: true,
      },
      { onConflict: "user_id" }
    );
    if (eMentor) {
      // Jangan tinggalkan data setengah jadi: kembalikan role.
      await supabase.from("profiles").update({ role: "user" }).eq("id", user_id);
      return tolak(eMentor);
    }

    return NextResponse.json({ message: "Mentor berhasil diangkat." });
  }

  if (aksi === "turunkan") {
    // Profil mentor tidak dihapus, hanya disembunyikan. Menghapusnya akan
    // memutus referensi dari booking lama dan menghilangkan riwayat kinerja.
    const { error: eMentor } = await admin
      .from("mentor_profiles")
      .update({ is_available: false })
      .eq("user_id", user_id);
    if (eMentor) return tolak(eMentor);

    const { error: eRole } = await supabase
      .from("profiles")
      .update({ role: "user" })
      .eq("id", user_id);
    if (eRole) return tolak(eRole);

    return NextResponse.json({
      message: "Mentor diturunkan. Riwayat sesinya tetap tersimpan.",
    });
  }

  const { error } = await admin
    .from("mentor_profiles")
    .update({ is_available: aksi === "aktifkan" })
    .eq("user_id", user_id);
  if (error) return tolak(error);

  return NextResponse.json({
    message:
      aksi === "aktifkan"
        ? "Mentor kembali menerima sesi baru."
        : "Mentor disembunyikan dari halaman booking.",
  });
}
