/**
 * Tipe response dari detection-engine (FastAPI/Python service di http://detection-engine:8000).
 *
 * Kontrak ini harus sinkron dengan schema Pydantic di sisi Python.
 * Jika engine menambah field baru, tambahkan di sini dengan `?` supaya backward-compatible.
 */

// ─── Match tunggal dari corpus ────────────────────────────────────────────────

export interface CorpusMatch {
  /** UUID chunk dari tabel corpus_embeddings */
  chunk_id: string;
  /** UUID dokumen dari tabel corpus_documents */
  document_id: string;
  /** Judul dokumen sumber */
  title: string;
  /** Nama sumber: 'garuda' | 'neliti' | 'manual' | custom */
  source_name: string;
  /** URL sumber — bisa null untuk dokumen manual */
  source_url: string | null;
  /** Teks chunk yang mirip */
  chunk_text: string;
  /** Cosine similarity (0.0 – 1.0) */
  similarity: number;
  /** Indeks chunk di dalam dokumen sumber */
  chunk_index: number;
}

// ─── Satu segmen teks dari dokumen yang disubmit ──────────────────────────────

export interface TextSegment {
  /** Teks segmen (kalimat / paragraf, tergantung chunking strategy engine) */
  text: string;
  /** Indeks karakter awal dalam dokumen original */
  start_char: number;
  /** Indeks karakter akhir dalam dokumen original */
  end_char: number;
  /**
   * Persentase kemiripan segmen ini dengan corpus (0 – 100).
   * 0 = original, 100 = identik dengan sumber.
   */
  similarity_score: number;
  /** Apakah segmen ini dianggap plagiat (similarity >= threshold) */
  is_plagiarized: boolean;
  /** Daftar match corpus untuk segmen ini, diurutkan similarity descending */
  matches: CorpusMatch[];
}

// ─── Response utama dari /detect ─────────────────────────────────────────────

export interface DetectionResult {
  /**
   * Persentase keseluruhan dokumen yang terdeteksi mirip (0 – 100).
   * Dihitung dari proporsi karakter / kata yang masuk threshold.
   */
  overall_similarity: number;

  /** Total jumlah kata dalam dokumen yang dianalisis */
  word_count: number;

  /** Jumlah segmen yang dianalisis */
  segment_count: number;

  /** Jumlah segmen yang terdeteksi plagiat */
  plagiarized_segment_count: number;

  /** Semua segmen teks dengan detail similarity per segmen */
  segments: TextSegment[];

  /**
   * Top unique sources yang paling banyak match.
   * Diurutkan berdasarkan jumlah segmen yang match, descending.
   */
  top_sources: Array<{
    source_name: string;
    source_url: string | null;
    title: string;
    match_count: number;
    max_similarity: number;
  }>;

  /** Metadata teknis dari proses deteksi */
  metadata: {
    /** Model embedding yang dipakai */
    embedding_model: string;
    /** Threshold similarity yang digunakan (0.0 – 1.0) */
    similarity_threshold: number;
    /** Strategi chunking: 'sentence' | 'paragraph' | 'fixed_window' */
    chunking_strategy: string;
    /** Durasi pemrosesan dalam milidetik */
    processing_time_ms: number;
    /** Versi engine */
    engine_version: string;
  };
}

// ─── Response envelope dari API ──────────────────────────────────────────────

export interface DetectionApiResponse {
  /** Selalu ada jika HTTP 200 */
  data?: DetectionResult;
  /** Ada jika HTTP 4xx/5xx */
  error?: string;
  /** Detail error teknis (hanya di non-production) */
  detail?: string;
}

// ─── Status internal untuk order setelah detection ───────────────────────────

export type DetectionOrderStatus =
  | "diproses"          // sedang diproses / menunggu detection
  | "selesai"           // detection berhasil, result tersimpan
  | "processing_failed" // detection gagal (engine down / timeout / error)
  | "dibatalkan";       // dibatalkan sebelum detection
