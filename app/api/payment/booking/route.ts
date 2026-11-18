import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { startPayment, getCustomerDetails } from "@/lib/payment/checkout";
import { generateOrderNumber } from "@/lib/utils/generate-order-number";
import { MIN_LEAD_MINUTES, slotPrice, slotStartsAt, type SlotRow } from "@/lib/booking/slots";

export const dynamic = "force-dynamic";

const schema = z.object({
  slot_id: z.string().uuid(),
  topic: z.string().trim().min(3, "Topik minimal 3 karakter.").max(200),
  notes: z.string().trim().max(1000).optional(),
});

/**
 * Booking sesi mentor + bayar via Midtrans.
 * Booking dibuat 'pending' (mengunci slot); webhook mengubahnya ke 'confirmed'
 * saat lunas, atau 'cancelled' saat expire sehingga slot terbuka lagi.
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser(["user"]);
  if (!auth.ok) {
    const msg = auth.status === 401 ? "Silakan login dulu untuk booking & bayar." : auth.status === 403 ? "Hanya akun customer yang bisa booking." : auth.error;
    return NextResponse.json({ error: msg }, { status: auth.status });
  }
  const { user } = auth.ctx;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Input tidak valid." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: slot } = await admin
    .from("booking_slots")
    .select("id, mentor_id, slot_date, slot_start, slot_end, is_blocked, mentor_profiles(id, user_id, price_per_hour, is_available, profiles(full_name, is_active))")
    .eq("id", parsed.data.slot_id)
    .single();

  if (!slot || slot.is_blocked) {
    return NextResponse.json({ error: "Slot tidak tersedia." }, { status: 409 });
  }

  const mentor = (Array.isArray(slot.mentor_profiles) ? slot.mentor_profiles[0] : slot.mentor_profiles) as
    | { id: string; user_id: string; price_per_hour: number; is_available: boolean; profiles: unknown }
    | null;
  const mentorProfile = (Array.isArray(mentor?.profiles) ? mentor?.profiles[0] : mentor?.profiles) as
    | { full_name: string | null; is_active: boolean }
    | null;

  if (!mentor || !mentor.is_available || mentorProfile?.is_active === false) {
    return NextResponse.json({ error: "Mentor sedang tidak menerima booking." }, { status: 409 });
  }
  if (mentor.user_id === user.id) {
    return NextResponse.json({ error: "Tidak bisa booking diri sendiri." }, { status: 400 });
  }
  if (slotStartsAt(slot as SlotRow).getTime() < Date.now() + MIN_LEAD_MINUTES * 60_000) {
    return NextResponse.json({ error: `Slot harus dibooking minimal ${MIN_LEAD_MINUTES} menit sebelum mulai.` }, { status: 409 });
  }

  const price = slotPrice(mentor.price_per_hour, slot as SlotRow);
  if (price <= 0) {
    return NextResponse.json({ error: "Tarif mentor belum diatur. Hubungi admin." }, { status: 400 });
  }

  const bookingNumber = generateOrderNumber(undefined, "BKG");
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .insert({
      booking_number: bookingNumber,
      customer_id: user.id,
      mentor_id: mentor.id,
      slot_id: slot.id,
      status: "pending",
      topic: parsed.data.topic,
      notes: parsed.data.notes ?? null,
      price_idr: price,
      payment_method: "midtrans",
    })
    .select("id, booking_number")
    .single();

  if (bookingError || !booking) {
    // 23505 = unique violation → slot baru saja diambil orang lain
    const taken = bookingError?.code === "23505";
    return NextResponse.json(
      { error: taken ? "Slot baru saja dibooking orang lain. Pilih slot lain." : "Gagal membuat booking." },
      { status: taken ? 409 : 500 }
    );
  }

  try {
    const payment = await startPayment({
      purpose: "booking",
      referenceId: booking.id,
      displayRef: booking.booking_number,
      userId: user.id,
      amountIdr: price,
      items: [
        {
          id: `bkg-${slot.id.slice(0, 8)}`,
          price,
          quantity: 1,
          name: `Bimbingan ${mentorProfile?.full_name ?? "Mentor"} ${slot.slot_date} ${slot.slot_start.slice(0, 5)}`,
        },
      ],
      customer: await getCustomerDetails(user.id, user.email),
      finishPath: `/dashboard/bimbingan-saya?booking=${booking.id}`,
    });

    await admin
      .from("bookings")
      .update({ midtrans_order_id: payment.midtransOrderId, midtrans_snap_token: payment.snapToken })
      .eq("id", booking.id);

    return NextResponse.json({
      data: {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        price_idr: price,
        payment_id: payment.paymentId,
        snap_token: payment.snapToken,
      },
    });
  } catch (err) {
    console.error("[payment/booking] error:", err);
    await admin
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: "Gagal membuat transaksi Midtrans" })
      .eq("id", booking.id);
    return NextResponse.json({ error: "Gagal membuat transaksi pembayaran. Coba lagi." }, { status: 502 });
  }
}
