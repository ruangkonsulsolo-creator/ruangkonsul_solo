"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Toast, useToast } from "@/components/ui/toast";
import { Save, Loader2, Plus, Trash2, Star, ToggleLeft, ToggleRight } from "lucide-react";

interface Package {
  id: string;
  name: string;
  service_id: string;
  quota_amount: number;
  price_idr: number;
  validity_days: number;
  is_active: boolean;
  is_popular: boolean;
}

interface Service { id: string; name: string; slug: string; }

const emptyPackage: Omit<Package, "id"> = {
  name: "",
  service_id: "",
  quota_amount: 10,
  price_idr: 0,
  validity_days: 30,
  is_active: true,
  is_popular: false,
};

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export function PaketConfigForm({
  packages: initial,
  services,
}: {
  packages: Package[];
  services: Service[];
}) {
  const supabase = createClient();
  const { toast, showToast, hideToast } = useToast();
  const [packages, setPackages] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPkg, setNewPkg] = useState({ ...emptyPackage, service_id: services[0]?.id ?? "" });
  const [adding, setAdding] = useState(false);

  function updatePkg(id: string, field: keyof Package, value: unknown) {
    setPackages((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p));
  }

  async function handleSave(pkg: Package) {
    setSaving(pkg.id);
    const { error } = await supabase
      .from("quota_packages")
      .update({
        name: pkg.name,
        quota_amount: pkg.quota_amount,
        price_idr: pkg.price_idr,
        validity_days: pkg.validity_days,
        is_active: pkg.is_active,
        is_popular: pkg.is_popular,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pkg.id);

    if (error) showToast(`Gagal menyimpan paket.`, "error");
    else showToast(`${pkg.name} berhasil disimpan!`, "success");
    setSaving(null);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus paket "${name}"? Pengguna yang sudah beli tidak terpengaruh.`)) return;
    const { error } = await supabase.from("quota_packages").delete().eq("id", id);
    if (error) showToast("Gagal menghapus paket.", "error");
    else {
      setPackages((prev) => prev.filter((p) => p.id !== id));
      showToast(`Paket "${name}" dihapus.`, "success");
    }
  }

  async function handleAdd() {
    if (!newPkg.name || !newPkg.service_id || newPkg.price_idr <= 0) {
      showToast("Nama, layanan, dan harga wajib diisi.", "error");
      return;
    }
    setAdding(true);
    const { data, error } = await supabase
      .from("quota_packages")
      .insert(newPkg)
      .select()
      .single();

    if (error || !data) showToast("Gagal menambah paket.", "error");
    else {
      setPackages((prev) => [...prev, data]);
      setNewPkg({ ...emptyPackage, service_id: services[0]?.id ?? "" });
      setShowAddForm(false);
      showToast(`Paket "${data.name}" ditambahkan!`, "success");
    }
    setAdding(false);
  }

  // Group by service
  const byService: Record<string, Package[]> = {};
  for (const pkg of packages) {
    if (!byService[pkg.service_id]) byService[pkg.service_id] = [];
    byService[pkg.service_id].push(pkg);
  }

  return (
    <>
      <div className="space-y-8">
        {services.map((svc) => (
          <div key={svc.id}>
            <div className="flex items-center gap-2 mb-4">
              <span className="h-0.5 w-6 bg-brand rounded-full" />
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-brand">{svc.name}</h3>
            </div>

            <div className="space-y-3">
              {(byService[svc.id] ?? []).map((pkg) => (
                <div
                  key={pkg.id}
                  className={`rounded-2xl border bg-white shadow-card overflow-hidden ${!pkg.is_active ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Input
                        value={pkg.name}
                        onChange={(e) => updatePkg(pkg.id, "name", e.target.value)}
                        className="h-8 text-sm font-bold border-0 bg-transparent p-0 focus-visible:ring-0 w-40"
                      />
                      {pkg.is_popular && <Badge className="text-[10px] px-2 py-0.5"><Star className="h-2.5 w-2.5 mr-1" />Populer</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updatePkg(pkg.id, "is_popular", !pkg.is_popular)}
                        className={`rounded-lg p-1.5 transition-colors ${pkg.is_popular ? "text-brand bg-brand-50" : "text-slate-400 hover:text-brand"}`}
                        title="Toggle populer"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => updatePkg(pkg.id, "is_active", !pkg.is_active)}
                        className={`rounded-lg p-1.5 transition-colors ${pkg.is_active ? "text-brand" : "text-slate-400"}`}
                        title={pkg.is_active ? "Nonaktifkan" : "Aktifkan"}
                      >
                        {pkg.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(pkg.id, pkg.name)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                        title="Hapus paket"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Kuota (cek)</Label>
                      <Input type="number" value={pkg.quota_amount} min={1}
                        onChange={(e) => updatePkg(pkg.id, "quota_amount", parseInt(e.target.value) || 1)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Harga (Rp)</Label>
                      <Input type="number" value={pkg.price_idr} min={0}
                        onChange={(e) => updatePkg(pkg.id, "price_idr", parseInt(e.target.value) || 0)} />
                      <p className="text-[10px] text-muted-foreground">{fmt(pkg.price_idr)}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Masa Aktif (hari)</Label>
                      <Input type="number" value={pkg.validity_days} min={1}
                        onChange={(e) => updatePkg(pkg.id, "validity_days", parseInt(e.target.value) || 1)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Harga / Cek</Label>
                      <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-brand">
                        {pkg.quota_amount > 0 ? fmt(Math.round(pkg.price_idr / pkg.quota_amount)) : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-3 flex justify-end">
                    <Button size="sm" onClick={() => handleSave(pkg)} disabled={saving === pkg.id} className="gap-1.5">
                      {saving === pkg.id
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</>
                        : <><Save className="h-3.5 w-3.5" /> Simpan</>
                      }
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Tambah paket baru */}
        {showAddForm ? (
          <div className="rounded-2xl border-2 border-dashed border-brand bg-brand-50 p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-brand">Tambah Paket Baru</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nama Paket</Label>
                <Input value={newPkg.name} onChange={(e) => setNewPkg({ ...newPkg, name: e.target.value })} placeholder="Starter, Pro, dll" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Layanan</Label>
                <select
                  value={newPkg.service_id}
                  onChange={(e) => setNewPkg({ ...newPkg, service_id: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Kuota (cek)</Label>
                <Input type="number" value={newPkg.quota_amount} min={1}
                  onChange={(e) => setNewPkg({ ...newPkg, quota_amount: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Harga (Rp)</Label>
                <Input type="number" value={newPkg.price_idr} min={0}
                  onChange={(e) => setNewPkg({ ...newPkg, price_idr: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Masa Aktif (hari)</Label>
                <Input type="number" value={newPkg.validity_days} min={1}
                  onChange={(e) => setNewPkg({ ...newPkg, validity_days: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={adding} className="gap-1.5">
                {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Tambah Paket
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>Batal</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowAddForm(true)} className="gap-2 border-dashed">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tambah Paket Baru
          </Button>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
