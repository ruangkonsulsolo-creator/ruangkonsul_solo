"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toast, useToast } from "@/components/ui/toast";
import {
  User, Phone, Mail, Copy, CheckCircle2, Gift, Loader2,
} from "lucide-react";

interface ProfilFormProps {
  userId: string;
  email: string;
  initialData: {
    full_name: string;
    whatsapp: string;
    referral_code: string;
    credit_balance: number;
  };
  referralCount: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(n);
}

export function ProfilForm({ userId, email, initialData, referralCount }: ProfilFormProps) {
  const supabase = createClient();
  const { toast, showToast, hideToast } = useToast();

  const [fullName, setFullName] = useState(initialData.full_name);
  const [whatsapp, setWhatsapp] = useState(initialData.whatsapp);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  async function handleSaveProfil(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, whatsapp })
      .eq("id", userId);

    if (error) {
      showToast("Gagal menyimpan profil.", "error");
    } else {
      showToast("Profil berhasil disimpan!", "success");
    }
    setSaving(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast("Password minimal 8 karakter.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Konfirmasi password tidak cocok.", "error");
      return;
    }
    setChangingPw(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      showToast("Gagal mengubah password.", "error");
    } else {
      showToast("Password berhasil diubah!", "success");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPw(false);
  }

  function handleCopyReferral() {
    const url = `${window.location.origin}/daftar?ref=${initialData.referral_code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <div className="space-y-5">

        {/* Info profil */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Informasi Akun</p>
          </div>
          <form onSubmit={handleSaveProfil} className="p-5 space-y-4">
            {/* Email — readonly */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                <Input id="email" value={email} disabled className="pl-9 bg-slate-50 text-slate-500" />
              </div>
              <p className="text-xs text-muted-foreground">Email tidak dapat diubah.</p>
            </div>

            {/* Nama lengkap */}
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-sm font-semibold text-slate-700">Nama Lengkap</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                <Input
                  id="fullName" value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama lengkap kamu"
                  className="pl-9"
                  disabled={saving}
                />
              </div>
            </div>

            {/* WhatsApp */}
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp" className="text-sm font-semibold text-slate-700">
                Nomor WhatsApp
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                <Input
                  id="whatsapp" value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="628xxxxxxxxxx"
                  className="pl-9"
                  disabled={saving}
                />
              </div>
              <p className="text-xs text-muted-foreground">Format: 628xxx (tanpa + atau 0 di depan). Digunakan untuk notifikasi laporan.</p>
            </div>

            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</> : <><CheckCircle2 className="h-4 w-4" /> Simpan Profil</>}
            </Button>
          </form>
        </div>

        {/* Referral */}
        <div className="rounded-2xl border border-brand-200 bg-brand-50 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-brand-100">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">Program Referral</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand flex-shrink-0">
                <Gift className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Ajak teman, kamu dapat komisi 10%!</p>
                <p className="text-xs text-muted-foreground mt-0.5">Setiap teman yang mendaftar dan melakukan pembelian pertama via link kamu.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white border border-brand-100 p-3 text-center">
                <p className="text-2xl font-extrabold text-brand">{referralCount}</p>
                <p className="text-xs text-muted-foreground">Teman didaftarkan</p>
              </div>
              <div className="rounded-xl bg-white border border-brand-100 p-3 text-center">
                <p className="text-2xl font-extrabold text-brand">{fmt(initialData.credit_balance)}</p>
                <p className="text-xs text-muted-foreground">Kredit tersedia</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Kode Referral Kamu</Label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center rounded-xl border border-brand-200 bg-white px-3 py-2">
                  <span className="font-mono text-sm font-bold text-brand flex-1">{initialData.referral_code}</span>
                </div>
                <button
                  onClick={handleCopyReferral}
                  className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-light transition-colors"
                  aria-label="Salin link referral"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Disalin!" : "Salin Link"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Ganti password */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Keamanan Akun</p>
          </div>
          <form onSubmit={handleChangePassword} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newPw" className="text-sm font-semibold text-slate-700">Password Baru</Label>
              <Input
                id="newPw" type="password" placeholder="Minimal 8 karakter"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                disabled={changingPw}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPw" className="text-sm font-semibold text-slate-700">Konfirmasi Password</Label>
              <Input
                id="confirmPw" type="password" placeholder="Ulangi password baru"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={changingPw}
              />
            </div>
            <Button type="submit" variant="outline" disabled={changingPw || !newPassword} className="gap-2">
              {changingPw ? <><Loader2 className="h-4 w-4 animate-spin" /> Mengubah...</> : "Ubah Password"}
            </Button>
          </form>
        </div>

      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
