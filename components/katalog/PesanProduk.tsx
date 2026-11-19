"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, CreditCard, Loader2, MessageCircle, Minus, Plus, ShieldCheck } from "lucide-react";
import { formatRupiah } from "@/lib/utils/format-currency";
import { BRAND, waLink } from "@/lib/brand";
import { bisaDibayarLangsung, jadwalViaWhatsApp, ongkirFlat, perluPilihJadwal } from "@/lib/katalog/checkout";
import { useSnapCheckout } from "@/lib/payment/use-snap";
import { WhatsAppField, isValidWhatsApp } from "@/components/payment/WhatsAppField";
import type { Produk } from "@/lib/katalog/tipe";

/**
 * Pemesanan produk katalog.
 *
 * - Harga pasti  → bayar langsung via Midtrans. Setelah lunas, pembeli dibawa
 *   ke halaman receipt yang berisi tombol "Konfirmasi via WhatsApp".
 * - Harga "mulai dari" → tetap konsultasi WhatsApp dulu, karena harga akhirnya
 *   menunggu pilihan isi (mengalikan harga awal lalu menagihnya akan salah).
 */
export function PesanProduk({ produk }: { produk: Produk }) {
  const router = useRouter();
  const { pay, busy } = useSnapCheckout();

  const [jumlah, setJumlah] = useState(1);
  const [whatsapp, setWhatsapp] = useState("");
  const [waError, setWaError] = useState<string | null>(null);
  const [catatan, setCatatan] = useState("");
  const [kirim, setKirim] = useState({ nama_penerima: "", alamat: "", kota: "", kode_pos: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const habis = produk.stok === 0;
  const fisik = produk.berat_gram !== null;
  const bayarLangsung = bisaDibayarLangsung(produk);
  const ongkir = fisik ? ongkirFlat() : 0;
  const subtotal = produk.harga * jumlah;
  const total = subtotal + ongkir;
  const maks = produk.stok === null ? 100 : Math.min(produk.stok, 100);

  const pesanWa = useMemo(() => {
    const baris = [`Halo ${BRAND.name}, saya ingin pesan:`, "", `Produk: ${produk.nama}`, `Jumlah: ${jumlah}`];
    baris.push(`Harga: mulai ${formatRupiah(produk.harga)} per item (menyesuaikan pilihan isi)`);
    return baris.join("\n");
  }, [produk, jumlah]);

  async function bayar() {
    setError(null);
    if (!isValidWhatsApp(whatsapp)) {
      setWaError("Nomor WhatsApp wajib diisi dengan benar sebelum bayar.");
      return;
    }
    if (fisik && (!kirim.nama_penerima || kirim.alamat.length < 10 || !kirim.kota || !/^\d{5}$/.test(kirim.kode_pos))) {
      setError("Lengkapi nama penerima, alamat, kota, dan kode pos (5 digit).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payment/produk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produk_id: produk.id,
          jumlah,
          whatsapp,
          catatan: catatan.trim() || undefined,
          ...(fisik ? kirim : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/produk/${produk.slug}`)}`);
        return;
      }
      if (!res.ok || !json.data?.snap_token) {
        if (json.code === "WHATSAPP_REQUIRED") setWaError(json.error);
        setError(json.error ?? "Gagal memulai pembayaran.");
        return;
      }

      setLoading(false);
      const { outcome, status } = await pay(json.data.snap_token, json.data.payment_id);
      if (status === "paid" || outcome === "success") {
        // Lunas → receipt + tombol "Konfirmasi via WhatsApp"
        router.push(`/receipt/${json.data.payment_id}`);
      } else if (outcome === "pending" || status === "pending") {
        router.push(`/dashboard/pesanan-produk?pesanan=${json.data.pesanan_id}&pending=1`);
      } else if (outcome === "error") {
        setError("Pembayaran gagal. Silakan coba lagi.");
      }
      // outcome "closed": pesanan tetap tersimpan, bisa dibayar dari menu Pesanan Produk
    } catch (e) {
      setError(e instanceof Error ? e.message : "Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  // Paket per jam: pilih mentor + jam dulu, bayar di langkah berikutnya.
  if (bayarLangsung && perluPilihJadwal(produk)) {
    return (
      <div className="space-y-3">
        <Link
          href={`/booking?produk=${encodeURIComponent(produk.slug)}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-base font-extrabold text-white shadow-md transition-opacity hover:opacity-90"
        >
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
          Pilih Mentor &amp; Jadwal
        </Link>
        <ol className="space-y-1 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <li>1. Pilih mentor dan jam yang kosong.</li>
          <li>2. Bayar {formatRupiah(produk.harga)} lewat QRIS — jadwal dikunci untukmu.</li>
          <li>3. Dapat receipt &amp; konfirmasi via WhatsApp.</li>
        </ol>
      </div>
    );
  }

  if (habis) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
        <p className="font-bold text-slate-700">Stok habis</p>
        <p className="mt-0.5 text-sm text-slate-500">Hubungi kami lewat WhatsApp untuk menanyakan kapan tersedia lagi.</p>
        <a
          href={waLink(`Halo ${BRAND.name}, apakah ${produk.nama} masih bisa dipesan?`)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-brand px-4 py-2 text-sm font-bold text-brand transition-colors hover:bg-brand-50"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Tanya ketersediaan
        </a>
      </div>
    );
  }

  const input = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none";
  const working = loading || busy;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-slate-700">Jumlah</span>
        <div className="flex items-center rounded-xl border border-slate-200">
          <button type="button" onClick={() => setJumlah((j) => Math.max(1, j - 1))} disabled={jumlah <= 1}
            className="px-3 py-2 text-slate-600 transition-colors hover:text-brand disabled:opacity-30" aria-label="Kurangi jumlah">
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="w-10 text-center font-bold text-slate-900">{jumlah}</span>
          <button type="button" onClick={() => setJumlah((j) => Math.min(maks, j + 1))} disabled={jumlah >= maks}
            className="px-3 py-2 text-slate-600 transition-colors hover:text-brand disabled:opacity-30" aria-label="Tambah jumlah">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {produk.stok !== null && <span className="text-xs text-slate-500">{produk.stok} tersedia</span>}
      </div>

      {!bayarLangsung ? (
        <>
          <p className="text-sm text-slate-600">
            Harga akhir menyesuaikan pilihan isi, jadi dikonfirmasi dulu lewat WhatsApp sebelum dibayar.
          </p>
          <a href={waLink(produk.wa_pesan || pesanWa)} target="_blank" rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-white transition-colors hover:bg-brand-light">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Konsultasi harga via WhatsApp
          </a>
        </>
      ) : (
        <>
          <WhatsAppField value={whatsapp} onChange={(v) => { setWhatsapp(v); setWaError(null); }} error={waError} />

          {fisik && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">Alamat pengiriman *</p>
              <input className={input} placeholder="Nama penerima" maxLength={100} value={kirim.nama_penerima}
                onChange={(e) => setKirim({ ...kirim, nama_penerima: e.target.value })} />
              <textarea className={input} rows={2} placeholder="Alamat lengkap (jalan, RT/RW, kelurahan, kecamatan)" maxLength={500}
                value={kirim.alamat} onChange={(e) => setKirim({ ...kirim, alamat: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <input className={input} placeholder="Kota/Kabupaten" maxLength={100} value={kirim.kota}
                  onChange={(e) => setKirim({ ...kirim, kota: e.target.value })} />
                <input className={input} placeholder="Kode pos" inputMode="numeric" value={kirim.kode_pos}
                  onChange={(e) => setKirim({ ...kirim, kode_pos: e.target.value.replace(/\D/g, "").slice(0, 5) })} />
              </div>
            </div>
          )}

          <textarea className={input} rows={2} maxLength={500} value={catatan} onChange={(e) => setCatatan(e.target.value)}
            placeholder={fisik ? "Catatan (ukuran, warna, dll.) — opsional" : "Catatan untuk kami (jenjang, topik, jadwal yang diinginkan) — opsional"} />

          <div className="space-y-1 rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>{jumlah}× {formatRupiah(produk.harga)}{produk.satuan ? ` ${produk.satuan}` : ""}</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            {fisik && (
              <div className="flex justify-between text-slate-600"><span>Ongkos kirim</span><span>{formatRupiah(ongkir)}</span></div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1 font-extrabold text-slate-900">
              <span>Total</span><span className="text-brand">{formatRupiah(total)}</span>
            </div>
          </div>

          {jadwalViaWhatsApp(produk) && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
              Jadwal sesi akan diinformasikan mentor lewat WhatsApp setelah pembayaran.
            </p>
          )}

          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

          <button type="button" onClick={bayar} disabled={working}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-white transition-colors hover:bg-brand-light disabled:opacity-60">
            {working ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CreditCard className="h-4 w-4" aria-hidden="true" />}
            {working ? "Memproses…" : `Bayar Sekarang · ${formatRupiah(total)}`}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Bayar dengan QRIS (semua m-banking & e-wallet) — diproses aman oleh Midtrans
          </p>
        </>
      )}
    </div>
  );
}
