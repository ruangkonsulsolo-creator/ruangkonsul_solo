-- Migration: 015_fix_corpus_schema
--
-- SUPERSEDES migration 013 (013_create_corpus_tables.sql).
--
-- Problem: 013 created corpus_embeddings (chunk_text, embedding vector(1536),
--          plus corpus_documents without a source_id column.
--          The detection-engine uses corpus_chunks (text, embedding vector(384))
--          and corpus_documents.source_id as its primary external key.
--
-- Fix:
--   1. Drop the 013 tables if they exist (idempotent — safe if 013 was never run).
--   2. Drop the 013 pgvector extension block (extensions already enabled by Supabase).
--   3. Create corpus_documents and corpus_chunks that exactly match the engine schema.
--   4. Recreate deny-all RLS and the helper SQL function with the correct column names.
--
-- The engine's own migrations/001_initial_schema.sql is the authoritative DDL;
-- this file is its Supabase-hosted mirror.

-- ─── 0. Drop old 013 objects (no-op if never created) ────────────────────────

DROP TABLE  IF EXISTS public.corpus_embeddings CASCADE;

-- corpus_documents may have been created by 013 without source_id.
-- Drop and recreate rather than ALTER to keep the migration clean.
DROP TABLE  IF EXISTS public.corpus_documents  CASCADE;

DROP FUNCTION IF EXISTS public.match_corpus_chunks(vector, float, int);

-- ─── 1. Extension ─────────────────────────────────────────────────────────────
-- pgvector is pre-installed on Supabase; this is idempotent.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ─── 2. corpus_documents ─────────────────────────────────────────────────────
CREATE TABLE public.corpus_documents (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Caller-supplied or auto-generated stable identifier.
  -- The engine uses this as its external handle for upsert and lookup.
  source_id    TEXT        UNIQUE NOT NULL,

  title        TEXT        NOT NULL,
  author       TEXT,
  source_url   TEXT,
  published_at TIMESTAMPTZ,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.corpus_documents IS
  'Reference documents ingested into the detection corpus. '
  'Managed exclusively by detection-engine via service_role key.';

COMMENT ON COLUMN public.corpus_documents.source_id IS
  'Stable external identifier for upsert. Provided by caller or auto-generated UUID string.';

CREATE INDEX idx_corpus_documents_source_id
  ON public.corpus_documents (source_id);

CREATE INDEX idx_corpus_documents_is_active
  ON public.corpus_documents (is_active);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_corpus_documents_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_corpus_documents_updated_at
  BEFORE UPDATE ON public.corpus_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_corpus_documents_updated_at();

-- ─── 3. corpus_chunks ────────────────────────────────────────────────────────
-- embedding dimension = 384 (paraphrase-multilingual-MiniLM-L12-v2)
-- Must match EMBEDDING_DIMENSIONS in detection-engine config.py.
-- If the model is changed, this column + index must be recreated.

CREATE TABLE public.corpus_chunks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  document_id  UUID        NOT NULL
                             REFERENCES public.corpus_documents(id)
                             ON DELETE CASCADE,

  chunk_index  INTEGER     NOT NULL CHECK (chunk_index >= 0),

  -- Raw text of the chunk — returned as excerpt in detection results
  text         TEXT        NOT NULL CHECK (text <> ''),

  -- 384-dim L2-normalised vector from sentence-transformers
  embedding    vector(384) NOT NULL,

  -- Diagnostics / debugging
  word_count   INTEGER,
  char_start   INTEGER,
  char_end     INTEGER,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT corpus_chunks_doc_chunk_unique UNIQUE (document_id, chunk_index)
);

COMMENT ON TABLE  public.corpus_chunks IS
  'One row per text chunk; stores raw text and its embedding vector. '
  'Used for both exact-match (MinHash) and semantic (cosine) retrieval.';

COMMENT ON COLUMN public.corpus_chunks.embedding IS
  '384-dim L2-normalised vector from paraphrase-multilingual-MiniLM-L12-v2. '
  'Dimension must match EMBEDDING_DIMENSIONS in detection-engine/app/config.py.';

CREATE INDEX idx_corpus_chunks_document_id
  ON public.corpus_chunks (document_id);

-- HNSW index — matches the engine's migration exactly.
-- Higher recall than IVFFlat, no training phase required.
-- Tune m / ef_construction if recall vs. build-time tradeoff needs adjusting.
CREATE INDEX idx_corpus_chunks_embedding_hnsw
  ON public.corpus_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

COMMENT ON INDEX public.idx_corpus_chunks_embedding_hnsw IS
  'HNSW index for approximate nearest-neighbour cosine search. '
  'Params: m=16, ef_construction=64 (standard starting point).';

-- ─── 4. Row Level Security — DENY ALL for anon / authenticated ───────────────
-- service_role bypasses RLS by default in Supabase → no explicit policy needed.
-- Zero policies = zero access for any non-service-role JWT.

ALTER TABLE public.corpus_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corpus_chunks    ENABLE ROW LEVEL SECURITY;

-- No CREATE POLICY statements — intentional.
-- Only service_role can read/write these tables.

-- ─── 5. Helper function: semantic search ─────────────────────────────────────
-- Signature aligns with the engine's vector_search.py query.
-- Callable via supabase.rpc('match_corpus_chunks', {...}) with service_role.
-- SECURITY INVOKER: RLS still applies — anon callers are blocked.

CREATE OR REPLACE FUNCTION public.match_corpus_chunks(
  query_embedding  vector(384),   -- must match embedding column dimension
  match_threshold  float   DEFAULT 0.70,
  match_count      int     DEFAULT 5
)
RETURNS TABLE (
  chunk_id     UUID,
  document_id  UUID,
  source_id    TEXT,
  title        TEXT,
  text         TEXT,
  chunk_index  INTEGER,
  similarity   float
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    cc.id                                   AS chunk_id,
    cc.document_id,
    cd.source_id,
    cd.title,
    cc.text,
    cc.chunk_index,
    1 - (cc.embedding <=> query_embedding)  AS similarity
  FROM public.corpus_chunks    cc
  JOIN public.corpus_documents cd ON cd.id = cc.document_id
  WHERE cd.is_active = TRUE
    AND 1 - (cc.embedding <=> query_embedding) >= match_threshold
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON FUNCTION public.match_corpus_chunks IS
  'ANN cosine similarity search over corpus_chunks. '
  'Returns up to match_count results with similarity >= match_threshold. '
  'Only callable with service_role key (RLS deny-all for other roles).';

-- ─── 6. Verify ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'corpus_documents'
      AND column_name  = 'source_id'
  ) THEN
    RAISE EXCEPTION '015: corpus_documents.source_id column missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'corpus_chunks'
      AND column_name  = 'text'
  ) THEN
    RAISE EXCEPTION '015: corpus_chunks.text column missing';
  END IF;

  RAISE NOTICE '015_fix_corpus_schema: migration successful.';
END $$;
