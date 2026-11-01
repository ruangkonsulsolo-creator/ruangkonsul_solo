"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/utils/format-currency";
import type { Produk } from "@/lib/merchandise/katalog";
import { BRAND, waLink } from "@/lib/brand";

/**
 * Pemilihan varian dan jumlah, lalu meneruskannya ke WhatsApp.
 *
 * Belum ada keranjang di sisi publik, jadi pesanan diteruskan ke WhatsApp
 * dengan pilihan pembeli sudah tertulis di pesannya. Varian sengaja tidak
 * dibuat sebagai hiasan: apa yang dipilih di sini benar-benar ikut terkirim,
 * supaya tidak ada salah paham soal ukuran atau warna.
 */
export function PemesananProduk({ produk }: { produk: Produk }) {
  const [pilihan, setPilihan] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (produk.varian ?? []).map((v) => [v.label, v.pilihan[0]])
    )
  );
  const [jumlah, setJumlah] = useState(1);

  const total = produk.harga * jumlah;

  const pesan = useMemo(() => {
    // WhatsApp tidak merender spasi berjajar, jadi tidak ada gunanya
    // meratakan kolom — cukup satu baris per keterangan.
    const baris = [
      `Halo ${BRAND.name}, saya ingin pesan:`,
      ``,
      `Produk: ${produk.nama}`,
    ];
    for (const v of produk.varian ?? []) {
      baris.push(`${v.label}: ${pilihan[v.label]}`);
    }
    baris.push(`Jumlah: ${jumlah}`);
    baris.push(`Total: ${formatRupiah(total)} (belum termasuk ongkir)`);
    return baris.join("\n");
  }, [produk, pilihan, jumlah, total]);

  const habis = produk.stok === 0;

  return (
    <div className="space-y-5">
      {produk.varian?.map((v) => (
        <div key={v.label}>
          <p className="mb-2 text-sm font-bold text-slate-900">{v.label}</p>
          <div
            role="radiogroup"
            aria-label={v.label}
            className="flex flex-wrap gap-2"
          >
            {v.pilihan.map((o) => {
              const aktif = pilihan[v.label] === o;
              return (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={aktif}
                  onClick={() =>
                    setPilihan((s) => ({ ...s, [v.label]: o }))
                  }
                  className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-colors ${
                    aktif
                      ? "border-brand bg-brand-50 text-brand"
                      : "border-slate-200 text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div>
        <p className="mb-2 text-sm font-bold text-slate-900">Jumlah</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border-2 border-slate-200">
            <button
              type="button"
              onClick={() => setJumlah((n) => Math.max(1, n - 1))}
              disabled={jumlah <= 1}
              aria-label="Kurangi jumlah"
              className="flex h-10 w-10 items-center justify-center text-slate-600 transition-colors hover:text-brand disabled:cursor-not-allowed disabled:text-slate-300"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <span
              aria-live="polite"
              className="w-12 text-center font-bold text-slate-900"
            >
              {jumlah}
            </span>
            <button
              type="button"
              onClick={() => setJumlah((n) => n + 1)}
              aria-label="Tambah jumlah"
              className="flex h-10 w-10 items-center justify-center text-slate-600 transition-colors hover:text-brand"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <span className="text-sm text-slate-500">
            Total{" "}
            <span className="font-extrabold text-brand">
              {formatRupiah(total)}
            </span>
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <Button
          asChild={!habis}
          disabled={habis}
          size="lg"
          className="w-full gap-2"
        >
          {habis ? (
            <span>Stok habis</span>
          ) : (
            <a href={waLink(pesan)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Pesan lewat WhatsApp
            </a>
          )}
        </Button>
        <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
          Pilihanmu di atas ikut terkirim dalam pesan. Ongkir dihitung setelah
          alamatmu diketahui.
        </p>
      </div>
    </div>
  );
}
