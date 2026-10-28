-- Migration: 005_create_uploaded_files

CREATE TABLE public.uploaded_files (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_name     TEXT NOT NULL,
  storage_path      TEXT NOT NULL,
  file_size_bytes   BIGINT NOT NULL,
  mime_type         TEXT NOT NULL,
  page_count        INTEGER,
  word_count        INTEGER,
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted        BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_uploaded_files_user_id ON public.uploaded_files(user_id);

ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User dapat membaca file sendiri"
  ON public.uploaded_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "User dapat mengupload file"
  ON public.uploaded_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin dapat membaca semua file"
  ON public.uploaded_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
