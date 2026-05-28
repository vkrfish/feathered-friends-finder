import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")
DB_URL = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("SELECT id, title, kind, file_name, youtube_url FROM public.study_items ORDER BY created_at DESC;")
    rows = cur.fetchall()
    print("Total items in DB:", len(rows))
    for r in rows:
        print(f"ID: {r[0]} | Title: {r[1]} | Kind: {r[2]} | File: {r[3]} | URL: {r[4]}")
    cur.close()
    conn.close()
except Exception as e:
    print("Database error:", e)
