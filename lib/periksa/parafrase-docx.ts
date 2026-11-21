import "server-only";
import { AlignmentType, Document, Footer, Packer, Paragraph, TextRun } from "docx";
import { BRAND } from "@/lib/brand";
import type { HasilPeriksa } from "./types";

/** Hasil parafrase sebagai berkas Word (.docx) yang bisa langsung disunting. */
export async function renderParafraseDocx(h: HasilPeriksa): Promise<Buffer> {
  const p = h.parafrase;
  if (!p) throw new Error("Bukan hasil parafrase.");
  const tgl = new Date(h.diperiksaPada).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" });

  const isi = p.teks
    .split(/\n{2,}|\r\n\r\n/)
    .map((par) => par.trim())
    .filter(Boolean)
    .map(
      (par) =>
        new Paragraph({
          children: [new TextRun({ text: par.replace(/\s*\n\s*/g, " "), font: "Times New Roman", size: 24 })],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { line: 360, after: 160 },
        })
    );

  const doc = new Document({
    creator: BRAND.name,
    title: "Hasil Parafrase",
    sections: [
      {
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Dibuat dengan ${BRAND.name} — periksa ulang makna & sitasi sebelum dipakai.`, size: 16, color: "888888" })],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({ children: [new TextRun({ text: "Hasil Parafrase", bold: true, size: 32, color: "8B0000" })], spacing: { after: 80 } }),
          new Paragraph({
            children: [
              new TextRun({ text: `${tgl} WIB · ${h.jumlahKata.toLocaleString("id-ID")} kata`, size: 18, color: "666666" }),
              ...(p.persenBerubah != null
                ? [new TextRun({ text: ` · Tingkat perubahan susunan kata: ${p.persenBerubah}%`, size: 18, color: "8B0000", bold: true })]
                : []),
            ],
            spacing: { after: 320 },
          }),
          ...isi,
          ...(p.catatan.length
            ? [
                new Paragraph({ children: [new TextRun({ text: "Catatan untuk penulis", bold: true, size: 22 })], spacing: { before: 360, after: 120 } }),
                ...p.catatan.map((c) => new Paragraph({ children: [new TextRun({ text: c, size: 20 })], bullet: { level: 0 } })),
              ]
            : []),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
