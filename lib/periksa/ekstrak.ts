/**
 * Mengambil teks dari berkas yang diunggah.
 *
 * Ditulis tanpa pustaka tambahan dengan sengaja. Menambah dependensi berarti
 * satu hal lagi yang bisa gagal saat build dan satu lagi yang perlu diperbarui
 * saat ada celah keamanan — padahal yang dibutuhkan di sini cuma membaca satu
 * berkas XML dari dalam sebuah ZIP.
 *
 * .docx sebenarnya arsip ZIP; naskahnya ada di word/document.xml. Node 18+
 * sudah punya DecompressionStream, jadi deflate-nya tidak perlu pustaka.
 *
 * .pdf belum didukung: formatnya tidak menyimpan teks sebagai teks berurutan,
 * dan membacanya dengan benar butuh pustaka tersendiri. Daripada mengembalikan
 * teks berantakan yang membuat jumlah kata dan tagihan ikut salah, berkas PDF
 * ditolak dengan pesan yang jelas.
 */

export class BerkasTidakDidukung extends Error {
  constructor(pesan: string) {
    super(pesan);
    this.name = "BerkasTidakDidukung";
  }
}

/** Batas aman; naskah di atas ini hampir pasti bukan satu bab. */
export const MAKS_BYTE = 10 * 1024 * 1024;

export const EKSTENSI_DIDUKUNG = [".docx", ".txt", ".md"] as const;

function ekstensiDari(nama: string): string {
  const titik = nama.lastIndexOf(".");
  return titik === -1 ? "" : nama.slice(titik).toLowerCase();
}

// ─── Pembaca ZIP seperlunya ──────────────────────────────────────────────────

const SIG_EOCD = 0x06054b50;
const SIG_CEN = 0x02014b50;

/** Cari End of Central Directory, yang letaknya di ekor berkas. */
function cariEocd(dv: DataView): number {
  // Komentar ZIP paling panjang 65535 byte, jadi tidak perlu memindai
  // lebih jauh dari itu dari ujung berkas.
  const mulai = Math.max(0, dv.byteLength - 22 - 65535);
  for (let i = dv.byteLength - 22; i >= mulai; i--) {
    if (dv.getUint32(i, true) === SIG_EOCD) return i;
  }
  throw new BerkasTidakDidukung(
    "Berkas ini bukan .docx yang utuh. Coba buka lalu simpan ulang dari Word."
  );
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Ambil satu berkas dari dalam arsip ZIP berdasarkan namanya. */
async function ambilDariZip(
  buf: ArrayBuffer,
  cari: string
): Promise<Uint8Array> {
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);
  const eocd = cariEocd(dv);
  const jumlah = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);

  for (let i = 0; i < jumlah; i++) {
    if (dv.getUint32(p, true) !== SIG_CEN) break;

    const metode = dv.getUint16(p + 10, true);
    const ukuranPadat = dv.getUint32(p + 20, true);
    const panjangNama = dv.getUint16(p + 28, true);
    const panjangEkstra = dv.getUint16(p + 30, true);
    const panjangKomentar = dv.getUint16(p + 32, true);
    const offsetLokal = dv.getUint32(p + 42, true);
    const nama = new TextDecoder().decode(
      u8.subarray(p + 46, p + 46 + panjangNama)
    );

    if (nama === cari) {
      // Panjang nama dan extra di header lokal bisa berbeda dari yang di
      // central directory, jadi dibaca ulang dari header lokal.
      const nLokal = dv.getUint16(offsetLokal + 26, true);
      const eLokal = dv.getUint16(offsetLokal + 28, true);
      const mulai = offsetLokal + 30 + nLokal + eLokal;
      const padat = u8.subarray(mulai, mulai + ukuranPadat);
      return metode === 0 ? padat : inflate(padat);
    }

    p += 46 + panjangNama + panjangEkstra + panjangKomentar;
  }

  throw new BerkasTidakDidukung(
    "Isi naskah tidak ditemukan di dalam berkas. Pastikan ini .docx dari Word " +
      "atau Google Docs, bukan .doc lama yang hanya diganti namanya."
  );
}

// ─── XML ke teks ─────────────────────────────────────────────────────────────

function lepasEntitas(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&"); // terakhir, supaya &amp;lt; tidak jadi "<"
}

function docxXmlKeTeks(xml: string): string {
  return lepasEntitas(
    xml
      // Akhir paragraf dan baris jadi baris baru, supaya paragraf tidak
      // menyatu dan jumlah katanya tetap benar.
      .replace(/<w:p[ >]/g, "\n<w:p ")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<w:br\s*\/>/g, "\n")
      .replace(/<w:tab\s*\/>/g, " ")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Pintu masuk ─────────────────────────────────────────────────────────────

export async function ekstrakTeks(
  namaBerkas: string,
  buf: ArrayBuffer
): Promise<string> {
  if (buf.byteLength > MAKS_BYTE) {
    throw new BerkasTidakDidukung(
      "Berkasnya lebih dari 10 MB. Kirim per bab saja — hasilnya juga lebih " +
        "mudah ditindaklanjuti."
    );
  }

  const ext = ekstensiDari(namaBerkas);

  if (ext === ".txt" || ext === ".md") {
    return new TextDecoder().decode(buf).trim();
  }

  if (ext === ".docx") {
    const xml = await ambilDariZip(buf, "word/document.xml");
    return docxXmlKeTeks(new TextDecoder().decode(xml));
  }

  if (ext === ".pdf" || ext === ".doc") {
    throw new BerkasTidakDidukung(
      `Format ${ext} belum didukung. Buka berkasnya lalu simpan sebagai .docx, ` +
        `atau salin isinya ke kotak di sebelah kiri.`
    );
  }

  throw new BerkasTidakDidukung(
    `Format berkas tidak dikenali. Yang didukung: ${EKSTENSI_DIDUKUNG.join(", ")}.`
  );
}
