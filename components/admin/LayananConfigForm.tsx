"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toast, useToast } from "@/components/ui/toast";
import { Save, Loader2, ToggleLeft, ToggleRight } from "lucide-react";

interface Service {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_idr: number;
  sla_hours: number;
  max_file_size_mb: number;
  is_active: boolean;
}

export function LayananConfigForm({ services: initial }: { services: Service[] }) {
  const supabase = createClient();
  const { toast, showToast, hideToast } = useToast();
  const [services, setServices] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);

  function update(id: string, field: keyof Service, value: unknown) {
    setServices((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s));
  }

  async function handleSave(service: Service) {
    setSaving(service.id);
    const { error } = await supabase
      .from("services")
      .update({
        price_idr: service.price_idr,
        sla_hours: service.sla_hours,
        max_file_size_mb: service.max_file_size_mb,
        description: service.description,
        is_active: service.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", service.id);

    if (error) {
      showToast(`Gagal menyimpan ${service.name}.`, "error");
    } else {
      showToast(`${service.name} berhasil disimpan!`, "success");
    }
    setSaving(null);
  }

  return (
    <>
      <div className="space-y-4">
        {services.map((service) => (
          <div
            key={service.id}
            className={`rounded-2xl border bg-white shadow-card overflow-hidden ${
              !service.is_active ? "opacity-60" : ""
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-900">{service.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{service.slug}</p>
              </div>
              <button
                onClick={() => update(service.id, "is_active", !service.is_active)}
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                  service.is_active
                    ? "bg-brand-50 text-brand border border-brand-200"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}
                aria-label={service.is_active ? "Nonaktifkan layanan" : "Aktifkan layanan"}
              >
                {service.is_active
                  ? <><ToggleRight className="h-4 w-4" /> Aktif</>
                  : <><ToggleLeft className="h-4 w-4" /> Nonaktif</>
                }
              </button>
            </div>

            {/* Form fields */}
            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Harga (Rp)</Label>
                <Input
                  type="number"
                  value={service.price_idr}
                  onChange={(e) => update(service.id, "price_idr", parseInt(e.target.value) || 0)}
                  min={0}
                />
                <p className="text-[10px] text-muted-foreground">
                  = {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(service.price_idr)}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Estimasi Selesai (jam)</Label>
                <Input
                  type="number"
                  value={service.sla_hours}
                  onChange={(e) => update(service.id, "sla_hours", parseInt(e.target.value) || 1)}
                  min={1}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Maks. Ukuran File (MB)</Label>
                <Input
                  type="number"
                  value={service.max_file_size_mb}
                  onChange={(e) => update(service.id, "max_file_size_mb", parseInt(e.target.value) || 1)}
                  min={1}
                  max={100}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <Label className="text-xs font-semibold text-slate-600">Deskripsi</Label>
                <Input
                  value={service.description ?? ""}
                  onChange={(e) => update(service.id, "description", e.target.value)}
                  placeholder="Deskripsi singkat layanan..."
                />
              </div>
            </div>

            <div className="px-5 pb-4 flex justify-end">
              <Button
                size="sm"
                onClick={() => handleSave(service)}
                disabled={saving === service.id}
                className="gap-2"
              >
                {saving === service.id
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</>
                  : <><Save className="h-3.5 w-3.5" /> Simpan</>
                }
              </Button>
            </div>
          </div>
        ))}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
