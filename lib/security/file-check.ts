/** Validasi file dokumen berdasarkan ekstensi, MIME, dan magic bytes (isi sebenarnya). */

export const DOC_MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
};
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function extOf(name: string): string {
  return (name.split(".").pop() ?? "").toLowerCase();
}

export function validateDocMeta(name: string, size: number, type: string): string | null {
  const ext = extOf(name);
  if (!DOC_MIME[ext]) return "Format tidak didukung. Gunakan PDF atau DOCX.";
  if (type && type !== DOC_MIME[ext] && type !== "application/octet-stream") return "Tipe file tidak cocok dengan ekstensinya.";
  if (!size || size < 100) return "File kosong atau rusak.";
  if (size > MAX_UPLOAD_BYTES) return "Ukuran file melebihi batas 50 MB.";
  return null;
}

/** Cocokkan magic bytes: %PDF-, ZIP (docx), OLE2 (doc). */
export function magicMatches(ext: string, head: Uint8Array): boolean {
  const hex = Array.from(head.slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
  if (ext === "pdf") return hex.startsWith("255044462d");          // %PDF-
  if (ext === "docx") return hex.startsWith("504b0304");           // PK..
  if (ext === "doc") return hex.startsWith("d0cf11e0a1b11ae1");    // OLE2
  return false;
}

export function safeFileName(name: string): string {
  const ext = extOf(name);
  const base = name.slice(0, name.length - ext.length - 1).normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "dokumen";
  return `${base}.${ext}`;
}
