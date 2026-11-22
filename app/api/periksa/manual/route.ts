import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startPayment, requireWhatsApp } from "@/lib/payment/checkout";
import { rateLimit } from "@/lib/security/rate-limit";
import { generateOrderNumber } from "@/lib/utils/generate-order-number";
import { BATAS_KATA_BESAR, JENIS_MANUAL, SLUG_MANUAL } from "@/lib/periksa/manual";

export const dynamic = "force-dynamic";


const MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const skemaBerkas = z.object({
  storage_path: z.string().min(3).max(400),
  nama_berkas: z.string().trim().min(1).max(200),
  ukuran: z.number().int().min(1).max(50 * 1024 * 1024),
  mime: z.enum(MIME),
  jumlah_kata: z.number().int().min(0).max(2_000_000),
});

const MAKS_FILE = 5;

const skema = z
  .object({
    // Baru: beberapa file sekaligus. Lama (satu file): medan berkas di tingkat atas.
    berkas: z.array(skemaBerkas).min(1).max(MAKS_FILE, `Maksimal ${MAKS_FILE} file per pesanan.`).optional(),
    jenis_manual: z.enum(JENIS_MANUAL).default("turnitin"),
    format_laporan: z.enum(["baru", "lama"]).optional(),
    whatsapp: z.string().optional(),
  })
  .and(skemaBerkas.partial());

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
  const daftar = d.berkas ?? (d.storage_path ? [skemaBerkas.parse(d)] : []);
  if (!daftar.length) return NextResponse.json({ error: "Pilih minimal satu file." }, { status: 422 });
  if (new Set(daftar.map((b) => b.storage_path)).size !== daftar.length) {
    return NextResponse.json({ error: "Ada file yang sama dikirim dua kali." }, { status: 422 });
  }

  // Semua berkas harus berada di folder milik user sendiri dan benar-benar ada.
  const admin = createAdminClient();
  for (const b of daftar) {
    const [folder, ...sisa] = b.storage_path.split("/");
    if (folder !== user.id || sisa.length !== 1 || sisa[0].includes("..")) {
      return NextResponse.json({ error: "Lokasi berkas tidak valid." }, { status: 400 });
    }
    const { data: ada } = await admin.storage.from("documents").list(user.id, { search: sisa[0], limit: 1 });
    if (!Array.isArray(ada) || !ada.some((o) => o.name === sisa[0])) {
      return NextResponse.json({ error: `Berkas ${b.nama_berkas} belum terunggah. Coba unggah ulang.` }, { status: 400 });
    }
  }

  const wa = await requireWhatsApp(user.id, d.whatsapp);
  if (!wa.ok) return NextResponse.json({ error: wa.error, field: "whatsapp" }, { status: 400 });

  const drillbit = d.jenis_manual === "drillbit";
  const formatLaporan = drillbit ? null : d.format_laporan ?? "baru";
  const slugUntuk = (kata: number) => (drillbit ? SLUG_MANUAL.drillbit : kata > BATAS_KATA_BESAR ? SLUG_MANUAL.besar : SLUG_MANUAL.kecil);
  const slugDipakai = [...new Set(daftar.map((b) => slugUntuk(b.jumlah_kata)))];
  const { data: layananRows } = await admin.from("services").select("id, slug, name, price_idr, is_active").in("slug", slugDipakai);
  const layananPer = new Map((layananRows ?? []).map((l) => [l.slug, l]));
  if (slugDipakai.some((sl) => !layananPer.get(sl)?.is_active)) {
    return NextResponse.json({ error: drillbit ? "Cek DrillBit sedang tidak tersedia." : "Cek plagiarisme manual sedang tidak tersedia." }, { status: 409 });
  }

  const awalHari = new Date();
  awalHari.setUTCHours(0, 0, 0, 0);
  const { count } = await admin.from("orders").select("id", { count: "exact", head: true }).gte("created_at", awalHari.toISOString());
  const akhiran = Math.random().toString(36).slice(2, 5).toUpperCase();

  // Buat satu pesanan per file. Pesanan pertama menjadi rujukan pembayaran.
  const dibuat: { id: string; order_number: string; harga: number; nama: string; slug: string }[] = [];
  const batalkanSemua = async (alasan: string) => {
    if (dibuat.length) {
      await admin.from("orders")
        .update({ status: "dibatalkan", cancelled_at: new Date().toISOString(), cancel_reason: alasan })
        .in("id", dibuat.map((x) => x.id));
    }
  };
  for (const [i, b] of daftar.entries()) {
    const slug = slugUntuk(b.jumlah_kata);
    const layanan = layananPer.get(slug)!;
    const { data: berkas, error: eBerkas } = await admin
      .from("uploaded_files")
      .insert({ user_id: user.id, original_name: b.nama_berkas, storage_path: b.storage_path, file_size_bytes: b.ukuran, mime_type: b.mime })
      .select("id")
      .single();
    if (eBerkas || !berkas) {
      console.error("[plagiasi-manual] berkas:", eBerkas?.message);
      await batalkanSemua("Gagal mencatat berkas");
      return NextResponse.json({ error: "Gagal mencatat berkas." }, { status: 500 });
    }
    const nomorDasar = `${generateOrderNumber((count ?? 0) + 1)}-${akhiran}`;
    const { data: pesanan, error: ePesanan } = await admin
      .from("orders")
      .insert({
        order_number: daftar.length > 1 ? `${nomorDasar}-${i + 1}` : nomorDasar,
        user_id: user.id,
        service_id: layanan.id,
        file_id: berkas.id,
        price_idr: layanan.price_idr,
        payment_method: "midtrans",
        format_laporan: formatLaporan,
        jumlah_kata: b.jumlah_kata,
        mesin_laporan: drillbit ? "DrillBit" : "Turnitin",
        ...(i > 0 ? { grup_bayar: dibuat[0].id } : {}),
      })
      .select("id, order_number")
      .single();
    if (ePesanan || !pesanan) {
      console.error("[plagiasi-manual] order:", ePesanan?.message);
      await batalkanSemua("Gagal membuat pesanan");
      const pesan = ePesanan?.message?.includes("grup_bayar")
        ? "Pesanan beberapa file belum aktif (migrasi 047 belum dijalankan). Kirim satu file per pesanan dulu."
        : "Gagal membuat pesanan.";
      return NextResponse.json({ error: pesan }, { status: 500 });
    }
    dibuat.push({ id: pesanan.id, order_number: pesanan.order_number, harga: layanan.price_idr, nama: layanan.name, slug });
  }
  if (dibuat.length > 1) {
    await admin.from("orders").update({ grup_bayar: dibuat[0].id }).eq("id", dibuat[0].id);
  }

  const total = dibuat.reduce((s, x) => s + x.harga, 0);
  const utama = dibuat[0];
  const { data: prof } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const label = (x: (typeof dibuat)[number]) => (formatLaporan ? `${x.nama} — tampilan ${formatLaporan}` : x.nama);
  try {
    const bayar = await startPayment({
      purpose: "order",
      referenceId: utama.id,
      displayRef: dibuat.length > 1 ? `${utama.order_number} (+${dibuat.length - 1})` : utama.order_number,
      userId: user.id,
      amountIdr: total,
      items: dibuat.map((x, i) => ({ id: `${x.slug}-${i + 1}`, name: label(x).slice(0, 50), price: x.harga, quantity: 1 })),
      itemSnapshot: dibuat.map((x, i) => ({ id: x.slug, name: label(x), price: x.harga, quantity: 1, berkas: daftar[i].nama_berkas, order_number: x.order_number })),
      customer: { firstName: prof?.full_name || "Customer", email: user.email, phone: wa.whatsapp },
      finishPath: "/dashboard/riwayat-pesanan",
      expiryMinutes: 24 * 60,
    });
    // midtrans_order_id unik per baris → hanya di pesanan utama; anggota grup
    // ditautkan lewat grup_bayar.
    await admin.from("orders")
      .update({ midtrans_order_id: bayar.midtransOrderId, midtrans_snap_token: bayar.snapToken })
      .eq("id", utama.id);
    return NextResponse.json({
      data: {
        orderId: utama.id,
        orderNumber: utama.order_number,
        orderIds: dibuat.map((x) => x.id),
        paymentId: bayar.paymentId,
        snapToken: bayar.snapToken,
        harga: total,
      },
    });
  } catch (e) {
    console.error("[plagiasi-manual] pembayaran:", e);
    await batalkanSemua("Gagal membuka pembayaran");
    return NextResponse.json({ error: "Gagal membuka pembayaran. Coba lagi." }, { status: 502 });
  }
}
