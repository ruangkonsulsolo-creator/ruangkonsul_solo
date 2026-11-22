import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils/format-currency";
import { formatWhatsApp } from "@/lib/validators/whatsapp";
import { STATUS_PESANAN } from "@/lib/katalog/status-pesanan";
import { AksiPesananAdmin } from "@/components/katalog/AksiPesananAdmin";
import { BerkasJasaAdmin } from "@/components/katalog/BerkasJasaAdmin";
import { bacaBerkas } from "@/lib/katalog/berkas-jasa";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Pesanan Produk | Admin ${BRAND.name}` };

const FILTER = ["dibayar", "diproses", "dikirim", "selesai", "menunggu_pembayaran", "dibatalkan", "semua"];

export default async function AdminPesananProdukPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const status = FILTER.includes(searchParams.status ?? "") ? searchParams.status! : "dibayar";

  let q = supabase
    .from("pesanan_produk")
    .select("*, profiles!pesanan_produk_user_id_fkey(full_name)") // "*": kolom jasa (048) mungkin belum ada
    .order("created_at", { ascending: false })
    .limit(100);
  if (status !== "semua") q = q.eq("status", status);

  const [{ data: rows }, { data: pays }] = await Promise.all([
    q,
    supabase.from("payments").select("id, reference_id, receipt_number").eq("purpose", "produk").eq("status", "paid").limit(500),
  ]);
  const receiptBy = new Map((pays ?? []).map((p) => [p.reference_id, p]));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Pesanan Produk (Katalog)</h2>
        <p className="text-sm text-slate-500">Pesanan yang dibayar langsung via Midtrans dari halaman produk. Pesanan berlabel <b>JASA</b>: unduh naskah, unggah file hasil, lalu selesaikan.</p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {FILTER.map((s) => (
          <a key={s} href={`?status=${s}`} className={`rounded-full border px-3 py-1 ${status === s ? "bg-slate-900 text-white" : "bg-white"}`}>
            {STATUS_PESANAN[s]?.label ?? "Semua"}
          </a>
        ))}
      </div>
      <div className="divide-y rounded-2xl border border-slate-200 bg-white">
        {(rows ?? []).length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">Tidak ada pesanan.</p>}
        {(rows ?? []).map((o) => {
          const st = STATUS_PESANAN[o.status] ?? { label: o.status, cls: "" };
          const cust = (Array.isArray(o.profiles) ? o.profiles[0] : o.profiles) as { full_name: string | null } | null;
          const rc = receiptBy.get(o.id);
          return (
            <div key={o.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.2fr_1fr_auto]">
              <div>
                <p className="font-semibold text-slate-900">{o.jumlah}× {o.nama_produk}{o.satuan ? <span className="font-normal text-slate-500"> · {o.satuan}</span> : null}</p>
                <p className="font-mono text-xs text-slate-500">
                  {o.nomor}
                  {o.jasa_berkas === true && <span className="ml-1.5 rounded bg-brand px-1.5 py-0.5 font-sans text-[10px] font-bold text-white">JASA</span>}
                  {" · "}<a href={`/dashboard/pesanan-produk/${o.id}`} className="font-sans font-semibold text-brand hover:underline">lihat sebagai customer</a>
                </p>
                <p className="mt-1 text-sm font-bold">{formatRupiah(o.total)}{o.ongkir > 0 && <span className="text-xs font-normal text-slate-500"> (ongkir {formatRupiah(o.ongkir)})</span>}</p>
                <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                {o.catatan && <p className="mt-1 text-xs text-amber-700">Catatan: {o.catatan}</p>}
              </div>
              <div className="text-xs text-slate-600">
                <p className="font-semibold text-slate-900">{cust?.full_name || "-"}</p>
                <a className="text-green-700 hover:underline" href={`https://wa.me/${o.whatsapp}`} target="_blank" rel="noopener noreferrer">WA {formatWhatsApp(o.whatsapp)}</a>
                {o.alamat && <p className="mt-1">{o.nama_penerima} — {o.alamat}, {o.kota} {o.kode_pos}</p>}
                {o.no_resi && <p className="mt-1 font-semibold">Resi {o.kurir}: {o.no_resi}</p>}
                {rc && <a href={`/receipt/${rc.id}`} className="mt-1 block font-mono font-semibold text-brand hover:underline">{rc.receipt_number}</a>}
              </div>
              <AksiPesananAdmin id={o.id} status={o.status} fisik={!!o.alamat} jasa={o.jasa_berkas === true} />
              {o.jasa_berkas === true && (
                <BerkasJasaAdmin
                  id={o.id}
                  status={o.status}
                  estimasi={o.estimasi_proses || "1x24 jam"}
                  naskah={bacaBerkas(o.berkas_pelanggan).map((b) => ({ nama: b.nama, ukuran: b.ukuran }))}
                  hasilAwal={bacaBerkas(o.berkas_hasil)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
