import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CorpusMatch, DetectionResult, TextSegment } from "@/types/detection";
import { mapLimit } from "./llm";
import { containment, distinctivePhrase, sampleEvenly, shingleHashes, toParagraphs, toSegments, wordCount, type Segment } from "./text";

/**
 * Similarity checker internal. Sumber pembanding:
 *  1. Repositori internal — fingerprint dokumen yang pernah dicek di platform ini (selalu aktif)
 *  2. Publikasi ilmiah — OpenAlex (gratis, ±250 juta karya; abstrak dibandingkan per frasa)
 *  3. Web umum — Google via Serper.dev (aktif jika SERPER_API_KEY di-set)
 *
 * Skor per segmen = proporsi frasa segmen yang ditemukan pada sumber (0–100).
 */

const THRESHOLD = 0.25;

interface Match extends CorpusMatch {
  /** proporsi segmen yang tertutup sumber ini (0–1) */
  coverage: number;
}

function match(partial: Partial<Match> & Pick<Match, "title" | "source_name" | "coverage">): Match {
  return {
    chunk_id: partial.chunk_id ?? "",
    document_id: partial.document_id ?? "",
    title: partial.title,
    source_name: partial.source_name,
    source_url: partial.source_url ?? null,
    chunk_text: partial.chunk_text ?? "",
    similarity: Math.round(partial.coverage * 1000) / 1000,
    chunk_index: partial.chunk_index ?? 0,
    coverage: partial.coverage,
  };
}

// ── 1. Repositori internal ──────────────────────────────────────────────────
async function repositoryMatches(segs: Segment[], orderId: string, userId: string): Promise<Map<number, Match[]>> {
  const admin = createAdminClient();
  const out = new Map<number, Match[]>();
  await mapLimit(segs, 6, async (s) => {
    const hashes = shingleHashes(s.text, 5);
    if (hashes.length < 5) return;
    const { data } = await admin.rpc("match_fingerprints", {
      p_hashes: hashes, p_exclude_order: orderId, p_exclude_user: userId, p_limit: 2,
    });
    for (const r of (data ?? []) as { order_id: string; chunk_index: number; overlap: number }[]) {
      const coverage = r.overlap / hashes.length;
      if (coverage < 0.08) continue;
      out.set(s.index, [
        ...(out.get(s.index) ?? []),
        match({
          title: "Dokumen yang pernah diperiksa di platform ini",
          source_name: "repositori internal",
          document_id: r.order_id.slice(0, 8),
          chunk_index: r.chunk_index,
          coverage,
          // Teks dokumen lain tidak pernah disimpan / ditampilkan (privasi)
          chunk_text: "(teks sumber dirahasiakan)",
        }),
      ]);
    }
  });
  return out;
}

export async function storeFingerprints(segs: Segment[], orderId: string, userId: string) {
  if (process.env.SIMILARITY_REPOSITORY === "false") return;
  const admin = createAdminClient();
  const rows = segs
    .map((s) => ({ order_id: orderId, user_id: userId, chunk_index: s.index, hashes: shingleHashes(s.text, 5) }))
    .filter((r) => r.hashes.length >= 5);
  for (let i = 0; i < rows.length; i += 200) {
    await admin.from("document_fingerprints").upsert(rows.slice(i, i + 200), { onConflict: "order_id,chunk_index" });
  }
}

// ── 2. OpenAlex ─────────────────────────────────────────────────────────────
function rebuildAbstract(inv: Record<string, number[]> | null | undefined): string {
  if (!inv) return "";
  const words: string[] = [];
  for (const [w, idxs] of Object.entries(inv)) for (const i of idxs) words[i] = w;
  return words.filter(Boolean).join(" ");
}

async function openAlexMatches(segs: Segment[]): Promise<Map<number, Match[]>> {
  const out = new Map<number, Match[]>();
  const mailto = process.env.OPENALEX_MAILTO ? `&mailto=${encodeURIComponent(process.env.OPENALEX_MAILTO)}` : "";
  await mapLimit(segs, 3, async (s) => {
    const q = distinctivePhrase(s.text, 14);
    if (wordCount(q) < 6) return;
    try {
      const res = await fetch(
        `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per_page=5&select=id,display_name,doi,abstract_inverted_index,primary_location${mailto}`,
        { cache: "no-store", signal: AbortSignal.timeout(12_000) }
      );
      if (!res.ok) return;
      const json = (await res.json()) as {
        results?: { id: string; display_name: string; doi: string | null; abstract_inverted_index?: Record<string, number[]>; primary_location?: { landing_page_url?: string; source?: { display_name?: string } } }[];
      };
      for (const w of json.results ?? []) {
        const abs = rebuildAbstract(w.abstract_inverted_index);
        const source = `${w.display_name ?? ""}. ${abs}`;
        const coverage = containment(s.text, source, 4);
        if (coverage < 0.08) continue;
        out.set(s.index, [
          ...(out.get(s.index) ?? []),
          match({
            title: w.display_name ?? "Publikasi ilmiah",
            source_name: w.primary_location?.source?.display_name ?? "OpenAlex",
            source_url: w.doi ?? w.primary_location?.landing_page_url ?? w.id,
            document_id: w.id,
            chunk_text: abs.slice(0, 400),
            coverage,
          }),
        ]);
      }
    } catch {
      /* sumber eksternal opsional — abaikan error jaringan */
    }
  });
  return out;
}

