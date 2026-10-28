-- Migration: 012_create_blog_posts
-- Tabel untuk artikel blog yang bisa di-CRUD dari admin panel

CREATE TABLE public.blog_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  excerpt      TEXT,
  content      TEXT NOT NULL,          -- Markdown
  cover_url    TEXT,                   -- URL gambar cover
  category     TEXT NOT NULL DEFAULT 'Panduan Akademik',
  read_time    TEXT NOT NULL DEFAULT '5 menit',
  author       TEXT NOT NULL DEFAULT 'Tim Kalibri',
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by   UUID REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_published ON public.blog_posts(is_published, published_at DESC);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Semua orang bisa baca artikel yang dipublish
CREATE POLICY "Public bisa baca artikel published"
  ON public.blog_posts FOR SELECT
  USING (is_published = true);

-- Admin bisa CRUD semua
CREATE POLICY "Admin bisa kelola blog"
  ON public.blog_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
