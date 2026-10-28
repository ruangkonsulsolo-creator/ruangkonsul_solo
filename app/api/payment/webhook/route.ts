import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { checkDocument } from "@/lib/detection/client";
import { adaptEngineResponse } from "@/lib/detection/adapter";
import { sendWhatsApp, waTemplates } from "@/lib/notification/whatsapp";

export async function POST(request: NextRequest) {
  // ─── 1. Parse body ──────────────────────────────────────────────────────────
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const {
    order_id,
    status_code,
    gross_amount,
    signature_key,
    transaction_status,
    fraud_status,
  } = body;

  // ─── 2. Verifikasi signature Midtrans ────────────────────────────────────────
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";
  const expected = createHash("sha512")
    .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
    .digest("hex");

  if (signature_key !== expected) {
    console.warn("[webhook] Midtrans: invalid signature for order_id:", order_id);
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const supabase = createClient();

  // ─── 3. Cari order ───────────────────────────────────────────────────────────
  const { data: orderRaw } = await supabase
    .from("orders")
    .select(`
      id, user_id, order_number, price_idr, status,
      file_id,
      services ( name, slug ),
      profiles ( whatsapp, full_name )
    `)
    .eq("midtrans_order_id", order_id)
    .single();

  if (!orderRaw) {
    console.warn("[webhook] Order not found for midtrans_order_id:", order_id);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Normalise join results: Supabase kadang mengembalikan array untuk relasi
  const order = {
    ...orderRaw,
    services: Array.isArray(orderRaw.services)
      ? (orderRaw.services[0] as { name: string; slug: string } | undefined) ?? null
      : (orderRaw.services as { name: string; slug: string } | null),
    profiles: Array.isArray(orderRaw.profiles)
      ? (orderRaw.profiles[0] as { whatsapp: string | null; full_name: string | null } | undefined) ?? null
      : (orderRaw.profiles as { whatsapp: string | null; full_name: string | null } | null),
  };

  // Idempotency — jangan proses ulang order yang sudah final
  if (["selesai", "processing_failed", "dibatalkan"].includes(order.status)) {
    return NextResponse.json({ data: "ok — already final" });
  }

  // ─── 4. Klasifikasi status Midtrans ─────────────────────────────────────────
  const isSuccess =
    (transaction_status === "settlement" || transaction_status === "capture") &&
    fraud_status !== "deny";

  const isFailed =
    transaction_status === "cancel" ||
    transaction_status === "deny" ||
    transaction_status === "expire";

  // ─── 5. Handle payment success ──────────────────────────────────────────────
  if (isSuccess) {
    // 5a. Update status → diproses + catat paid_at
    await supabase
      .from("orders")
      .update({
        status: "diproses",
        paid_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    // 5b. Catat transaksi finansial
    await supabase.from("transactions").insert({
      user_id: order.user_id,
      type: "order_payment",
      amount_idr: order.price_idr,
      reference_id: order.id,
      reference_type: "order",
      gateway_ref: order_id,
      notes: `Pembayaran ${order.order_number} berhasil`,
    });

    // 5c. Notifikasi in-app "Pembayaran Berhasil"
    await supabase.from("notifications").insert({
      user_id: order.user_id,
      order_id: order.id,
      channel: "in_app",
      title: "Pembayaran Berhasil",
      body: `Pesanan ${order.order_number} sedang diproses.`,
    });

    // 5d. Jalankan detection pipeline (non-blocking terhadap HTTP response ini)
    // Webhook Midtrans harus respond cepat → jalankan pipeline setelah response dikirim
    // Gunakan waitUntil jika tersedia (Vercel Edge), atau fire-and-forget dengan .catch
    runDetectionPipeline(order.id, order).catch((err) => {
      console.error("[webhook] Unexpected error in detection pipeline:", err);
    });
  }

  // ─── 6. Handle payment failed/cancelled ─────────────────────────────────────
  if (isFailed) {
    await supabase
      .from("orders")
      .update({
        status: "dibatalkan",
        cancelled_at: new Date().toISOString(),
        cancel_reason: `Midtrans: ${transaction_status}`,
      })
      .eq("id", order.id);
  }

  // Midtrans harus dapat 200 cepat — pipeline berjalan di background
  return NextResponse.json({ data: "ok" });
}

// ─── Detection pipeline ──────────────────────────────────────────────────────

/**
 * Pipeline lengkap setelah pembayaran berhasil:
 *
 * 1. Ambil teks dokumen dari Supabase Storage
 * 2. Panggil detection engine
 * 3a. Sukses → simpan result, update status 'selesai', kirim WA
 * 3b. Gagal  → update status 'processing_failed', simpan error message
 *              Order TIDAK dihapus — admin bisa retry manual
 *
 * Semua error di-catch di level tertinggi supaya tidak ada unhandled rejection.
 */
async function runDetectionPipeline(
  orderId: string,
  order: {
    user_id: string;
    order_number: string;
    file_id: string;
    services: { name: string; slug: string } | null;
    profiles: { whatsapp: string | null; full_name: string | null } | null;
  }
) {
  const supabase = createClient();
  const now = new Date().toISOString();

  // Hanya jalankan detection untuk layanan plagiasi
  // AI Detector, DrillBit, Parafrase ditangani secara manual oleh admin
  const serviceSlug = (order.services as any)?.slug ?? "";
  if (serviceSlug !== "plagiasi") {
    console.info(
      `[detection] Skip untuk layanan '${serviceSlug}' — hanya plagiasi yang otomatis.`
    );
    return;
  }

  // Catat waktu mulai
  await supabase
    .from("orders")
    .update({ detection_started_at: now })
    .eq("id", orderId);

  // ─── Ambil file dari Supabase Storage ───────────────────────────────────────
  let documentText: string;
  try {
    documentText = await extractTextFromOrder(orderId, order.file_id, supabase);
  } catch (err) {
    const errorMsg = `extract_failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[detection] Gagal ekstrak teks untuk order ${orderId}:`, err);

    await supabase
      .from("orders")
      .update({
        status: "processing_failed",
        detection_error: errorMsg,
      })
      .eq("id", orderId);

    return;
  }

  // ─── Panggil detection engine ────────────────────────────────────────────────
  console.info(`[detection] Memulai analisis untuk order ${orderId} (${documentText.length} chars)`);

  const detectionResult = await checkDocument(documentText, {
    orderId,
    timeoutMs: 55_000,
  });

  // ─── Handle hasil detection ──────────────────────────────────────────────────
  if (!detectionResult.ok) {
    // Engine gagal — simpan error, set status processing_failed
    // Order TIDAK dihapus, admin bisa retry
    console.error(
      `[detection] Engine error untuk order ${orderId}:`,
      detectionResult.error
    );

    await supabase
      .from("orders")
      .update({
        status: "processing_failed",
        detection_error: `${detectionResult.errorType}: ${detectionResult.error}`,
      })
      .eq("id", orderId);

    // Notifikasi in-app untuk admin (bukan user) — pakai service role nanti
    await supabase.from("notifications").insert({
      user_id: order.user_id,
      order_id: orderId,
      channel: "in_app",
      title: "Proses Tertunda",
      body: `Laporan pesanan ${order.order_number} sedang diproses ulang. Tim kami akan segera menghubungi kamu.`,
    });

    return;
  }

  // ─── Detection berhasil ──────────────────────────────────────────────────────
  const result = adaptEngineResponse(detectionResult.raw);
  const completedAt = new Date().toISOString();

  console.info(
    `[detection] Selesai untuk order ${orderId}: ` +
    `similarity=${result.overall_similarity.toFixed(1)}%, ` +
    `segments=${result.segment_count}, ` +
    `time=${result.metadata.processing_time_ms}ms`
  );

  // Simpan result + update status selesai dalam satu query
  await supabase
    .from("orders")
    .update({
      status: "selesai",
      result: result as unknown as Record<string, unknown>,
      completed_at: completedAt,
    })
    .eq("id", orderId);

  // Notifikasi in-app "Laporan Siap"
  await supabase.from("notifications").insert({
    user_id: order.user_id,
    order_id: orderId,
    channel: "in_app",
    title: "Laporan Siap Diunduh",
    body: `Laporan ${order.order_number} selesai. Similarity: ${result.overall_similarity.toFixed(1)}%`,
  });

  // Kirim WhatsApp jika user punya nomor terdaftar
  const whatsapp = (order.profiles as any)?.whatsapp as string | null;
  if (whatsapp) {
    const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/riwayat-pesanan`;
    const message = waTemplates.orderCompleted(order.order_number, downloadUrl);

    await sendWhatsApp({ to: whatsapp, message }).catch((err) => {
      // WA gagal tidak boleh crash pipeline — log saja
      console.error(`[detection] WA notification gagal untuk order ${orderId}:`, err);
    });
  }
}

// ─── Helper: ekstrak teks dari file order ────────────────────────────────────

/**
 * Download file dari Supabase Storage dan kembalikan teks plain-nya.
 *
 * Saat ini hanya mengambil raw bytes dan decode sebagai UTF-8 (cocok untuk TXT/DOCX plain).
 * Untuk PDF real: integrasikan pdf-parse / pdfminer di server atau di detection engine sendiri.
 *
 * Jika memilih strategy "engine melakukan ekstraksi":
 *   Ganti fungsi ini dengan upload file langsung ke engine (multipart/form-data).
 */
async function extractTextFromOrder(
  orderId: string,
  fileId: string,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  // Ambil metadata file untuk mendapatkan storage_path
  const { data: fileRecord, error: fileError } = await supabase
    .from("uploaded_files")
    .select("storage_path, mime_type, original_name")
    .eq("id", fileId)
    .single();

  if (fileError || !fileRecord) {
    throw new Error(`File record tidak ditemukan untuk file_id: ${fileId}`);
  }

  // Download dari Supabase Storage bucket "documents"
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("documents")
    .download(fileRecord.storage_path);

  if (downloadError || !fileData) {
    throw new Error(
      `Gagal download file dari storage (path: ${fileRecord.storage_path}): ` +
      (downloadError?.message ?? "unknown error")
    );
  }

  // Konversi Blob → ArrayBuffer → string
  const arrayBuffer = await fileData.arrayBuffer();
  const textDecoder = new TextDecoder("utf-8");
  const rawText = textDecoder.decode(arrayBuffer);

  if (!rawText || rawText.trim().length < 10) {
    throw new Error(
      `Teks yang diekstrak terlalu pendek atau kosong ` +
      `(${rawText.trim().length} chars) dari file: ${fileRecord.original_name}`
    );
  }

  return rawText;
}