// ── 3. Web (Serper) ─────────────────────────────────────────────────────────
async function webMatches(segs: Segment[]): Promise<Map<number, Match[]>> {
  const out = new Map<number, Match[]>();
  const key = process.env.SERPER_API_KEY;
  if (!key) return out;
  await mapLimit(segs, 4, async (s) => {
    const q = `"${distinctivePhrase(s.text, 10)}"`;
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": key, "Content-Type": "application/json" },
        body: JSON.stringify({ q, gl: "id", num: 5 }),
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) return;
      const json = (await res.json()) as { organic?: { title: string; link: string; snippet?: string }[] };
      for (const r of json.organic ?? []) {
        if (!r.snippet) continue;
        const snippetHit = containment(r.snippet, s.text, 3);
        if (snippetHit < 0.5) continue;
        // Snippet hanya ±25 kata: frasa query yang cocok persis = indikasi kuat seluruh kalimat tersalin
        const coverage = Math.min(1, snippetHit * Math.max(wordCount(r.snippet) / s.words, 0.35));
        out.set(s.index, [
          ...(out.get(s.index) ?? []),
          match({ title: r.title, source_name: new URL(r.link).hostname.replace(/^www\./, ""), source_url: r.link, chunk_text: r.snippet, coverage }),
        ]);
      }
    } catch {
      /* abaikan */
    }
  });
  return out;
}

export async function checkSimilarity(
  rawText: string,
  ctx: { orderId: string; userId: string }
): Promise<{ result: DetectionResult; segments: Segment[] }> {
  const t0 = Date.now();
  const segs = toSegments(toParagraphs(rawText), 50, 200).filter((s) => s.words >= 15);
  if (!segs.length) throw new Error("Teks terlalu pendek untuk dianalisis.");

  const externalSample = sampleEvenly(segs, Number(process.env.SIMILARITY_MAX_QUERIES ?? 20));
  const [repo, alex, web] = await Promise.all([
    repositoryMatches(segs, ctx.orderId, ctx.userId),
    openAlexMatches(sampleEvenly(externalSample, 15)),
    webMatches(externalSample),
  ]);

  const segments: TextSegment[] = segs.map((s) => {
    const ms = [...(repo.get(s.index) ?? []), ...(alex.get(s.index) ?? []), ...(web.get(s.index) ?? [])].sort(
      (a, b) => b.coverage - a.coverage
    );
    const score = Math.round((ms[0]?.coverage ?? 0) * 100);
    return {
      text: s.text,
      start_char: s.start_char,
      end_char: s.end_char,
      similarity_score: score,
      is_plagiarized: score >= THRESHOLD * 100,
      matches: ms.slice(0, 5).map((m) => {
        const copy: Partial<Match> = { ...m };
        delete copy.coverage;
        return copy as CorpusMatch;
      }),
    };
  });

  const totalWords = segs.reduce((a, s) => a + s.words, 0) || 1;
  const overall = segs.reduce((a, s, i) => a + s.words * (segments[i].similarity_score / 100), 0) / totalWords;

  const bySource = new Map<string, { source_name: string; source_url: string | null; title: string; match_count: number; max_similarity: number }>();
  for (const seg of segments) {
    for (const m of seg.matches) {
      const k = m.source_url ?? `${m.source_name}:${m.document_id}`;
      const cur = bySource.get(k) ?? { source_name: m.source_name, source_url: m.source_url, title: m.title, match_count: 0, max_similarity: 0 };
      cur.match_count++;
      cur.max_similarity = Math.max(cur.max_similarity, m.similarity);
      bySource.set(k, cur);
    }
  }

  const sources = ["repositori internal", "OpenAlex"].concat(process.env.SERPER_API_KEY ? ["web (Google)"] : []);

  return {
    segments: segs,
    result: {
      overall_similarity: Math.round(overall * 1000) / 10,
      word_count: wordCount(rawText),
      segment_count: segments.length,
      plagiarized_segment_count: segments.filter((s) => s.is_plagiarized).length,
      segments,
      top_sources: Array.from(bySource.values()).sort((a, b) => b.match_count - a.match_count || b.max_similarity - a.max_similarity).slice(0, 15),
      metadata: {
        embedding_model: `shingle-4/5 · sumber: ${sources.join(", ")}`,
        similarity_threshold: THRESHOLD,
        chunking_strategy: "paragraph",
        processing_time_ms: Date.now() - t0,
        engine_version: "rks-similarity-1.0",
      },
    },
  };
}
