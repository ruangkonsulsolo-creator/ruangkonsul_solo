"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Toast, useToast } from "@/components/ui/toast";
import { Plus, Pencil, Trash2, Eye, EyeOff, X, Save, Loader2, ExternalLink } from "lucide-react";
import { BRAND } from "@/lib/brand";

interface Post { id: string; slug: string; title: string; category: string; is_published: boolean; published_at: string | null; created_at: string; read_time: string; }

const CATEGORIES = ["Panduan Akademik", "Panduan Layanan", "Tips Skripsi", "Teknologi", "Berita"];

const EMPTY_FORM = {
  slug: "", title: "", excerpt: "", content: "", cover_url: "",
  category: "Tips Skripsi", read_time: "5 menit",
  author: `Tim ${BRAND.shortName}`, is_published: false,
};

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

export function BlogAdminTable({ posts: initial }: { posts: Post[] }) {
  const supabase = createClient();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [posts, setPosts] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openAdd() { setEditId(null); setForm({ ...EMPTY_FORM }); setShowForm(true); }

  async function openEdit(id: string) {
    const { data } = await supabase.from("blog_posts").select("*").eq("id", id).single();
    if (data) { setForm({ slug: data.slug, title: data.title, excerpt: data.excerpt ?? "", content: data.content, cover_url: data.cover_url ?? "", category: data.category, read_time: data.read_time, author: data.author, is_published: data.is_published }); setEditId(id); setShowForm(true); }
  }

  async function handleTogglePublish(p: Post) {
    setTogglingId(p.id);
    const newState = !p.is_published;
    await supabase.from("blog_posts").update({ is_published: newState, published_at: newState ? new Date().toISOString() : null }).eq("id", p.id);
    setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_published: newState, published_at: newState ? new Date().toISOString() : null } : x));
    showToast(newState ? "Artikel dipublish!" : "Artikel disembunyikan.", "success");
    setTogglingId(null);
  }

  async function handleDelete(p: Post) {
    if (!confirm(`Hapus artikel "${p.title}"?`)) return;
    setDeletingId(p.id);
    await supabase.from("blog_posts").delete().eq("id", p.id);
    setPosts((prev) => prev.filter((x) => x.id !== p.id));
    showToast("Artikel dihapus.", "success");
    setDeletingId(null);
  }

  async function handleSave() {
    if (!form.title || !form.content) { showToast("Judul dan konten wajib diisi.", "error"); return; }
    const slug = form.slug || slugify(form.title);
    setSaving(true);
    const payload = { ...form, slug, published_at: form.is_published ? new Date().toISOString() : null };
    if (editId) {
      const { error } = await supabase.from("blog_posts").update(payload).eq("id", editId);
      if (error) showToast("Gagal update artikel.", "error");
      else { showToast("Artikel berhasil diupdate!", "success"); router.refresh(); setShowForm(false); }
    } else {
      const { data, error } = await supabase.from("blog_posts").insert(payload).select().single();
      if (error || !data) showToast("Gagal tambah artikel.", "error");
      else { setPosts((prev) => [data, ...prev]); showToast("Artikel berhasil ditambahkan!", "success"); setShowForm(false); }
    }
    setSaving(false);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> Tulis Artikel</Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl mt-6 mb-8">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-extrabold text-slate-900">{editId ? "Edit Artikel" : "Tulis Artikel Baru"}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Judul Artikel *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: slugify(e.target.value) })} placeholder="Judul artikel..." className="text-lg font-semibold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Slug URL</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="judul-artikel-seo-friendly" className="font-mono text-sm" />
                <p className="text-[10px] text-muted-foreground">{BRAND.domain}/blog/{form.slug || "..."}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Ringkasan</Label>
                <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:outline-none resize-none" placeholder="Ringkasan singkat..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Kategori</Label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-brand focus:outline-none">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Estimasi Baca</Label>
                  <Input value={form.read_time} onChange={(e) => setForm({ ...form, read_time: e.target.value })} placeholder="5 menit" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">URL Gambar Cover</Label>
                <Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="https://... atau /promo-bimbingan.jpeg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Konten Artikel (Markdown) *</Label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={18} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:outline-none resize-y font-mono leading-relaxed" placeholder={"## Judul Section\n\nTulis konten dengan Markdown."} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="rounded border-slate-300 text-brand focus:ring-brand h-4 w-4" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Publish artikel</p>
                  <p className="text-xs text-muted-foreground">Artikel akan tampil di halaman blog publik</p>
                </div>
              </label>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
              <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Menyimpan..." : "Simpan Artikel"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Daftar artikel blog">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Judul</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Baca</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {posts.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Belum ada artikel. Klik "Tulis Artikel" untuk mulai.</td></tr>
              ) : posts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 max-w-[280px]">
                    <p className="font-semibold text-slate-900 truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">/blog/{p.slug}</p>
                  </td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{p.category}</Badge></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.read_time}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleTogglePublish(p)} disabled={togglingId === p.id} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${p.is_published ? "bg-brand-50 text-brand hover:bg-brand-100" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                      {togglingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : p.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {p.is_published ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(p.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {p.is_published && (
                        <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-brand transition-colors" title="Lihat artikel">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button onClick={() => openEdit(p.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-brand transition-colors" title="Edit artikel">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(p)} disabled={deletingId === p.id} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors" title="Hapus artikel">
                        {deletingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
