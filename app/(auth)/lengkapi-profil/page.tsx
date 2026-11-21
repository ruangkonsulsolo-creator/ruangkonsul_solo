import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ambilStatusProfil } from "@/lib/auth/status-profil";
import { homeForRole, type Role } from "@/lib/auth/roles";
import { safeRedirectPath } from "@/lib/utils/safe-redirect";
import { FormLengkapiProfil } from "@/components/auth/FormLengkapiProfil";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lengkapi Pendaftaran" };

export default async function LengkapiProfilPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const status = await ambilStatusProfil(supabase, user.id);
  if (!status) redirect("/login?error=akun-nonaktif");
  if (status.registrasi_selesai) redirect(homeForRole(status.role as Role));

  const { data: profil } = await supabase
    .from("profiles")
    .select("full_name, whatsapp")
    .eq("id", user.id)
    .maybeSingle();

  const meta = user.user_metadata ?? {};
  const nama = (profil?.full_name || meta.full_name || meta.name || "") as string;
  const wa = profil?.whatsapp ? String(profil.whatsapp).replace(/^62/, "0") : "";

  return (
    <FormLengkapiProfil
      email={user.email ?? ""}
      namaAwal={nama}
      waAwal={wa}
      avatar={(meta.avatar_url || meta.picture || null) as string | null}
      next={safeRedirectPath(searchParams.next ?? null)}
    />
  );
}
