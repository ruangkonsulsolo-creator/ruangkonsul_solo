"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toast, useToast } from "@/components/ui/toast";
import { Eye, EyeOff, Mail, Lock, User, MessageCircle, BadgeCheck, KeyRound } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { normalizeWhatsApp } from "@/lib/validators/whatsapp";

interface Props {
  email: string;
  namaAwal: string;
  waAwal: string;
  avatar: string | null;
  next: string;
  modeAwal: "customer" | "mentor";
}

type Field = "full_name" | "password" | "password_confirm" | "whatsapp" | "kode_mentor";
const POLA_KODE = /^MTR-[A-Z0-9]{6}$/;

export function FormLengkapiProfil({ email, namaAwal, waAwal, avatar, next, modeAwal }: Props) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();

  const [nama, setNama] = useState(namaAwal);
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [wa, setWa] = useState(waAwal);
  const [lihat, setLihat] = useState(false);
  const [sebagai, setSebagai] = useState<"customer" | "mentor">(modeAwal);
  const [kode, setKode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  function validasi(): boolean {
    const e: Partial<Record<Field, string>> = {};
    if (nama.trim().length < 3) e.full_name = "Nama minimal 3 karakter.";
    if (password.length < 8) e.password = "Password minimal 8 karakter.";
    if (konfirmasi !== password) e.password_confirm = "Konfirmasi password tidak sama.";
    if (!normalizeWhatsApp(wa)) e.whatsapp = "Format nomor tidak valid (contoh: 0812xxxxxxxx).";
    if (sebagai === "mentor" && !POLA_KODE.test(kode.trim().toUpperCase())) e.kode_mentor = "Kode mentor tidak valid (format: MTR-XXXXXX).";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function kirim(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validasi()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/lengkapi-profil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: nama,
          password,
          password_confirm: konfirmasi,
          whatsapp: wa,
          sebagai,
          kode_mentor: sebagai === "mentor" ? kode.trim().toUpperCase() : undefined,
          next,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (j.field) setErrors({ [j.field as Field]: j.error });
        showToast(j.error ?? "Gagal menyimpan. Coba lagi.", "error");
        if (res.status === 401) router.replace("/login");
        return;
      }
      router.replace(j.redirect ?? "/dashboard");
      router.refresh();
    } catch {
      showToast("Koneksi bermasalah. Coba lagi.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function keluar() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const err = (f: Field) =>
    errors[f] ? <p className="text-xs text-red-600">{errors[f]}</p> : null;

  return (
    <>
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-slate-900">Lengkapi pendaftaran</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Akun Google kamu sudah terhubung. Isi data di bawah untuk menyelesaikan pendaftaran.
          </p>
        </div>

        <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-9 w-9 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <BadgeCheck className="h-6 w-6 text-green-600" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="text-xs text-green-700">Terhubung dengan Google</p>
            <p className="truncate text-sm font-semibold text-slate-800">{email}</p>
          </div>
        </div>

        <div role="tablist" aria-label="Daftar sebagai" className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          {(["customer", "mentor"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={sebagai === k}
              onClick={() => { setSebagai(k); setErrors({}); }}
              className={`rounded-lg px-3 py-2 transition-colors ${sebagai === k ? "bg-white text-[#8B0000] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {k === "customer" ? "Customer" : "Mentor"}
            </button>
          ))}
        </div>

        <form onSubmit={kirim} className="space-y-4" noValidate>
          {sebagai === "mentor" && (
            <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <Label htmlFor="kode" className="text-sm font-semibold text-slate-700">
                Kode Mentor <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-600" aria-hidden="true" />
                <Input id="kode" value={kode} onChange={(e) => setKode(e.target.value.toUpperCase())}
                  placeholder="MTR-XXXXXX" className="pl-9 bg-white font-mono tracking-wider uppercase"
                  autoComplete="off" maxLength={10} disabled={loading} aria-invalid={!!errors.kode_mentor} />
              </div>
              {err("kode_mentor") ?? (
                <p className="text-[11px] text-slate-600">
                  Kode sekali pakai dari admin. Belum punya?{" "}
                  <a href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent("Halo admin, saya ingin meminta kode pendaftaran mentor Ruang Konsul Solo.")}`}
                    target="_blank" rel="noopener noreferrer" className="font-semibold text-[#8B0000] hover:underline">
                    Minta ke admin
                  </a>
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
              <Input id="email" type="email" value={email} readOnly disabled className="pl-9 bg-slate-50" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nama" className="text-sm font-semibold text-slate-700">
              Nama Lengkap <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
              <Input id="nama" value={nama} onChange={(e) => setNama(e.target.value)}
                placeholder="Budi Santoso" className="pl-9" autoComplete="name" disabled={loading}
                aria-invalid={!!errors.full_name} />
            </div>
            {err("full_name")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wa" className="text-sm font-semibold text-slate-700">
              Nomor WhatsApp <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" aria-hidden="true" />
              <Input id="wa" type="tel" inputMode="tel" value={wa} onChange={(e) => setWa(e.target.value)}
                placeholder="0812xxxxxxxx" className="pl-9" autoComplete="tel" disabled={loading}
                aria-invalid={!!errors.whatsapp} />
            </div>
            {err("whatsapp") ?? (
              <p className="text-[11px] text-muted-foreground">Untuk notifikasi pesanan, jadwal & receipt.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
              Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
              <Input id="password" type={lihat ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter"
                className="pl-9 pr-10" autoComplete="new-password" disabled={loading}
                aria-invalid={!!errors.password} />
              <button type="button" onClick={() => setLihat(!lihat)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={lihat ? "Sembunyikan password" : "Tampilkan password"}>
                {lihat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {err("password") ?? (
              <p className="text-[11px] text-muted-foreground">Agar kamu juga bisa masuk dengan email + password.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="konfirmasi" className="text-sm font-semibold text-slate-700">
              Konfirmasi Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
              <Input id="konfirmasi" type={lihat ? "text" : "password"} value={konfirmasi}
                onChange={(e) => setKonfirmasi(e.target.value)} placeholder="Ulangi password"
                className="pl-9" autoComplete="new-password" disabled={loading}
                aria-invalid={!!errors.password_confirm} />
            </div>
            {err("password_confirm")}
          </div>

          <Button type="submit" className="w-full mt-2" size="lg" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Menyimpan...
              </span>
            ) : sebagai === "mentor" ? "Daftar sebagai Mentor" : "Selesaikan Pendaftaran"}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Bukan akun ini?{" "}
          <button type="button" onClick={keluar} className="font-semibold text-[#8B0000] hover:underline">
            Keluar & pakai akun lain
          </button>
        </p>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
