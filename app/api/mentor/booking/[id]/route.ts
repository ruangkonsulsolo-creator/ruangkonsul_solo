import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, MENTOR_AREA_ROLES, STAFF_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["completed", "no_show", "cancelled"]).optional(),
  meeting_link: z.string().trim().url("Link meeting tidak valid.").max(500).or(z.literal("")).optional(),
  session_notes: z.string().trim().max(2000).optional(),
  cancel_reason: z.string().trim().max(300).optional(),
});

/**
 * Mentor mengelola sesi miliknya: kirim link meeting, catatan, tandai selesai / tidak hadir.
 * Pembatalan booking yang sudah dibayar hanya oleh admin/superadmin (perlu refund).
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(MENTOR_AREA_ROLES);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, role } = auth.ctx;
  const isStaff = STAFF_ROLES.includes(role);

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Input tidak valid." }, { status: 422 });
  }
  const input = parsed.data;

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, status, booking_number, customer_id, mentor_id, mentor_profiles(user_id)")
    .eq("id", params.id)
    .single();

  if (!booking) return NextResponse.json({ error: "Booking tidak ditemukan." }, { status: 404 });

  const mentorUserId = (Array.isArray(booking.mentor_profiles) ? booking.mentor_profiles[0] : booking.mentor_profiles)?.user_id;
  if (!isStaff && mentorUserId !== user.id) {
    return NextResponse.json({ error: "Bukan sesi kamu." }, { status: 403 });
  }

  if (input.status === "cancelled" && !isStaff) {
    return NextResponse.json({ error: "Pembatalan sesi berbayar hanya bisa dilakukan admin." }, { status: 403 });
  }
  if (input.status && booking.status !== "confirmed") {
    return NextResponse.json({ error: "Hanya sesi terkonfirmasi yang bisa diubah statusnya." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};
  if (input.meeting_link !== undefined) patch.meeting_link = input.meeting_link || null;
  if (input.session_notes !== undefined) patch.session_notes = input.session_notes || null;
  if (input.status) {
    patch.status = input.status;
    if (input.status === "completed") patch.completed_at = now;
    if (input.status === "cancelled") {
      patch.cancelled_at = now;
      patch.cancel_reason = input.cancel_reason || "Dibatalkan admin";
    }
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });

  const { error } = await admin.from("bookings").update(patch).eq("id", booking.id);
  if (error) return NextResponse.json({ error: "Gagal memperbarui sesi." }, { status: 500 });

  if (input.status === "completed") {
    const { count } = await admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("mentor_id", booking.mentor_id)
      .eq("status", "completed");
    await admin.from("mentor_profiles").update({ session_count: count ?? 0 }).eq("id", booking.mentor_id);
  }

  const notify: Record<string, string> = {
    completed: `Sesi ${booking.booking_number} selesai. Beri ulasan untuk mentor kamu di menu Bimbingan Saya.`,
    no_show: `Sesi ${booking.booking_number} ditandai tidak hadir.`,
    cancelled: `Sesi ${booking.booking_number} dibatalkan. Tim kami akan menghubungi kamu untuk refund/jadwal ulang.`,
  };
  if (input.status || input.meeting_link) {
    await admin.from("notifications").insert({
      user_id: booking.customer_id,
      channel: "in_app",
      title: input.status ? "Update Sesi Bimbingan" : "Link Meeting Tersedia",
      body: input.status ? notify[input.status] : `Link meeting sesi ${booking.booking_number} sudah tersedia.`,
    });
  }

  return NextResponse.json({ data: { id: booking.id, ...patch } });
}
