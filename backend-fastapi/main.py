import os
import re
import json
import hashlib
import uuid
import io
import zipfile
import asyncio
import requests
import numpy as np
import psycopg2
from psycopg2.extras import execute_values
from urllib.parse import urlparse, unquote
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, Form, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import pypdf
import edge_tts
from quiz_service import generate_rag_quiz, evaluate_quiz_submission
from tutor_service import (
    generate_tutor_outline,
    generate_tutor_step,
    evaluate_tutor_activity,
    answer_tutor_followup,
)

# Load environment variables
load_dotenv(dotenv_path="../.env")
load_dotenv()

app = FastAPI(title="Ultra Learn FastAPI RAG Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

@app.get("/")
def health_check():
    return {"status": "ok", "service": "Ultra Learn FastAPI RAG Engine"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# Database Configuration
DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/ultralearn")

def validate_uuid_string(uuid_str: str):
    """
    Validates if a string is a comma-separated list of valid UUIDs or default virtual IDs.
    Raises HTTPException 400 if any is invalid.
    """
    if not uuid_str:
        raise HTTPException(status_code=400, detail="item_id cannot be empty")
    ids = [x.strip() for x in uuid_str.split(",") if x.strip()]
    if not ids:
        raise HTTPException(status_code=400, detail="item_id cannot be empty")
    for val in ids:
        if val.startswith("default-") or val.startswith("default"):
            continue
        try:
            uuid.UUID(val)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid item_id format: '{val}'. Must be a valid UUID string."
            )

def get_db_connection():
    try:
        parsed = urlparse(DB_URL)
        username = unquote(parsed.username) if parsed.username else None
        password = unquote(parsed.password) if parsed.password else None
        hostname = parsed.hostname
        port = parsed.port
        database = parsed.path.lstrip('/') if parsed.path else None

        conn = psycopg2.connect(
            user=username,
            password=password,
            host=hostname,
            port=port,
            database=database,
            connect_timeout=5
        )
        return conn
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        return None

# AI API Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

print(f"[INFO] Gemini API Key present: {bool(GEMINI_API_KEY)}")
print(f"[INFO] OpenRouter API Key present: {bool(OPENROUTER_API_KEY)}")

# -------------------------------------------------------------
# CORE AI CLIENT: RESILIENT MULTI-PROVIDER LLM & EMBEDDINGS
# -------------------------------------------------------------
def get_embedding(text: str, fast: bool = False) -> list:
    """
    Generates a 1536-dimensional float vector.
    1. Attempts Gemini REST API (gemini-embedding-001 with outputDimensionality=1536).
    2. Attempts OpenRouter (openai/text-embedding-3-small).
    3. Falls back to deterministic semantic hash vector.
    """
    target_dim = 1536
    clean_text = (text or "").strip()
    if not clean_text:
        return [0.0] * target_dim

    if not fast and GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={GEMINI_API_KEY}"
            payload = {
                "content": {"parts": [{"text": clean_text[:8000]}]},
                "outputDimensionality": target_dim
            }
            res = requests.post(url, json=payload, timeout=10)
            if res.status_code == 200:
                data = res.json()
                values = data.get("embedding", {}).get("values", [])
                if len(values) == target_dim:
                    return values
                elif len(values) > 0:
                    if len(values) < target_dim:
                        values = values + [0.0] * (target_dim - len(values))
                    return values[:target_dim]
            else:
                print(f"[WARNING] Gemini embedding error {res.status_code}: {res.text[:150]}")
        except Exception as e:
            print(f"[WARNING] Gemini embedding call failed: {e}")

    if not fast and OPENROUTER_API_KEY:
        try:
            url = "https://openrouter.ai/api/v1/embeddings"
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "openai/text-embedding-3-small",
                "input": clean_text[:8000]
            }
            res = requests.post(url, json=payload, headers=headers, timeout=10)
            if res.status_code == 200:
                res_json = res.json()
                if "data" in res_json and len(res_json["data"]) > 0:
                    vec = res_json["data"][0]["embedding"]
                    if len(vec) < target_dim:
                        vec = vec + [0.0] * (target_dim - len(vec))
                    return vec[:target_dim]
            else:
                print(f"[WARNING] OpenRouter embedding error {res.status_code}: {res.text[:150]}")
        except Exception as e:
            print(f"[WARNING] OpenRouter embedding failed: {e}")

    # Fallback: Deterministic Semantic Hash Vector
    vec = np.zeros(target_dim)
    words = re.findall(r'\w+', clean_text.lower())
    if not words:
        words = ["document", "study", "content"]
    for w in words:
        h = int(hashlib.md5(w.encode('utf-8')).hexdigest(), 16)
        idx = h % target_dim
        vec[idx] += 1.0

    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()

def call_llm(prompt: str, system_instruction: str = None, json_mode: bool = False, chat_history: list = None, timeout: int = 35, system_prompt: str = None, **kwargs) -> str:
    system_instruction = system_instruction or system_prompt
    """
    Executes an LLM completion request with multi-provider failover:
    1. Google Gemini REST API (gemini-2.5-flash / gemini-flash-latest / gemini-2.0-flash)
    2. OpenRouter API (google/gemini-2.5-flash / llama-3.3-70b-instruct)
    3. Raises RuntimeError if all remote calls fail to allow local fallback.
    """
    # 1. Try Gemini REST API
    if GEMINI_API_KEY:
        gemini_models = ["gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"]
        for model_name in gemini_models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
                contents = []
                if chat_history:
                    for msg in chat_history:
                        role = "user" if getattr(msg, "role", "") == "user" or (isinstance(msg, dict) and msg.get("role") == "user") else "model"
                        content = getattr(msg, "content", "") if hasattr(msg, "content") else (msg.get("content", "") if isinstance(msg, dict) else str(msg))
                        if content:
                            contents.append({"role": role, "parts": [{"text": content}]})

                contents.append({"role": "user", "parts": [{"text": prompt}]})

                payload = {"contents": contents}
                if system_instruction:
                    payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
                if json_mode:
                    payload["generationConfig"] = {"responseMimeType": "application/json"}

                res = requests.post(url, json=payload, timeout=timeout)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"]
                else:
                    print(f"[WARNING] Gemini API {model_name} returned status {res.status_code}: {res.text[:150]}")
            except Exception as e:
                print(f"[WARNING] Gemini API {model_name} call error: {e}")

    # 2. Try OpenRouter
    if OPENROUTER_API_KEY:
        try:
            url = "https://openrouter.ai/api/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            }
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            if chat_history:
                for msg in chat_history:
                    role = "user" if getattr(msg, "role", "") == "user" or (isinstance(msg, dict) and msg.get("role") == "user") else "assistant"
                    content = getattr(msg, "content", "") if hasattr(msg, "content") else (msg.get("content", "") if isinstance(msg, dict) else str(msg))
                    if content:
                        messages.append({"role": role, "content": content})
            messages.append({"role": "user", "content": prompt})

            payload = {
                "model": "google/gemini-2.5-flash",
                "messages": messages
            }
            if json_mode:
                payload["response_format"] = {"type": "json_object"}

            res = requests.post(url, json=payload, headers=headers, timeout=timeout)
            if res.status_code == 200:
                data = res.json()
                choices = data.get("choices", [])
                if choices and "message" in choices[0]:
                    return choices[0]["message"].get("content", "")
            else:
                print(f"[WARNING] OpenRouter returned status {res.status_code}: {res.text[:150]}")
        except Exception as e:
            print(f"[WARNING] OpenRouter call error: {e}")

    raise RuntimeError("All configured AI providers failed or are unavailable.")

