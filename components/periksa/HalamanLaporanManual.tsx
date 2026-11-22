import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserTermasukTamu } from "@/lib/supabase/tamu";
import { labelKemiripan } from "@/lib/periksa/persen-berubah";
import { FORMAT_LAPORAN } from "@/lib/periksa/manual";
import { StatusPesanan, type TahapPesanan } from "@/components/periksa/StatusPesanan";
import { BayarUlangPesanan } from "@/components/katalog/BayarUlangPesanan";
import { PantauPembayaran } from "@/components/payment/PantauPembayaran";
import { tokenPesananValid } from "@/lib/periksa/tautan-aman";

/**
 * Status satu pesanan laporan (Turnitin/DrillBit): langkah pesanan, kode order,
 * skor similarity, tombol unduh/bayar, lalu pratinjau PDF asli dari tim.
 * Dipakai di /dashboard/laporan/[id] (member) dan
 * /cek-plagiarisme/pesanan/[id] (semua, termasuk tamu).
 */
const TAHAP: Record<string, TahapPesanan> = {
  menunggu_pembayaran: "menunggu",
  dibayar: "dibayar",
  diproses: "diproses",
  selesai: "selesai",
  dibatalkan: "batal",
  processing_failed: "gagal",
};

/**
 * Status satu pesanan laporan (Turnitin/DrillBit): langkah pesanan, kode order,
 * skor similarity, tombol unduh, lalu pratinjau PDF asli yang diunggah tim.
 */
