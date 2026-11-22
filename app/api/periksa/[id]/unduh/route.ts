import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderLaporanPdf } from "@/lib/periksa/laporan-pdf";
import { renderSampulAi } from "@/lib/periksa/sampul-ai";
import { renderParafraseDocx } from "@/lib/periksa/parafrase-docx";
import type { HasilPeriksa } from "@/lib/periksa/types";
import { ambilPdfResmiZeroGpt } from "@/lib/periksa/penyedia-zerogpt";
import { PDFDocument } from "pdf-lib";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Unduh hasil pemeriksaan instan:
 *  - indikasi AI & kemiripan → laporan PDF
 *  - parafrase → .docx
 * Hanya pemilik (atau staf) — RLS tabel pemeriksaan yang menyaring.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  const supabase = createClient({ tamu: true });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Masuk dulu." }, { status: 401 });

  const { data: row } = await supabase
    .from("pemeriksaan")
    .select("id, user_id, jenis, status, hasil")
    .eq("id", params.id)
    .maybeSingle();
  if (!row || row.status !== "selesai" || !row.hasil) {
    return NextResponse.json({ error: "Hasil tidak ditemukan atau belum selesai." }, { status: 404 });
  }
  const h = row.hasil as HasilPeriksa;
  const kode = row.id.slice(0, 8).toUpperCase();

  if (row.jenis === "parafrase") {
    const buf = await renderParafraseDocx(h);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Hasil-Parafrase-${kode}.docx"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  // Cek AI lewat ZeroGPT: berikan laporan PDF RESMI ZeroGPT (digabung bila
  // naskah dipecah menjadi beberapa deteksi). Kalau gagal diambil, jatuh ke
  // laporan ringkas buatan situs agar customer tetap bisa mengunduh.
  const ruj = h.ai?.rujukan;
  if (row.jenis === "ai" && ruj?.penyedia === "zerogpt" && ruj.ids.length > 0) {
    try {
      const berkas = [];
      for (const id of ruj.ids) berkas.push(await PDFDocument.load(await ambilPdfResmiZeroGpt(id)));
      const jumlahLampiran = berkas.reduce((n, d) => n + d.getPageCount(), 0);
      // Halaman 1: ringkasan rapi; sesudahnya laporan asli ZeroGPT tanpa diubah.
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
      const sampul = await PDFDocument.load(
        await renderSampulAi(h, { kode, appUrl, jumlahHalamanLampiran: jumlahLampiran })
      );
      const gabung = await PDFDocument.create();
      gabung.setTitle(`Laporan Deteksi AI ${kode}`);
      for (const d of [sampul, ...berkas]) {
        const hal = await gabung.copyPages(d, d.getPageIndices());
        hal.forEach((p) => gabung.addPage(p));
      }
      const pdf = await gabung.save();
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Laporan-ZeroGPT-${kode}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    } catch (e) {
      console.error("[unduh] PDF resmi ZeroGPT gagal, pakai laporan cadangan:", e);
    }
  }

  const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", row.user_id).maybeSingle();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const pdf = await renderLaporanPdf(h, { nama: prof?.full_name ?? null, appUrl });
  const nama = row.jenis === "ai" ? "Laporan-Deteksi-AI" : "Laporan-Kemiripan";
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nama}-${kode}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