def call_llm_stream(prompt: str, system_instruction: str = None, chat_history: list = None, timeout: int = 35, system_prompt: str = None, **kwargs):
    system_instruction = system_instruction or system_prompt
    """
    Yields streamed text tokens from Google Gemini REST streaming API or OpenRouter with fallback.
    """
    # 1. Try Google Gemini REST Streaming
    if GEMINI_API_KEY:
        gemini_models = ["gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"]
        for model_name in gemini_models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:streamGenerateContent?key={GEMINI_API_KEY}&alt=sse"
                raw_contents = []
                if chat_history:
                    for msg in chat_history:
                        role = "user" if getattr(msg, "role", "") == "user" or (isinstance(msg, dict) and msg.get("role") == "user") else "model"
                        content = getattr(msg, "content", "") if hasattr(msg, "content") else (msg.get("content", "") if isinstance(msg, dict) else str(msg))
                        if content:
                            raw_contents.append({"role": role, "parts": [{"text": content}]})

                raw_contents.append({"role": "user", "parts": [{"text": prompt}]})

                # Merge consecutive roles for Gemini API format compliance
                contents = []
                for item in raw_contents:
                    if contents and contents[-1]["role"] == item["role"]:
                        contents[-1]["parts"][0]["text"] += "\n" + item["parts"][0]["text"]
                    else:
                        contents.append(item)

                payload = {"contents": contents}
                if system_instruction:
                    payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

                res = requests.post(url, json=payload, stream=True, timeout=timeout)
                if res.status_code == 200:
                    yielded_any = False
                    for line in res.iter_lines():
                        if not line:
                            continue
                        line_str = line.decode("utf-8")
                        if line_str.startswith("data: "):
                            data_str = line_str[6:].strip()
                            if data_str == "[DONE]":
                                break
                            try:
                                data = json.loads(data_str)
                                candidates = data.get("candidates", [])
                                if candidates and "content" in candidates[0]:
                                    parts = candidates[0]["content"].get("parts", [])
                                    for part in parts:
                                        text_chunk = part.get("text", "")
                                        if text_chunk:
                                            yielded_any = True
                                            yield text_chunk
                            except Exception:
                                pass
                    if yielded_any:
                        return
                else:
                    print(f"[WARNING] Gemini Stream {model_name} returned status {res.status_code}: {res.text[:120]}")
            except Exception as e:
                print(f"[WARNING] Gemini Stream {model_name} call error: {e}")

    # 2. Try OpenRouter Streaming
    if OPENROUTER_API_KEY:
        try:
            url = "https://openrouter.ai/api/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            }
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            if chat_history:
                for msg in chat_history:
                    role = "user" if getattr(msg, "role", "") == "user" or (isinstance(msg, dict) and msg.get("role") == "user") else "assistant"
                    content = getattr(msg, "content", "") if hasattr(msg, "content") else (msg.get("content", "") if isinstance(msg, dict) else str(msg))
                    if content:
                        messages.append({"role": role, "content": content})
            messages.append({"role": "user", "content": prompt})

            payload = {
                "model": "google/gemini-2.5-flash",
                "messages": messages,
                "stream": True
            }

            res = requests.post(url, json=payload, headers=headers, stream=True, timeout=timeout)
            if res.status_code == 200:
                yielded_any = False
                for line in res.iter_lines():
                    if not line:
                        continue
                    line_str = line.decode("utf-8")
                    if line_str.startswith("data: "):
                        data_str = line_str[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            choices = data.get("choices", [])
                            if choices and "delta" in choices[0]:
                                chunk = choices[0]["delta"].get("content", "")
                                if chunk:
                                    yielded_any = True
                                    yield chunk
                        except Exception:
                            pass
                if yielded_any:
                    return
        except Exception as e:
            print(f"[WARNING] OpenRouter stream error: {e}")

    raise RuntimeError("All configured AI providers failed streaming.")

# -------------------------------------------------------------
# HELPER: Multilingual Detection & Translation Layer (Option 2)
# -------------------------------------------------------------
def is_non_english(text: str) -> bool:
    """Detects if text contains significant non-Latin/Indic/CJK/Arabic characters."""
    if not text:
        return False
    non_latin = re.findall(r'[\u0600-\u06FF\u0900-\u0D7F\u4E00-\u9FFF\u3040-\u30FF\u0400-\u04FF]', text)
    return len(non_latin) > 20

def translate_to_english(text: str) -> str:
    """Translates regional language text to natural English using Gemini LLM."""
    if not text or not is_non_english(text):
        return text
    try:
        # Segment into chunks of ~5000 chars along word boundaries
        words = text.split()
        current_chunk = []
        current_len = 0
        chunks = []
        for w in words:
            current_chunk.append(w)
            current_len += len(w) + 1
            if current_len >= 5000:
                chunks.append(" ".join(current_chunk))
                current_chunk = []
                current_len = 0
        if current_chunk:
            chunks.append(" ".join(current_chunk))

        translated_parts = []
        for segment in chunks[:6]:  # Translate up to ~30,000 characters
            prompt = f"""Translate the following regional language text accurately into natural English. Retain all names, cricket terms, player names, technical concepts, numbers, and facts faithfully. Return ONLY the English translation without introductory remarks:

{segment}"""
            translated = call_llm(prompt, timeout=25)
            translated = re.sub(r'^(?:Here is the translation|Translation|Here is an accurate translation[^:]*):\s*', '', translated, flags=re.IGNORECASE)
            translated_parts.append(translated.strip())
        return " ".join(translated_parts).strip()
    except Exception as e:
        print(f"[WARNING] Translation to English failed: {e}")
        return text

# -------------------------------------------------------------
# HELPER: Multilingual Detection & Translation Layer (Option 2)
# -------------------------------------------------------------
def is_non_english(text: str) -> bool:
    """Detects if text contains significant non-Latin/Indic/CJK/Arabic characters."""
    if not text:
        return False
    non_latin = re.findall(r'[\u0600-\u06FF\u0900-\u0D7F\u4E00-\u9FFF\u3040-\u30FF\u0400-\u04FF]', text)
    return len(non_latin) > 20

def translate_to_english(text: str) -> str:
    """Translates regional language text to natural English using Gemini LLM."""
    if not text or not is_non_english(text):
        return text
    try:
        # Segment into chunks of ~5000 chars along word boundaries
        words = text.split()
        current_chunk = []
        current_len = 0
        chunks = []
        for w in words:
            current_chunk.append(w)
            current_len += len(w) + 1
            if current_len >= 5000:
                chunks.append(" ".join(current_chunk))
                current_chunk = []
                current_len = 0
        if current_chunk:
            chunks.append(" ".join(current_chunk))

        translated_parts = []
        for segment in chunks[:6]:  # Translate up to ~30,000 characters
            prompt = f"""Translate the following regional language text accurately into natural English. Retain all names, cricket terms, player names, technical concepts, numbers, and facts faithfully. Return ONLY the English translation without introductory remarks:

{segment}"""
            translated = call_llm(prompt, timeout=25)
            translated = re.sub(r'^(?:Here is the translation|Translation|Here is an accurate translation[^:]*):\s*', '', translated, flags=re.IGNORECASE)
            translated_parts.append(translated.strip())
        return " ".join(translated_parts).strip()
    except Exception as e:
        print(f"[WARNING] Translation to English failed: {e}")
        return text

# -------------------------------------------------------------
# HELPER: Text Chunking Strategy
# -------------------------------------------------------------
def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150) -> list:
    chunks = []
    start = 0
    text_len = len(text)
    if text_len == 0:
        return []
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunks.append(text[start:end])
        if end == text_len:
            break
        start += (chunk_size - overlap)
    return chunks

