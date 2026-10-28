"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Toast, useToast } from "@/components/ui/toast";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, X, Save, Image as ImageIcon, Star } from "lucide-react";

interface Kelas { id: string; tab: string; tag: string; title: string; subtitle: string | null; harga: number; is_active: boolean; sort_order: number; rating: number; review_count: number; image_url: string | null; }

const TAB_OPTIONS = [
  { value: "seminar", label: "Seminar Gratis" },
  { value: "skripsi", label: "Skripsi & Thesis" },
  { value: "lomba",   label: "Lomba" },
  { value: "data",    label: "Olah Data" },
];

const EMPTY_FORM = {
  tab: "seminar", tag: "GRATIS", tag_color: "bg-brand text-white",
  title: "", subtitle: "", description: "",
  harga: 0, harga_coret: 0,
  jadwal: "", durasi: "", peserta: "",
  fitur: "", cta_label: "Daftar Sekarang",
  wa_message: "Halo%2C saya ingin tahu lebih lanjut",
  require_login: false, badge: "", badge_color: "bg-brand text-white",
  is_active: true, sort_order: 0,
};

function fmt(n: number) {
  return n === 0 ? "Gratis" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export function KelasAdminTable({ kelas: initial }: { kelas: Kelas[] }) {
  const supabase = createClient();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [kelas, setKelas] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function openAdd() { setEditId(null); setForm({ ...EMPTY_FORM }); setImageFile(null); setImagePreview(null); setShowForm(true); }
  function openEdit(k: Kelas) { setEditId(k.id); setImagePreview(k.image_url); setImageFile(null); setShowForm(true); }

  async function handleToggle(k: Kelas) {
    setTogglingId(k.id);
    await supabase.from("kelas_bimbingan").update({ is_active: !k.is_active }).eq("id", k.id);
    setKelas((prev) => prev.map((x) => x.id === k.id ? { ...x, is_active: !x.is_active } : x));
    setTogglingId(null);
  }

  async function handleDelete(k: Kelas) {
    if (!confirm(`Hapus kelas "${k.title}"?`)) return;
    setDeletingId(k.id);
    await supabase.from("kelas_bimbingan").delete().eq("id", k.id);
    setKelas((prev) => prev.filter((x) => x.id !== k.id));
    setDeletingId(null);
    showToast("Kelas dihapus.", "success");
  }

  async function handleSave() {
    if (!form.title || !form.tab) { showToast("Judul dan tab wajib diisi.", "error"); return; }
    setSaving(true);
    let image_url = imagePreview;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `kelas/${Date.now()}.${ext}`;
      const { data: upData, error: upErr } = await supabase.storage.from("public-assets").upload(path, imageFile, { upsert: true });
      if (!upErr && upData) {
        const { data: pub } = supabase.storage.from("public-assets").getPublicUrl(path);
        image_url = pub.publicUrl;
      }
    }
    const payload = { tab: form.tab, tag: form.tag, tag_color: form.tag_color, title: form.title, subtitle: form.subtitle || null, description: form.description, image_url, harga: Number(form.harga), harga_coret: Number(form.harga_coret) || null, jadwal: form.jadwal, durasi: form.durasi, peserta: form.peserta, fitur: form.fitur.split("\n").map((s) => s.trim()).filter(Boolean), cta_label: form.cta_label, wa_message: form.wa_message, require_login: form.require_login, badge: form.badge || null, badge_color: form.badge_color, is_active: form.is_active, sort_order: Number(form.sort_order) };
    if (editId) {
      const { error } = await supabase.from("kelas_bimbingan").update(payload).eq("id", editId);
      if (error) showToast("Gagal update kelas.", "error");
      else { showToast("Kelas berhasil diupdate!", "success"); router.refresh(); setShowForm(false); }
    } else {
      const { data, error } = await supabase.from("kelas_bimbingan").insert(payload).select().single();
      if (error || !data) showToast("Gagal tambah kelas.", "error");
      else { setKelas((prev) => [...prev, data]); showToast("Kelas berhasil ditambahkan!", "success"); setShowForm(false); }
    }
    setSaving(false);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> Tambah Kelas</Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl mt-8 mb-8">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-extrabold text-slate-900">{editId ? "Edit Kelas" : "Tambah Kelas Baru"}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Tab Kategori *</Label>
                  <select value={form.tab} onChange={(e) => setForm({ ...form, tab: e.target.value })} className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-brand focus:outline-none">
                    {TAB_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Tag</Label>
                  <Input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="GRATIS" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Judul Kelas *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul kelas..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Subtitle</Label>
                <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Subtitle singkat..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Deskripsi</Label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:outline-none resize-none" placeholder="Deskripsi kelas..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Foto / Cover Kelas</Label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:border-brand hover:text-brand transition-colors">
                    <ImageIcon className="h-4 w-4" />
                    {imageFile ? imageFile.name : "Pilih Gambar"}
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }} />
                  </label>
                  {imagePreview && <img src={imagePreview} alt="preview" className="h-16 w-24 rounded-lg object-cover border border-slate-200" />}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Harga (Rp) — 0 = Gratis</Label>
                  <Input type="number" value={form.harga} onChange={(e) => setForm({ ...form, harga: +e.target.value })} min={0} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Harga Coret (Rp)</Label>
                  <Input type="number" value={form.harga_coret} onChange={(e) => setForm({ ...form, harga_coret: +e.target.value })} min={0} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Jadwal</Label>
                  <Input value={form.jadwal} onChange={(e) => setForm({ ...form, jadwal: e.target.value })} placeholder="Senin–Jumat" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Durasi</Label>
                  <Input value={form.durasi} onChange={(e) => setForm({ ...form, durasi: e.target.value })} placeholder="1–3 bulan" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Peserta</Label>
                  <Input value={form.peserta} onChange={(e) => setForm({ ...form, peserta: e.target.value })} placeholder="Individu" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Fitur (satu per baris)</Label>
                <textarea value={form.fitur} onChange={(e) => setForm({ ...form, fitur: e.target.value })} rows={5} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:outline-none resize-none font-mono" placeholder={"Fitur 1\nFitur 2\nFitur 3"} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Label Tombol CTA</Label>
                  <Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Badge (opsional)</Label>
                  <Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Best Seller" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Urutan Tampil</Label>
                  <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} min={0} />
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-slate-300 text-brand focus:ring-brand" />
                    <span className="text-sm font-medium text-slate-700">Tampilkan Kelas</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
              <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Menyimpan..." : "Simpan Kelas"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Daftar kelas bimbingan">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Kelas</th><th className="px-4 py-3">Tab</th><th className="px-4 py-3">Harga</th><th className="px-4 py-3">Rating</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Urutan</th><th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kelas.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Belum ada kelas. Klik "Tambah Kelas" untuk mulai.</td></tr>
              ) : kelas.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {k.image_url ? <img src={k.image_url} alt="" className="h-10 w-14 rounded-lg object-cover border border-slate-100 flex-shrink-0" /> : <div className="h-10 w-14 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0"><ImageIcon className="h-4 w-4 text-brand-200" /></div>}
                      <div><p className="font-semibold text-slate-900 max-w-[200px] truncate">{k.title}</p><p className="text-xs text-muted-foreground">{k.subtitle ?? ""}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px] capitalize">{k.tab}</Badge></td>
                  <td className="px-4 py-3 font-medium text-brand">{fmt(k.harga)}</td>
                  <td className="px-4 py-3 text-xs">⭐ {k.rating} ({k.review_count})</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(k)} disabled={togglingId === k.id} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold transition-colors ${k.is_active ? "bg-brand-50 text-brand hover:bg-brand-100" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                      {togglingId === k.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : k.is_active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                      {k.is_active ? "Aktif" : "Nonaktif"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-center">{k.sort_order}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(k)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-brand transition-colors" title="Edit kelas"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(k)} disabled={deletingId === k.id} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors" title="Hapus kelas">
                        {deletingId === k.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
