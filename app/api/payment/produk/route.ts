import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { startPayment, getCustomerDetails, requireWhatsApp } from "@/lib/payment/checkout";
import { rateLimit } from "@/lib/security/rate-limit";
import { nomorUnik } from "@/lib/utils/nomor-unik";
import { ongkirFlat, bisaDibayarLangsung, perluPilihJadwal } from "@/lib/katalog/checkout";
import { skemaBerkas, periksaNaskah, MAKS_NASKAH } from "@/lib/katalog/berkas-jasa";
import { ESTIMASI_BAWAAN } from "@/lib/katalog/tipe";

export const dynamic = "force-dynamic";

const schema = z.object({
  produk_id: z.string().uuid(),
  jumlah: z.number().int().min(1).max(100),
  whatsapp: z.string().max(25),
  catatan: z.string().trim().max(500).optional(),
  nama_penerima: z.string().trim().max(100).optional(),
  alamat: z.string().trim().max(500).optional(),
  kota: z.string().trim().max(100).optional(),
  kode_pos: z.string().trim().max(10).optional(),
  berkas: z.array(skemaBerkas).max(MAKS_NASKAH).optional(),
});

/**
 * Bayar langsung produk katalog via Midtrans.
 * Harga SELALU diambil dari tabel produk (bukan dari browser).
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user } = auth.ctx;

  if (!(await rateLimit(`produk:${user.id}`, 60, 6))) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi sebentar." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Input tidak valid." }, { status: 422 });
  }
  const input = parsed.data;

  const admin = createAdminClient();
  const { data: produk } = await admin
    .from("produk")
    .select("*") // "*": kolom jasa_berkas (048) mungkin belum ada
    .eq("id", input.produk_id)
    .maybeSingle();

  if (!produk || !produk.is_active) return NextResponse.json({ error: "Produk tidak tersedia." }, { status: 404 });
  if (!bisaDibayarLangsung(produk)) {
    return NextResponse.json({ error: "Harga produk ini perlu dikonfirmasi dulu via WhatsApp." }, { status: 400 });
  }
  if (perluPilihJadwal(produk)) {
    return NextResponse.json(
      { error: "Paket per jam dipesan lewat pemilihan jadwal.", redirect: `/booking?produk=${produk.slug}` },
      { status: 409 }
    );
  }
  const jasa = produk.jasa_berkas === true;
  if (jasa && input.jumlah !== 1) return NextResponse.json({ error: "Jasa dipesan satu per transaksi." }, { status: 422 });
  if (!jasa && input.berkas?.length) return NextResponse.json({ error: "Produk ini tidak menerima unggahan berkas." }, { status: 422 });
  if (jasa && input.berkas?.length) {
    const galat = await periksaNaskah(admin, user.id, input.berkas);
    if (galat) return NextResponse.json({ error: galat }, { status: 422 });
  }

  if (!jasa && produk.stok !== null && produk.stok < input.jumlah) {
    return NextResponse.json({ error: produk.stok === 0 ? "Stok habis." : `Stok tersisa ${produk.stok}.` }, { status: 409 });
  }

  // Produk fisik wajib alamat kirim
  const fisik = !jasa && produk.berat_gram !== null;
  if (fisik) {
    if (!input.nama_penerima || input.nama_penerima.length < 2) return NextResponse.json({ error: "Nama penerima wajib diisi." }, { status: 422 });
    if (!input.alamat || input.alamat.length < 10) return NextResponse.json({ error: "Alamat lengkap wajib diisi." }, { status: 422 });
    if (!input.kota || input.kota.length < 2) return NextResponse.json({ error: "Kota wajib diisi." }, { status: 422 });
    if (!input.kode_pos || !/^\d{5}$/.test(input.kode_pos)) return NextResponse.json({ error: "Kode pos harus 5 digit." }, { status: 422 });
  }

  // Wajib WhatsApp sebelum bayar (disimpan ke profil)
  const wa = await requireWhatsApp(user.id, input.whatsapp);
  if (!wa.ok) return NextResponse.json({ error: wa.error, code: "WHATSAPP_REQUIRED" }, { status: 422 });

  const subtotal = produk.harga * input.jumlah;
  const ongkir = fisik ? ongkirFlat() : 0;
  const total = subtotal + ongkir;

  // Reservasi stok (hanya produk berstok terhitung)
  let stokDireservasi = false;
  if (!jasa && produk.stok !== null) {
    const { data, error } = await admin.rpc("reservasi_stok_produk", { p_produk_id: produk.id, p_jumlah: input.jumlah });
    if (error) return NextResponse.json({ error: "Stok baru saja habis. Kurangi jumlah." }, { status: 409 });
    stokDireservasi = data === true;
  }

  const nomor = nomorUnik("PRD");
  const { data: pesanan, error: insErr } = await admin
    .from("pesanan_produk")
    .insert({
      nomor,
      user_id: user.id,
      produk_id: produk.id,
      nama_produk: produk.nama,
      satuan: produk.satuan,
      harga_satuan: produk.harga,
      jumlah: input.jumlah,
      subtotal,
      ongkir,
      total,
      whatsapp: wa.whatsapp,
      catatan: input.catatan || null,
      nama_penerima: fisik ? input.nama_penerima : null,
      alamat: fisik ? input.alamat : null,
      kota: fisik ? input.kota : null,
      kode_pos: fisik ? input.kode_pos : null,
      stok_direservasi: stokDireservasi,
      ...(jasa
        ? { jasa_berkas: true, estimasi_proses: produk.estimasi_proses || ESTIMASI_BAWAAN, berkas_pelanggan: input.berkas ?? [] }
        : {}),
    })
    .select("id, nomor")
    .single();

  if (insErr || !pesanan) {
    if (stokDireservasi) {
      const { data: p } = await admin.from("produk").select("stok").eq("id", produk.id).single();
      if (p?.stok !== null && p?.stok !== undefined) await admin.from("produk").update({ stok: p.stok + input.jumlah }).eq("id", produk.id);
    }
    return NextResponse.json({ error: "Gagal membuat pesanan." }, { status: 500 });
  }

  try {
    const satuan = produk.satuan ? ` (${produk.satuan.replace(/^per\s+/i, "per ")})` : "";
    const payment = await startPayment({
      purpose: "produk",
      referenceId: pesanan.id,
      displayRef: pesanan.nomor,
      userId: user.id,
      amountIdr: total,
      items: [
        { id: produk.slug.slice(0, 50), price: produk.harga, quantity: input.jumlah, name: `${produk.nama}${satuan}` },
        ...(ongkir > 0 ? [{ id: "ongkir", price: ongkir, quantity: 1, name: "Ongkos kirim" }] : []),
      ],
      customer: { ...(await getCustomerDetails(user.id, user.email)), phone: wa.whatsapp },
      finishPath: jasa ? `/dashboard/pesanan-produk/${pesanan.id}` : `/dashboard/pesanan-produk?pesanan=${pesanan.id}`,
    });

    await admin
      .from("pesanan_produk")
      .update({ midtrans_order_id: payment.midtransOrderId, midtrans_snap_token: payment.snapToken })
      .eq("id", pesanan.id);

    return NextResponse.json({
      data: { pesanan_id: pesanan.id, nomor: pesanan.nomor, total, payment_id: payment.paymentId, snap_token: payment.snapToken },
    });
  } catch (err) {
    console.error("[payment/produk] Midtrans error:", err);
    await admin
      .from("pesanan_produk")
      .update({ status: "dibatalkan", dibatalkan_at: new Date().toISOString(), alasan_batal: "Gagal membuat transaksi Midtrans" })
      .eq("id", pesanan.id);
    await admin.rpc("lepas_stok_pesanan", { p_pesanan_id: pesanan.id });
    return NextResponse.json({ error: "Gagal membuat transaksi pembayaran. Coba lagi." }, { status: 502 });
  }
}
