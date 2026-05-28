import psycopg2
import os
import json
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")
DB_URL = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    # Select all items to inspect their transcripts
    cur.execute("SELECT id, transcript FROM public.study_items;")
    rows = cur.fetchall()
    
    purged_count = 0
    for r in rows:
        item_id = r[0]
        t_json = r[1]
        if t_json:
            if isinstance(t_json, str):
                t_json = json.loads(t_json)
            
            # Check if it contains the mock text
            has_mock = False
            if isinstance(t_json, list):
                for line in t_json:
                    text = line.get('text', '')
                    if "specialized" in text or "syllabus guidelines" in text:
                        has_mock = True
                        break
            
            if has_mock:
                print(f"Purging mock transcript and chapters for Item ID: {item_id}")
                cur.execute(
                    "UPDATE public.study_items SET transcript = '[]'::jsonb, chapters = '[]'::jsonb WHERE id = %s;",
                    (item_id,)
                )
                purged_count += 1
                
    conn.commit()
    cur.close()
    conn.close()
    print(f"Successfully purged {purged_count} database rows containing mock transcripts!")
except Exception as e:
    print("Database error:", e)
