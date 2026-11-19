"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save } from "lucide-react";
import { Toast, useToast } from "@/components/ui/toast";

interface Product {
  id: string; name: string; category: string | null; description: string | null;
  price_idr: number; stock: number; is_active: boolean; image_url: string | null;
}

async function call(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, error: json.error as string | undefined };
}

/** Tabel produk: ubah harga/stok/aktif langsung, plus tambah produk baru. */
export function MerchProductTable({ products }: { products: Product[] }) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [edits, setEdits] = useState<Record<string, Partial<Product>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", category: "", price_idr: "", stock: "", image_url: "", description: "" });

  async function save(p: Product) {
    const e = edits[p.id];
    if (!e) return;
    setBusy(p.id);
    const r = await call(`/api/admin/merch/products/${p.id}`, "PATCH", e);
    setBusy(null);
    if (!r.ok) return showToast(r.error ?? "Gagal menyimpan.", "error");
    setEdits(({ [p.id]: _, ...rest }) => rest);
    showToast("Produk diperbarui.", "success");
    router.refresh();
  }

  async function add() {
    setBusy("new");
    const r = await call("/api/admin/merch/products", "POST", {
      name: draft.name, category: draft.category || null, description: draft.description || null,
      price_idr: Number(draft.price_idr), stock: Number(draft.stock || 0), image_url: draft.image_url || null,
    });
    setBusy(null);
    if (!r.ok) return showToast(r.error ?? "Gagal menambah produk.", "error");
    setDraft({ name: "", category: "", price_idr: "", stock: "", image_url: "", description: "" });
    showToast("Produk ditambahkan.", "success");
    router.refresh();
  }

  const cell = "rounded border border-slate-200 px-2 py-1 text-xs";
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase text-muted-foreground">
              <th className="px-3 py-2">Produk</th><th className="px-3 py-2">Harga</th><th className="px-3 py-2">Stok</th><th className="px-3 py-2">Aktif</th><th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((p) => {
              const e = edits[p.id] ?? {};
              const set = (k: keyof Product, v: unknown) => setEdits((s) => ({ ...s, [p.id]: { ...s[p.id], [k]: v } }));
              return (
                <tr key={p.id}>
                  <td className="px-3 py-2"><p className="font-semibold">{p.name}</p><p className="text-[11px] text-muted-foreground">{p.category}</p></td>
                  <td className="px-3 py-2"><input className={`${cell} w-28`} type="number" defaultValue={p.price_idr} onChange={(ev) => set("price_idr", Number(ev.target.value))} /></td>
                  <td className="px-3 py-2"><input className={`${cell} w-20`} type="number" defaultValue={p.stock} onChange={(ev) => set("stock", Number(ev.target.value))} /></td>
                  <td className="px-3 py-2"><input type="checkbox" defaultChecked={p.is_active} onChange={(ev) => set("is_active", ev.target.checked)} /></td>
                  <td className="px-3 py-2">
                    <button disabled={!edits[p.id] || busy === p.id} onClick={() => save(p)} className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-30">
                      {busy === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Simpan
                    </button>
                    {Object.keys(e).length > 0 && <span className="ml-2 text-[10px] text-amber-600">belum disimpan</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border bg-white p-4 md:grid-cols-6">
        <input className={cell} placeholder="Nama produk" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <input className={cell} placeholder="Kategori" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
        <input className={cell} placeholder="Harga" type="number" value={draft.price_idr} onChange={(e) => setDraft({ ...draft, price_idr: e.target.value })} />
        <input className={cell} placeholder="Stok" type="number" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
        <input className={cell} placeholder="URL gambar (https)" value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} />
        <button onClick={add} disabled={busy === "new" || !draft.name || !draft.price_idr} className="inline-flex items-center justify-center gap-1 rounded-md bg-[#8B0000] px-2 py-1 text-xs font-semibold text-white disabled:opacity-40">
          {busy === "new" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Tambah
        </button>
        <input className={`${cell} col-span-2 md:col-span-6`} placeholder="Deskripsi" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}

/** Aksi pesanan: input kurir + resi, selesai, batal. */
export function MerchOrderActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [courier, setCourier] = useState("JNE");
  const [resi, setResi] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    const r = await call(`/api/admin/merch/orders/${id}`, "PATCH", body);
    setBusy(false);
    if (!r.ok) return showToast(r.error ?? "Gagal.", "error");
    showToast(ok, "success");
    router.refresh();
  }

  const cell = "rounded border border-slate-200 px-2 py-1 text-xs";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(status === "dibayar" || status === "dikirim") && (
        <>
          <select className={cell} value={courier} onChange={(e) => setCourier(e.target.value)}>
            {["JNE", "J&T", "SiCepat", "AnterAja", "POS", "Ninja", "GoSend", "GrabExpress"].map((c) => <option key={c}>{c}</option>)}
          </select>
          <input className={`${cell} w-32`} placeholder="No. resi" value={resi} onChange={(e) => setResi(e.target.value)} />
          <button disabled={busy || resi.length < 4} onClick={() => act({ action: "ship", courier, tracking_number: resi }, "Resi disimpan & customer dinotifikasi.")}
            className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-30">Kirim</button>
        </>
      )}
      {status === "dikirim" && (
        <button disabled={busy} onClick={() => act({ action: "complete" }, "Pesanan selesai.")} className="rounded-md bg-green-600 px-2 py-1 text-xs text-white">Selesai</button>
      )}
      {status === "dibayar" && (
        <button disabled={busy} onClick={() => { const reason = prompt("Alasan pembatalan (refund manual):"); if (reason) act({ action: "cancel", reason }, "Pesanan dibatalkan."); }}
          className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600">Batalkan</button>
      )}
      {busy && <Loader2 className="h-3 w-3 animate-spin" />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}

