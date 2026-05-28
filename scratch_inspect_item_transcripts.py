import psycopg2
import os
import json
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")
DB_URL = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("SELECT id, title, kind, file_name, transcript FROM public.study_items;")
    rows = cur.fetchall()
    print("Inspecting DB items:")
    for r in rows:
        t_json = r[4]
        if isinstance(t_json, str):
            t_json = json.loads(t_json)
        print(f"\nID: {r[0]} | Title: {r[1]} | Kind: {r[2]} | File: {r[3]}")
        if t_json:
            print("Transcript length:", len(t_json))
            for i, line in enumerate(t_json[:3]):
                print(f"  Line {i}: [{line.get('time')}] {line.get('text')}")
        else:
            print("Transcript is EMPTY/NULL")
    cur.close()
    conn.close()
except Exception as e:
    print("Database error:", e)