# -------------------------------------------------------------
# HELPER: Insert Chunks & Embeddings into PostgreSQL
# -------------------------------------------------------------
def insert_document_chunks_to_db(conn, item_id: str, page_chunks: list, title: str = "", file_name: str = "", content: str = "", kind: str = "document"):
    """
    Stores vector embeddings into public.document_chunks.
    Ensures parent study_items row exists so foreign key constraint is satisfied.
    """
    if not conn or not page_chunks:
        return

    # Filter out virtual items
    if item_id.startswith("default-") or item_id.startswith("default"):
        return

    try:
        cur = conn.cursor()
        clean_title = title or "Study Resource"

        # Ensure parent item exists / update content
        cur.execute("SELECT id FROM public.study_items WHERE id = %s::uuid", (item_id,))
        exists = cur.fetchone()
        if exists:
            cur.execute(
                """
                UPDATE public.study_items
                SET content = %s,
                    title = COALESCE(NULLIF(%s, ''), title),
                    file_name = COALESCE(NULLIF(%s, ''), file_name)
                WHERE id = %s::uuid
                """,
                (content or "", clean_title, file_name or clean_title, item_id)
            )
        else:
            cur.execute("SELECT id FROM auth.users LIMIT 1")
            user_row = cur.fetchone()
            fallback_user_id = user_row[0] if user_row else None
            if fallback_user_id:
                cur.execute(
                    """
                    INSERT INTO public.study_items (id, title, kind, file_name, content, profile_id)
                    VALUES (%s::uuid, %s, %s, %s, %s, %s::uuid)
                    """,
                    (item_id, clean_title, kind, file_name or clean_title, content or "", fallback_user_id)
                )

        # Clear previous chunks for this item if re-ingesting
        cur.execute("DELETE FROM public.document_chunks WHERE item_id = %s::uuid", (item_id,))

        data_list = []
        for p_item_id, page_num, chunk_text_content in page_chunks:
            emb = get_embedding(chunk_text_content, fast=False)
            data_list.append((p_item_id, page_num, chunk_text_content, emb))

        if data_list:
            execute_values(
                cur,
                """
                INSERT INTO public.document_chunks (item_id, page_number, chunk_text, embedding)
                VALUES %s
                """,
                data_list,
                template="(%s::uuid, %s, %s, %s::vector)"
            )
            conn.commit()
            print(f"[RAG] Successfully inserted {len(data_list)} vector chunks for item {item_id}")
        cur.close()
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"[ERROR] Failed to insert document chunks for {item_id}: {e}")

