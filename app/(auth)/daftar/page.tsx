"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toast, useToast } from "@/components/ui/toast";
import { Eye, EyeOff, Mail, Lock, User, CheckCircle2 } from "lucide-react";
import { BRAND } from "@/lib/brand";

export default function DaftarPage() {
  const supabase = createClient();
  const { toast, showToast, hideToast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ["", "Lemah", "Sedang", "Kuat"];
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-green-500"];

  async function handleDaftar(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { showToast("Password minimal 8 karakter.", "error"); return; }
    setLoading(true);

    const params = new URLSearchParams(window.location.search);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName, referral_code_used: params.get("ref") ?? null },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      showToast(error.message.includes("already registered") ? "Email ini sudah terdaftar." : error.message, "error");
      setLoading(false);
      return;
    }
    setEmailSent(true);
    setLoading(false);
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { showToast("Gagal daftar dengan Google.", "error"); setGoogleLoading(false); }
  }

  if (emailSent) {
    return (
      <div className="flex flex-col items-center text-center py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 mb-4">
          <CheckCircle2 className="h-8 w-8 text-[#8B0000]" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">Cek email kamu!</h2>
        <p className="text-sm text-muted-foreground mb-1">Link verifikasi dikirim ke</p>
        <p className="font-semibold text-slate-800 mb-6">{email}</p>
        <p className="text-xs text-muted-foreground mb-4">Tidak menerima email? Cek folder spam.</p>
        <Link href="/login" className="text-sm font-semibold text-[#8B0000] hover:underline">
          Kembali ke login
        </Link>
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-slate-900">Buat akun gratis 🎓</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-[#8B0000] hover:text-brand-light">
              Masuk di sini
            </Link>
          </p>
        </div>

        {/* Google */}
        <button type="button" onClick={handleGoogleLogin} disabled={googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#8B0000] hover:bg-brand-50 transition-all disabled:opacity-60">
          {googleLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          {googleLoading ? "Mengarahkan..." : "Daftar dengan Google"}
        </button>

        <div className="my-5 flex items-center gap-3">
          <span className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-muted-foreground font-medium">atau daftar dengan email</span>
          <span className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={handleDaftar} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-sm font-semibold text-slate-700">Nama Lengkap</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
              <Input id="fullName" type="text" placeholder="Budi Santoso" value={fullName}
                onChange={(e) => setFullName(e.target.value)} className="pl-9" required disabled={loading} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
              <Input id="email" type="email" placeholder="nama@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)} className="pl-9" required disabled={loading} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="Minimal 8 karakter"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-10" required minLength={8} disabled={loading} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Sembunyikan" : "Tampilkan"}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= passwordStrength ? strengthColor[passwordStrength] : "bg-slate-200"}`} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{strengthLabel[passwordStrength]}</span>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full mt-2" size="lg" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Mendaftarkan...
              </span>
            ) : "Buat Akun Gratis"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Dengan mendaftar, kamu setuju dengan{" "}
          <Link href="/syarat" className="text-[#8B0000] hover:underline">Syarat &amp; Ketentuan</Link>{" "}
          {BRAND.name}.
        </p>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
