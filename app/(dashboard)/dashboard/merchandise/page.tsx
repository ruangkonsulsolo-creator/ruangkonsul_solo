import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRupiah } from "@/lib/utils/format-currency";
import { PREVIEW_MODE } from "@/lib/utils/preview-mode";
import { BRAND } from "@/lib/brand";
import { ShoppingBag, Star, Truck, ShieldCheck, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Merchandise | ${BRAND.name}` };

const PRODUCTS = [
  { id: "m1", name: "Tumbler RK Solo",        category: "Aksesoris", price: 45000,  rating: 4.8, sold: 67,  badge: "Best Seller", desc: "Tumbler stainless 500ml dengan logo RK Solo. Bikin mabar makin semangat." },
  { id: "m2", name: "Hoodie Skripsi Survivor",  category: "Pakaian",  price: 125000, rating: 4.9, sold: 34,  badge: "New",        desc: "Hoodie premium dengan tulisan 'Skripsi Survivor'. Perfect buatPull all-nighter." },
  { id: "m3", name: "Notebook Bimbingan",      category: "Stationery",price: 35000,  rating: 4.7, sold: 89,  badge: null,         desc: "Notebook A5 120 pages dengan template bimbingan. Catat progress skripsi-mu." },
  { id: "m4", name: "Sticker Pack Akademik",   category: "Sticker",  price: 20000,  rating: 4.6, sold: 112, badge: null,         desc: "10 sheet sticker akademik lucu. Pas untuk laptop dan botol minum." },
  { id: "m5", name: "Tote Bag RK Solo",        category: "Aksesoris", price: 38000,  rating: 4.8, sold: 56,  badge: null,         desc: "Tote bag kanvas tebal. Bawa buku skripsi tanpa takut robek." },
  { id: "m6", name: "Mug 'Dosen Happy'",       category: "Aksesoris", price: 30000,  rating: 4.5, sold: 43,  badge: null,         desc: "Mug keramik dengan tulisan 'Bikin Dosen Happy'. Hadiah perfect buat dosen pembimbing." },
];

const CATEGORIES = ["Semua", "Aksesoris", "Pakaian", "Stationery", "Sticker"];

export default async function MerchandisePage() {
  return (
    <div className="space-y-7 max-w-4xl">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Merchandise {BRAND.shortName}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Produk resmi Ruang Konsul Solo. Dukung kami sakin keren.</p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              i === 0
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {PRODUCTS.map((p) => (
          <Card key={p.id} className="overflow-hidden group flex flex-col">
            {/* Product image placeholder */}
            <div className="relative aspect-square bg-gradient-to-br from-brand-50 to-slate-100 flex items-center justify-center">
              <ShoppingBag className="h-12 w-12 text-slate-200 group-hover:scale-110 transition-transform" />
              {p.badge && (
                <div className="absolute top-3 left-3">
                  <Badge variant={p.badge === "Best Seller" ? "info" : "warning"}>{p.badge}</Badge>
                </div>
              )}
            </div>
            {/* Product info */}
            <div className="p-4 flex-1 flex flex-col">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{p.category}</p>
              <h3 className="text-sm font-bold text-slate-900 mb-1">{p.name}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{p.desc}</p>
              <div className="flex items-center gap-1 mb-2 text-xs">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-slate-700">{p.rating}</span>
                <span className="text-muted-foreground">· {p.sold} terjual</span>
              </div>
              <div className="flex items-end justify-between mt-auto">
                <span className="text-lg font-extrabold text-[#8B0000]">{formatRupiah(p.price)}</span>
                <Button size="sm" variant="outline" className="gap-1.5 px-3">
                  Beli
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
            <Truck className="h-5 w-5 text-[#8B0000]" />
          </div>
          <p className="text-xs font-semibold text-slate-700">Gratis Ongkir</p>
          <p className="text-[10px] text-muted-foreground">Min. belanja Rp 100rb</p>
        </div>
        <div className="flex flex-col items-center text-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
            <ShieldCheck className="h-5 w-5 text-[#8B0000]" />
          </div>
          <p className="text-xs font-semibold text-slate-700">Garansi Resmi</p>
          <p className="text-[10px] text-muted-foreground">Produk asli RK Solo</p>
        </div>
        <div className="flex flex-col items-center text-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
            <Star className="h-5 w-5 text-[#8B0000]" />
          </div>
          <p className="text-xs font-semibold text-slate-700">Rating 4.8</p>
          <p className="text-[10px] text-muted-foreground">Dari 200+ pembeli</p>
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">Punya ide produk?</p>
          <p className="text-xs text-muted-foreground mt-0.5">Kirim ide merchandise-mu ke tim kami!</p>
        </div>
        <Button asChild size="sm" variant="outline" className="gap-2 flex-shrink-0">
          <a href={`https://wa.me/${BRAND.whatsapp}?text=Halo,%20aku%20punya%20ide%20merchandise!`} target="_blank" rel="noopener noreferrer">
            Kirim Ide <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
