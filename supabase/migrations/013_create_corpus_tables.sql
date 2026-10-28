-- Migration: 013_create_corpus_tables
-- Detection engine: corpus dokumen akademik + vektor embedding untuk similarity search.
--
-- Akses:
--   - HANYA melalui service_role key (server-side, tidak pernah di-expose ke client)
--   - anon key dan authenticated role TIDAK dapat membaca, menulis, atau mengeksekusi
--     operasi apapun pada tabel-tabel ini (deny-all RLS)
-- Alasan tidak pakai RLS per-user: ini data internal engine, bukan data milik user.

-- ─────────────────────────────────────────────
-- 1. Extension pgvector
-- ─────────────────────────────────────────────
-- Pastikan extension tersedia di project Supabase.
-- Supabase managed sudah include pgvector; baris ini idempotent (IF NOT EXISTS).
CREATE EXTENSION IF NOT EXISTS vector
  WITH SCHEMA extensions;  -- Supabase convention: ekstensi di schema extensions

-- ─────────────────────────────────────────────
-- 2. Tabel corpus_documents
--    Metadata dokumen akademik yang di-scrape / di-input manual
-- ─────────────────────────────────────────────
CREATE TABLE public.corpus_documents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Judul dokumen / artikel / jurnal
  title       TEXT        NOT NULL,

  -- URL sumber asli (nullable untuk entry manual)
  source_url  TEXT,

  -- Nama sumber: 'garuda' | 'neliti' | 'manual' | custom string
  -- Tidak dibuat ENUM supaya mudah ditambah sumber baru tanpa ALTER TYPE
  source_name TEXT        NOT NULL CHECK (source_name <> ''),

  -- Timestamp kapan dokumen ini di-scrape atau dimasukkan
  scraped_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Hindari duplikasi URL per sumber
  CONSTRAINT corpus_documents_source_url_unique UNIQUE (source_url)
);

COMMENT ON TABLE  public.corpus_documents IS
  'Metadata dokumen akademik yang digunakan sebagai corpus untuk detection engine.';
COMMENT ON COLUMN public.corpus_documents.source_name IS
  'Asal dokumen: garuda | neliti | manual | string custom lainnya.';
COMMENT ON COLUMN public.corpus_documents.source_url IS
  'URL sumber asli. NULL untuk entry manual atau dokumen tanpa URL publik.';

-- ─────────────────────────────────────────────
-- 3. Tabel corpus_embeddings
--    Chunk teks + vektor embedding per dokumen
-- ─────────────────────────────────────────────
-- Dimensi embedding: 1536 (OpenAI text-embedding-ada-002 / text-embedding-3-small)
-- Jika pakai model lain, ubah angka ini sebelum menjalankan migration:
--   - sentence-transformers/all-MiniLM-L6-v2  → 384
--   - text-embedding-3-large                  → 3072
--   - nomic-embed-text                        → 768
DO $$ BEGIN
  RAISE NOTICE 'corpus_embeddings: menggunakan dimensi 1536 (OpenAI text-embedding-ada-002).';
  RAISE NOTICE 'Ubah nilai EMBEDDING_DIM di migration ini jika memakai model berbeda.';
END $$;

CREATE TABLE public.corpus_embeddings (
  id            UUID      PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relasi ke dokumen induk; CASCADE delete supaya embedding ikut terhapus
  document_id   UUID      NOT NULL
                          REFERENCES public.corpus_documents(id)
                          ON DELETE CASCADE,

  -- Potongan teks (chunk) dari dokumen — isi asli yang dicari kemiripannya
  chunk_text    TEXT      NOT NULL CHECK (chunk_text <> ''),

  -- Vektor embedding dari chunk_text (1536 dimensi)
  -- Gunakan type vector dari pgvector extension
  embedding     vector(1536) NOT NULL,

  -- Urutan chunk di dalam dokumen (0-indexed), untuk rekonstruksi konteks
  chunk_index   INTEGER   NOT NULL CHECK (chunk_index >= 0),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Satu dokumen tidak boleh punya dua chunk dengan index yang sama
  CONSTRAINT corpus_embeddings_doc_chunk_unique UNIQUE (document_id, chunk_index)
);

COMMENT ON TABLE  public.corpus_embeddings IS
  'Vektor embedding per-chunk dokumen corpus. Dipakai untuk cosine similarity search.';
COMMENT ON COLUMN public.corpus_embeddings.embedding IS
  'Vektor 1536-dimensi dari model text-embedding-ada-002. Ubah dimensi jika ganti model.';
COMMENT ON COLUMN public.corpus_embeddings.chunk_index IS
  'Urutan chunk dalam dokumen (0-indexed). Dipakai untuk rekonstruksi konteks saat diperlukan.';

-- ─────────────────────────────────────────────
-- 4. Index untuk similarity search
-- ─────────────────────────────────────────────

-- 4a. Index konvensional untuk lookup by document_id (join & filter)
CREATE INDEX idx_corpus_embeddings_document_id
  ON public.corpus_embeddings (document_id);