export async function HalamanLaporanManual({
  id,
  kembali,
  urlLogin,
  token,
}: {
  id: string;
  kembali: { href: string; label: string };
  /** Tujuan bila tidak ada sesi sama sekali (member: login; tamu: halaman cek). */
  urlLogin: string;
  /** Token dari tautan WhatsApp: akses baca pesanan ini tanpa sesi. */
  token?: string;
}) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const lewatToken = tokenPesananValid(id, token);
  // Termasuk sesi tamu: pesanan cek plagiasi boleh dibuat tanpa daftar akun.
  const sesi = createClient({ tamu: true });
  const user = lewatToken ? null : await getUserTermasukTamu(sesi);
  if (!lewatToken && !user) redirect(urlLogin);
  // Token sah → baca dengan service role, dibatasi ke id pesanan ini saja.
  const supabase = lewatToken ? createAdminClient() : sesi;

  let q = supabase
    .from("orders")
    .select("id, order_number, status, created_at, persen_kemiripan, report_storage_path, format_laporan, mesin_laporan, grup_bayar, uploaded_files ( original_name )")
    .eq("id", id);
  if (!lewatToken) q = q.eq("user_id", user!.id);
  const { data: o } = await q.maybeSingle();
  if (!o) notFound();

  const berkas = (o.uploaded_files as unknown as { original_name: string } | null)?.original_name ?? "Naskah";
  const siap = o.status === "selesai" && !!o.report_storage_path;
  const tahap: TahapPesanan = siap ? "selesai" : o.status === "selesai" ? "diproses" : TAHAP[o.status] ?? "diproses";
  const drillbit = o.mesin_laporan === "DrillBit";
  const mesin = o.mesin_laporan && o.mesin_laporan !== "Lainnya" ? o.mesin_laporan : null;
  const format = o.format_laporan ? FORMAT_LAPORAN[o.format_laporan as "baru" | "lama"] : null;
  const persen = o.persen_kemiripan != null ? Number(o.persen_kemiripan) : null;

  // Bucket "reports" privat: URL bertanda tangan 1 jam, hanya setelah kepemilikan dicek di atas.
  // Belum dibayar → tombol bayar langsung di halaman ini (juga untuk tamu).
  let bayar: { paymentId: string; snapToken: string; referensi: string } | null = null;
  if (o.status === "menunggu_pembayaran" && !lewatToken) {
    const referensi = (o.grup_bayar as string | null) ?? o.id;
    const { data: p } = await supabase
      .from("payments")
      .select("id, snap_token")
      .eq("purpose", "order")
      .eq("reference_id", referensi)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (p?.snap_token) bayar = { paymentId: p.id, snapToken: p.snap_token, referensi };
  }

  let url: string | null = null;
  if (siap) {
    const { data: tanda } = await createAdminClient().storage.from("reports").createSignedUrl(o.report_storage_path!, 3600);
    url = tanda?.signedUrl ?? null;
  }

  const judul = {
    selesai: "Laporan siap",
    menunggu: "Menunggu pembayaran",
    dibayar: "Sedang diperiksa tim",
    diproses: "Sedang diperiksa tim",
    batal: "Pesanan dibatalkan",
    gagal: "Sedang dicek admin",
  }[tahap];

  const info =
    tahap === "selesai"
      ? { judul: "Tersimpan permanen", teks: "Laporan ini bisa kamu unduh lagi kapan saja dari Riwayat Pesanan." }
      : tahap === "menunggu"
        ? { judul: "Belum dibayar", teks: "Selesaikan pembayaran QRIS agar naskahmu masuk antrean pemeriksaan." }
        : tahap === "batal"
          ? { judul: "Pesanan tidak diproses", teks: "Pesanan ini dibatalkan. Hubungi admin kalau sudah terlanjur membayar." }
          : { judul: "Laporan maks. 1×24 jam", teks: "Tim sedang memeriksa naskahmu. Kami kabari lewat notifikasi & WhatsApp begitu laporan siap." };

  return (
    <div className="space-y-6">
      <StatusPesanan
        kembali={kembali}
        layanan={drillbit ? "Cek DrillBit" : "Cek Plagiasi"}
        waktu={o.created_at}
        tahap={tahap}
        judul={judul}
        namaBerkas={berkas}
        keterangan={
          siap
            ? [mesin ? `Laporan ${mesin}` : "Laporan PDF asli", format].filter(Boolean).join(" · ")
            : "Laporan dikirim maks. 1×24 jam setelah dibayar."
        }
        kode={o.order_number}
        skor={{
          label: "Similarity Score",
          persen: siap ? persen : null,
          vonis: siap ? (persen != null ? labelKemiripan(persen) : "Lihat persentase di laporan") : "Skor muncul setelah laporan selesai",
          jenis: "kemiripan",
        }}
        info={info}
        unduh={siap ? { href: `/api/report/${o.id}${lewatToken ? `?t=${token}` : ""}`, label: `Unduh ${mesin ? `File ${mesin}` : "Laporan"} (PDF)` } : undefined}
        lanjut={undefined}
        bukaTab={url ? { href: url, label: "Buka laporan di tab baru" } : undefined}
        orderBaru="/cek-plagiarisme"
        ajakSimpanWa={tahap === "menunggu" || tahap === "dibayar" || tahap === "diproses"}
      />

      {bayar && (
        <div className="mx-auto flex max-w-3xl justify-center">
          <PantauPembayaran paymentId={bayar.paymentId} />
          <BayarUlangPesanan pesananId={bayar.referensi} snapToken={bayar.snapToken} paymentId={bayar.paymentId} purpose="order" setelahLunas="refresh" />
        </div>
      )}

      {siap && (
        <section className="mx-auto max-w-3xl">
          <h3 className="mb-3 text-lg font-extrabold text-slate-900">Pratinjau laporan</h3>
          {url ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
              <iframe src={`${url}#view=FitH`} title={`Laporan ${o.order_number}`} className="h-[80vh] w-full" />
              <p className="bg-white px-4 py-2 text-xs text-slate-500">
                Berkas ditampilkan asli seperti yang diterbitkan mesin pemeriksa. Kalau tidak tampil di HP, pakai tombol unduh atau buka di tab baru.
              </p>
            </div>
          ) : (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Gagal memuat pratinjau. Coba muat ulang halaman.</p>
          )}
        </section>
      )}
    </div>
  );
}
