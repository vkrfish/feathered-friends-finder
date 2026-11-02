import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

migration_sql = """
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

CREATE INDEX IF NOT EXISTS idx_tutor_sessions_profile ON public.tutor_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_item ON public.tutor_sessions(item_id);

ALTER TABLE public.tutor_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tutor_sessions' AND policyname = 'Users manage own tutor sessions'
  ) THEN
    CREATE POLICY "Users manage own tutor sessions" ON public.tutor_sessions
      FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
  END IF;
END $$;
"""

try:
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    conn.autocommit = True
    cursor = conn.cursor()
    cursor.execute(migration_sql)
    print("tutor_sessions migration executed successfully.")
except Exception as e:
    print(f"Migration error: {e}")