-- 4b. IVFFlat index untuk approximate nearest-neighbor cosine similarity.
--     Menggunakan operator class `vector_cosine_ops`.
--
--     Parameter lists = 100:
--       - Nilai default pgvector untuk dataset sedang (~100K–1M rows)
--       - Aturan praktis: lists ≈ sqrt(jumlah_row) untuk dataset besar
--       - Terlalu kecil → scan tidak efisien; terlalu besar → build lambat
--
--     CATATAN: IVFFlat butuh data sudah ada sebelum index dibangun agar
--     centroid efektif. Untuk dataset kosong, index tetap dibuat tapi akan
--     di-rebuild otomatis saat pertama kali ada data yang cukup.
--     Alternatif: pakai HNSW (pgvector >= 0.5.0) untuk build-time lebih cepat.
CREATE INDEX idx_corpus_embeddings_ivfflat
  ON public.corpus_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

COMMENT ON INDEX public.idx_corpus_embeddings_ivfflat IS
  'IVFFlat index untuk approximate cosine similarity search. lists=100 cocok untuk ~100K rows. '
  'Untuk dataset lebih besar, rebuild dengan lists=sqrt(total_rows).';

-- 4c. Index untuk pencarian dokumen berdasarkan sumber (query per sumber)
CREATE INDEX idx_corpus_documents_source_name
  ON public.corpus_documents (source_name);

-- 4d. Index untuk sorting/filtering berdasarkan waktu scraping
CREATE INDEX idx_corpus_documents_scraped_at
  ON public.corpus_documents (scraped_at DESC);

-- ─────────────────────────────────────────────
-- 5. Row Level Security — DENY ALL untuk publik
-- ─────────────────────────────────────────────
-- Strategi: aktifkan RLS tapi jangan buat policy apapun untuk anon/authenticated.
-- Tidak ada policy = tidak ada akses untuk role tersebut.
-- service_role key di-bypass RLS secara default di Supabase → tetap bisa akses penuh.

ALTER TABLE public.corpus_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corpus_embeddings ENABLE ROW LEVEL SECURITY;

-- Eksplisit dokumentasikan bahwa TIDAK ada policy untuk anon/authenticated.
-- service_role bypass RLS, jadi tidak perlu policy khusus untuk itu.
--
-- Jika di masa depan butuh akses terbatas untuk authenticated user
-- (misal: read-only untuk hasil similarity), tambahkan policy baru di sini:
--
-- CREATE POLICY "authenticated_read_embeddings"
--   ON public.corpus_embeddings FOR SELECT
--   TO authenticated
--   USING (true);  -- atau kondisi yang lebih spesifik

-- Verifikasi: pastikan tidak ada default policy yang bocor
-- (Supabase tidak membuat default policy, tapi dicek eksplisit sebagai dokumentasi)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename IN ('corpus_documents', 'corpus_embeddings')
      AND schemaname = 'public'
  ) THEN
    RAISE NOTICE 'corpus tables: ada policy RLS yang aktif. Pastikan ini disengaja.';
  ELSE
    RAISE NOTICE 'corpus tables: RLS aktif, zero policies — hanya service_role yang bisa akses. OK.';
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 6. Helper function: similarity search
--    Dipanggil dari server-side (service_role) via supabase.rpc()
-- ─────────────────────────────────────────────
-- Function ini SECURITY DEFINER tidak dipakai karena kita ingin akses
-- tetap dikontrol oleh service_role key, bukan di-escape lewat function.
-- Gunakan langsung: SELECT * FROM match_corpus_chunks(...) dengan service_role.

CREATE OR REPLACE FUNCTION public.match_corpus_chunks(
  query_embedding  vector(1536),
  match_threshold  float    DEFAULT 0.78,   -- minimum cosine similarity (0–1)
  match_count      int      DEFAULT 10       -- jumlah hasil maksimum
)
RETURNS TABLE (
  id            UUID,
  document_id   UUID,
  chunk_text    TEXT,
  chunk_index   INTEGER,
  similarity    float,
  title         TEXT,
  source_name   TEXT,
  source_url    TEXT
)
LANGUAGE sql
-- STABLE: tidak memodifikasi DB, cocok untuk query optimizer
STABLE
-- SECURITY INVOKER (default): function dieksekusi dengan hak caller.
-- Karena RLS aktif dan tidak ada policy → anon tidak bisa akses bahkan lewat function ini.
SECURITY INVOKER
AS $$
  SELECT
    e.id,
    e.document_id,
    e.chunk_text,
    e.chunk_index,
    -- Cosine similarity: 1 - cosine_distance
    1 - (e.embedding <=> query_embedding) AS similarity,
    d.title,
    d.source_name,
    d.source_url
  FROM public.corpus_embeddings e
  JOIN public.corpus_documents  d ON d.id = e.document_id
  WHERE 1 - (e.embedding <=> query_embedding) >= match_threshold
  ORDER BY e.embedding <=> query_embedding  -- ascending distance = descending similarity
  LIMIT match_count;
$$;

COMMENT ON FUNCTION public.match_corpus_chunks IS
  'Cari chunk corpus paling mirip dengan query_embedding menggunakan cosine similarity. '
  'Hanya bisa dipanggil dengan service_role key karena RLS deny-all untuk anon/authenticated.';
