import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  slot_id: z.string().uuid(),
  mentor_id: z.string().uuid(),
  topik: z.string().trim().min(4, "Ceritakan singkat yang ingin dibahas.").max(300),
  catatan: z.string().trim().max(1000).optional(),
});

/** RKS-20261028-4821 — tanggal WIB agar urut dan mudah dicari admin. */
function bookingNumber(): string {
  const tanggal = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/-/g, "");
  const acak = Math.floor(1000 + Math.random() * 9000);
  return `RKS-${tanggal}-${acak}`;
}

/**
 * Membuat booking sesi bimbingan.
 *
 * Wajib login: booking terikat ke akun supaya customer bisa melihat riwayat,
 * mentor tahu siapa yang datang, dan admin bisa mengingatkan keduanya.
 *
 * Perebutan slot ditangani database, bukan dicek di sini. Mengecek dulu lalu
 * menulis ("cek lalu tulis") meninggalkan celah di antara dua langkah: dua
 * permintaan bersamaan bisa sama-sama lolos pengecekan. Partial unique index
 * bookings_one_active_per_slot membuat penulisan kedua gagal dengan 23505,
 * dan itu yang diterjemahkan jadi pesan "slot keburu diambil".
 */
export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Data tidak terbaca." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Data belum lengkap.",
        detail: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  const { slot_id, mentor_id, topik, catatan } = parsed.data;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Masuk dulu untuk memesan jadwal.",
        action: "login",
      },
      { status: 401 }
    );
  }

  // Harga diambil dari server, tidak pernah dari body. Kalau harga dikirim
  // klien, siapa pun bisa memesan sesi seharga nol lewat curl.
  const { data: mentor, error: mentorError } = await supabase
    .from("mentor_profiles")
    .select("id, price_per_hour, is_available, display_name")
    .eq("id", mentor_id)
    .maybeSingle();

  if (mentorError || !mentor) {
    return NextResponse.json({ error: "Mentor tidak ditemukan." }, { status: 404 });
  }

  if (!mentor.is_available) {
    return NextResponse.json(
      { error: "Mentor ini sedang tidak menerima sesi baru." },
      { status: 409 }
    );
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      booking_number: bookingNumber(),
      customer_id: user.id,
      mentor_id,
      slot_id,
      status: "pending",
      topic: topik,
      notes: catatan ?? null,
      price_idr: mentor.price_per_hour,
    })
    .select("id, booking_number, status, price_idr")
    .single();

  if (error) {
    // 23505 = slot sudah punya booking aktif. Ini kondisi normal saat dua
    // orang menekan tombol hampir bersamaan, bukan kerusakan sistem.
    if (error.code === "23505") {
      return NextResponse.json(
        {
          error: "Slot ini baru saja diambil orang lain. Pilih jam lain ya.",
          action: "refresh_slots",
        },
        { status: 409 }
      );
    }

    // 23514 = trigger validate_booking_slot menolak (slot lewat / milik
    // mentor lain).
    if (error.code === "23514") {
      return NextResponse.json(
        { error: "Jadwal itu sudah tidak bisa dipesan.", action: "refresh_slots" },
        { status: 409 }
      );
    }

    // 42501 = RLS menolak. Biasanya sesi kedaluwarsa di tengah jalan.
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Sesi login kamu berakhir. Masuk lagi ya.", action: "login" },
        { status: 401 }
      );
    }

    console.error("[booking/create]", error);
    return NextResponse.json(
      { error: "Gagal menyimpan pesanan. Coba lagi sebentar lagi." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: booking,
    message:
      "Jadwal tersimpan. Admin akan mengonfirmasi lewat WhatsApp sebelum sesi dimulai.",
  });
}
