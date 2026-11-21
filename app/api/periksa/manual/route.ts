import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startPayment, requireWhatsApp } from "@/lib/payment/checkout";
import { rateLimit } from "@/lib/security/rate-limit";
import { generateOrderNumber } from "@/lib/utils/generate-order-number";
import { BATAS_KATA_BESAR, SLUG_MANUAL } from "@/lib/periksa/manual";

export const dynamic = "force-dynamic";


const MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const skema = z.object({
  storage_path: z.string().min(3).max(400),
  nama_berkas: z.string().trim().min(1).max(200),
  ukuran: z.number().int().min(1).max(50 * 1024 * 1024),
  mime: z.enum(MIME),
  jumlah_kata: z.number().int().min(0).max(2_000_000),
  format_laporan: z.enum(["baru", "lama"]),
  whatsapp: z.string().optional(),
});

/**
 * Cek plagiarisme mode manual: berkas sudah diunggah langsung dari browser ke
 * bucket "documents" (folder milik user). Rute ini mencatat berkas, membuat
 * pesanan, lalu membuka pembayaran QRIS. Setelah lunas, admin memeriksa dan
 * mengunggah laporan PDF + persentase.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Masuk dulu untuk memesan laporan." }, { status: 401 });

  if (!(await rateLimit(`plagiasi-manual:${user.id}`, 600, 8))) {
    return NextResponse.json({ error: "Terlalu banyak pesanan. Coba lagi beberapa menit." }, { status: 429 });
  }

  const parsed = skema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 422 });
  }
  const d = parsed.data;

  // Berkas harus berada di folder milik user sendiri dan benar-benar ada.
  const [folder, ...sisa] = d.storage_path.split("/");
  if (folder !== user.id || sisa.length !== 1 || sisa[0].includes("..")) {
    return NextResponse.json({ error: "Lokasi berkas tidak valid." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: ada } = await admin.storage.from("documents").list(user.id, { search: sisa[0], limit: 1 });
  if (!Array.isArray(ada) || !ada.some((o) => o.name === sisa[0])) {
    return NextResponse.json({ error: "Berkas belum terunggah. Coba unggah ulang." }, { status: 400 });
  }

  const wa = await requireWhatsApp(user.id, d.whatsapp);
  if (!wa.ok) return NextResponse.json({ error: wa.error, field: "whatsapp" }, { status: 400 });

  const slug = d.jumlah_kata > BATAS_KATA_BESAR ? SLUG_MANUAL.besar : SLUG_MANUAL.kecil;
  const { data: layanan } = await admin
    .from("services")
    .select("id, name, price_idr, is_active")
    .eq("slug", slug)
    .maybeSingle();
  if (!layanan || !layanan.is_active) {
    return NextResponse.json({ error: "Cek plagiarisme manual sedang tidak tersedia." }, { status: 409 });
  }

  const { data: berkas, error: eBerkas } = await admin
    .from("uploaded_files")
    .insert({
      user_id: user.id,
      original_name: d.nama_berkas,
      storage_path: d.storage_path,
      file_size_bytes: d.ukuran,
      mime_type: d.mime,
    })
    .select("id")
    .single();
  if (eBerkas || !berkas) {
    console.error("[plagiasi-manual] berkas:", eBerkas?.message);
    return NextResponse.json({ error: "Gagal mencatat berkas." }, { status: 500 });
  }

  const awalHari = new Date();
  awalHari.setUTCHours(0, 0, 0, 0);
  const { count } = await admin.from("orders").select("id", { count: "exact", head: true }).gte("created_at", awalHari.toISOString());
  const nomor = `${generateOrderNumber((count ?? 0) + 1)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

  const { data: pesanan, error: ePesanan } = await admin
    .from("orders")
    .insert({
      order_number: nomor,
      user_id: user.id,
      service_id: layanan.id,
      file_id: berkas.id,
      price_idr: layanan.price_idr,
      payment_method: "midtrans",
      format_laporan: d.format_laporan,
      jumlah_kata: d.jumlah_kata,
    })
    .select("id, order_number")
    .single();
  if (ePesanan || !pesanan) {
    console.error("[plagiasi-manual] order:", ePesanan?.message);
    return NextResponse.json({ error: "Gagal membuat pesanan." }, { status: 500 });
  }

  const { data: prof } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const namaItem = `${layanan.name} — tampilan ${d.format_laporan}`;
  try {
    const bayar = await startPayment({
      purpose: "order",
      referenceId: pesanan.id,
      displayRef: pesanan.order_number,
      userId: user.id,
      amountIdr: layanan.price_idr,
      items: [{ id: slug, name: namaItem.slice(0, 50), price: layanan.price_idr, quantity: 1 }],
      itemSnapshot: [{ id: slug, name: namaItem, price: layanan.price_idr, quantity: 1, berkas: d.nama_berkas }],
      customer: { firstName: prof?.full_name || "Customer", email: user.email, phone: wa.whatsapp },
      finishPath: "/dashboard/riwayat-pesanan",
      expiryMinutes: 24 * 60,
    });
    await admin.from("orders").update({ midtrans_order_id: bayar.midtransOrderId, midtrans_snap_token: bayar.snapToken }).eq("id", pesanan.id);
    return NextResponse.json({
      data: { orderId: pesanan.id, orderNumber: pesanan.order_number, paymentId: bayar.paymentId, snapToken: bayar.snapToken, harga: layanan.price_idr },
    });
  } catch (e) {
    console.error("[plagiasi-manual] pembayaran:", e);
    await admin.from("orders").update({ status: "dibatalkan", cancelled_at: new Date().toISOString(), cancel_reason: "Gagal membuka pembayaran" }).eq("id", pesanan.id);
    return NextResponse.json({ error: "Gagal membuka pembayaran. Coba lagi." }, { status: 502 });
  }
}
