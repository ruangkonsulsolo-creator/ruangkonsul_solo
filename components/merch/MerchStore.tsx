"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag, Loader2, Package, Truck } from "lucide-react";
import { Toast, useToast } from "@/components/ui/toast";
import { useSnapCheckout } from "@/lib/payment/use-snap";
import { formatRupiah } from "@/lib/utils/format-currency";
import { merchShippingFee } from "@/lib/merch/config";
import { WhatsAppField, isValidWhatsApp } from "@/components/payment/WhatsAppField";
import { cn } from "@/lib/utils";

export interface MerchProduct {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price_idr: number;
  stock: number;
  image_url: string | null;
}

export function MerchStore({ products }: { products: MerchProduct[] }) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const { pay, busy } = useSnapCheckout();

  const categories = useMemo(
    () => ["Semua", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean) as string[]))],
    [products]
  );
  const [cat, setCat] = useState("Semua");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkout, setCheckout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ recipient_name: "", shipping_address: "", city: "", postal_code: "", notes: "" });
  const [whatsapp, setWhatsapp] = useState("");
  const [waError, setWaError] = useState<string | null>(null);

  const shipping = merchShippingFee();
  const lines = products.filter((p) => cart[p.id]).map((p) => ({ ...p, qty: cart[p.id] }));
  const subtotal = lines.reduce((s, l) => s + l.price_idr * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  function setQty(id: string, qty: number, max: number) {
    setCart((c) => {
      const next = { ...c };
      const q = Math.max(0, Math.min(qty, max, 20));
      if (q === 0) delete next[id];
      else next[id] = q;
      return next;
    });
  }

  async function submit() {
    if (!lines.length) return;
    if (!isValidWhatsApp(whatsapp)) {
      setWaError("Nomor WhatsApp wajib diisi dengan benar.");
      return;
    }
    if (!/^\d{5}$/.test(form.postal_code)) return showToast("Kode pos harus 5 digit.", "error");
    setSubmitting(true);
    try {
      const res = await fetch("/api/payment/merch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ product_id: l.id, quantity: l.qty })),
          whatsapp,
          ...form,
          notes: form.notes || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) return router.push("/login?next=/dashboard/merchandise");
      if (!res.ok || !json.data?.snap_token) {
        if (json.code === "WHATSAPP_REQUIRED") setWaError(json.error);
        showToast(json.error ?? "Gagal membuat pesanan.", "error");
        return;
      }
      setSubmitting(false);
      setCart({});
      setCheckout(false);
      const { status } = await pay(json.data.snap_token, json.data.payment_id);
      router.push(`/dashboard/merchandise?order=${json.data.merch_order_id}&${status === "paid" ? "paid=1" : "pending=1"}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const shown = products.filter((p) => cat === "Semua" || p.category === cat);
  const input = "w-full rounded-md border border-input px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium", cat === c ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => {
          const q = cart[p.id] ?? 0;
          const out = p.stock <= 0;
          return (
            <div key={p.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <div className="mb-3 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-50 to-slate-100">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-10 w-10 text-[#8B0000]/40" aria-hidden="true" />
                )}
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{p.category}</p>
              <p className="font-bold text-slate-900">{p.name}</p>
              <p className="mt-1 line-clamp-2 flex-1 text-xs text-muted-foreground">{p.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-slate-900">{formatRupiah(p.price_idr)}</p>
                  <p className={cn("text-[11px]", out ? "text-red-600" : "text-muted-foreground")}>{out ? "Stok habis" : `Stok ${p.stock}`}</p>
                </div>
                {q === 0 ? (
                  <button disabled={out} onClick={() => setQty(p.id, 1, p.stock)}
                    className="rounded-lg bg-[#8B0000] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
                    + Keranjang
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(p.id, q - 1, p.stock)} className="rounded-md border p-1" aria-label="Kurangi"><Minus className="h-3 w-3" /></button>
                    <span className="w-5 text-center text-sm font-bold">{q}</span>
                    <button onClick={() => setQty(p.id, q + 1, p.stock)} className="rounded-md border p-1" aria-label="Tambah"><Plus className="h-3 w-3" /></button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {count > 0 && !checkout && (
        <div className="sticky bottom-4 flex items-center justify-between rounded-2xl bg-slate-900 px-5 py-3 text-white shadow-lg">
          <span className="flex items-center gap-2 text-sm"><ShoppingBag className="h-4 w-4" /> {count} item · {formatRupiah(subtotal)}</span>
          <button onClick={() => setCheckout(true)} className="rounded-lg bg-white px-4 py-1.5 text-sm font-bold text-slate-900">Checkout</button>
        </div>
      )}

      {checkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900"><Truck className="h-4 w-4" /> Checkout Merchandise</h3>
              <button onClick={() => setCheckout(false)} className="text-sm text-slate-500">Tutup</button>
            </div>

            <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm">
              {lines.map((l) => (
                <div key={l.id} className="flex justify-between"><span>{l.qty}× {l.name}</span><span>{formatRupiah(l.price_idr * l.qty)}</span></div>
              ))}
              <div className="flex justify-between text-muted-foreground"><span>Ongkos kirim</span><span>{formatRupiah(shipping)}</span></div>
              <div className="flex justify-between border-t pt-1 font-extrabold"><span>Total</span><span>{formatRupiah(subtotal + shipping)}</span></div>
            </div>

            <div className="space-y-3">
              <input className={input} placeholder="Nama penerima *" value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} maxLength={100} />
              <WhatsAppField value={whatsapp} onChange={(v) => { setWhatsapp(v); setWaError(null); }} error={waError} />
              <textarea className={input} rows={3} placeholder="Alamat lengkap (jalan, RT/RW, kelurahan, kecamatan) *" value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })} maxLength={500} />
              <div className="grid grid-cols-2 gap-3">
                <input className={input} placeholder="Kota/Kabupaten *" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={100} />
                <input className={input} placeholder="Kode pos *" inputMode="numeric" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value.replace(/\D/g, "").slice(0, 5) })} />
              </div>
              <input className={input} placeholder="Catatan (ukuran, warna, dll.)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={300} />
            </div>

            <button onClick={submit} disabled={submitting || busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B0000] py-3 text-sm font-extrabold text-white disabled:opacity-60">
              {(submitting || busy) && <Loader2 className="h-4 w-4 animate-spin" />}
              Bayar {formatRupiah(subtotal + shipping)}
            </button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
