/**
 * Client untuk detection-engine service.
 *
 * Detection engine adalah Python/FastAPI service yang berjalan di container terpisah.
 * Default URL: http://detection-engine:8000  (Docker internal network)
 * Override: set DETECTION_ENGINE_URL di .env.local / environment vars.
 *
 * Auth: engine memeriksa header "X-API-Key" (lihat app/dependencies.py).
 * Key disimpan di DETECTION_ENGINE_API_KEY (server-side only, tidak NEXT_PUBLIC_).
 *
 * Error handling philosophy:
 *   Jika engine down atau timeout → JANGAN crash order.
 *   Return { ok: false, error } supaya caller bisa set status 'processing_failed'
 *   dan order tetap tersimpan di DB untuk retry manual.
 */

import type { EngineDetectResponse } from "@/lib/detection/adapter";

// ─── Config ──────────────────────────────────────────────────────────────────

const ENGINE_URL =
  process.env.DETECTION_ENGINE_URL?.replace(/\/$/, "") ??
  "http://detection-engine:8000";

/**
 * API key dikirim sebagai "X-API-Key" — nama header yang dipakai engine
 * (lihat detection-engine/app/dependencies.py → require_api_key).
 *
 * Env var: DETECTION_ENGINE_API_KEY
 * Harus sama dengan API_KEY di detection-engine/.env
 */
const ENGINE_API_KEY = process.env.DETECTION_ENGINE_API_KEY ?? "";

/** Timeout dalam milidetik. Default 55 detik — di bawah Vercel function timeout (60s). */
const DEFAULT_TIMEOUT_MS = 55_000;

// ─── Tipe return ─────────────────────────────────────────────────────────────

export type CheckDocumentSuccess = {
  ok: true;
  /** Raw response dari engine — belum dikonversi ke format Kalibri */
  raw: EngineDetectResponse;
};

export type CheckDocumentFailure = {
  ok: false;
  /**
   * Kategori error:
   * - 'timeout'      : engine tidak merespons dalam waktu yang ditentukan
   * - 'network'      : engine tidak bisa dijangkau (service down, DNS fail, dll.)
   * - 'engine_error' : engine merespons tapi HTTP 4xx/5xx
   * - 'parse_error'  : respons engine tidak bisa di-parse sebagai JSON yang diharapkan
   */
  errorType: "timeout" | "network" | "engine_error" | "parse_error";
  error: string;
  /** HTTP status code — hanya ada jika errorType === 'engine_error' */
  statusCode?: number;
};

export type CheckDocumentResult = CheckDocumentSuccess | CheckDocumentFailure;

// ─── Request body shape (sesuai DetectRequest di engine/app/models/detect.py) ─

interface EngineDetectRequest {
  text: string;
  document_id?: string;
  options?: {
    top_k?: number;     // default: 10
    min_score?: number; // default: null (engine pakai settings.MIN_COMBINED_SCORE)
  };
}

// ─── Fungsi utama ─────────────────────────────────────────────────────────────

/**
 * Kirim teks dokumen ke detection engine dan kembalikan raw response.
 *
 * Raw response masih dalam format engine (`overall_score`, `matched_sources`, dll.).
 * Gunakan `adaptEngineResponse()` dari lib/detection/adapter.ts untuk konversi
 * ke format Kalibri (`DetectionResult`) sebelum disimpan ke DB.
 *
 * @example
 * ```ts
 * import { checkDocument }       from "@/lib/detection/client";
 * import { adaptEngineResponse } from "@/lib/detection/adapter";
 *
 * const raw = await checkDocument(text, { orderId });
 * if (!raw.ok) {
 *   // simpan status 'processing_failed', jangan crash
 *   return;
 * }
 * const result = adaptEngineResponse(raw.raw);  // → DetectionResult
 * ```
 */
export async function checkDocument(
  text: string,
  options: {
    timeoutMs?: number;
    /** Order ID untuk tracing di engine logs (dikirim sebagai document_id) */
    orderId?: string;
    /**
     * Threshold similarity minimum (0.0–1.0).
     * null / undefined → engine pakai nilai default dari config-nya sendiri.
     */
    minScore?: number;
    /** Jumlah sumber maksimum yang dikembalikan. Default: 10. */
    topK?: number;
  } = {}
): Promise<CheckDocumentResult> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    orderId,
    minScore,
    topK,
  } = options;

  const endpoint = `${ENGINE_URL}/detect`;

  // Susun body sesuai EngineDetectRequest
  const requestBody: EngineDetectRequest = { text };
  if (orderId) requestBody.document_id = orderId;

  const engineOptions: EngineDetectRequest["options"] = {};
  if (topK   !== undefined) engineOptions.top_k   = topK;
  if (minScore !== undefined) engineOptions.min_score = minScore;
  if (Object.keys(engineOptions).length > 0) requestBody.options = engineOptions;

  // AbortController untuk implementasi timeout
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Header yang diperiksa oleh engine: X-API-Key
        // (lihat detection-engine/app/dependencies.py → require_api_key)
        "X-API-Key": ENGINE_API_KEY,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutHandle);

    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        errorType: "timeout",
        error: `Detection engine timeout setelah ${timeoutMs}ms (${endpoint})`,
      };
    }

    return {
      ok: false,
      errorType: "network",
      error: `Tidak bisa menjangkau detection engine: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  } finally {
    clearTimeout(timeoutHandle);
  }

  // HTTP error dari engine (4xx / 5xx)
  if (!response.ok) {
    let detail = "";
    try {
      const errBody = await response.json() as Record<string, unknown>;
      // Engine bungkus error dalam { error: { code, message, details } }
      const errObj = errBody["error"];
      if (errObj && typeof errObj === "object") {
        detail = (errObj as Record<string, string>)["message"] ?? "";
      } else if (typeof errBody["detail"] === "string") {
        detail = errBody["detail"];
      }
    } catch {
      // body bukan JSON — abaikan
    }

    return {
      ok: false,
      errorType: "engine_error",
      statusCode: response.status,
      error: `Detection engine error ${response.status}: ${detail || response.statusText}`,
    };
  }

  // Parse JSON response
  let raw: EngineDetectResponse;
  try {
    raw = await response.json() as EngineDetectResponse;
  } catch (err) {
    return {
      ok: false,
      errorType: "parse_error",
      error: `Gagal parse response dari detection engine: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  // Validasi minimal — engine harus punya overall_score (float) di root
  if (typeof raw?.overall_score !== "number") {
    return {
      ok: false,
      errorType: "parse_error",
      error:
        "Response detection engine tidak valid: field 'overall_score' tidak ditemukan atau bukan number",
    };
  }

  return { ok: true, raw };
}

// ─── Health check ─────────────────────────────────────────────────────────────

/**
 * Cek apakah detection engine sedang up.
 * Tidak membutuhkan API key — endpoint /health bersifat publik.
 */
export async function isDetectionEngineHealthy(timeoutMs = 5_000): Promise<boolean> {
  const controller = new AbortController();
  const handle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${ENGINE_URL}/health`, {
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(handle);
  }
}
