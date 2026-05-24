-- Enable the pgvector extension for storing semantic embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store study items (PDFs, videos, websites, texts, and deep research reports)
CREATE TABLE public.study_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind TEXT NOT NULL, -- 'pdf', 'youtube', 'website', 'text', 'research'
  file_name TEXT,
  content TEXT, -- stores document body text, scraped site text, or research markdown report
  youtube_url TEXT,
  video_id TEXT,
  notes TEXT NOT NULL DEFAULT '',
  chapters JSONB DEFAULT '[]'::jsonb,
  transcript JSONB DEFAULT '[]'::jsonb
);

-- Table to store PDF chunks for vector search (RAG)
CREATE TABLE public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.study_items(id) ON DELETE CASCADE,
  page_number INT NOT NULL DEFAULT 1,
  chunk_text TEXT NOT NULL,
  embedding vector(1536) -- dimensions match OpenAI (1536) / Gemini embeddings
);

-- Table to store flashcards for active recall
CREATE TABLE public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.study_items(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table to store quizzes for testing
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.study_items(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  answer INT NOT NULL, -- index of correct option
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table to store chat history associated with each study session
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.study_items(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_study_items_profile ON public.study_items(profile_id);
CREATE INDEX idx_document_chunks_item ON public.document_chunks(item_id);
CREATE INDEX idx_flashcards_item ON public.flashcards(item_id);
CREATE INDEX idx_quizzes_item ON public.quizzes(item_id);
CREATE INDEX idx_chat_messages_item ON public.chat_messages(item_id);

-- HNSW Vector Index for fast approximate nearest neighbor search (Cosine distance)
CREATE INDEX idx_document_chunks_embedding 
ON public.document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- Enable Row Level Security (RLS)
ALTER TABLE public.study_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies (Allow authenticated access and bypass check for local development API gateway)
CREATE POLICY "Public / Authenticated access to study items" ON public.study_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public / Authenticated access to document chunks" ON public.document_chunks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public / Authenticated access to flashcards" ON public.flashcards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public / Authenticated access to quizzes" ON public.quizzes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public / Authenticated access to chat messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
