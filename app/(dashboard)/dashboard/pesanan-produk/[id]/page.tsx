import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusPesanan, type TahapPesanan } from "@/components/periksa/StatusPesanan";
import { PanelJasa } from "@/components/katalog/PanelJasa";
import { BayarUlangPesanan } from "@/components/katalog/BayarUlangPesanan";
import { ReceiptPendingSync } from "@/components/payment/ReceiptPendingSync";
import { bacaBerkas } from "@/lib/katalog/berkas-jasa";
import { ESTIMASI_BAWAAN } from "@/lib/katalog/tipe";
import { formatRupiah } from "@/lib/utils/format-currency";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Status Pesanan | ${BRAND.name}` };

const TAHAP: Record<string, TahapPesanan> = {
  menunggu_pembayaran: "menunggu",
  dibayar: "diproses",
  diproses: "diproses",
  dikirim: "diproses",
  selesai: "selesai",
  dibatalkan: "batal",
};

/** Status satu pesanan produk/jasa: Dibuat → Dibayar → Diproses → Selesai. */
export default async function StatusPesananProdukPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { baru?: string; pending?: string };
}) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return notFound();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/dashboard/pesanan-produk/${params.id}`);

  // RLS: pemilik atau staf. "*" karena kolom jasa (048) mungkin belum ada.
  const { data: o } = await supabase.from("pesanan_produk").select("*").eq("id", params.id).maybeSingle();
  if (!o) return notFound();

  const [{ data: pays }, { data: profil }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, status, created_at")
      .eq("purpose", "produk")
      .eq("reference_id", o.id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("profiles").select("full_name").eq("id", o.user_id).maybeSingle(),
  ]);
  const pay = pays?.[0];
  const tahapLuar = TAHAP[o.status as string] ?? "diproses";
  const tahap = tahapLuar === "menunggu" || tahapLuar === "selesai" || tahapLuar === "batal" ? tahapLuar : "diproses";
  const jasa = o.jasa_berkas === true;
  const estimasi = (o.estimasi_proses as string | null) || ESTIMASI_BAWAAN;
  const naskah = bacaBerkas(o.berkas_pelanggan).map((b) => ({ nama: b.nama, ukuran: b.ukuran }));
  // File hasil baru tampil ke customer setelah admin menandai selesai.
  const hasil = o.status === "selesai" ? bacaBerkas(o.berkas_hasil).map((b) => ({ nama: b.nama, ukuran: b.ukuran })) : [];

  return (
    <div className="space-y-4">
      {pay?.status === "pending" && searchParams.pending && <ReceiptPendingSync paymentId={pay.id} />}
      <StatusPesanan
        layanan={jasa ? "Jasa" : "Produk"}
        waktu={o.created_at as string}
        tahap={tahapLuar}
        judul={o.nama_produk as string}
        namaBerkas={formatRupiah(o.total as number)}
        keterangan={jasa ? `Estimasi pengerjaan maks ${estimasi}` : `${o.jumlah}× ${o.satuan ?? "item"}`}
        kode={o.nomor as string}
        kembali={{ href: "/dashboard/pesanan-produk", label: "Semua pesanan" }}
        hubungiKecil={!jasa}
      >
        {jasa ? (
          <PanelJasa
            pesananId={o.id as string}
            kode={o.nomor as string}
            namaProduk={o.nama_produk as string}
            namaPelanggan={profil?.full_name ?? ""}
            tahap={tahap}
            estimasi={estimasi}
            naskah={naskah}
            hasil={hasil}
            receiptHref={pay?.status === "paid" ? `/receipt/${pay.id}` : null}
            lunasBaru={!!searchParams.baru}
          />
        ) : (
          <div className="space-y-3 text-center">
            {o.no_resi && (
              <p className="text-sm text-slate-700">Resi {o.kurir ?? ""}: <span className="font-mono font-bold">{o.no_resi}</span></p>
            )}
            {pay?.status === "paid" && (
              <Link href={`/receipt/${pay.id}`} className="inline-block text-sm font-bold text-brand hover:underline">
                Receipt & konfirmasi WhatsApp →
              </Link>
            )}
          </div>
        )}
        {o.status === "menunggu_pembayaran" && o.midtrans_snap_token && (
          <div className="flex justify-center">
            <BayarUlangPesanan pesananId={o.id as string} snapToken={o.midtrans_snap_token as string} paymentId={pay?.id ?? null} />
          </div>
        )}
      </StatusPesanan>
    </div>
  );
}
