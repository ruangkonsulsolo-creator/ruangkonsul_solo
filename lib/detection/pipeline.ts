import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkDocument } from "@/lib/detection/client";
import { adaptEngineResponse } from "@/lib/detection/adapter";
import { sendWhatsApp, waTemplates } from "@/lib/notification/whatsapp";

type AdminClient = ReturnType<typeof createAdminClient>;

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
export async function runDetectionPipeline(
  orderId: string,
  order: {
    user_id: string;
    order_number: string;
    file_id: string;
    services: { name: string; slug: string } | null;
    profiles: { whatsapp: string | null; full_name: string | null } | null;
  }
) {
  // Service role: pipeline berjalan tanpa sesi user (dipicu webhook)
  const supabase = createAdminClient();
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
  supabase: AdminClient
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
