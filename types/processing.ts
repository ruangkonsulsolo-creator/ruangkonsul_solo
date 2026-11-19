/** Hasil engine internal (disimpan di orders.result, kolom JSONB). */

export interface AiSegmentResult {
  index: number;
  text: string;
  words: number;
  /** 0–100: perkiraan probabilitas segmen ditulis AI */
  ai_score: number;
  signals: string[];
}

export interface AiDetectionResult {
  kind: "ai";
  overall_ai_score: number;
  verdict: "rendah" | "sedang" | "tinggi";
  word_count: number;
  analyzed_segments: number;
  total_segments: number;
  method: "model+stylometry" | "stylometry";
  segments: AiSegmentResult[];
  metadata: { processed_at: string; processing_time_ms: number; model?: string };
}

export interface ParaphraseParagraph {
  original: string;
  paraphrased: string;
  /** 0–100: proporsi frasa 4-kata yang berubah */
  change_pct: number;
}

export interface ParaphraseResult {
  kind: "paraphrase";
  word_count: number;
  paragraph_count: number;
  avg_change_pct: number;
  truncated: boolean;
  paragraphs: ParaphraseParagraph[];
  metadata: { processed_at: string; processing_time_ms: number; model: string };
}
