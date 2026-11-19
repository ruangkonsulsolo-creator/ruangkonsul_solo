import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, STAFF_ROLES } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsApp } from "@/lib/notification/whatsapp";
import { BRAND } from "@/lib/brand";

/**
 * Kelola satu sesi bimbingan (booking mentor).
 * Boleh: admin/superadmin untuk semua sesi; mentor hanya untuk sesinya sendiri.
 *
 * Aksi:
 *  - link        : simpan/ubah link meeting (Zoom/Meet) → kabari customer
 *  - selesai     : confirmed → completed
 *  - tidak_hadir : confirmed → no_show
 *  - batal       : (staff saja) batalkan; jika sudah dibayar → refund manual
 */
const Body = z.discriminatedUnion("aksi", [
  z.object({
    aksi: z.literal("link"),
    meeting_link: z
      .string()
      .trim()
      .max(500)
      .url("Link harus berupa URL lengkap, mis. https://meet.google.com/…")
      .refine((u) => u.startsWith("https://"), "Link harus diawali https://"),
  }),
  z.object({ aksi: z.literal("selesai"), catatan_sesi: z.string().trim().max(2000).optional() }),
  z.object({ aksi: z.literal("tidak_hadir") }),
  z.object({ aksi: z.literal("batal"), alasan: z.string().trim().min(3).max(500) }),
]);

const jamWib = new Intl.DateTimeFormat("id-ID", {
  weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta",
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(["mentor", ...STAFF_ROLES]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, role } = auth.ctx;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 422 });
  }
  const input = parsed.data;
  const staff = STAFF_ROLES.includes(role);

  const admin = createAdminClient();
  const { data: b } = await admin
    .from("bookings")
    .select(
      "id, booking_number, status, paid_at, customer_id, whatsapp, meeting_link, mentor_profiles ( user_id, display_name ), slot:booking_slots!bookings_slot_id_fkey ( slot_date, slot_start )"
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!b) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });

  const mentor = (Array.isArray(b.mentor_profiles) ? b.mentor_profiles[0] : b.mentor_profiles) as
    | { user_id: string | null; display_name: string | null }
    | null;
  if (!staff && mentor?.user_id !== user.id) {
    return NextResponse.json({ error: "Ini bukan sesimu." }, { status: 403 });
  }

  const now = new Date().toISOString();
  const slot = (Array.isArray(b.slot) ? b.slot[0] : b.slot) as { slot_date: string; slot_start: string } | null;
  const waktu = slot
    ? `${jamWib.format(new Date(`${slot.slot_date}T00:00:00+07:00`))}, ${slot.slot_start.slice(0, 5).replace(":", ".")} WIB`
    : "";

  async function kabari(title: string, body: string, wa?: string) {
    await admin.from("notifications").insert({ user_id: b!.customer_id, channel: "in_app", title, body });
    if (wa && b!.whatsapp) sendWhatsApp({ to: b!.whatsapp, message: wa }).catch(() => undefined);
  }

  switch (input.aksi) {
    case "link": {
      if (b.status !== "confirmed") {
        return NextResponse.json({ error: "Link hanya bisa diisi untuk sesi yang sudah terkonfirmasi (lunas)." }, { status: 409 });
      }
      await admin.from("bookings").update({ meeting_link: input.meeting_link }).eq("id", b.id);
      await kabari(
        "Link Sesi Bimbingan",
        `${b.booking_number}${waktu ? ` — ${waktu}` : ""}. Link: ${input.meeting_link}`,
        `📅 *${BRAND.name}* — Link sesi *${b.booking_number}*${waktu ? ` (${waktu})` : ""}${mentor?.display_name ? ` bersama ${mentor.display_name}` : ""}:\n${input.meeting_link}`
      );
      return NextResponse.json({ data: "ok" });
    }
    case "selesai": {
      if (b.status !== "confirmed") return NextResponse.json({ error: "Sesi belum terkonfirmasi." }, { status: 409 });
      await admin
        .from("bookings")
        .update({ status: "completed", completed_at: now, ...(input.catatan_sesi ? { session_notes: input.catatan_sesi } : {}) })
        .eq("id", b.id);
      await kabari("Sesi Selesai", `${b.booking_number} telah selesai. Terima kasih! Jangan lupa beri ulasan untuk mentormu.`);
      return NextResponse.json({ data: "ok" });
    }
    case "tidak_hadir": {
      if (b.status !== "confirmed") return NextResponse.json({ error: "Sesi belum terkonfirmasi." }, { status: 409 });
      await admin.from("bookings").update({ status: "no_show" }).eq("id", b.id);
      return NextResponse.json({ data: "ok" });
    }
    case "batal": {
      if (!staff) return NextResponse.json({ error: "Pembatalan hanya oleh admin." }, { status: 403 });
      if (!["pending", "confirmed"].includes(b.status)) {
        return NextResponse.json({ error: "Sesi ini tidak bisa dibatalkan." }, { status: 409 });
      }
      await admin
        .from("bookings")
        .update({ status: "cancelled", cancelled_at: now, cancel_reason: input.alasan })
        .eq("id", b.id);
      await kabari(
        "Sesi Dibatalkan",
        `${b.booking_number} dibatalkan: ${input.alasan}.${b.paid_at ? " Admin akan menghubungi kamu untuk pengembalian dana / jadwal pengganti." : ""}`
      );
      return NextResponse.json({ data: "ok", refund_manual: !!b.paid_at });
    }
  }
}
