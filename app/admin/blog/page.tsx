import { createClient } from "@/lib/supabase/server";
import { BlogAdminTable } from "@/components/admin/BlogAdminTable";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Kelola Blog | Admin ${BRAND.name}` };

export default async function AdminBlogPage() {
  const supabase = createClient();
  const { data: posts } = await supabase.from("blog_posts").select("id, slug, title, category, is_published, published_at, created_at, read_time").order("created_at", { ascending: false });
  return (
    <div className="space-y-5 max-w-5xl">
      <div><h2 className="text-xl font-extrabold text-slate-900">Kelola Blog</h2><p className="text-sm text-muted-foreground mt-0.5">Tulis, edit, dan publish artikel blog {BRAND.name}.</p></div>
      <BlogAdminTable posts={posts ?? []} />
    </div>
  );
}
