-- ============================================================
-- Ultra Learn (LearnX) — Production PostgreSQL Database Schema
-- Multi-Tenant Architecture with pgvector & Supabase Auth RLS
-- Target Concurrency: 1,000+ Concurrent Active Users
-- ============================================================

-- 1. Enable pgvector extension for semantic embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- Table: profiles
-- Mirrors Supabase auth.users for application-level profile data
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: study_items
-- Stores user-owned notebooks and knowledge sources.
-- Strictly tied to profile_id (auth.users).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.study_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notebook_id UUID REFERENCES public.study_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,              -- 'notebook', 'pdf', 'youtube', 'website', 'text', 'research'
  file_name TEXT,
  content TEXT,                    -- document body, translated text, scraped markdown
  youtube_url TEXT,
  video_id TEXT,
  notes TEXT NOT NULL DEFAULT '',
  chapters JSONB DEFAULT '[]'::jsonb,
  transcript JSONB DEFAULT '[]'::jsonb,
  briefing_doc TEXT,
  audio_script JSONB,
  file_data BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: document_chunks
-- Stores 1536-dimensional semantic vector embeddings per item.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.study_items(id) ON DELETE CASCADE,
  page_number INT NOT NULL DEFAULT 1,
  chunk_text TEXT NOT NULL,
  embedding vector(1536)
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
-- Table: quiz_sessions
-- Interactive RAG-generated quiz sessions and evaluations.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.study_items(id) ON DELETE CASCADE,
  topic TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  num_questions INT NOT NULL DEFAULT 5,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_answers JSONB DEFAULT '{}'::jsonb,
  score INT,
  total_questions INT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: tutor_sessions
-- Interactive RAG Tutor Mode sessions, outline, and progression.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tutor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.study_items(id) ON DELETE CASCADE,
  outline JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_section_idx INT NOT NULL DEFAULT 0,
  current_step_idx INT NOT NULL DEFAULT 0,
  completed_activities INT NOT NULL DEFAULT 0,
  total_activities INT NOT NULL DEFAULT 0,
  accuracy INT DEFAULT 0,
  session_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: chat_messages
-- Persistent chat history for Socratic RAG Q&A per study item.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.study_items(id) ON DELETE CASCADE,
  role TEXT NOT NULL,              -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: pinned_notes
-- User-pinned notes, highlights, and insights per item.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pinned_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.study_items(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Performance Indexes for 1,000+ Concurrent Querying
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_study_items_profile   ON public.study_items(profile_id);
CREATE INDEX IF NOT EXISTS idx_study_items_notebook  ON public.study_items(notebook_id);
CREATE INDEX IF NOT EXISTS idx_study_items_created   ON public.study_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_chunks_item  ON public.document_chunks(item_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_item       ON public.flashcards(item_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_item          ON public.quizzes(item_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_profile ON public.quiz_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_item    ON public.quiz_sessions(item_id);
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_profile ON public.tutor_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_item    ON public.tutor_sessions(item_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_item    ON public.chat_messages(item_id);
CREATE INDEX IF NOT EXISTS idx_pinned_notes_item     ON public.pinned_notes(item_id);

-- HNSW vector index for ultra-low latency ANN vector similarity search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================================
-- Row Level Security (RLS) Policies (Zero Data Leakage)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users manage own study items" ON public.study_items FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users access chunks of own items" ON public.document_chunks FOR ALL USING (EXISTS (SELECT 1 FROM public.study_items s WHERE s.id = item_id AND s.profile_id = auth.uid()));
CREATE POLICY "Users access flashcards of own items" ON public.flashcards FOR ALL USING (EXISTS (SELECT 1 FROM public.study_items s WHERE s.id = item_id AND s.profile_id = auth.uid()));
CREATE POLICY "Users access quizzes of own items" ON public.quizzes FOR ALL USING (EXISTS (SELECT 1 FROM public.study_items s WHERE s.id = item_id AND s.profile_id = auth.uid()));
CREATE POLICY "Users manage own quiz sessions" ON public.quiz_sessions FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users manage own tutor sessions" ON public.tutor_sessions FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users access chat of own items" ON public.chat_messages FOR ALL USING (EXISTS (SELECT 1 FROM public.study_items s WHERE s.id = item_id AND s.profile_id = auth.uid()));
CREATE POLICY "Users access pinned notes of own items" ON public.pinned_notes FOR ALL USING (EXISTS (SELECT 1 FROM public.study_items s WHERE s.id = item_id AND s.profile_id = auth.uid()));

SELECT 'Ultra Learn multi-tenant schema with RLS and HNSW initialized successfully!' AS status;
