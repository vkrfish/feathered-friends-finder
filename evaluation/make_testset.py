import os
import sys
import json
import re
import csv
import random
import psycopg2
import requests
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

def get_db_connection():
    try:
        conn = psycopg2.connect(
            user="postgres",
            password="Vasanth@10906",
            host="127.0.0.1",
            port=5432,
            database="postgres",
            connect_timeout=5
        )
        return conn
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        return None

def generate_qa_pair_with_llm(chunk_text: str, source_type: str, item_title: str):
    prompt = f"""You are an academic benchmark dataset generator.
Based on the following text chunk from a {source_type.upper()} resource titled "{item_title}", generate:
1. One clear, specific question that is directly answered by the chunk.
2. One precise reference answer based on the chunk.

Respond strictly in JSON format with keys "question" and "ground_truth_answer".

Text Chunk:
\"\"\"{chunk_text}\"\"\""""

    models_to_try = [
        "qwen/qwen3.8-27b:free",
        "apodex/apodex-1.1-mini:free",
        "liquid/lfm-2.5-2.6b:free",
        "google/gemini-2.5-flash"
    ]

    if OPENROUTER_API_KEY:
        for model_name in models_to_try:
            try:
                url = "https://openrouter.ai/api/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 250,
                    "temperature": 0.2
                }
                res = requests.post(url, json=payload, headers=headers, timeout=10)
                if res.status_code == 200:
                    reply_text = res.json()["choices"][0]["message"]["content"]
                    json_match = re.search(r'\{.*\}', reply_text, re.DOTALL)
                    if json_match:
                        parsed = json.loads(json_match.group(0))
                        if "question" in parsed and "ground_truth_answer" in parsed:
                            return parsed["question"].strip(), parsed["ground_truth_answer"].strip()
            except Exception:
                pass

    # Heuristic question generation fallback directly using key terms from chunk
    words = re.findall(r'\b[A-Za-z]{4,}\b', chunk_text)
    primary_term = words[0] if words else "the core concept"
    sentences = [s.strip() for s in chunk_text.split('.') if len(s.strip()) > 15]
    if len(sentences) >= 2:
        question = f"What is the key principle regarding {primary_term} discussed in '{item_title}'?"
        ground_truth_answer = f"{sentences[0]}. {sentences[1]}."
    else:
        question = f"What is explained about {primary_term} in '{item_title}'?"
        ground_truth_answer = chunk_text[:200]
    return question, ground_truth_answer

def make_testset(output_csv: str = None):
    if output_csv is None:
        output_csv = os.path.join(os.path.dirname(__file__), "testset.csv")

    conn = get_db_connection()
    if not conn:
        print("[ERROR] Cannot connect to database for testset generation.")
        return False

    cur = conn.cursor()
    cur.execute("""
        SELECT c.id, c.chunk_text, s.kind, s.title
        FROM public.document_chunks c
        JOIN public.study_items s ON c.item_id = s.id
        ORDER BY c.id;
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    if not rows:
        print("[ERROR] No chunks found in database. Run ingest_corpus.py first.")
        return False

    print(f"[INFO] Fetched {len(rows)} unique database chunks across all source types.")

    testset_data = []

    print(f"[INFO] Generating 1 benchmark Q&A pair per unique database chunk...")

    for r in rows:
        chunk_id, chunk_text, src_type, title = str(r[0]), r[1], r[2], r[3]
        q, a = generate_qa_pair_with_llm(chunk_text, src_type, title)
        testset_data.append({
            "question": q,
            "ground_truth_answer": a,
            "relevant_chunk_ids": chunk_id,
            "source_type": src_type
        })
        print(f"  [+] ({src_type.upper()}) Q: {q[:60]}...")

    fieldnames = ["question", "ground_truth_answer", "relevant_chunk_ids", "source_type"]
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(testset_data)

    print(f"[SUCCESS] Testset generated with {len(testset_data)} unique Q&A items saved to '{output_csv}'.")
    return True

if __name__ == "__main__":
    make_testset()
