"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast, useToast } from "@/components/ui/toast";

export default function LupaPasswordPage() {
  const supabase = createClient();
  const { toast, showToast, hideToast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      showToast("Gagal mengirim email. Coba lagi.", "error");
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 text-2xl">📧</div>
          <CardTitle>Email terkirim!</CardTitle>
          <CardDescription>
            Cek inbox <span className="font-medium text-foreground">{email}</span> untuk
            link reset password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className="text-sm text-brand hover:underline">
            Kembali ke login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Lupa password?</CardTitle>
          <CardDescription>
            Masukkan emailmu dan kami akan kirimkan link untuk reset password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Mengirim..." : "Kirim Link Reset"}
            </Button>
            <div className="text-center">
              <Link href="/login" className="text-sm text-muted-foreground hover:underline">
                Kembali ke login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
