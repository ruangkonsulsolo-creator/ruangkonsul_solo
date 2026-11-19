import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { startPayment, getCustomerDetails, requireWhatsApp } from "@/lib/payment/checkout";
import { generateOrderNumber } from "@/lib/utils/generate-order-number";
import { rateLimit } from "@/lib/security/rate-limit";
import { merchShippingFee } from "@/lib/merch/config";

export const dynamic = "force-dynamic";

const schema = z.object({
  items: z
    .array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().min(1).max(20) }))
    .min(1, "Keranjang kosong.")
    .max(20),
  recipient_name: z.string().trim().min(2, "Nama penerima wajib diisi.").max(100),
  whatsapp: z.string().max(25),
  shipping_address: z.string().trim().min(10, "Alamat terlalu pendek.").max(500),
  city: z.string().trim().min(2, "Kota wajib diisi.").max(100),
  postal_code: z.string().trim().regex(/^\d{5}$/, "Kode pos harus 5 digit."),
  notes: z.string().trim().max(300).optional(),
});

/** Checkout merchandise: reservasi stok → pesanan → transaksi Midtrans. */
export async function POST(request: NextRequest) {
  const auth = await requireUser(["user"]);
  if (!auth.ok) {
    const msg = auth.status === 401 ? "Silakan login dulu." : auth.status === 403 ? "Hanya akun customer yang bisa membeli." : auth.error;
    return NextResponse.json({ error: msg }, { status: auth.status });
  }
  const { user } = auth.ctx;

  if (!(await rateLimit(`merch:${user.id}`, 60, 5))) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi sebentar." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Input tidak valid." }, { status: 422 });
  }
  const input = parsed.data;

  const wa = await requireWhatsApp(user.id, input.whatsapp);
  if (!wa.ok) return NextResponse.json({ error: wa.error, code: "WHATSAPP_REQUIRED" }, { status: 422 });

  // Gabungkan item duplikat
  const qtyById = new Map<string, number>();
  for (const it of input.items) qtyById.set(it.product_id, (qtyById.get(it.product_id) ?? 0) + it.quantity);

  const admin = createAdminClient();
  const { data: products } = await admin
    .from("merch_products")
    .select("id, slug, name, price_idr, stock, is_active")
    .in("id", Array.from(qtyById.keys()));

  if (!products || products.length !== qtyById.size || products.some((p) => !p.is_active)) {
    return NextResponse.json({ error: "Ada produk yang tidak tersedia. Muat ulang halaman." }, { status: 409 });
  }

  const lines = products.map((p) => ({
    product_id: p.id,
    slug: p.slug,
    name: p.name,
    price_idr: p.price_idr,
    quantity: qtyById.get(p.id)!,
  }));
  const short = lines.find((l) => products.find((p) => p.id === l.product_id)!.stock < l.quantity);
  if (short) return NextResponse.json({ error: `Stok ${short.name} tidak mencukupi.` }, { status: 409 });

  const subtotal = lines.reduce((s, l) => s + l.price_idr * l.quantity, 0);
  const shipping = merchShippingFee();
  const total = subtotal + shipping;

  // Reservasi stok atomik (dikembalikan jika pembayaran gagal/expire)
  const { error: stockError } = await admin.rpc("reserve_merch_stock", {
    p_items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
  });
  if (stockError) {
    return NextResponse.json({ error: "Stok baru saja habis. Kurangi jumlah atau pilih produk lain." }, { status: 409 });
  }

  const orderNumber = generateOrderNumber(undefined, "MRC");
  const { data: order, error: orderError } = await admin
    .from("merch_orders")
    .insert({
      order_number: orderNumber,
      user_id: user.id,
      items: lines,
      subtotal_idr: subtotal,
      shipping_fee_idr: shipping,
      total_idr: total,
      recipient_name: input.recipient_name,
      recipient_phone: wa.whatsapp,
      shipping_address: input.shipping_address,
      city: input.city,
      postal_code: input.postal_code,
      notes: input.notes ?? null,
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    // Pesanan belum tercatat → kembalikan stok langsung per produk
    await restoreStock(admin, lines);
    return NextResponse.json({ error: "Gagal membuat pesanan." }, { status: 500 });
  }

  try {
    const payment = await startPayment({
      purpose: "merch",
      referenceId: order.id,
      displayRef: order.order_number,
      userId: user.id,
      amountIdr: total,
      items: [
        ...lines.map((l) => ({ id: l.slug.slice(0, 50), price: l.price_idr, quantity: l.quantity, name: l.name })),
        ...(shipping > 0 ? [{ id: "ongkir", price: shipping, quantity: 1, name: "Ongkos kirim" }] : []),
      ],
      customer: { ...(await getCustomerDetails(user.id, user.email)), phone: wa.whatsapp },
      finishPath: `/dashboard/merchandise?order=${order.id}`,
    });

    await admin
      .from("merch_orders")
      .update({ midtrans_order_id: payment.midtransOrderId, midtrans_snap_token: payment.snapToken })
      .eq("id", order.id);

    return NextResponse.json({
      data: { merch_order_id: order.id, order_number: order.order_number, total_idr: total, payment_id: payment.paymentId, snap_token: payment.snapToken },
    });
  } catch (err) {
    console.error("[payment/merch] error:", err);
    await admin
      .from("merch_orders")
      .update({ status: "dibatalkan", cancelled_at: new Date().toISOString(), cancel_reason: "Gagal membuat transaksi Midtrans" })
      .eq("id", order.id);
    await admin.rpc("release_merch_stock", { p_order_id: order.id });
    return NextResponse.json({ error: "Gagal membuat transaksi pembayaran. Coba lagi." }, { status: 502 });
  }
}

async function restoreStock(
  admin: ReturnType<typeof createAdminClient>,
  lines: { product_id: string; quantity: number }[]
) {
  for (const l of lines) {
    const { data } = await admin.from("merch_products").select("stock").eq("id", l.product_id).single();
    if (data) await admin.from("merch_products").update({ stock: data.stock + l.quantity }).eq("id", l.product_id);
  }
}
