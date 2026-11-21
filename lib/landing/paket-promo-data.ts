export type PaketPromo = {
  id: string;
  judul: string;
  harga_mulai: number;
  satuan: string;
  kategori: string | null;
  image_url: string;
  fitur: string[];
  cta_label: string;
  cta_href: string;
};

/** 60000 → "60k", 1500 → "1,5k", 750 → "750". */
export function hargaRingkas(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
  if (n >= 1000) return `${(n / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}k`;
  return n.toLocaleString("id-ID");
}
