"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Loader2, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toast, useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

interface Props {
  initial: { bio: string; specializations: string[]; price_per_hour: number; is_available: boolean };
  options: string[];
}

/** Form edit profil mentor (bio, spesialisasi, tarif, ketersediaan). Tulis via RLS "Mentor update profil sendiri". */
export function MentorProfileEditor({ initial, options }: Props) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState(initial.bio);
  const [specs, setSpecs] = useState<string[]>(initial.specializations);
  const [price, setPrice] = useState(String(initial.price_per_hour || ""));
  const [available, setAvailable] = useState(initial.is_available);

  async function save() {
    const priceNum = Number(price.replace(/\D/g, ""));
    if (!priceNum || priceNum < 10000) return showToast("Tarif per jam minimal Rp10.000.", "error");
    if (priceNum > 10_000_000) return showToast("Tarif per jam terlalu besar.", "error");

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return showToast("Sesi habis, silakan login ulang.", "error"); }

    const { error } = await supabase
      .from("mentor_profiles")
      .upsert(
        { user_id: user.id, bio: bio.trim() || null, specializations: specs, price_per_hour: priceNum, is_available: available },
        { onConflict: "user_id" }
      );
    setSaving(false);
    if (error) return showToast(`Gagal menyimpan: ${error.message}`, "error");
    showToast("Profil mentor disimpan.", "success");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <Edit3 className="h-3.5 w-3.5" />
        Edit Profil
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Edit Profil Mentor</h3>
              <button onClick={() => setOpen(false)} aria-label="Tutup"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Bio</Label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={1000}
                className="w-full rounded-md border border-input px-3 py-2 text-sm" placeholder="Ceritakan pengalaman & keahlianmu" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Spesialisasi</Label>
              <div className="flex flex-wrap gap-2">
                {options.map((o) => {
                  const on = specs.includes(o);
                  return (
                    <button key={o} type="button"
                      onClick={() => setSpecs((s) => (on ? s.filter((x) => x !== o) : [...s, o]))}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${on ? "border-[#8B0000] bg-brand-50 text-[#8B0000]" : "border-slate-200 text-slate-500"}`}>
                      {on && <CheckCircle2 className="inline h-3 w-3 mr-1" />}{o}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tarif per jam (Rp) *</Label>
              <Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} placeholder="150000" />
              <p className="text-[11px] text-muted-foreground">Harga sesi = tarif × durasi slot. Wajib diisi agar klien bisa booking & bayar.</p>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
              Tersedia menerima booking
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button onClick={save} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Simpan
              </Button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
