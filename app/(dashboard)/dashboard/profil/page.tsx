import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfilForm } from "@/components/dashboard/ProfilForm";
import { BRAND } from "@/lib/brand";
import { PREVIEW_MODE, PREVIEW_USER, PREVIEW_PROFILE } from "@/lib/utils/preview-mode";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Profil | ${BRAND.name}` };

export default async function ProfilPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (!PREVIEW_MODE) redirect("/login");
    return (
      <div className="max-w-xl space-y-7">
        <h2 className="text-xl font-extrabold text-slate-900">Profil Saya</h2>
        <ProfilForm userId={PREVIEW_USER.id} email={PREVIEW_USER.email} initialData={{ full_name: PREVIEW_PROFILE.full_name, whatsapp: PREVIEW_PROFILE.whatsapp, referral_code: PREVIEW_PROFILE.referral_code, credit_balance: PREVIEW_PROFILE.credit_balance }} referralCount={0} />
      </div>
    );
  }
  const { data: profile } = await supabase.from("profiles").select("full_name, whatsapp, referral_code, credit_balance").eq("id", user.id).single();
  const { count: referralCount } = await supabase.from("referrals").select("*", { count: "exact", head: true }).eq("referrer_id", user.id);
  return (
    <div className="max-w-xl space-y-7">
      <h2 className="text-xl font-extrabold text-slate-900">Profil Saya</h2>
      <ProfilForm userId={user.id} email={user.email ?? ""} initialData={{ full_name: profile?.full_name ?? "", whatsapp: profile?.whatsapp ?? "", referral_code: profile?.referral_code ?? "", credit_balance: profile?.credit_balance ?? 0 }} referralCount={referralCount ?? 0} />
    </div>
  );
}
