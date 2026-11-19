import "server-only";
import { waitUntil } from "@vercel/functions";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsApp } from "@/lib/notification/whatsapp";
import { BRAND } from "@/lib/brand";
import { extractText, ExtractError } from "./extract";
import { detectAi } from "./ai-detect";
import { paraphraseDocument } from "./paraphrase";
import { checkSimilarity, storeFingerprints } from "./similarity";
import { aiReportPdf, paraphraseReportPdf, similarityReportPdf, type ReportMeta } from "./report-pdf";

/** Layanan yang diproses otomatis. DrillBit tetap manual (laporan resmi diunggah admin). */
export const AUTO_SERVICES = new Set(["plagiasi", "ai-detector", "parafrase"]);
export const MAX_ATTEMPTS = 3;
/** Klaim dianggap macet (function mati di tengah jalan) setelah ini */
const STALE_MS = 10 * 60 * 1000;

type Admin = ReturnType<typeof createAdminClient>;

export interface ProcessOutcome {
  ok: boolean;
  status: "selesai" | "processing_failed" | "skipped";
  reason?: string;
}

/**
 * Jalankan di background (Vercel waitUntil) — respons HTTP tidak menunggu.
 * Di luar Vercel promise tetap berjalan selama proses Node hidup.
 */
export function scheduleProcessing(orderId: string) {
  const p = processOrder(orderId).catch((err) => console.error(`[processing] ${orderId}:`, err));
  try {
    waitUntil(p);
  } catch {
    /* bukan di request context Vercel */
  }
}

/**
 * Proses satu pesanan. Aman dipanggil berkali-kali/paralel: hanya satu
 * pemanggil yang berhasil "mengklaim" pesanan (update optimistik).
 */
