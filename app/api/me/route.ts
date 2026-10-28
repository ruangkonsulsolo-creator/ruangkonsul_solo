import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Kembalikan role + info dasar user yang sedang login */
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ role: null }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, referral_code, credit_balance")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      id:             user.id,
      email:          user.email,
      role:           profile?.role ?? "user",
      full_name:      profile?.full_name ?? "",
      referral_code:  profile?.referral_code ?? "",
      credit_balance: profile?.credit_balance ?? 0,
    });
  } catch {
    return NextResponse.json({ role: "user" });
  }
}
