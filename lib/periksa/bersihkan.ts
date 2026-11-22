/**
 * Buang kode field sitasi dari teks naskah sebelum diperiksa & dihitung biayanya.
 *
 * Mendeley, Zotero, dan EndNote menyimpan sitasi sebagai field Word berisi
 * JSON/XML panjang, mis.:
 *   ADDIN CSL_CITATION {"citationItems":[{"id":"ITEM-1",...}],...}(Kontan, 2026)
 * Kalau ikut terbaca, laporan detektor AI penuh JSON, skornya terdistorsi, dan
 * customer membayar kata yang bukan tulisannya. Yang dipertahankan hanya teks
 * sitasi yang tampil di dokumen, mis. "(Kontan, 2026)".
 */
export function bersihkanKodeSitasi(teks: string): string {
  if (!teks || !/ADDIN\b/.test(teks)) return teks;
  let s = teks;

  // EndNote: ADDIN EN.CITE <EndNote>...</EndNote>  dan  ADDIN EN.CITE.DATA
  s = s.replace(/ADDIN\s+EN\.CITE(?:\.DATA)?\s*(?:<EndNote>[\s\S]*?<\/EndNote>)?/g, " ");
  // Daftar pustaka otomatis: ADDIN Mendeley Bibliography CSL_BIBLIOGRAPHY / ADDIN ZOTERO_BIBL {...} CSL_BIBLIOGRAPHY
  s = s.replace(/ADDIN\s+ZOTERO_BIBL\s*(\{[\s\S]*?\})?\s*CSL_BIBLIOGRAPHY/g, " ");
  s = s.replace(/ADDIN\s+Mendeley\s+Bibliography\s+CSL_BIBLIOGRAPHY/g, " ");

  // CSL JSON (Mendeley / Zotero): penanda + objek JSON berimbang.
  const penanda = /ADDIN\s+(?:ZOTERO_ITEM\s+)?(?:Mendeley\s+Citation\{[^}]*\}\s*)?CSL_CITATION\s*/g;
  let hasil = "";
  let posisi = 0;
  let m: RegExpExecArray | null;
  while ((m = penanda.exec(s))) {
    hasil += s.slice(posisi, m.index);
    let i = m.index + m[0].length;
    if (s[i] === "{") i = akhirJson(s, i);
    posisi = i;
    penanda.lastIndex = i;
  }
  hasil += s.slice(posisi);

  return hasil
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,;:)])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Indeks tepat setelah objek JSON yang dimulai di s[mulai] === "{". */
function akhirJson(s: string, mulai: number): number {
  let dalam = 0;
  let diString = false;
  for (let i = mulai; i < s.length; i++) {
    const c = s[i];
    if (diString) {
      if (c === "\\") i++;
      else if (c === '"') diString = false;
      continue;
    }
    if (c === '"') diString = true;
    else if (c === "{") dalam++;
    else if (c === "}" && --dalam === 0) return i + 1;
  }
  return s.length; // JSON tidak tertutup: buang sampai akhir lebih aman daripada mengirim sisa JSON
}
