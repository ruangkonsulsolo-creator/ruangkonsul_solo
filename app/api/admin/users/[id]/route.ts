import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    role: z.enum(["user", "mentor", "admin", "superadmin"]).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.is_active !== undefined, { message: "Tidak ada perubahan." });

/**
 * FR-ADM07: Superadmin mengubah role / mengaktifkan-menonaktifkan akun.
 * - Superadmin tidak bisa menurunkan / menonaktifkan dirinya sendiri.
 * - Superadmin terakhir tidak bisa diturunkan.
 * - Role → mentor otomatis dibuatkan mentor_profiles.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(["superadmin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user } = auth.ctx;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Input tidak valid." }, { status: 422 });
  }
  const input = parsed.data;

  if (params.id === user.id && (input.is_active === false || (input.role && input.role !== "superadmin"))) {
    return NextResponse.json({ error: "Tidak bisa menurunkan atau menonaktifkan akun sendiri." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, role, full_name, is_active")
    .eq("id", params.id)
    .single();
  if (!target) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

  const demotingSuperadmin =
    target.role === "superadmin" && ((input.role && input.role !== "superadmin") || input.is_active === false);
  if (demotingSuperadmin) {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "superadmin")
      .eq("is_active", true);
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "Harus ada minimal satu superadmin aktif." }, { status: 400 });
    }
  }

  const patch: Record<string, unknown> = {};
  if (input.role !== undefined) patch.role = input.role;
  if (input.is_active !== undefined) patch.is_active = input.is_active;

  const { error } = await admin.from("profiles").update(patch).eq("id", target.id);
  if (error) return NextResponse.json({ error: "Gagal memperbarui user." }, { status: 500 });

  if (input.role === "mentor") {
    await admin
      .from("mentor_profiles")
      .upsert({ user_id: target.id }, { onConflict: "user_id", ignoreDuplicates: true });
  }
  if (input.role && input.role !== "mentor" && target.role === "mentor") {
    // Mantan mentor tidak lagi muncul di halaman booking
    await admin.from("mentor_profiles").update({ is_available: false }).eq("user_id", target.id);
  }

  // Nonaktif → blokir login di level Supabase Auth (refresh token ikut ditolak);
  // aktif kembali → buka blokir.
  if (input.is_active !== undefined && input.is_active !== target.is_active) {
    await admin.auth.admin
      .updateUserById(target.id, { ban_duration: input.is_active ? "none" : "876000h" })
      .catch((e) => console.error("[admin/users] ban update gagal:", e));
  }

  if (input.role && input.role !== target.role) {
    await admin.from("notifications").insert({
      user_id: target.id,
      channel: "in_app",
      title: "Role Akun Diperbarui",
      body: `Role akunmu sekarang: ${input.role}. Silakan login ulang jika menu belum berubah.`,
    });
  }

  return NextResponse.json({ data: { id: target.id, ...patch } });
}
