import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

migration_sql = """
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.study_items(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_profile ON public.quiz_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_item ON public.quiz_sessions(item_id);

ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_sessions' AND policyname = 'Users manage own quiz sessions'
  ) THEN
    CREATE POLICY "Users manage own quiz sessions" ON public.quiz_sessions
      FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
  END IF;
END $$;
"""

try:
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    conn.autocommit = True
    cursor = conn.cursor()
    cursor.execute(migration_sql)
    print("quiz_sessions migration executed successfully.")
except Exception as e:
    print(f"Migration error: {e}")

