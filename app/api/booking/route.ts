import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BRAND } from "@/lib/brand";

export async function POST(request: NextRequest) {
  let body: {
    nama: string; prodi?: string; whatsapp: string;
    mentor_id?: string; tanggal?: string; jam?: string;
    kebutuhan: string[]; catatan?: string;
  };

  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Body tidak valid." }, { status: 400 }); }

  if (!body.nama?.trim() || !body.whatsapp?.trim() || !body.kebutuhan?.length) {
    return NextResponse.json({ error: "Nama, WhatsApp, dan kebutuhan wajib diisi." }, { status: 422 });
  }

  // Simpan ke tabel booking_leads (lead tanpa akun). booking_leads tidak punya
  // policy INSERT untuk anon, jadi ditulis lewat service role setelah validasi.
  if (body.nama.length > 120 || body.whatsapp.length > 20 || body.kebutuhan.length > 20 || (body.catatan?.length ?? 0) > 2000) {
    return NextResponse.json({ error: "Input terlalu panjang." }, { status: 422 });
  }
  const supabase = createAdminClient();

  // Coba insert ke booking_leads
  const { error } = await supabase.from("booking_leads").insert({
    nama:       body.nama.trim(),
    prodi:      body.prodi?.trim() ?? null,
    whatsapp:   body.whatsapp.trim(),
    mentor_id:  body.mentor_id ?? null,
    tanggal:    body.tanggal ?? null,
    jam:        body.jam ?? null,
    kebutuhan:  body.kebutuhan,
    catatan:    body.catatan?.trim() ?? null,
    source:     "native_booking_form",
  });

  // Jika tabel belum ada (migration belum jalan), tetap return success
  // dan kirim WA ke admin
  if (error && !error.message.includes("does not exist")) {
    console.error("Booking lead error:", error);
    return NextResponse.json({ error: "Gagal menyimpan booking." }, { status: 500 });
  }

  // Kirim notif WA ke admin (fire & forget)
  const message = `📋 *Booking Bimbingan Baru*\n\n👤 ${body.nama}\n📚 ${body.prodi ?? "-"}\n📱 ${body.whatsapp}\n🎯 ${body.kebutuhan.join(", ")}\n📅 ${body.tanggal ?? "Fleksibel"} ${body.jam ? body.jam + " WIB" : ""}\n💬 ${body.catatan ?? "-"}`;

  fetch(`https://api.fonnte.com/send`, {
    method: "POST",
    headers: { Authorization: process.env.FONNTE_API_KEY ?? "", "Content-Type": "application/json" },
    body: JSON.stringify({ target: BRAND.whatsapp, message }),
  }).catch(console.error);

  return NextResponse.json({ data: "ok", message: "Booking berhasil dikirim. Tim kami akan konfirmasi via WhatsApp." });
}
