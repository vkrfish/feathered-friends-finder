-- ============================================================
-- Ultra Learn — PostgreSQL Database Setup Script
-- Run this against your local PostgreSQL to create the schema.
--
-- Usage:
--   1. Create the database:  createdb ultralearn
--   2. Run this script:      psql -d ultralearn -f db/init.sql
-- ============================================================

-- Enable the pgvector extension for semantic embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- Table: study_items
-- Stores PDFs, YouTube videos, websites, text blocks, and
-- deep research reports uploaded by the user.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.study_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind TEXT NOT NULL,              -- 'pdf', 'youtube', 'website', 'text', 'research'
  file_name TEXT,
  content TEXT,                    -- document body, scraped text, or research markdown
  youtube_url TEXT,
  video_id TEXT,
  notes TEXT NOT NULL DEFAULT '',
  chapters JSONB DEFAULT '[]'::jsonb,
  transcript JSONB DEFAULT '[]'::jsonb,
  file_data BYTEA
);

-- ============================================================
-- Table: document_chunks
-- Stores PDF text chunks with vector embeddings for RAG search.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.study_items(id) ON DELETE CASCADE,
  page_number INT NOT NULL DEFAULT 1,
  chunk_text TEXT NOT NULL,
  embedding vector(1536)          -- 1536 dims (Gemini 768 padded, or OpenAI native)
);

-- ============================================================
-- Table: flashcards
-- Active recall flashcards generated per study item.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.study_items(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: quizzes
-- Multiple-choice quiz questions generated per study item.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.study_items(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  answer INT NOT NULL,             -- index of the correct option (0-based)
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: chat_messages
-- Persistent chat history for RAG Q&A per study item.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.study_items(id) ON DELETE CASCADE,
  role TEXT NOT NULL,              -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes for query performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_study_items_created   ON public.study_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_chunks_item  ON public.document_chunks(item_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_item       ON public.flashcards(item_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_item          ON public.quizzes(item_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_item    ON public.chat_messages(item_id);

-- HNSW vector index for fast approximate nearest-neighbor search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops);

-- ============================================================
-- Additions for NotebookLM Features
-- ============================================================
ALTER TABLE public.study_items ADD COLUMN IF NOT EXISTS briefing_doc TEXT;
ALTER TABLE public.study_items ADD COLUMN IF NOT EXISTS audio_script JSONB;

-- Table for Saved Notes (Pinned messages/content)
CREATE TABLE IF NOT EXISTS public.pinned_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.study_items(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pinned_notes_item ON public.pinned_notes(item_id);

-- Done!
SELECT 'Ultra Learn schema created successfully!' AS status;

