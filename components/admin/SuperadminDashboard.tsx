"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Toast, useToast } from "@/components/ui/toast";
import {
  Settings, Package, Image as ImageIcon, GraduationCap,
  Save, Loader2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  Plus, Trash2, DollarSign, Tag, Zap,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────── */
interface Service {
  id: string; slug: string; name: string; description: string | null;
  price_idr: number; sla_hours: number; is_active: boolean;
}
interface QuotaPackage {
  id: string; name: string; service_id: string;
  quota_amount: number; price_idr: number; validity_days: number;
  is_active: boolean; is_popular: boolean;
  services: { name: string } | null;
}
interface Banner {
  id: string; title: string; image_url: string; link_url: string | null;
  sort_order: number; is_active: boolean;
}
interface Kelas {
  id: string; tab: string; title: string; harga: number;
  is_active: boolean; sort_order: number;
}

interface Props {
  services: Service[];
  packages: QuotaPackage[];
  banners: Banner[];
  kelas: Kelas[];
}

/* ── Section wrapper ─────────────────────────────────────────────── */
function Section({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-100 hover:bg-brand-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
            <Icon className="h-4 w-4 text-[#8B0000]" aria-hidden="true" />
          </div>
          <span className="text-sm font-extrabold text-slate-800">{title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export function SuperadminDashboard({ services: initialServices, packages: initialPackages, banners: initialBanners, kelas: initialKelas }: Props) {
  const supabase = createClient();
  const { toast, showToast, hideToast } = useToast();

  const [services, setServices] = useState(initialServices);
  const [packages, setPackages] = useState(initialPackages);
  const [banners, setBanners] = useState(initialBanners);
  const [kelas, setKelas] = useState(initialKelas);
  const [saving, setSaving] = useState<string | null>(null);

  /* ── Helper: save single row ── */
  async function saveRow(table: string, id: string, data: Record<string, unknown>, label: string) {
    setSaving(id);
    const { error } = await supabase.from(table).update({ ...data, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) showToast(`Gagal simpan ${label}.`, "error");
    else showToast(`${label} berhasil disimpan!`, "success");
    setSaving(null);
  }

  /* ── 1. Services (harga, SLA, toggle) ── */
  function updateService(id: string, field: keyof Service, value: unknown) {
    setServices(p => p.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  /* ── 2. Packages (harga, kuota, validitas) ── */
  function updatePackage(id: string, field: keyof QuotaPackage, value: unknown) {
    setPackages(p => p.map(pkg => pkg.id === id ? { ...pkg, [field]: value } : pkg));
  }

  /* ── 3. Banners ── */
  function updateBanner(id: string, field: keyof Banner, value: unknown) {
    setBanners(p => p.map(b => b.id === id ? { ...b, [field]: value } : b));
  }

  async function deleteBanner(id: string) {
    if (!confirm("Hapus banner ini?")) return;
    await supabase.from("banners").delete().eq("id", id);
    setBanners(p => p.filter(b => b.id !== id));
    showToast("Banner dihapus.", "success");
  }

  async function addBanner() {
    const { data } = await supabase.from("banners").insert({
      title: "Banner Baru", image_url: "", link_url: null,
      sort_order: banners.length, is_active: false,
    }).select().single();
    if (data) setBanners(p => [...p, data]);
  }

  /* ── 4. Kelas (harga, toggle, urutan) ── */
  function updateKelas(id: string, field: keyof Kelas, value: unknown) {
    setKelas(p => p.map(k => k.id === id ? { ...k, [field]: value } : k));
  }

  function fmt(n: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
  }

  return (
    <>
      <div className="space-y-5 max-w-4xl">

        {/* ── Harga Layanan ── */}
        <Section icon={DollarSign} title="Harga & Konfigurasi Layanan">
          <div className="space-y-3">
            {services.map(svc => (
              <div key={svc.id} className={`rounded-xl border p-4 ${!svc.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{svc.name}</p>
                    <p className="text-[11px] font-mono text-slate-400">{svc.slug}</p>
                  </div>
                  <button
                    onClick={() => updateService(svc.id, "is_active", !svc.is_active)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${svc.is_active ? "bg-brand-50 text-[#8B0000]" : "bg-slate-100 text-slate-400"}`}
                  >
                    {svc.is_active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                    {svc.is_active ? "Aktif" : "Nonaktif"}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Harga (Rp)</Label>
                    <Input type="number" value={svc.price_idr} min={0}
                      onChange={e => updateService(svc.id, "price_idr", +e.target.value)} />
                    <p className="text-[10px] text-slate-400 mt-0.5">{fmt(svc.price_idr)}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">SLA (jam)</Label>
                    <Input type="number" value={svc.sla_hours} min={1}
                      onChange={e => updateService(svc.id, "sla_hours", +e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button size="sm" onClick={() => saveRow("services", svc.id, { price_idr: svc.price_idr, sla_hours: svc.sla_hours, is_active: svc.is_active }, svc.name)} disabled={saving === svc.id} className="gap-1.5 w-full">
                      {saving === svc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Simpan
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Paket Hemat ── */}
        <Section icon={Package} title="Harga & Benefit Paket Hemat">
          <div className="space-y-3">
            {packages.map(pkg => (
              <div key={pkg.id} className={`rounded-xl border p-4 ${!pkg.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{pkg.name}</p>
                    <p className="text-[11px] text-slate-400">{(pkg.services as any)?.name} · {pkg.quota_amount}× · {pkg.validity_days} hari</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updatePackage(pkg.id, "is_popular", !pkg.is_popular)} className={`text-[10px] font-bold px-2 py-1 rounded-lg ${pkg.is_popular ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}>
                      {pkg.is_popular ? "⭐ Populer" : "Populer?"}
                    </button>
                    <button onClick={() => updatePackage(pkg.id, "is_active", !pkg.is_active)} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${pkg.is_active ? "bg-brand-50 text-[#8B0000]" : "bg-slate-100 text-slate-400"}`}>
                      {pkg.is_active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                      {pkg.is_active ? "Aktif" : "Nonaktif"}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Harga (Rp)</Label>
                    <Input type="number" value={pkg.price_idr} min={0}
                      onChange={e => updatePackage(pkg.id, "price_idr", +e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Kuota (×)</Label>
                    <Input type="number" value={pkg.quota_amount} min={1}
                      onChange={e => updatePackage(pkg.id, "quota_amount", +e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Masa Aktif (hari)</Label>
                    <Input type="number" value={pkg.validity_days} min={1}
                      onChange={e => updatePackage(pkg.id, "validity_days", +e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button size="sm" onClick={() => saveRow("quota_packages", pkg.id, { price_idr: pkg.price_idr, quota_amount: pkg.quota_amount, validity_days: pkg.validity_days, is_active: pkg.is_active, is_popular: pkg.is_popular }, pkg.name)} disabled={saving === pkg.id} className="gap-1.5 w-full">
                      {saving === pkg.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Simpan
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Banner Promo ── */}
        <Section icon={ImageIcon} title="Banner & Promo (Landing Page)">
          <div className="space-y-3">
            {banners.map(b => (
              <div key={b.id} className={`rounded-xl border p-4 ${!b.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Input value={b.title} onChange={e => updateBanner(b.id, "title", e.target.value)} className="h-8 text-sm font-bold border-0 bg-transparent p-0 focus-visible:ring-0 w-48" placeholder="Judul banner" />
                    <button onClick={() => updateBanner(b.id, "is_active", !b.is_active)} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${b.is_active ? "bg-brand-50 text-[#8B0000]" : "bg-slate-100 text-slate-400"}`}>
                      {b.is_active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                      {b.is_active ? "Aktif" : "Nonaktif"}
                    </button>
                  </div>
                  <button onClick={() => deleteBanner(b.id)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">URL Gambar</Label>
                    <Input value={b.image_url} onChange={e => updateBanner(b.id, "image_url", e.target.value)} placeholder="https://... atau /promo-xxx.jpeg" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Link Tujuan</Label>
                    <Input value={b.link_url ?? ""} onChange={e => updateBanner(b.id, "link_url", e.target.value || null)} placeholder="/bimbingan" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Urutan</Label>
                    <Input type="number" value={b.sort_order} min={0} onChange={e => updateBanner(b.id, "sort_order", +e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button size="sm" onClick={() => saveRow("banners", b.id, { title: b.title, image_url: b.image_url, link_url: b.link_url, sort_order: b.sort_order, is_active: b.is_active }, b.title)} disabled={saving === b.id} className="gap-1.5 w-full">
                      {saving === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Simpan
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addBanner} className="gap-2 border-dashed w-full">
              <Plus className="h-4 w-4" /> Tambah Banner
            </Button>
          </div>
        </Section>

        {/* ── Kelas Bimbingan (harga, urutan, toggle) ── */}
        <Section icon={GraduationCap} title="Harga & Urutan Kelas Bimbingan">
          <div className="space-y-3">
            {kelas.map(k => (
              <div key={k.id} className={`rounded-xl border p-4 ${!k.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{k.title}</p>
                    <Badge variant="secondary" className="text-[10px] capitalize mt-0.5">{k.tab}</Badge>
                  </div>
                  <button onClick={() => updateKelas(k.id, "is_active", !k.is_active)} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${k.is_active ? "bg-brand-50 text-[#8B0000]" : "bg-slate-100 text-slate-400"}`}>
                    {k.is_active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                    {k.is_active ? "Aktif" : "Nonaktif"}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Harga (Rp)</Label>
                    <Input type="number" value={k.harga} min={0} onChange={e => updateKelas(k.id, "harga", +e.target.value)} />
                    <p className="text-[10px] text-slate-400 mt-0.5">{k.harga === 0 ? "Gratis" : fmt(k.harga)}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Urutan</Label>
                    <Input type="number" value={k.sort_order} min={0} onChange={e => updateKelas(k.id, "sort_order", +e.target.value)} />
                  </div>
                  <div className="flex items-end sm:col-span-2">
                    <Button size="sm" onClick={() => saveRow("kelas_bimbingan", k.id, { harga: k.harga, sort_order: k.sort_order, is_active: k.is_active }, k.title)} disabled={saving === k.id} className="gap-1.5 w-full">
                      {saving === k.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Simpan
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
