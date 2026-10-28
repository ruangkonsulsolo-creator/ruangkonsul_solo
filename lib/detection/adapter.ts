/**
 * Adapter: konversi DetectResponse (detection-engine) → DetectionResult (Kalibri).
 *
 * Detection engine mengembalikan format ringkas berorientasi "source":
 *   { overall_score, exact_score, semantic_score, matched_sources[], processing_time_ms }
 *
 * Kalibri frontend dan DB mengharapkan format berorientasi "segment":
 *   { overall_similarity, segments[], top_sources[], metadata, ... }
 *
 * Adapter ini menjembatani keduanya tanpa mengubah satu sisi kontrak pun.
 * Jika engine menambah field baru di masa depan, tambahkan di EngineDetectResponse
 * dan propagasikan ke DetectionResult seperlunya.
 */

import type {
  DetectionResult,
  TextSegment,
  CorpusMatch,
} from "@/types/detection";

// ─── Engine response types ────────────────────────────────────────────────────
// Cermin dari detection-engine/app/models/detect.py (DetectResponse + MatchedSource)

export interface EngineMatchedSource {
  source_id:      string;
  title:          string;
  exact_score:    number;   // 0.0 – 1.0
  semantic_score: number;   // 0.0 – 1.0
  combined_score: number;   // 0.0 – 1.0 (weighted combination)
  matched_excerpt: string;  // best matching chunk text snippet
}

export interface EngineDetectResponse {
  document_id:      string | null;
  overall_score:    number;   // 0.0 – 1.0, combined (exact + semantic)
  exact_score:      number;   // 0.0 – 1.0, MinHash Jaccard
  semantic_score:   number;   // 0.0 – 1.0, cosine similarity
  matched_sources:  EngineMatchedSource[];
  processing_time_ms: number;
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

/**
 * Konversi raw engine response ke DetectionResult yang dipakai Kalibri.
 *
 * Mapping:
 *   overall_score * 100        → overall_similarity  (engine: 0–1, Kalibri: 0–100)
 *   matched_sources            → top_sources + segments (satu segment per source)
 *   processing_time_ms         → metadata.processing_time_ms
 *
 * Catatan limitasi:
 *   Engine saat ini mengembalikan satu excerpt per source (bukan per-chunk breakdown).
 *   Kalibri's DetectionResult supports per-segment granularity — kita modelkan
 *   setiap matched_source sebagai satu TextSegment.
 *   Ketika engine di-upgrade untuk mengembalikan per-chunk results, adapter ini
 *   bisa diperbarui tanpa mengubah komponen UI.
 */
export function adaptEngineResponse(raw: EngineDetectResponse): DetectionResult {
  const similarityPct = clamp(raw.overall_score * 100, 0, 100);

  // ── Bangun segments dari matched_sources ─────────────────────────────────
  // Setiap matched_source diperlakukan sebagai satu "plagiarized segment"
  // karena engine tidak (belum) mengembalikan posisi char.
  const segments: TextSegment[] = raw.matched_sources.map((src, idx) => {
    const segSimilarityPct = clamp(src.combined_score * 100, 0, 100);
    const threshold = 15; // 15% → sesuai MIN_COMBINED_SCORE di engine config

    const match: CorpusMatch = {
      chunk_id:    src.source_id, // engine tidak expose chunk UUID — pakai source_id sebagai proxy
      document_id: src.source_id,
      title:       src.title,
      source_name: "corpus",      // engine tidak expose source_name per-match; bisa di-extend
      source_url:  null,          // engine tidak expose source_url per-match saat ini
      chunk_text:  src.matched_excerpt,
      similarity:  src.combined_score,
      chunk_index: idx,
    };

    return {
      text:             src.matched_excerpt,
      start_char:       0,  // engine belum expose posisi karakter
      end_char:         src.matched_excerpt.length,
      similarity_score: segSimilarityPct,
      is_plagiarized:   segSimilarityPct >= threshold,
      matches:          [match],
    };
  });

  // ── Bangun top_sources ────────────────────────────────────────────────────
  const top_sources = raw.matched_sources.map((src) => ({
    source_name:    "corpus",
    source_url:     null,
    title:          src.title,
    match_count:    1,  // engine aggregates per-source, count = 1 per entry
    max_similarity: src.combined_score,
  }));

  // ── Hitung word_count kasar dari semua excerpt ────────────────────────────
  const totalWords = raw.matched_sources.reduce(
    (sum, src) => sum + src.matched_excerpt.split(/\s+/).filter(Boolean).length,
    0
  );

  // ── Metadata ──────────────────────────────────────────────────────────────
  const metadata: DetectionResult["metadata"] = {
    embedding_model:      "paraphrase-multilingual-MiniLM-L12-v2",
    similarity_threshold: 0.15, // MIN_COMBINED_SCORE dari engine config
    chunking_strategy:    "paragraph",
    processing_time_ms:   raw.processing_time_ms,
    engine_version:       "0.1.0",
  };

  return {
    overall_similarity:          similarityPct,
    word_count:                  totalWords,
    segment_count:               segments.length,
    plagiarized_segment_count:   segments.filter((s) => s.is_plagiarized).length,
    segments,
    top_sources,
    metadata,
    // Bidang tambahan untuk audit/debug — tidak ada di DetectionResult type tapi
    // disimpan di jsonb, jadi aman kalau ditambahkan. Cast ke any untuk simplicity.
    _raw: {
      exact_score:    raw.exact_score,
      semantic_score: raw.semantic_score,
      overall_score:  raw.overall_score,
    } as unknown,
  } as DetectionResult;
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
