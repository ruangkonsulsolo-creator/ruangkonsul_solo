import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { whatsappSchema } from "@/lib/validators/whatsapp";
import { rateLimit } from "@/lib/security/rate-limit";
import { ambilStatusProfil } from "@/lib/auth/status-profil";
import { homeForRole, type Role } from "@/lib/auth/roles";
import { safeRedirectPath } from "@/lib/utils/safe-redirect";

const schema = z
  .object({
    full_name: z.string().trim().min(3, "Nama minimal 3 karakter.").max(120, "Nama terlalu panjang."),
    password: z.string().min(8, "Password minimal 8 karakter.").max(72, "Password maksimal 72 karakter."),
    password_confirm: z.string(),
    whatsapp: whatsappSchema,
    sebagai: z.enum(["customer", "mentor"]).default("customer"),
    kode_mentor: z.string().trim().toUpperCase().optional(),
    next: z.string().optional(),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: "Konfirmasi password tidak sama.",
    path: ["password_confirm"],
  })
  .refine((d) => d.sebagai !== "mentor" || /^MTR-[A-Z0-9]{6}$/.test(d.kode_mentor ?? ""), {
    message: "Kode mentor tidak valid (format: MTR-XXXXXX).",
    path: ["kode_mentor"],
  });

const PESAN_KODE: Record<string, string> = {
  tidak_ditemukan: "Kode mentor tidak ditemukan. Periksa lagi atau minta kode ke admin.",
  terpakai: "Kode mentor ini sudah dipakai akun lain.",
  kedaluwarsa: "Kode mentor sudah kedaluwarsa. Minta kode baru ke admin.",
  nonaktif: "Kode mentor sudah dinonaktifkan admin.",
};

/** Selesaikan pendaftaran akun yang dibuat lewat Google. */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi berakhir. Silakan masuk lagi." }, { status: 401 });

  if (!(await rateLimit(`lengkapi:${user.id}`, 600, 10))) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi beberapa menit." }, { status: 429 });
  }

  const status = await ambilStatusProfil(supabase, user.id);
  if (!status) return NextResponse.json({ error: "Profil tidak ditemukan." }, { status: 404 });
  if (status.registrasi_selesai) {
    return NextResponse.json({ redirect: homeForRole(status.role as Role) });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Data tidak valid.", field: first?.path[0] }, { status: 400 });
  }
  const d = parsed.data;
  const admin = createAdminClient();
  const jadiMentor = d.sebagai === "mentor";

  // Cek kode lebih dulu supaya tidak memasang password bila kode salah.
  if (jadiMentor) {
    const { data: k } = await admin
      .from("kode_mentor")
      .select("aktif, kedaluwarsa_at, dipakai_oleh")
      .eq("kode", d.kode_mentor)
      .maybeSingle();
    const alasan = !k ? "tidak_ditemukan"
      : k.dipakai_oleh && k.dipakai_oleh !== user.id ? "terpakai"
      : !k.dipakai_oleh && !k.aktif ? "nonaktif"
      : !k.dipakai_oleh && k.kedaluwarsa_at && new Date(k.kedaluwarsa_at) < new Date() ? "kedaluwarsa"
      : null;
    if (alasan) {
      return NextResponse.json({ error: PESAN_KODE[alasan], field: "kode_mentor" }, { status: 400 });
    }
  }

  // Password dipasang pada akun yang sama, jadi nanti bisa masuk lewat email
  // + password maupun Google.
  const { error: pwErr } = await supabase.auth.updateUser({
    password: d.password,
    data: { full_name: d.full_name },
  });
  if (pwErr) {
    console.warn("[lengkapi-profil] updateUser:", pwErr.message);
    const lemah = /weak|short|characters/i.test(pwErr.message);
    return NextResponse.json(
      { error: lemah ? "Password terlalu lemah. Gunakan kombinasi huruf dan angka." : "Gagal menyimpan password. Coba lagi.", field: "password" },
      { status: 400 }
    );
  }

  let role = status.role;
  if (jadiMentor) {
    const { data: hasil, error: kErr } = await admin.rpc("pakai_kode_mentor", {
      p_kode: d.kode_mentor,
      p_user: user.id,
      p_nama: d.full_name,
    });
    if (kErr || hasil !== "ok") {
      if (kErr) console.error("[lengkapi-profil] pakai_kode_mentor:", kErr.message);
      return NextResponse.json(
        { error: PESAN_KODE[hasil as string] ?? "Gagal memakai kode mentor. Coba lagi.", field: "kode_mentor" },
        { status: 400 }
      );
    }
    role = "mentor";
  }

  const { error: upErr } = await admin
    .from("profiles")
    .update({ full_name: d.full_name, whatsapp: d.whatsapp, registrasi_selesai: true })
    .eq("id", user.id);
  if (upErr) {
    console.error("[lengkapi-profil] update profil:", upErr.message);
    return NextResponse.json({ error: "Gagal menyimpan data. Coba lagi." }, { status: 500 });
  }

  const home = homeForRole(role as Role);
  if (jadiMentor) return NextResponse.json({ redirect: "/mentor" });
  const next = safeRedirectPath(d.next ?? null);
  // Customer tidak diarahkan ke area mentor/admin meskipun next menunjuk ke sana.
  const bolehNext = next !== "/dashboard" && !next.startsWith("/mentor") && !next.startsWith("/admin");
  return NextResponse.json({ redirect: bolehNext ? next : home });
}
