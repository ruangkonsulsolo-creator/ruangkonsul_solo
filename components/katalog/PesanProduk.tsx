"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Minus, Plus } from "lucide-react";
import { formatRupiah } from "@/lib/utils/format-currency";
import { BRAND, waLink } from "@/lib/brand";
import type { Produk } from "@/lib/katalog/tipe";

/**
 * Jumlah pesanan dan tombol lanjut ke WhatsApp.
 *
 * Belum ada keranjang di sisi publik, jadi pesanan diteruskan ke WhatsApp
 * dengan pilihan pembeli sudah tertulis di pesannya.
 *
 * Untuk produk yang harganya "mulai dari", totalnya sengaja tidak
 * ditampilkan sebagai angka pasti — mengalikan harga awal dengan jumlah
 * lalu menyebutnya "total" akan terbaca sebagai harga final, padahal
 * harganya masih menunggu pilihan isi.
 */
export function PesanProduk({ produk }: { produk: Produk }) {
  const [jumlah, setJumlah] = useState(1);
  const habis = produk.stok === 0;
  const total = produk.harga * jumlah;

  const pesan = useMemo(() => {
    const baris = [
      `Halo ${BRAND.name}, saya ingin pesan:`,
      "",
      `Produk: ${produk.nama}`,
      `Jumlah: ${jumlah}`,
    ];
    if (produk.harga_mulai) {
      baris.push(
        `Harga: mulai ${formatRupiah(produk.harga)} per item ` +
          `(menyesuaikan pilihan isi)`
      );
    } else {
      baris.push(`Perkiraan total: ${formatRupiah(total)}`);
    }
    if (produk.berat_gram) baris.push("", "Mohon info ongkos kirimnya ya.");
    return baris.join("\n");
  }, [produk, jumlah, total]);

  if (habis) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
        <p className="font-bold text-slate-700">Stok habis</p>
        <p className="mt-0.5 text-sm text-slate-500">
          Hubungi kami lewat WhatsApp untuk menanyakan kapan tersedia lagi.
        </p>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-slate-700">Jumlah</span>
        <div className="flex items-center rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setJumlah((j) => Math.max(1, j - 1))}
            disabled={jumlah <= 1}
            className="px-3 py-2 text-slate-600 transition-colors hover:text-brand disabled:opacity-30"
            aria-label="Kurangi jumlah"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="w-10 text-center font-bold text-slate-900">{jumlah}</span>
          <button
            type="button"
            onClick={() =>
              setJumlah((j) =>
                produk.stok === null ? j + 1 : Math.min(produk.stok, j + 1)
              )
            }
            disabled={produk.stok !== null && jumlah >= produk.stok}
            className="px-3 py-2 text-slate-600 transition-colors hover:text-brand disabled:opacity-30"
            aria-label="Tambah jumlah"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {produk.stok !== null && (
          <span className="text-xs text-slate-500">{produk.stok} tersedia</span>
        )}
      </div>

      {!produk.harga_mulai && jumlah > 1 && (
        <p className="text-sm text-slate-600">
          Perkiraan total:{" "}
          <span className="font-extrabold text-brand">{formatRupiah(total)}</span>
          {produk.berat_gram ? " (belum termasuk ongkir)" : ""}
        </p>
      )}
      {produk.harga_mulai && (
        <p className="text-sm text-slate-600">
          Harga akhir menyesuaikan pilihan isi, jadi dikonfirmasi dulu lewat
          WhatsApp sebelum dibayar.
        </p>
      )}

      <a
        href={waLink(produk.wa_pesan || pesan)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-white transition-colors hover:bg-brand-light"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        Pesan lewat WhatsApp
      </a>
    </div>
  );
}
