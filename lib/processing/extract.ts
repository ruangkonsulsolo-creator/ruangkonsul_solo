import "server-only";

export class ExtractError extends Error {}

/**
 * Ekstrak teks dari PDF / DOCX.
 * .doc (Word 97-2003) tidak didukung otomatis → lempar ExtractError agar
 * pesanan ditandai processing_failed dan ditangani admin.
 */
export async function extractText(buf: ArrayBuffer, mime: string, fileName: string): Promise<string> {
  const lower = fileName.toLowerCase();

  if (mime === "application/pdf" || lower.endsWith(".pdf")) {
    const { extractText: pdfExtract, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await pdfExtract(pdf, { mergePages: false });
    const pages = Array.isArray(text) ? text : [text];
    const joined = pages.join("\n\n");
    if (joined.replace(/\s/g, "").length < 50) {
      throw new ExtractError("PDF tidak berisi teks (kemungkinan hasil scan/gambar). Perlu OCR manual.");
    }
    return joined;
  }

  if (mime.includes("wordprocessingml") || lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    if (value.replace(/\s/g, "").length < 50) throw new ExtractError("Dokumen DOCX kosong.");
    return value;
  }

  throw new ExtractError("Format .doc lama tidak didukung otomatis. Simpan ulang sebagai .docx atau PDF.");
}
