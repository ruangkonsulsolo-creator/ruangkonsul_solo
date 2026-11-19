/** Utilitas teks: normalisasi, paragraf, segmen, shingle hash. Tanpa dependensi server. */

export function normalizeWhitespace(s: string): string {
  return s
    .replace(/\r/g, "")
    .replace(/-\n(?=[a-z])/g, "")          // sambungan kata terpotong di PDF
    .replace(/[ \t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Pisah paragraf; gabungkan baris pendek hasil PDF menjadi paragraf utuh. */
export function toParagraphs(raw: string): string[] {
  const text = normalizeWhitespace(raw);
  const blocks = text.split(/\n\s*\n/);
  const out: string[] = [];
  for (const b of blocks) {
    const p = b.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    if (p.length < 2) continue;
    out.push(p);
  }
  // PDF sering tanpa baris kosong → jika hanya 1-2 blok besar, pecah per kalimat ±150 kata
  if (out.length <= 2 && text.length > 3000) {
    return chunkBySentences(out.join(" "), 150);
  }
  return out;
}

export function splitSentences(s: string): string[] {
  return s
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function wordCount(s: string): number {
  return (s.match(/\S+/g) ?? []).length;
}

function chunkBySentences(s: string, targetWords: number): string[] {
  const out: string[] = [];
  let cur: string[] = [];
  let n = 0;
  for (const sent of splitSentences(s)) {
    cur.push(sent);
    n += wordCount(sent);
    if (n >= targetWords) {
      out.push(cur.join(" "));
      cur = [];
      n = 0;
    }
  }
  if (cur.length) out.push(cur.join(" "));
  return out;
}

export interface Segment {
  index: number;
  text: string;
  start_char: number;
  end_char: number;
  words: number;
}

/**
 * Gabungkan paragraf menjadi segmen 60–220 kata (unit analisis similarity / AI).
 * Paragraf sangat pendek (judul, nomor halaman) digabung ke segmen berikutnya.
 */
export function toSegments(paragraphs: string[], min = 60, max = 220): Segment[] {
  const segs: Segment[] = [];
  let buf: string[] = [];
  let words = 0;
  let cursor = 0;
  let start = 0;

  const flush = () => {
    if (!buf.length) return;
    const text = buf.join("\n\n");
    segs.push({ index: segs.length, text, start_char: start, end_char: start + text.length, words });
    buf = [];
    words = 0;
  };

  for (const p of paragraphs) {
    const w = wordCount(p);
    if (w > max) {
      flush();
      start = cursor;
      for (const piece of chunkBySentences(p, Math.round((min + max) / 2))) {
        segs.push({ index: segs.length, text: piece, start_char: cursor, end_char: cursor + piece.length, words: wordCount(piece) });
        cursor += piece.length + 1;
      }
      start = cursor;
      continue;
    }
    if (!buf.length) start = cursor;
    buf.push(p);
    words += w;
    cursor += p.length + 2;
    if (words >= min) flush();
  }
  flush();
  return segs;
}

/** Token kata untuk perbandingan: huruf kecil, tanpa tanda baca, tanpa angka sitasi. */
export function tokens(s: string): string[] {
  return (s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").match(/[a-z0-9]+/g) ?? []).filter(
    (t) => t.length > 1 || /\d/.test(t)
  );
}

/** FNV-1a 32-bit → int32 bertanda (cocok untuk kolom INTEGER[] Postgres). */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

/** Hash shingle n-kata unik. */
export function shingleHashes(s: string, n = 5): number[] {
  const t = tokens(s);
  const set = new Set<number>();
  for (let i = 0; i + n <= t.length; i++) set.add(fnv1a(t.slice(i, i + n).join(" ")));
  return Array.from(set);
}

/** Proporsi shingle `a` yang juga ada di `b` (containment, 0–1). */
export function containment(a: string, b: string, n = 4): number {
  const ha = shingleHashes(a, n);
  if (!ha.length) return 0;
  const hb = new Set(shingleHashes(b, n));
  let hit = 0;
  for (const h of ha) if (hb.has(h)) hit++;
  return hit / ha.length;
}

/** Potongan teks yang paling "khas" (kata panjang terbanyak) untuk query pencarian. */
export function distinctivePhrase(s: string, words = 12): string {
  const sents = splitSentences(s).filter((x) => wordCount(x) >= 8);
  const pick = (sents.length ? sents : [s]).map((x) => ({
    x,
    score: tokens(x).filter((t) => t.length >= 7).length,
  }));
  pick.sort((a, b) => b.score - a.score);
  return (pick[0]?.x ?? s).split(/\s+/).slice(0, words).join(" ").replace(/["“”]/g, "");
}

/** Ambil sampel merata maksimal n elemen. */
export function sampleEvenly<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]);
}