export async function processOrder(orderId: string, opts: { force?: boolean } = {}): Promise<ProcessOutcome> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(
      "id, order_number, user_id, status, processing_attempts, detection_started_at, file_id, services(name, slug), uploaded_files(original_name, storage_path, mime_type, is_deleted), profiles:profiles!orders_user_id_fkey(full_name, whatsapp)"
    )
    .eq("id", orderId)
    .single();

  if (!order) return { ok: false, status: "skipped", reason: "not_found" };
  const service = one(order.services) as { name: string; slug: string } | null;
  const file = one(order.uploaded_files) as { original_name: string; storage_path: string; mime_type: string; is_deleted: boolean } | null;
  const profile = one(order.profiles) as { full_name: string | null; whatsapp: string | null } | null;

  if (!service || !AUTO_SERVICES.has(service.slug)) return { ok: true, status: "skipped", reason: "manual_service" };
  if (!["diproses", "processing_failed"].includes(order.status)) return { ok: true, status: "skipped", reason: `status_${order.status}` };
  if (!opts.force && order.processing_attempts >= MAX_ATTEMPTS) return { ok: false, status: "skipped", reason: "max_attempts" };
  if (order.detection_started_at && order.status === "diproses" && Date.now() - new Date(order.detection_started_at).getTime() < STALE_MS) {
    return { ok: true, status: "skipped", reason: "in_progress" };
  }

  // Klaim atomik
  const { data: claimed } = await admin
    .from("orders")
    .update({
      status: "diproses",
      detection_started_at: new Date().toISOString(),
      processing_attempts: (opts.force ? 0 : order.processing_attempts) + 1,
      detection_error: null,
    })
    .eq("id", order.id)
    .eq("processing_attempts", order.processing_attempts)
    .select("id");
  if (!claimed?.length) return { ok: true, status: "skipped", reason: "claimed_elsewhere" };

  try {
    if (!file || file.is_deleted) throw new ExtractError("File dokumen tidak ditemukan.");
    const { data: blob, error: dlErr } = await admin.storage.from("documents").download(file.storage_path);
    if (dlErr || !blob) throw new Error(`Gagal mengunduh file: ${dlErr?.message ?? "unknown"}`);
    const text = await extractText(await blob.arrayBuffer(), file.mime_type, file.original_name);

    const meta: ReportMeta = {
      orderNumber: order.order_number,
      serviceName: service.name,
      fileName: file.original_name,
      customerName: profile?.full_name || "Customer",
      processedAt: new Date().toISOString(),
    };

    let result: unknown;
    let reportPdf: Uint8Array;
    let outputPath: string | null = null;
    let summary: string;

    if (service.slug === "plagiasi") {
      const { result: r, segments } = await checkSimilarity(text, { orderId: order.id, userId: order.user_id });
      await storeFingerprints(segments, order.id, order.user_id);
      result = r;
      reportPdf = await similarityReportPdf(r, meta);
      summary = `Similarity ${r.overall_similarity.toFixed(1)}%`;
    } else if (service.slug === "ai-detector") {
      const r = await detectAi(text);
      result = r;
      reportPdf = await aiReportPdf(r, meta);
      summary = `Indikasi AI ${r.overall_ai_score}%`;
    } else {
      const { result: r, docx } = await paraphraseDocument(text);
      result = r;
      reportPdf = await paraphraseReportPdf(r, meta);
      outputPath = `${order.user_id}/${order.order_number}-parafrase.docx`;
      const { error } = await admin.storage.from("reports").upload(outputPath, docx, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });
      if (error) throw new Error(`Gagal menyimpan hasil parafrase: ${error.message}`);
      summary = `Parafrase selesai (perubahan rata-rata ${r.avg_change_pct}%)`;
    }

    const reportPath = `${order.user_id}/${order.order_number}-laporan.pdf`;
    const { error: upErr } = await admin.storage.from("reports").upload(reportPath, Buffer.from(reportPdf), {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) throw new Error(`Gagal menyimpan laporan: ${upErr.message}`);

    const now = new Date().toISOString();
    await admin
      .from("orders")
      .update({
        status: "selesai",
        result,
        report_storage_path: reportPath,
        report_uploaded_at: now,
        output_storage_path: outputPath,
        completed_at: now,
        detection_completed_at: now,
        detection_error: null,
      })
      .eq("id", order.id);

    await notifyDone(admin, order.id, order.user_id, order.order_number, service.name, summary, profile?.whatsapp ?? null);
    return { ok: true, status: "selesai" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[processing] gagal ${order.order_number}:`, msg);
    await admin.from("orders").update({ status: "processing_failed", detection_error: msg.slice(0, 500) }).eq("id", order.id);

    // Error permanen (format file) atau sudah 3x gagal → beri tahu customer bahwa admin akan menangani
    const permanent = err instanceof ExtractError;
    if (permanent || order.processing_attempts + 1 >= MAX_ATTEMPTS) {
      await admin.from("notifications").insert({
        user_id: order.user_id,
        order_id: order.id,
        channel: "in_app",
        title: "Pesanan Ditangani Manual",
        body: permanent
          ? `Pesanan ${order.order_number}: ${msg} Tim kami akan menghubungi kamu.`
          : `Pesanan ${order.order_number} mengalami kendala teknis dan sedang ditangani tim kami.`,
      });
      // Hentikan retry otomatis untuk error permanen
      if (permanent) await admin.from("orders").update({ processing_attempts: MAX_ATTEMPTS }).eq("id", order.id);
    }
    return { ok: false, status: "processing_failed", reason: msg };
  }
}

async function notifyDone(admin: Admin, orderId: string, userId: string, orderNumber: string, serviceName: string, summary: string, wa: string | null) {
  await admin.from("notifications").insert({
    user_id: userId,
    order_id: orderId,
    channel: "in_app",
    title: "Hasil Siap Diunduh ✅",
    body: `${serviceName} ${orderNumber}: ${summary}. Laporan bisa diunduh di Riwayat Pesanan.`,
  });
  if (wa) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? `https://${BRAND.domain}`).replace(/\/$/, "");
    sendWhatsApp({
      to: wa,
      message: `✅ *${BRAND.name}* — ${serviceName} pesanan *${orderNumber}* selesai.\n${summary}.\n\nUnduh laporan: ${appUrl}/dashboard/riwayat-pesanan`,
    }).catch(() => undefined);
  }
}

/** Pesanan yang perlu diproses (dipakai cron). */
export async function findPendingOrders(limit = 3): Promise<string[]> {
  const admin = createAdminClient();
  const staleBefore = new Date(Date.now() - STALE_MS).toISOString();
  const { data } = await admin
    .from("orders")
    .select("id, status, detection_started_at, processing_attempts, services!inner(slug)")
    .in("status", ["diproses", "processing_failed"])
    .lt("processing_attempts", MAX_ATTEMPTS)
    .in("services.slug", Array.from(AUTO_SERVICES))
    .order("created_at", { ascending: true })
    .limit(30);
  return (data ?? [])
    .filter((o) => !o.detection_started_at || o.status === "processing_failed" || o.detection_started_at < staleBefore)
    .slice(0, limit)
    .map((o) => o.id);
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}