# -------------------------------------------------------------
# HELPER: AI Generation Router (Flashcards, Quizzes, Summary)
# -------------------------------------------------------------
def generate_study_materials(content_text: str, title: str):
    """
    Generates study guides, 5 flashcards, and 3 quiz questions.
    Uses AI if available, else falls back to robust local semantic parsing.
    """
    prompt = f"""
    Analyze the following academic document:
    Title: {title}
    Content:
    {content_text[:4000]}
    
    Respond strictly in JSON format with three fields:
    1. "summary": A brief markdown summary outlining key topics.
    2. "flashcards": An array of 5 objects containing "question", "answer", "hint".
    3. "quiz": An array of 3 objects containing "question", "options" (array of 4 strings), "answer" (0-3 index of correct option), "explanation".
    """

    try:
        reply_text = call_llm(prompt, json_mode=True, timeout=25)
        json_match = re.search(r'\{.*\}', reply_text, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
            if isinstance(parsed, dict) and "flashcards" in parsed and "quiz" in parsed:
                return {
                    "summary": parsed.get("summary", f"### Document Summary: {title}\nSummary of study topics."),
                    "flashcards": parsed.get("flashcards", []),
                    "quiz": parsed.get("quiz", [])
                }
    except Exception as e:
        print(f"[WARNING] AI study material generation fallback activated: {e}")

    # FALLBACK: Structured Socratic Generator
    keywords = re.findall(r'\b[A-Za-z]{4,}\b', content_text)
    primary_terms = list(dict.fromkeys([k for k in keywords if len(k) > 4]))[:5]
    if len(primary_terms) < 3:
        primary_terms = ["Analysis", "Concepts", "Structure", "Applications", "Summary"]

    flashcards = []
    for term in primary_terms:
        flashcards.append({
          "question": f"Explain the core definition and context of '{term}' in this resource.",
          "answer": f"Based on content analysis, '{term}' is a key concept introduced to explain related details and structural applications.",
          "hint": f"Look for sections discussing {term}."
        })

    quiz = [
      {
        "question": f"Which of the following describes the role of '{primary_terms[0]}' in this study guide?",
        "options": [
          f"A central concept supporting the structural arguments",
          "A minor placeholder item",
          "An outdated secondary reference",
          "None of the above"
        ],
        "answer": 0,
        "explanation": f"The document highlights {primary_terms[0]} as a central pillar of the study outline."
      },
      {
        "question": f"What is the main objective of analyzing '{primary_terms[1]}'?",
        "options": [
          "To ignore practical applications",
          "To build Socratic understanding and prepare for exam retrieval",
          "To compile source citation codes",
          "To translate the document pages"
        ],
        "answer": 1,
        "explanation": "Examining these terms increases active recall scores and strengthens conceptual preparation."
      }
    ]

    return {
        "summary": f"### Document Summary: {title}\nThis document contains structured details about {', '.join(primary_terms[:3])}.",
        "flashcards": flashcards,
        "quiz": quiz
    }

# -------------------------------------------------------------
# HELPER: Extract text from DOCX (Word Documents)
# -------------------------------------------------------------
def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as docx:
            xml_content = docx.read('word/document.xml')
            matches = re.findall(r'<w:t[^>]*>(.*?)</w:t>', xml_content.decode('utf-8'))
            text = "".join(matches)
            text = text.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
            return text
    except Exception as e:
        print(f"[ERROR] DOCX extraction failed: {e}")
        return ""

# -------------------------------------------------------------
# API ENDPOINT: PROCESS PDF / DOCX / TXT & STORE RAG CHUNKS
# -------------------------------------------------------------
@app.post("/process-pdf")
async def process_pdf(file: UploadFile = File(...), item_id: str = Form(...)):
    validate_uuid_string(item_id)
    conn = get_db_connection()
    try:
        file_bytes = await file.read()
        filename_lower = file.filename.lower()
        full_text = ""
        page_chunks = []

        # 1. Parse content based on file type
        try:
            if filename_lower.endswith(".docx"):
                print(f"[INFO] Ingesting Word Document (.docx): {file.filename}")
                full_text = extract_text_from_docx(file_bytes)
                if full_text.strip():
                    chunks = chunk_text(full_text)
                    for chunk in chunks:
                        if chunk.strip():
                            page_chunks.append((item_id, 1, chunk))

            elif filename_lower.endswith(".txt") or filename_lower.endswith(".md"):
                print(f"[INFO] Ingesting Plain Text File (.txt/.md): {file.filename}")
                full_text = file_bytes.decode("utf-8", errors="ignore")
                if full_text.strip():
                    chunks = chunk_text(full_text)
                    for chunk in chunks:
                        if chunk.strip():
                            page_chunks.append((item_id, 1, chunk))

            else:
                # Treat as PDF
                print(f"[INFO] Ingesting PDF Document: {file.filename}")
                pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                for idx, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text() or ""
                    full_text += page_text + "\n"
                    chunks = chunk_text(page_text)
                    for chunk in chunks:
                        if chunk.strip():
                            page_chunks.append((item_id, idx + 1, chunk))

        except Exception as parse_error:
            print(f"[WARNING] Native parsing failed for {file.filename}: {parse_error}.")
            full_text = ""

        # 2. Dynamic fallback text if empty
        if not full_text.strip():
            clean_title = file.filename.split('.')[0].replace("_", " ").replace("-", " ")
            full_text = (
                f"This study workspace covers topics related to {clean_title}.\n\n"
                f"The document '{file.filename}' is a layout file, office document, or scanned asset. "
                f"Please open or download the original file to read, and use this study center to generate quizzes, "
                f"study guides, and practice active recall concepts about {clean_title}."
            )
            page_chunks.append((item_id, 1, full_text))

        # 3. Insert Chunks with Embeddings into pgvector
        clean_title = file.filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ")

        # Multilingual Option 2: Check for regional language in uploaded document
        effective_content = full_text
        if full_text.strip() and is_non_english(full_text):
            print(f"[Document] Regional language detected in '{file.filename}'. Translating to English layer...")
            english_doc = translate_to_english(full_text)
            if english_doc and english_doc != full_text:
                effective_content = english_doc
                en_chunks = chunk_text(english_doc)
                for idx, c in enumerate(en_chunks):
                    page_chunks.append((item_id, idx + 1, f"[English Translation]:\n{c}"))

        if conn:
            insert_document_chunks_to_db(
                conn,
                item_id=item_id,
                page_chunks=page_chunks,
                title=clean_title,
                file_name=file.filename,
                content=effective_content,
                kind="pdf"
            )

        # 4. Generate flashcards and quizzes
        materials = generate_study_materials(effective_content, file.filename)

        return {
            "content": full_text,
            "flashcards": materials["flashcards"],
            "quiz": materials["quiz"]
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

# -------------------------------------------------------------
# API ENDPOINT: YOUTUBE ROADMAP & TRANSCRIPT RAG
# -------------------------------------------------------------
class YoutubePayload(BaseModel):
    url: str
    item_id: str

@app.post("/process-youtube")
async def process_youtube(payload: YoutubePayload):
    validate_uuid_string(payload.item_id)
    conn = get_db_connection()

    video_id = "dQw4w9WgXcQ"
    reg = r'(?:v=|\/)([0-9A-Za-z_-]{11}).*'
    match = re.search(reg, payload.url)
    if match:
        video_id = match.group(1)

    def format_seconds(seconds: float) -> str:
        total_sec = int(seconds)
        minutes = total_sec // 60
        secs = total_sec % 60
        return f"{minutes:02d}:{secs:02d}"

    video_title = f"YouTube Video ({video_id})"
    try:
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        res = requests.get(oembed_url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            video_title = data.get("title", video_title)
    except Exception:
        pass

    transcript_data = []
    full_text = ""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        srt = None
        # Support both new instance API (YouTubeTranscriptApi().fetch) and legacy static API
        try:
            if hasattr(YouTubeTranscriptApi, 'get_transcript'):
                try:
                    srt = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'hi', 'te', 'ta', 'en-US'])
                except Exception:
                    srt = YouTubeTranscriptApi.get_transcript(video_id)
            else:
                api = YouTubeTranscriptApi()
                try:
                    srt = api.fetch(video_id, languages=['en', 'hi', 'te', 'ta', 'en-US'])
                except Exception:
                    try:
                        srt = api.fetch(video_id)
                    except Exception:
                        transcript_list = api.list(video_id)
                        srt = transcript_list.find_transcript(['en', 'hi', 'te', 'ta', 'en-US']).fetch()
        except Exception as e1:
            print(f"[YouTube] Primary transcript retrieval failed: {e1}. Trying fallback listing...")
            try:
                api = YouTubeTranscriptApi() if callable(YouTubeTranscriptApi) else YouTubeTranscriptApi
                t_list = api.list(video_id) if hasattr(api, 'list') else YouTubeTranscriptApi.list_transcripts(video_id)
                for t in t_list:
                    srt = t.fetch()
                    break
            except Exception as e2:
                print(f"[YouTube] Secondary transcript retrieval failed: {e2}")

        if srt:
            for entry in srt:
                seconds = entry.start if hasattr(entry, 'start') else (entry.get('start', 0.0) if isinstance(entry, dict) else 0.0)
                text = entry.text if hasattr(entry, 'text') else (entry.get('text', '') if isinstance(entry, dict) else str(entry))
                time_str = format_seconds(seconds)
                transcript_data.append({
                    "text": text,
                    "time": time_str,
                    "seconds": int(seconds)
                })
                full_text += text + " "
            print(f"[YouTube] Successfully fetched {len(transcript_data)} transcript segments for video {video_id}")
    except Exception as e:
        print(f"[WARNING] YouTube transcript extraction failed for video {video_id}: {e}.")

    # Generate chapters & study materials
    chapters = []
    flashcards = []
    quiz = []
    summary_content = f"### Study Session: {video_title}\n\n"

    if full_text.strip():
        # Option 2: Multilingual Detection & Dual-Ingestion Translation Layer
        english_text = ""
        is_regional = is_non_english(full_text)
        if is_regional:
            print(f"[YouTube] Regional transcript detected for '{video_title}'. Translating to English layer...")
            english_text = translate_to_english(full_text)
            print(f"[YouTube] Successfully translated {len(english_text)} English characters.")

        # Store transcript chunks into pgvector
        page_chunks = []
        if is_regional and english_text.strip():
            # Dual-ingestion: Store bilingual & English chunks for direct cross-lingual vector retrieval
            en_chunks = chunk_text(english_text)
            orig_chunks = chunk_text(full_text)

            # 1. Primary English semantic chunks (match English questions directly)
            for idx, c in enumerate(en_chunks):
                page_chunks.append((payload.item_id, idx + 1, f"[English Translation]:\n{c}"))

            # 2. Original regional transcript chunks (for regional questions & citations)
            for idx, c in enumerate(orig_chunks):
                page_chunks.append((payload.item_id, idx + 1, f"[Original Transcript]:\n{c}"))
        else:
            chunks = chunk_text(full_text)
            for idx, chunk in enumerate(chunks):
                page_chunks.append((payload.item_id, idx + 1, chunk))

        effective_content = english_text if (is_regional and english_text.strip()) else full_text

        if conn:
            insert_document_chunks_to_db(
                conn,
                item_id=payload.item_id,
                page_chunks=page_chunks,
                title=video_title,
                file_name=video_title,
                content=effective_content,
                kind="youtube"
            )

        prompt = f"""
        Analyze the following YouTube video transcript:
        Title: {video_title}
        Transcript Context:
        {effective_content[:8000]}
        
        Respond strictly in JSON format with four fields:
        1. "summary": A brief markdown summary outlining the key topics of the video.
        2. "chapters": An array of objects representing major timestamps/sections in the video. Each object must have "title", "time" (format MM:SS), "seconds" (integer seconds). Example: {{"title": "Introduction", "time": "00:00", "seconds": 0}}. Generate 3 to 6 major chapters based on when the topics naturally transition.
        3. "flashcards": An array of 5 objects containing "question", "answer", "hint".
        4. "quiz": An array of 3 objects containing "question", "options" (array of 4 strings), "answer" (0-3 index of correct option), "explanation".
        """
        try:
            reply_text = call_llm(prompt, json_mode=True, timeout=30)
            json_match = re.search(r'\{.*\}', reply_text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
                summary_content = parsed.get("summary", summary_content)
                chapters = parsed.get("chapters", [])
                flashcards = parsed.get("flashcards", [])
                quiz = parsed.get("quiz", [])
        except Exception as ai_e:
            print(f"[WARNING] AI YouTube processing failed: {ai_e}")

    if not chapters:
        total_duration = transcript_data[-1]["seconds"] if transcript_data else 300
        chapters = [
            {"title": "Introduction", "time": "00:00", "seconds": 0},
            {"title": "Core Discussion", "time": "01:30", "seconds": 90},
            {"title": "Key Takeaways", "time": format_seconds(total_duration // 2), "seconds": total_duration // 2}
        ]

    if not flashcards or not quiz:
        fallback_materials = generate_study_materials(full_text[:3000] if full_text.strip() else video_title, video_title)
        flashcards = flashcards or fallback_materials["flashcards"]
        quiz = quiz or fallback_materials["quiz"]
        if not full_text.strip():
            summary_content += f"This YouTube video does not contain a pre-generated transcript. A study guide has been synthesized from '{video_title}'."
        else:
            summary_content = summary_content or fallback_materials["summary"]

    if conn:
        conn.close()

    return {
        "title": video_title,
        "video_id": video_id,
        "content": summary_content,
        "chapters": chapters,
        "transcript": transcript_data,
        "flashcards": flashcards,
        "quiz": quiz
    }

# -------------------------------------------------------------
# API ENDPOINTS: WEBSITES, ADD TEXT, DEEP RESEARCH
# -------------------------------------------------------------
class UrlPayload(BaseModel):
    url: str
    item_id: str

@app.post("/process-website")
async def process_website(payload: UrlPayload):
    validate_uuid_string(payload.item_id)
    conn = get_db_connection()

    scraped_text = ""
    title = f"Web Page: {payload.url}"
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        res = requests.get(payload.url, headers=headers, timeout=10)
        if res.status_code == 200:
            html = res.text
            # Basic text extraction from HTML
            text = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
            text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
            text = re.sub(r'<[^>]+>', ' ', text)
            text = re.sub(r'\s+', ' ', text).strip()
            scraped_text = text[:10000]
            # Extract title if present
            title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
            if title_match:
                title = title_match.group(1).strip()
    except Exception as e:
        print(f"[WARNING] Website scraping error: {e}")

    if not scraped_text:
        scraped_text = f"Scraped content from {payload.url}.\nFeatures modern web application components, documentation, and conceptual guides."

    # Multilingual Option 2: Check for regional language
    effective_text = scraped_text
    if scraped_text.strip() and is_non_english(scraped_text):
        english_web = translate_to_english(scraped_text)
        if english_web and english_web != scraped_text:
            effective_text = english_web

    # Store vector chunks into pgvector
    if conn:
        chunks = chunk_text(scraped_text)
        page_chunks = [(payload.item_id, idx + 1, c) for idx, c in enumerate(chunks)]
        if effective_text != scraped_text:
            en_chunks = chunk_text(effective_text)
            for idx, c in enumerate(en_chunks):
                page_chunks.append((payload.item_id, idx + 1, f"[English Translation]:\n{c}"))

        insert_document_chunks_to_db(
            conn,
            item_id=payload.item_id,
            page_chunks=page_chunks,
            title=title,
            file_name=payload.url,
            content=effective_text,
            kind="website"
        )
        conn.close()

    materials = generate_study_materials(effective_text, title)
    return {
        "content": scraped_text,
        "flashcards": materials["flashcards"],
        "quiz": materials["quiz"]
    }

class TextPayload(BaseModel):
    text: str
    item_id: str

@app.post("/process-text")
async def process_text(payload: TextPayload):
    validate_uuid_string(payload.item_id)
    conn = get_db_connection()

    # Multilingual Option 2: Check for regional language in pasted notes
    effective_text = payload.text
    if payload.text.strip() and is_non_english(payload.text):
        english_notes = translate_to_english(payload.text)
        if english_notes and english_notes != payload.text:
            effective_text = english_notes

    # Store vector chunks into pgvector
    if conn:
        chunks = chunk_text(payload.text)
        page_chunks = [(payload.item_id, idx + 1, c) for idx, c in enumerate(chunks)]
        if effective_text != payload.text:
            en_chunks = chunk_text(effective_text)
            for idx, c in enumerate(en_chunks):
                page_chunks.append((payload.item_id, idx + 1, f"[English Translation]:\n{c}"))

        insert_document_chunks_to_db(
            conn,
            item_id=payload.item_id,
            page_chunks=page_chunks,
            title="Pasted Notes",
            file_name="Pasted Notes",
            content=effective_text,
            kind="text"
        )
        conn.close()

    materials = generate_study_materials(effective_text, "Pasted Notes")
    return {
        "flashcards": materials["flashcards"],
        "quiz": materials["quiz"]
    }

class ResearchPayload(BaseModel):
    topic: str
    item_id: str

@app.post("/process-research")
async def process_research(payload: ResearchPayload):
    validate_uuid_string(payload.item_id)
    conn = get_db_connection()

    report = ""
    prompt = f"""You are an elite academic researcher. Generate a comprehensive, deep-dive research dossier on the topic: '{payload.topic}'.
Include:
1. Executive Overview
2. Historical & Theoretical Background
3. Key Pillars and Technical Mechanisms
4. Case Studies and Practical Applications
5. Future Outlook and Critical Open Challenges

Write in rich Markdown with clear headings (H2, H3), bullet points, and key takeaways."""

    try:
        report = call_llm(prompt, timeout=30)
    except Exception as e:
        print(f"[WARNING] Research report generation fallback: {e}")
        report = f"# Research Dossier: {payload.topic}\n\n## Introduction\nDetailed findings and conceptual breakdown on {payload.topic}.\n\n## Core Concepts\nKey foundations supporting {payload.topic} across modern workflows."

    # Store vector chunks into pgvector
    if conn:
        chunks = chunk_text(report)
        page_chunks = [(payload.item_id, idx + 1, c) for idx, c in enumerate(chunks)]
        insert_document_chunks_to_db(
            conn,
            item_id=payload.item_id,
            page_chunks=page_chunks,
            title=f"Research: {payload.topic}",
            file_name=f"Research: {payload.topic}",
            content=report,
            kind="research"
        )
        conn.close()

    materials = generate_study_materials(report, payload.topic)
    return {
        "content": report,
        "flashcards": materials["flashcards"],
        "quiz": materials["quiz"]
    }

# -------------------------------------------------------------
# API ENDPOINT: CHAT (RAG COSINE DISTANCE MATCHING)
# -------------------------------------------------------------
# Semaphore to cap concurrent AI requests at 30 to scale smoothly for 1,000+ users
AI_CONCURRENCY_SEMAPHORE = asyncio.Semaphore(30)

class ChatHistoryMessage(BaseModel):
    role: str
    content: str

class ChatPayload(BaseModel):
    item_id: str
    question: str
    chat_history: list[ChatHistoryMessage] = []
    context: str = ""
    stream: bool = False

@app.post("/chat")
async def chat(payload: ChatPayload):
    validate_uuid_string(payload.item_id)
    conn = get_db_connection()

    try:
        search_query = payload.question

        # 1. Condense query if chat history exists
        if payload.chat_history:
            try:
                history_text = "\n".join([
                    f"{'User' if m.role == 'user' else 'Assistant'}: {m.content}"
                    for m in payload.chat_history[-5:]
                ])
                condensation_prompt = f"""Given the conversation history and a follow-up question, rewrite the follow-up question to be a single standalone search query containing all key context. Do not answer it.
Conversation History:
{history_text}
Follow-up Question: {payload.question}
Standalone Search Query:"""

                condensed = call_llm(condensation_prompt, timeout=10).strip()
                condensed = re.sub(r'^["\'`]+|["\'`]+$', '', condensed).strip()
                if condensed and len(condensed) > 3:
                    search_query = condensed
                print(f"[RAG] Question: '{payload.question}' -> Query: '{search_query}'")
            except Exception as e:
                print(f"[WARNING] Query condensation skipped: {e}")

        # 2. Extract page numbers if explicitly requested
        page_numbers = []
        for text_to_check in [payload.question, search_query]:
            matches1 = re.findall(r'(?:page|pg\.?|p\.)\s*(\d+)', text_to_check, re.IGNORECASE)
            for m in matches1:
                page_numbers.append(int(m))
            matches2 = re.findall(r'(\d+)\s*(?:th|rd|st|nd)?\s*page', text_to_check, re.IGNORECASE)
            for m in matches2:
                page_numbers.append(int(m))
        page_numbers = list(set(page_numbers))

        item_ids = list(dict.fromkeys([x.strip() for x in payload.item_id.split(",") if x.strip() and not x.startswith("default")]))
        matches = []
        matched_ids = set()
        context = ""
        item_kind = "document"

        if conn and item_ids:
            cur = conn.cursor()

            # Priority 1: Page-specific chunk retrieval
            if page_numbers:
                cur.execute(
                    """
                    SELECT c.chunk_text, c.page_number, s.title, s.file_name, c.item_id
                    FROM public.document_chunks c
                    JOIN public.study_items s ON c.item_id = s.id
                    WHERE c.item_id = ANY(%s::uuid[]) AND c.page_number = ANY(%s)
                    ORDER BY c.page_number ASC
                    LIMIT 8
                    """,
                    (item_ids, page_numbers)
                )
                matches = cur.fetchall()

            # Priority 2: Vector RAG search with Cosine Distance
            if not matches:
                query_embedding = get_embedding(search_query, fast=False)
                cur.execute(
                    """
                    SELECT c.chunk_text, c.page_number, s.title, s.file_name, c.item_id, (c.embedding <=> %s::vector) AS distance
                    FROM public.document_chunks c
                    JOIN public.study_items s ON c.item_id = s.id
                    WHERE c.item_id = ANY(%s::uuid[])
                    ORDER BY c.embedding <=> %s::vector ASC
                    LIMIT 8
                    """,
                    (query_embedding, item_ids, query_embedding)
                )
                raw_matches = cur.fetchall()
                # Accept top nearest chunks
                matches = raw_matches[:8]

            if matches:
                matched_ids = {str(m[4]) for m in matches}

            # Priority 3: Retrieve full document summary/transcripts for context
            cur.execute(
                """
                SELECT kind, content, transcript, youtube_url, title, file_name, id
                FROM public.study_items
                WHERE id = ANY(%s::uuid[])
                """,
                (item_ids,)
            )
            rows = cur.fetchall()
            cur.close()

            context_parts = []
            if matches:
                for m in matches:
                    source_name = m[3] if m[3] else m[2]
                    page_label = f"Page {m[1]}" if m[1] else "Section"
                    context_parts.append(f"[Source: {source_name}, {page_label}]:\n{m[0]}")

            for row in rows:
                row_id = str(row[6])
                row_kind = row[0] or "document"
                item_content = row[1] or ""
                item_transcript = row[2]
                youtube_url = row[3] or ""
                item_title = row[4] or "Resource"
                item_file_name = row[5] or item_title
                source_name = item_file_name if row_kind == "pdf" else item_title

                # Include content/transcripts if this source was not present in vector matches
                if row_id not in matched_ids or not matches:
                    if item_content and item_content.strip():
                        context_parts.append(f"[Source Overview for '{source_name}']:\n{item_content[:3000]}")

                if item_transcript:
                    try:
                        if isinstance(item_transcript, str):
                            item_transcript = json.loads(item_transcript)
                        if isinstance(item_transcript, list) and item_transcript:
                            transcript_text = "\n".join(
                                [f"[{t.get('time','?')}] {t.get('text','')}" for t in item_transcript[:40]]
                            )
                            if row_id not in matched_ids:
                                context_parts.append(f"[Video Transcript for '{source_name}']:\n{transcript_text}")
                    except Exception:
                        pass

                item_kind = row_kind

            if context_parts:
                context = "\n\n".join(context_parts)

        # Supplement with client-provided context if database context is minimal
        if payload.context and payload.context.strip():
            if context and context.strip() and "No specific content" not in context:
                context = f"{context}\n\n[Active Client Context]:\n{payload.context[:4000]}"
            else:
                context = payload.context[:8000]

        if not context or not context.strip():
            context = "No specific content was stored for the selected items."

        # 3. Build Prompt & Execute AI Generation
        if len(item_ids) > 1:
            kind_label = f"multiple knowledge sources ({len(item_ids)} resources including documents, lectures, and notes)"
        else:
            kind_label = {
                "youtube": "YouTube video lecture",
                "website": "web page",
                "text": "pasted notes",
                "research": "deep research report",
                "pdf": "PDF document"
            }.get(item_kind, "study resource")

        system_instruction = f"""You are an expert, highly knowledgeable AI study assistant.
The user is studying {kind_label}.

PRIMARY OBJECTIVES:
1. Provide extremely clear, beautifully structured, and comprehensive answers.
2. Directly answer the user's question using the provided source context. When multiple resources are available, synthesize information across ALL provided sources.
3. If the user asks about a specific resource or topic (e.g. YouTube video, mock interviews, Tech Vedhu, or document), locate that information in the retrieved context and answer it thoroughly.
4. IMPORTANT CITATION RULE: Whenever citing facts from the source, append an inline citation in the format `[Page X]` for documents or `[MM:SS]` for videos (e.g., "The concept is defined as... [Page 2]" or "[01:30]").
5. If the exact answer isn't fully covered in the context, seamlessly supplement using your vast AI knowledge while mentioning that you are supplementing with general knowledge.
6. End with a friendly, conversational follow-up inviting deeper exploration."""

        user_prompt = f"""Retrieved Source Context:
{context}

Question: {payload.question}"""

        if payload.stream:
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass
                conn = None

            async def generate_chat_stream():
                async with AI_CONCURRENCY_SEMAPHORE:
                    try:
                        try:
                            for chunk in call_llm_stream(
                                prompt=user_prompt,
                                system_instruction=system_instruction,
                                chat_history=payload.chat_history,
                                timeout=30
                            ):
                                yield f"data: {json.dumps({'token': chunk, 'text': chunk})}\n\n"
                        except Exception as ai_e:
                            print(f"[WARNING] Remote AI stream failed: {ai_e}. Using synthesized fallback.")
                            fallback_reply = f"Based on your {kind_label}, here is the information regarding **{payload.question}**:\n\n"
                            if matches:
                                fallback_reply += f"> {matches[0][0][:400]}...\n\n"
                                fallback_reply += "I've extracted this from your study resource. Would you like a deeper breakdown of any specific concept?"
                            elif context and "No specific content" not in context:
                                fallback_reply += f"{context[:600]}\n\nFeel free to ask follow-up questions to explore further!"
                            else:
                                fallback_reply += f"I analyzed your study materials for '{payload.question}'. Upload additional notes or select active sources to see page-specific citations!"

                            words = fallback_reply.split(" ")
                            for idx, w in enumerate(words):
                                token = w + (" " if idx < len(words) - 1 else "")
                                yield f"data: {json.dumps({'token': token, 'text': token})}\n\n"
                                await asyncio.sleep(0.015)

                        yield "data: [DONE]\n\n"
                    except Exception as stream_err:
                        yield f"data: {json.dumps({'error': str(stream_err)})}\n\n"
                        yield "data: [DONE]\n\n"

            return StreamingResponse(
                generate_chat_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                }
            )

        async with AI_CONCURRENCY_SEMAPHORE:
            try:
                reply = call_llm(
                    prompt=user_prompt,
                    system_instruction=system_instruction,
                    chat_history=payload.chat_history,
                    timeout=30
                )
            except Exception as ai_e:
                print(f"[WARNING] Remote AI chat failed: {ai_e}. Using synthesized fallback.")
                reply = f"Based on your {kind_label}, here is the information regarding **{payload.question}**:\n\n"
                if matches:
                    reply += f"> {matches[0][0][:400]}...\n\n"
                    reply += "I've extracted this from your study resource. Would you like a deeper breakdown of any specific concept?"
                elif context and "No specific content" not in context:
                    reply += f"{context[:600]}\n\nFeel free to ask follow-up questions to explore further!"
                else:
                    reply += f"I analyzed your study materials for '{payload.question}'. Upload additional notes or select active sources to see page-specific citations!"

        return {"answer": reply}

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@app.post("/chat/stream")
async def chat_stream(payload: ChatPayload):
    payload.stream = True
    return await chat(payload)

# -------------------------------------------------------------
# NOTEBOOK LM FEATURES: PODCAST, BRIEFING, TTS
# -------------------------------------------------------------
class GenerationPayload(BaseModel):
    item_id: str
    language: str = "English"
    instructions: str = ""
    format: str = "two-hosts"
    duration: str = "Medium (~10 mins)"
    pages: str = "All"
    host1Name: str = "Host 1"
    host2Name: str = "Host 2"

@app.get("/tts")
async def get_tts(text: str, voice: str):
    try:
        communicate = edge_tts.Communicate(text, voice)
        async def generate():
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]
        return StreamingResponse(generate(), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tts-full/{item_id}")
async def get_tts_full(item_id: str, voice1: str, voice2: str, h1Name: str = "Host 1"):
    validate_uuid_string(item_id)
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cur = conn.cursor()
        cur.execute("SELECT audio_script FROM public.study_items WHERE id = %s", (item_id,))
        item = cur.fetchone()
        cur.close()
    finally:
        conn.close()

    if not item or not item[0]:
        raise HTTPException(status_code=404, detail="No script found")

    script = item[0]
    if isinstance(script, str):
        script = json.loads(script)

    async def generate():
        for line in script:
            text = line.get("text", "")
            speaker = line.get("speaker", "")
            if not text:
                continue

            voice_id = voice1
            if speaker != "Alex" and speaker != h1Name and speaker != "Host 1":
                voice_id = voice2

            try:
                communicate = edge_tts.Communicate(text, voice_id)
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        yield chunk["data"]
            except Exception as e:
                print(f"Error generating TTS for line: {e}")

    return StreamingResponse(generate(), media_type="audio/mpeg", headers={
        "Content-Disposition": f"attachment; filename=\"podcast_{item_id}.mp3\""
    })

@app.post("/generate-podcast")
async def generate_podcast(payload: GenerationPayload):
    validate_uuid_string(payload.item_id)
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        item_ids = [x.strip() for x in payload.item_id.split(",") if x.strip() and not x.startswith("default")]
        cur = conn.cursor()

        cur.execute(
            """
            SELECT id, title, file_name, content, transcript, kind 
            FROM public.study_items 
            WHERE id = ANY(%s::uuid[])
            """,
            (item_ids,)
        )
        rows = cur.fetchall()

        context_parts = []
        for row in rows:
            item_title = row[1] or "Resource"
            item_file_name = row[2] or item_title
            content = row[3] or ""
            transcript = row[4]
            kind = row[5] or "document"
            source_name = item_file_name if kind == "pdf" else item_title

            context_text = f"--- Source: {source_name} ---\n"
            if content.strip():
                context_text += f"[Summary content]:\n{content}\n"
            if transcript and isinstance(transcript, list) and len(transcript) > 0:
                context_text += "[Transcript]:\n" + "\n".join([f"[{t.get('time','?')}] {t.get('text','')}" for t in transcript[:40]]) + "\n"

            cur.execute("SELECT chunk_text, page_number FROM public.document_chunks WHERE item_id = %s LIMIT 15", (row[0],))
            chunks = cur.fetchall()
            if chunks:
                context_text += "[Sections]:\n" + "\n".join([f"(Page {c[1]}): {c[0]}" for c in chunks]) + "\n"

            context_parts.append(context_text)

        cur.close()
        context_text = "\n\n".join(context_parts) if context_parts else "Educational study topic."

        instructions_text = f"\nUSER CUSTOM INSTRUCTIONS: {payload.instructions}\n" if payload.instructions.strip() else ""
        pages_text = f"\nFOCUS ONLY ON CONTENT FROM PAGES: {payload.pages}.\n" if payload.pages.strip() and payload.pages.lower() != "all" else ""

        para_count = "8 to 12"
        if "Short" in payload.duration:
            para_count = "4 to 6"
        elif "Long" in payload.duration:
            para_count = "18 to 25"

        if payload.format == "single-host":
            prompt = f"""You are a professional audio generation AI.
Generate an engaging, educational SINGLE-HOST MONOLOGUE explaining this document's topics.
Host Name: {payload.host1Name}
Language: {payload.language} (CRITICAL: Strictly in {payload.language} vocabulary).
{pages_text}
{instructions_text}

Respond strictly in JSON format with field "texts" (an array of {para_count} strings, each representing a paragraph):
{{"texts": ["paragraph 1", "paragraph 2"]}}

Context:
{context_text[:15000]}"""
        else:
            prompt = f"""You are a professional podcast generation AI.
Generate an engaging, witty, and educational dialogue between two hosts: {payload.host1Name} and {payload.host2Name}.
Language: {payload.language} (CRITICAL: Strictly in {payload.language} vocabulary).
{pages_text}
{instructions_text}

Respond strictly in JSON format with field "script" (an array of {para_count} objects with "speaker" and "text"):
{{"script": [{{"speaker": "{payload.host1Name}", "text": "..."}}, {{"speaker": "{payload.host2Name}", "text": "..."}}]}}

Context:
{context_text[:15000]}"""

        script = []
        try:
            reply_text = call_llm(prompt, json_mode=True, timeout=40)
            json_match = re.search(r'\{.*\}', reply_text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
                if payload.format == "single-host":
                    if "texts" in parsed:
                        script = [{"speaker": payload.host1Name, "text": t} for t in parsed["texts"]]
                    elif "script" in parsed:
                        script = [{"speaker": payload.host1Name, "text": s.get("text", "")} for s in parsed["script"]]
                else:
                    script = parsed.get("script", [])
        except Exception as e:
            print(f"[WARNING] Podcast generation fallback: {e}")
            if payload.format == "single-host":
                script = [
                    {"speaker": payload.host1Name, "text": f"Welcome to today's study overview on our selected topics."},
                    {"speaker": payload.host1Name, "text": f"We are examining key insights and core concepts to strengthen your understanding."}
                ]
            else:
                script = [
                    {"speaker": payload.host1Name, "text": f"Welcome back! Today we are breaking down our study notes."},
                    {"speaker": payload.host2Name, "text": f"That's right, let's dive into the core takeaways together!"}
                ]

        return {"script": script}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@app.post("/generate-briefing")
async def generate_briefing(payload: GenerationPayload):
    validate_uuid_string(payload.item_id)
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        item_ids = [x.strip() for x in payload.item_id.split(",") if x.strip() and not x.startswith("default")]
        cur = conn.cursor()

        cur.execute(
            """
            SELECT id, title, file_name, content, transcript, kind 
            FROM public.study_items 
            WHERE id = ANY(%s::uuid[])
            """,
            (item_ids,)
        )
        rows = cur.fetchall()

        context_parts = []
        for row in rows:
            item_title = row[1] or "Resource"
            item_file_name = row[2] or item_title
            content = row[3] or ""
            kind = row[5] or "document"
            source_name = item_file_name if kind == "pdf" else item_title

            context_text = f"--- Source: {source_name} ---\n"
            if content.strip():
                context_text += f"[Summary content]:\n{content}\n"

            cur.execute("SELECT chunk_text, page_number FROM public.document_chunks WHERE item_id = %s LIMIT 15", (row[0],))
            chunks = cur.fetchall()
            if chunks:
                context_text += "[Sections]:\n" + "\n".join([f"(Page {c[1]}): {c[0]}" for c in chunks]) + "\n"

            context_parts.append(context_text)

        cur.close()
        context_text = "\n\n".join(context_parts) if context_parts else "Educational study topic."

        prompt = f"""You are an expert Briefing Document creator.
Based on the following document context, generate a structured Markdown briefing document.
It must include:
1. Executive Summary
2. FAQ (Frequently Asked Questions) - At least 5 insightful questions and answers.
3. Key Glossary - Define 5-10 core terms or concepts found in the text.
4. Chronology / Timeline or Key Strategic Takeaways.

Format with Markdown headers (# H1, ## H2, ### H3), bold terms, and bullet points. Return ONLY the markdown.

Context:
{context_text[:18000]}"""

        briefing_markdown = "# Study Briefing Document\n\n## Executive Summary\nSummary of core concepts and themes."
        try:
            briefing_markdown = call_llm(prompt, timeout=35)
            briefing_markdown = re.sub(r'^```(?:markdown)?\n?', '', briefing_markdown)
            briefing_markdown = re.sub(r'\n?```$', '', briefing_markdown)
        except Exception as e:
            print(f"[WARNING] Briefing generation fallback: {e}")

        return {"briefing_doc": briefing_markdown}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

# ============================================================
# Dedicated RAG Quiz Generator Module
# ============================================================
class QuizGeneratePayload(BaseModel):
    item_id: str
    topic: Optional[str] = None
    num_questions: int = 5
    difficulty: str = "medium"
    profile_id: Optional[str] = None

class QuizEvaluatePayload(BaseModel):
    session_id: str
    answers: Dict[str, Any]
    profile_id: Optional[str] = None

@app.post("/generate-quiz")
async def generate_quiz_endpoint(payload: QuizGeneratePayload):
    validate_uuid_string(payload.item_id)
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        item_ids = [x.strip() for x in payload.item_id.split(",") if x.strip() and not x.startswith("default")]
        
        full_questions = generate_rag_quiz(
            conn=conn,
            get_embedding_fn=get_embedding,
            call_llm_fn=call_llm,
            item_ids=item_ids,
            topic=payload.topic,
            num_questions=payload.num_questions,
            difficulty=payload.difficulty
        )

        session_id = str(uuid.uuid4())
        primary_item_id = item_ids[0]

        # Save session to database
        cur = conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO public.quiz_sessions (id, profile_id, item_id, topic, difficulty, num_questions, questions, total_questions)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (session_id, payload.profile_id, primary_item_id, payload.topic or "", payload.difficulty, len(full_questions), json.dumps(full_questions), len(full_questions))
            )
            conn.commit()
        except Exception as dbe:
            print(f"[QuizService] Warning saving quiz session: {dbe}")
            conn.rollback()

        # Sanitize questions: strip answer and explanation before sending to frontend!
        sanitized_questions = []
        for q in full_questions:
            sanitized_questions.append({
                "id": q["id"],
                "question": q["question"],
                "options": q["options"],
                "source_reference": q.get("source_reference", {})
            })

        return {
            "session_id": session_id,
            "item_id": primary_item_id,
            "topic": payload.topic or "",
            "difficulty": payload.difficulty,
            "num_questions": len(sanitized_questions),
            "questions": sanitized_questions
        }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@app.post("/evaluate-quiz")
async def evaluate_quiz_endpoint(payload: QuizEvaluatePayload):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT questions, profile_id
            FROM public.quiz_sessions
            WHERE id = %s
            """,
            (payload.session_id,)
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Quiz session not found")

        stored_questions = row[0]
        if isinstance(stored_questions, str):
            stored_questions = json.loads(stored_questions)

        evaluation = evaluate_quiz_submission(stored_questions, payload.answers)

        # Update quiz session record in database
        try:
            cur.execute(
                """
                UPDATE public.quiz_sessions
                SET user_answers = %s, score = %s, total_questions = %s, completed_at = now()
                WHERE id = %s
                """,
                (json.dumps(payload.answers), evaluation["score"], evaluation["total_questions"], payload.session_id)
            )
            conn.commit()
        except Exception as dbe:
            print(f"[QuizService] Warning updating quiz evaluation: {dbe}")
            conn.rollback()

        return {
            "session_id": payload.session_id,
            **evaluation
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

# -------------------------------------------------------------
# TUTOR MODE ENDPOINTS (Sequential Grounded Learning)
# -------------------------------------------------------------
class TutorOutlinePayload(BaseModel):
    item_id: str
    profile_id: Optional[str] = None

class TutorStepPayload(BaseModel):
    item_id: str
    section_id: str
    section_title: str
    step_index: int = 0
    total_steps: int = 5
    profile_id: Optional[str] = None

class TutorEvaluatePayload(BaseModel):
    activity: Dict[str, Any]
    user_answer: Any
    profile_id: Optional[str] = None

class TutorFollowupPayload(BaseModel):
    item_id: str
    concept_title: str
    question: str
    profile_id: Optional[str] = None

class TutorSessionSavePayload(BaseModel):
    session_id: Optional[str] = None
    item_id: str
    profile_id: Optional[str] = None
    outline: List[Dict[str, Any]]
    current_section_idx: int = 0
    current_step_idx: int = 0
    completed_activities: int = 0
    total_activities: int = 0
    accuracy: int = 0
    session_history: List[Dict[str, Any]] = []
    status: str = "active"

@app.post("/tutor/outline")
async def tutor_outline_endpoint(payload: TutorOutlinePayload):
    validate_uuid_string(payload.item_id)
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        item_ids = [x.strip() for x in payload.item_id.split(",") if x.strip() and not x.startswith("default")]
        outline = generate_tutor_outline(conn, item_ids, call_llm)
        return {"item_id": payload.item_id, "outline": outline}
    except Exception as e:
        print(f"[TutorService] Error generating outline: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@app.post("/tutor/step")
async def tutor_step_endpoint(payload: TutorStepPayload):
    validate_uuid_string(payload.item_id)
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        item_ids = [x.strip() for x in payload.item_id.split(",") if x.strip() and not x.startswith("default")]
        step_data = generate_tutor_step(
            conn=conn,
            item_ids=item_ids,
            section_title=payload.section_title,
            step_index=payload.step_index,
            total_steps=payload.total_steps,
            call_llm_fn=call_llm,
            get_embedding_fn=get_embedding,
        )
        return step_data
    except Exception as e:
        print(f"[TutorService] Error generating tutor step: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@app.post("/tutor/evaluate")
async def tutor_evaluate_endpoint(payload: TutorEvaluatePayload):
    try:
        evaluation = evaluate_tutor_activity(
            stored_activity=payload.activity,
            user_answer=payload.user_answer,
            call_llm_fn=call_llm,
        )
        return evaluation
    except Exception as e:
        print(f"[TutorService] Error evaluating activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tutor/followup")
async def tutor_followup_endpoint(payload: TutorFollowupPayload):
    validate_uuid_string(payload.item_id)
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        item_ids = [x.strip() for x in payload.item_id.split(",") if x.strip() and not x.startswith("default")]
        answer = answer_tutor_followup(
            conn=conn,
            item_ids=item_ids,
            concept_title=payload.concept_title,
            user_question=payload.question,
            call_llm_fn=call_llm,
            get_embedding_fn=get_embedding,
        )
        return {"answer": answer}
    except Exception as e:
        print(f"[TutorService] Error in follow-up: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@app.post("/tutor/session/save")
async def tutor_session_save_endpoint(payload: TutorSessionSavePayload):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cur = conn.cursor()
        sess_id = payload.session_id or str(uuid.uuid4())
        primary_item_id = payload.item_id.split(",")[0].strip()

        cur.execute(
            """
            INSERT INTO public.tutor_sessions (
                id, profile_id, item_id, outline, current_section_idx, current_step_idx,
                completed_activities, total_activities, accuracy, session_history, status, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
            ON CONFLICT (id) DO UPDATE SET
                current_section_idx = EXCLUDED.current_section_idx,
                current_step_idx = EXCLUDED.current_step_idx,
                completed_activities = EXCLUDED.completed_activities,
                total_activities = EXCLUDED.total_activities,
                accuracy = EXCLUDED.accuracy,
                session_history = EXCLUDED.session_history,
                status = EXCLUDED.status,
                updated_at = now()
            RETURNING id, current_section_idx, current_step_idx, completed_activities, total_activities, accuracy, status
            """,
            (
                sess_id,
                payload.profile_id,
                primary_item_id if not primary_item_id.startswith("default") else None,
                json.dumps(payload.outline),
                payload.current_section_idx,
                payload.current_step_idx,
                payload.completed_activities,
                payload.total_activities,
                payload.accuracy,
                json.dumps(payload.session_history),
                payload.status,
            ),
        )
        row = cur.fetchone()
        conn.commit()
        return {
            "session_id": row[0],
            "current_section_idx": row[1],
            "current_step_idx": row[2],
            "completed_activities": row[3],
            "total_activities": row[4],
            "accuracy": row[5],
            "status": row[6],
        }
    except Exception as e:
        print(f"[TutorService] Session save error: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@app.get("/tutor/session/item/{item_id}")
async def tutor_get_latest_session_endpoint(item_id: str):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cur = conn.cursor()
        primary_id = item_id.split(",")[0].strip()
        cur.execute(
            """
            SELECT id, profile_id, item_id, outline, current_section_idx, current_step_idx,
                   completed_activities, total_activities, accuracy, session_history, status, updated_at
            FROM public.tutor_sessions
            WHERE item_id = %s
            ORDER BY updated_at DESC
            LIMIT 1
            """,
            (primary_id,),
        )
        row = cur.fetchone()
        if not row:
            return {"session": None}
        return {
            "session": {
                "id": str(row[0]),
                "profile_id": str(row[1]) if row[1] else None,
                "item_id": str(row[2]) if row[2] else None,
                "outline": row[3] if isinstance(row[3], list) else json.loads(row[3]),
                "current_section_idx": row[4],
                "current_step_idx": row[5],
                "completed_activities": row[6],
                "total_activities": row[7],
                "accuracy": row[8],
                "session_history": row[9] if isinstance(row[9], list) else json.loads(row[9]),
                "status": row[10],
                "updated_at": row[11].isoformat() if row[11] else None,
            }
        }
    except Exception as e:
        print(f"[TutorService] Error getting session: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    port = int(os.getenv("PORT") or os.getenv("FASTAPI_PORT") or 8000)
    is_dev = os.getenv("ENVIRONMENT", "development").lower() == "development"
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=is_dev)
