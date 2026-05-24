import os
import re
import json
import hashlib
import requests
import numpy as np
from fastapi import FastAPI, UploadFile, Form, File, HTTPException
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import execute_values
import pypdf
import requests
from dotenv import load_dotenv

# google.generativeai is only imported if OpenRouter is NOT configured
# (avoids an aiohttp/WSMsgType compatibility crash on Windows with Python 3.11)
genai = None

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

# Connect to database
DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/ultralearn")

def get_db_connection():
    try:
        from urllib.parse import urlparse, unquote
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
            database=database
        )
        return conn
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        return None


# AI API Key setup
API_KEY = os.getenv("GEMINI_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
USE_OPENROUTER = bool(OPENROUTER_API_KEY)
USE_REAL_AI = bool(API_KEY) or USE_OPENROUTER

if USE_OPENROUTER:
    print("[INFO] Configuring backend to use OpenRouter with Gemini 2.0 API.")
elif USE_REAL_AI:
    # Only import genai when OpenRouter is absent and Gemini key is set
    try:
        import google.generativeai as _genai
        genai = _genai
        genai.configure(api_key=API_KEY)
        print("[INFO] Configuring Gemini SDK with API Key.")
    except Exception as _e:
        print(f"[WARNING] Could not load google.generativeai: {_e}. Falling back to local engine.")
        USE_REAL_AI = False
else:
    print("[WARNING] Neither GEMINI_API_KEY nor OPENROUTER_API_KEY found. Running with local simulated RAG engine.")

# -------------------------------------------------------------
# HELPER: Vector Embedding Generator (768/1536 Dimensions)
# -------------------------------------------------------------
def get_embedding(text: str, fast: bool = True) -> list:
    """
    Generates a 1536-dimensional float vector.
    If fast is True, creates an instant deterministic semantic hash vector locally.
    Otherwise, attempts to call slow remote APIs if available.
    """
    target_dim = 1536
    
    if not fast and USE_REAL_AI:
        try:
            if USE_OPENROUTER:
                url = "https://openrouter.ai/api/v1/embeddings"
                headers = {
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "openai/text-embedding-3-small",
                    "input": text
                }
                res = requests.post(url, json=payload, headers=headers, timeout=10)
                res_json = res.json()
                if "data" in res_json and len(res_json["data"]) > 0:
                    vec = res_json["data"][0]["embedding"]
                    return vec[:target_dim]
                else:
                    print(f"OpenRouter embedding failed: {res.text}")
            else:
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=text,
                    task_type="retrieval_document"
                )
                vec = result['embedding']
                # Pad 768 to 1536
                if len(vec) < target_dim:
                    vec = vec + [0.0] * (target_dim - len(vec))
                return vec[:target_dim]
        except Exception as e:
            print(f"Error calling embedding API: {e}. Falling back to hash vector.")

    # FALLBACK: Semantic Hash-based vector generator
    vec = np.zeros(target_dim)
    words = re.findall(r'\w+', text.lower())
    for w in words:
        # Generate stable index for this word
        h = int(hashlib.md5(w.encode('utf-8')).hexdigest(), 16)
        idx = h % target_dim
        # Add weights based on word hash to allow basic similarity metrics
        vec[idx] += 1.0
    
    # Normalize vector to unit length
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
        
    return vec.tolist()

# -------------------------------------------------------------
# HELPER: Text Chunking Strategy
# -------------------------------------------------------------
def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150) -> list:
    chunks = []
    start = 0
    text_len = len(text)
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunks.append(text[start:end])
        start += (chunk_size - overlap)
    return chunks

# -------------------------------------------------------------
# HELPER: AI Generation Router
# -------------------------------------------------------------
def generate_study_materials(content_text: str, title: str):
    """
    Generates study guides, 5 flashcards, and 3 quiz questions.
    Uses Gemini API if available, else falls back to robust local parsing.
    """
    prompt = f"""
    Analyze the following academic document:
    Title: {title}
    Content:
    {content_text[:3000]}
    
    Respond strictly in JSON format with three fields:
    1. "summary": A brief markdown summary outlining key topics.
    2. "flashcards": An array of 5 objects containing "question", "answer", "hint".
    3. "quiz": An array of 3 objects containing "question", "options" (array of 4 strings), "answer" (0-3 index of correct option), "explanation".
    """

    if USE_OPENROUTER:
        try:
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": "google/gemini-2.0-flash-001",
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            }
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            if response.status_code == 200:
                reply_text = response.json()['choices'][0]['message']['content']
                json_match = re.search(r'\{.*\}', reply_text, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group(0))
            else:
                print(f"OpenRouter error: {response.text}")
        except Exception as e:
            print(f"OpenRouter generation failed: {e}. Using fallback.")

    elif USE_REAL_AI:
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt, request_options={"timeout": 15})
            # Find JSON block in reply
            json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
        except Exception as e:
            print(f"Gemini generation failed: {e}. Using fallback.")

    # FALLBACK: Structured Socratic Generator
    keywords = re.findall(r'\b[A-Za-z]{4,}\b', content_text)
    primary_terms = list(set([k for k in keywords if len(k) > 5]))[:5]
    if len(primary_terms) < 3:
        primary_terms = ["Automation", "Syllabus", "Exams", "Revision", "Concepts"]

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
        "question": f"What is the main objective of analyzing '{primary_terms[1]}隶?",
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
# API ENDPOINT: PROCESS PDF & STORE RAG CHUNKS
# -------------------------------------------------------------
@app.post("/process-pdf")
async def process_pdf(file: UploadFile = File(...), item_id: str = Form(...)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        # Read PDF content
        pdf_reader = pypdf.PdfReader(file.file)
        full_text = ""
        page_chunks = []

        for idx, page in enumerate(pdf_reader.pages):
            page_text = page.extract_text() or ""
            full_text += page_text + "\n"
            
            # Chunk page text
            chunks = chunk_text(page_text)
            for chunk in chunks:
                if chunk.strip():
                    page_chunks.append((item_id, idx + 1, chunk))

        if not full_text.strip():
            print(f"[WARNING] Could not extract text from {file.filename}. Using dynamic fallback.")
            clean_title = file.filename.replace(".pdf", "").replace("_", " ").replace("-", " ")
            full_text = f"This study guide covers topics related to {clean_title}. The document '{file.filename}' is a visual resource or scanned layout. Please use the original PDF viewer on the left to read, and practice active recall retrieving terms like {clean_title}."
            page_chunks.append((item_id, 1, full_text))

        # Generate vectors and prepare bulk data
        data_list = []
        for item_id_val, page_num, chunk in page_chunks:
            embedding = get_embedding(chunk, fast=True)
            data_list.append((item_id_val, page_num, chunk, embedding))

        # Bulk insert to database in a single high-speed query!
        cur = conn.cursor()
        execute_values(
            cur,
            """
            INSERT INTO public.document_chunks (item_id, page_number, chunk_text, embedding)
            VALUES %s
            """,
            data_list,
            template="(%s, %s, %s, %s::vector)"
        )

        conn.commit()
        cur.close()

        # Generate flashcards and quizzes
        materials = generate_study_materials(full_text, file.filename)

        return {
            "content": full_text[:4000], # return preview
            "flashcards": materials["flashcards"],
            "quiz": materials["quiz"]
        }
    except HTTPException as he:
        conn.rollback()
        raise he
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# -------------------------------------------------------------
# API ENDPOINT: YOUTUBE ROADMAP EXTRACTOR
# -------------------------------------------------------------
class YoutubePayload(BaseModel):
    url: str
    item_id: str

@app.post("/process-youtube")
async def process_youtube(payload: YoutubePayload):
    # 1. Extract video_id
    video_id = "dQw4w9WgXcQ"
    reg = r'(?:v=|\/)([0-9A-Za-z_-]{11}).*'
    match = re.search(reg, payload.url)
    if match:
        video_id = match.group(1)

    # Helper: format float seconds into MM:SS
    def format_seconds(seconds: float) -> str:
        total_sec = int(seconds)
        minutes = total_sec // 60
        secs = total_sec % 60
        return f"{minutes:02d}:{secs:02d}"

    # Fetch title first using oEmbed for high-quality context
    video_title = f"YouTube Video ({video_id})"
    try:
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        res = requests.get(oembed_url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            video_title = data.get("title", video_title)
    except Exception:
        pass

    # 2. Try fetching the real transcript
    transcript_data = []
    full_text = ""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi

        # Fetch transcript
        try:
            srt = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'hi', 'te', 'ta'])
        except Exception:
            try:
                srt = YouTubeTranscriptApi.get_transcript(video_id)
            except Exception as srt_e:
                raise srt_e

        # Process transcript into array
        for entry in srt:
            seconds = entry.get('start', 0.0)
            text = entry.get('text', '')
            time_str = format_seconds(seconds)
            transcript_data.append({
                "text": text,
                "time": time_str,
                "seconds": int(seconds)
            })
            full_text += text + " "
            
        print(f"[YouTube] Successfully fetched {len(transcript_data)} transcript segments for video {video_id}")
    
    except Exception as e:
        print(f"[WARNING] YouTube transcript extraction failed for video {video_id}: {e}. Generating clean no-transcript view.")
        
        # Keep transcript and chapters empty if not available
        transcript_data = []
        chapters = []
        
        # Generate custom study materials based on the real video title!
        summary_content = f"### Study Session: {video_title}\nThis YouTube video does not contain an active spoken transcript. Based on the video title **'{video_title}'**, we have prepared a custom learning workspace for you to explore related concepts."
        
        flashcards = []
        quiz = []
        
        if USE_REAL_AI:
            try:
                prompt = f"""
                The user wants to study a YouTube resource.
                Title: {video_title}
                Note: This video has no transcript.
                
                Respond strictly in JSON format with three fields:
                1. "summary": A brief markdown summary introducing the topic of "{video_title}" and what a learner should know about it.
                2. "flashcards": An array of 5 objects containing "question", "answer", "hint" based on the topic of "{video_title}".
                3. "quiz": An array of 3 objects containing "question", "options" (array of 4 strings), "answer" (0-3 index of correct option), "explanation" based on the topic of "{video_title}".
                """
                if USE_OPENROUTER:
                    headers = {
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                    }
                    api_payload = {
                        "model": "google/gemini-2.0-flash-001",
                        "messages": [{"role": "user", "content": prompt}]
                    }
                    res = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=api_payload, timeout=20)
                    if res.status_code == 200:
                        parsed = json.loads(re.search(r'\{.*\}', res.json()['choices'][0]['message']['content'], re.DOTALL).group(0))
                        summary_content = parsed.get("summary", summary_content)
                        flashcards = parsed.get("flashcards", [])
                        quiz = parsed.get("quiz", [])
                elif genai:
                    model = genai.GenerativeModel("gemini-1.5-flash")
                    response = model.generate_content(prompt)
                    parsed = json.loads(re.search(r'\{.*\}', response.text, re.DOTALL).group(0))
                    summary_content = parsed.get("summary", summary_content)
                    flashcards = parsed.get("flashcards", [])
                    quiz = parsed.get("quiz", [])
            except Exception as ai_e:
                print(f"[WARNING] Fallback AI study materials generation failed: {ai_e}")

        if not flashcards or not quiz:
            flashcards = [
                {
                    "question": f"What is the main subject of '{video_title}'?",
                    "answer": f"The main subject is centered around the theme: '{video_title}'.",
                    "hint": "Check the title of the video."
                }
            ]
            quiz = [
                {
                    "question": f"Which of the following best matches the resource title?",
                    "options": [video_title, "A completely different video", "A blank placeholder", "None of the above"],
                    "answer": 0,
                    "explanation": f"The title of this study session is '{video_title}'."
                }
            ]

        return {
            "video_id": video_id,
            "content": summary_content,
            "chapters": chapters,
            "transcript": transcript_data,
            "flashcards": flashcards,
            "quiz": quiz
        }

    # 3. Use AI to generate real chapters, summary, flashcards, and quiz from the real transcript!
    # Build prompt
    prompt = f"""
    Analyze the following YouTube video transcript:
    Title: YouTube Video ({video_id})
    Transcript Context:
    {full_text[:8000]}
    
    Respond strictly in JSON format with four fields:
    1. "summary": A brief markdown summary outlining the key topics of the video.
    2. "chapters": An array of objects representing major timestamps/sections in the video. Each object must have "title", "time" (format MM:SS), "seconds" (integer seconds). Example: {{"title": "Introduction", "time": "00:00", "seconds": 0}}. Generate 3 to 6 major chapters based on when the topics naturally transition.
    3. "flashcards": An array of 5 objects containing "question", "answer", "hint".
    4. "quiz": An array of 3 objects containing "question", "options" (array of 4 strings), "answer" (0-3 index of correct option), "explanation".
    """

    chapters = []
    flashcards = []
    quiz = []
    summary_content = f"YouTube video analyzed: {payload.url}"

    if USE_REAL_AI:
        try:
            if USE_OPENROUTER:
                headers = {
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                }
                api_payload = {
                    "model": "google/gemini-2.0-flash-001",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
                res = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=api_payload,
                    timeout=30
                )
                if res.status_code == 200:
                    reply_text = res.json()['choices'][0]['message']['content']
                    json_match = re.search(r'\{.*\}', reply_text, re.DOTALL)
                    if json_match:
                        parsed = json.loads(json_match.group(0))
                        summary_content = parsed.get("summary", summary_content)
                        chapters = parsed.get("chapters", [])
                        flashcards = parsed.get("flashcards", [])
                        quiz = parsed.get("quiz", [])
            elif genai:
                model = genai.GenerativeModel("gemini-1.5-flash")
                response = model.generate_content(prompt)
                json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    summary_content = parsed.get("summary", summary_content)
                    chapters = parsed.get("chapters", [])
                    flashcards = parsed.get("flashcards", [])
                    quiz = parsed.get("quiz", [])
        except Exception as e:
            print(f"[WARNING] AI processing of transcript failed: {e}. Falling back to default materials.")

    # Fallback if AI generation failed or returned empty values
    if not chapters:
        # Build 3 basic chapters evenly spaced
        total_duration = transcript_data[-1]["seconds"] if transcript_data else 300
        chapters = [
            {"title": "Introduction", "time": "00:00", "seconds": 0},
            {"title": "Core Discussion", "time": "01:30", "seconds": 90},
            {"title": "Key Takeaways", "time": format_seconds(total_duration // 2), "seconds": total_duration // 2}
        ]
    if not flashcards or not quiz:
        fallback_materials = generate_study_materials(full_text[:3000], f"YouTube ({video_id})")
        flashcards = flashcards or fallback_materials["flashcards"]
        quiz = quiz or fallback_materials["quiz"]
        summary_content = summary_content or fallback_materials["summary"]

    return {
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
    # Simulated Scraper
    scraped_text = f"Scraped contents from {payload.url}.\nFeatures modern single page applications, server functions, and edge APIs."
    materials = generate_study_materials(scraped_text, payload.url)
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
    materials = generate_study_materials(payload.text, "Pasted Notes")
    return {
        "flashcards": materials["flashcards"],
        "quiz": materials["quiz"]
    }

class ResearchPayload(BaseModel):
    topic: str
    item_id: str

@app.post("/process-research")
async def process_research(payload: ResearchPayload):
    report = f"# Research Dossier: {payload.topic}\n\n## Introduction\nDetailed findings on {payload.topic}..."
    materials = generate_study_materials(report, payload.topic)
    return {
        "content": report,
        "flashcards": materials["flashcards"],
        "quiz": materials["quiz"]
    }

# -------------------------------------------------------------
# API ENDPOINT: CHAT (RAG COSINE DISTANCE MATCHING)
# -------------------------------------------------------------
class ChatHistoryMessage(BaseModel):
    role: str
    content: str

class ChatPayload(BaseModel):
    item_id: str
    question: str
    chat_history: list[ChatHistoryMessage] = []

@app.post("/chat")
async def chat(payload: ChatPayload):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        # 1. Condense the query if chat history is present to capture semantic terms
        search_query = payload.question
        if payload.chat_history and USE_REAL_AI:
            try:
                # Format history for the condensation prompt
                history_text = ""
                for msg in payload.chat_history[-5:]: # Look at last 5 messages for brevity and speed
                    role_label = "User" if msg.role == "user" else "Assistant"
                    history_text += f"{role_label}: {msg.content}\n"
                
                condensation_prompt = f"""Given the following conversation history and a follow-up question, rewrite the follow-up question to be a standalone, search-optimized query.
The standalone query should contain all necessary context and search terms from the conversation history so it can be used to search in a vector database.
Do NOT answer the question. Only return the rewritten standalone query and absolutely nothing else.

Conversation History:
{history_text}

Follow-up Question: {payload.question}

Standalone Query:"""

                if USE_OPENROUTER:
                    headers = {
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                    }
                    api_payload = {
                        "model": "google/gemini-2.0-flash-001",
                        "messages": [{"role": "user", "content": condensation_prompt}]
                    }
                    res = requests.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers=headers,
                        json=api_payload,
                        timeout=10
                    )
                    if res.status_code == 200:
                        condensed = res.json()['choices'][0]['message']['content'].strip()
                        # Clean any quotes or markdown around the standalone query
                        condensed = re.sub(r'^["\'`]+|["\'`]+$', '', condensed).strip()
                        if condensed:
                            search_query = condensed
                elif genai:
                    model = genai.GenerativeModel("gemini-1.5-flash")
                    res = model.generate_content(condensation_prompt)
                    condensed = res.text.strip()
                    condensed = re.sub(r'^["\'`]+|["\'`]+$', '', condensed).strip()
                    if condensed:
                        search_query = condensed
                
                print(f"[RAG] Original Question: '{payload.question}' -> Standalone Search Query: '{search_query}'")
            except Exception as e:
                print(f"[WARNING] Query condensation failed: {e}. Using original question.")

        # 2. Extract page numbers from either the original question OR the condensed search query
        page_numbers = []
        for text_to_check in [payload.question, search_query]:
            # Pattern 1: "page 47", "pg 47", "p. 47", "pg.47"
            matches1 = re.findall(r'(?:page|pg\.?|p\.)\s*(\d+)', text_to_check, re.IGNORECASE)
            for m in matches1:
                page_numbers.append(int(m))
                
            # Pattern 2: "47th page", "47 page"
            matches2 = re.findall(r'(\d+)\s*(?:th|rd|st|nd)?\s*page', text_to_check, re.IGNORECASE)
            for m in matches2:
                page_numbers.append(int(m))
                
        # Remove duplicates
        page_numbers = list(set(page_numbers))

        cur = conn.cursor()
        matches = []
        
        # If specific page numbers were mentioned, try to retrieve chunks from those pages first!
        if page_numbers:
            cur.execute(
                """
                SELECT chunk_text, page_number
                FROM public.document_chunks
                WHERE item_id = %s AND page_number = ANY(%s)
                ORDER BY page_number ASC
                LIMIT 5
                """,
                (payload.item_id, page_numbers)
            )
            matches = cur.fetchall()

        # If no page numbers were matched, or no chunks were found on those pages, fall back to vector similarity search
        if not matches:
            # Embed query question (using search_query for better semantic matches!)
            query_embedding = get_embedding(search_query)

            # Try vector RAG search first (works for PDF items with document_chunks)
            cur.execute(
                """
                SELECT chunk_text, page_number
                FROM public.document_chunks
                WHERE item_id = %s
                ORDER BY embedding <=> %s::vector
                LIMIT 3
                """,
                (payload.item_id, query_embedding)
            )
            matches = cur.fetchall()

        # 3. If no chunks found (e.g. YouTube, text, website, research), fall back to
        #    the item's stored content and transcript from study_items
        context = ""
        item_kind = "document"
        if matches:
            context = "\n\n".join([f"[Page {m[1]}]: {m[0]}" for m in matches])
        else:
            # Fetch the item's content and transcript directly
            cur.execute(
                """
                SELECT kind, content, transcript, youtube_url
                FROM public.study_items
                WHERE id = %s
                """,
                (payload.item_id,)
            )
            item_row = cur.fetchone()
            if item_row:
                item_kind = item_row[0] or "document"
                item_content = item_row[1] or ""
                item_transcript = item_row[2]  # JSONB field
                youtube_url = item_row[3] or ""

                # Build rich context from the item
                context_parts = []

                if item_content and item_content.strip():
                    context_parts.append(f"[Resource Summary]:\n{item_content[:3000]}")

                # Flatten transcript entries into readable text
                if item_transcript:
                    try:
                        if isinstance(item_transcript, str):
                            import json as _json
                            item_transcript = _json.loads(item_transcript)
                        if isinstance(item_transcript, list) and item_transcript:
                            transcript_text = "\n".join(
                                [f"[{t.get('time','?')}] {t.get('text','')}" for t in item_transcript[:40]]
                            )
                            context_parts.append(f"[Video Transcript]:\n{transcript_text}")
                    except Exception:
                        pass

                if youtube_url:
                    context_parts.append(f"[Source]: {youtube_url}")

                if context_parts:
                    context = "\n\n".join(context_parts)
                else:
                    context = "No content was stored for this item."
            else:
                context = "Item not found in the database."

        cur.close()

        # 4. Build prompt — specialized per content kind
        kind_label = {
            "youtube": "YouTube video lecture",
            "website": "scraped web page",
            "text": "pasted notes",
            "research": "deep research report",
            "pdf": "PDF document"
        }.get(item_kind, "study resource")

        if item_kind == "youtube":
            # ── Specialized YouTube RAG prompt (detailed, uses AI knowledge if needed) ──
            prompt = f"""You are an expert, highly knowledgeable AI study assistant specialized in answering questions from YouTube video knowledge sources.

PRIMARY OBJECTIVE:
Generate extremely detailed, comprehensive, and rich multi-paragraph explanations. You must deeply explore concepts, provide examples, and ensure the user gets a thorough understanding. Short answers are unacceptable.

ANSWERING RULES:
1. Start by answering the question thoroughly using the retrieved transcript context provided below. Include major timestamps when citing the video (e.g., "[00:01:12]").
2. If the retrieved context is insufficient or lacks detail to fully answer the user's question, YOU MUST seamlessly use your own vast general AI knowledge to provide a complete, deeply informative answer. Simply add a brief note mentioning that you are supplementing with general knowledge.
3. Prioritize: extreme detail, factual accuracy, clarity, and comprehensive explanations.
4. If the user requests a summary or explanation, provide highly structured, lengthy content with bullet points, deep dives into sub-topics, and clear takeaways.

Retrieved Transcript Context:
{context}

User Question:
{payload.question}

Answer:"""
        else:
            # Format chat history for string prompt fallback
            history_str = ""
            if payload.chat_history:
                history_str = "\n--- Conversation History ---\n"
                for msg in payload.chat_history:
                    role_label = "User" if msg.role == "user" else "Assistant"
                    history_str += f"{role_label}: {msg.content}\n"
                history_str += "----------------------------\n"

            # ── Standard document study prompt ──
            prompt = f"""You are an expert, highly knowledgeable AI study assistant. The user is studying a {kind_label}.

Your primary goal is to generate extremely detailed, comprehensive, and rich multi-paragraph explanations. You must deeply explore concepts, provide examples, and ensure the user gets a thorough understanding. Short answers are strictly prohibited.

ANSWERING RULES:
1. First, answer the question thoroughly using the document context provided below.
2. If the exact answer isn't in the context, or if the context lacks enough detail to provide a comprehensive answer, YOU MUST use your own vast general AI knowledge to fully answer the question. Do not just say "I don't know." Instead, provide a deep, informative answer and simply note that the information comes from your general knowledge.
3. Be highly specific, beautifully structured, and incredibly helpful.
4. IMPORTANT: Whenever you use information from the provided document context, you MUST append an inline citation with the exact page number you got it from, using the format `[Page X]` (e.g., "The core concept is defined as... [Page 4]").

At the very end of your response, always append a friendly closing follow-up sentence inviting deeper exploration, such as:
"Do you need a deeper explanation of any of these topics, or is there another question you would like to ask to help you get a better idea?" (or similar highly conversational variants).

Context from the {kind_label}:
{context}
{history_str}
User Question:
{payload.question}

Answer:"""

        if USE_OPENROUTER:
            try:
                headers = {
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                }
                # For YouTube: split into system (instructions) + user (context + question) + history
                # For others: split into system (context + instructions) + history + user (question)
                if item_kind == "youtube":
                    messages = [
                        {"role": "system", "content": """You are an expert, highly knowledgeable AI study assistant specialized in answering questions from YouTube video transcripts.
Generate extremely detailed, comprehensive, and rich multi-paragraph explanations. You must deeply explore concepts, provide examples, and ensure the user gets a thorough understanding. Short answers are unacceptable.
Start by answering the question thoroughly using the retrieved transcript context provided. Include major timestamps when citing the video (e.g., "[00:01:12]").
If the retrieved context is insufficient or lacks detail, YOU MUST seamlessly use your own vast general AI knowledge to provide a complete, deeply informative answer. Simply add a brief note mentioning that you are supplementing with general knowledge.

At the very end of your response, always append a friendly closing follow-up sentence inviting deeper exploration."""}
                    ]
                    
                    for msg in payload.chat_history:
                        messages.append({"role": msg.role, "content": msg.content})
                    
                    messages.append({"role": "user", "content": f"Context:\n{context}\n\nQuestion: {payload.question}"})
                else:
                    messages = [
                        {"role": "system", "content": f"""You are an expert, highly knowledgeable AI study assistant. The user is studying a {kind_label}.
Your primary goal is to generate extremely detailed, comprehensive, and rich multi-paragraph explanations. You must deeply explore concepts, provide examples, and ensure the user gets a thorough understanding. Short answers are strictly prohibited.
First, answer the question thoroughly using the document context provided.
IMPORTANT: Whenever you use information from the provided document context, you MUST append an inline citation with the exact page number you got it from, using the format `[Page X]` (e.g., "The core concept is defined as... [Page 4]").
If the exact answer isn't in the context, or if the context lacks enough detail to provide a comprehensive answer, YOU MUST use your own vast general AI knowledge to fully answer the question. Do not just say "I don't know."

At the very end of your response, always append a friendly closing follow-up sentence inviting deeper exploration."""}
                    ]
                    
                    messages.append({"role": "user", "content": f"Context:\n{context}"})
                    for msg in payload.chat_history:
                        messages.append({"role": msg.role, "content": msg.content})
                    messages.append({"role": "user", "content": payload.question})

                api_payload = {
                    "model": "google/gemini-2.0-flash-001",
                    "messages": messages
                }
                response = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=api_payload,
                    timeout=30
                )
                if response.status_code == 200:
                    reply = response.json()['choices'][0]['message']['content']
                else:
                    print(f"OpenRouter error: {response.text}")
                    raise Exception("OpenRouter request failed")
            except Exception as e:
                print(f"OpenRouter chat failed: {e}. Using fallback.")
                reply = f"Based on the {kind_label}, here is a response to your question: **{payload.question}**.\n\n{context[:500]}"
        elif USE_REAL_AI and genai:
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            reply = response.text
        else:
            # Fallback local engine — surface the context directly
            reply = f"Here is relevant content from your {kind_label} about **{payload.question}**:\n\n"
            if matches:
                reply += f"> \"{matches[0][0][:300]}...\"\n\n"
                reply += "I've extracted this from the most relevant section of your document."
            elif context and context != "No content was stored for this item.":
                reply += context[:600]
            else:
                reply += "No content was found for this resource. Please re-upload or re-add it."

        return {"answer": reply}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# -------------------------------------------------------------
# NOTEBOOK LM FEATURES: PODCAST & BRIEFING
# -------------------------------------------------------------
from fastapi.responses import StreamingResponse
import edge_tts

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
            if not text: continue
            
            voice_id = voice1
            if speaker != "Alex" and speaker != h1Name and speaker != "Host 1":
                voice_id = voice2
                
            try:
                communicate = edge_tts.Communicate(text, voice_id)
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        yield chunk["data"]
                # yield b'\x00' * 4000 # Add a tiny silence gap between speakers to make it sound natural (optional, edge-tts already adds some padding)
            except Exception as e:
                print(f"Error generating TTS for line: {e}")
                
    return StreamingResponse(generate(), media_type="audio/mpeg", headers={
        "Content-Disposition": f"attachment; filename=\"podcast_{item_id}.mp3\""
    })

@app.post("/generate-podcast")
async def generate_podcast(payload: GenerationPayload):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        cur = conn.cursor()
        cur.execute("SELECT content, transcript FROM public.study_items WHERE id = %s", (payload.item_id,))
        item_row = cur.fetchone()
        if not item_row:
            raise HTTPException(status_code=404, detail="Item not found")
        
        content = item_row[0] or ""
        transcript = item_row[1]
        
        context_text = content
        if transcript and isinstance(transcript, list) and len(transcript) > 0:
            context_text += "\n" + "\n".join([f"[{t.get('time','?')}] {t.get('text','')}" for t in transcript[:200]])
            
        if not context_text.strip():
            context_text = "There is no text context available for this document to generate a podcast."
            
        def parse_pages(pages_str: str):
            if not pages_str or pages_str.lower() == "all":
                return None
            page_nums = set()
            for part in pages_str.split(","):
                part = part.strip()
                if "-" in part:
                    bounds = part.split("-")
                    if len(bounds) == 2 and bounds[0].isdigit() and bounds[1].isdigit():
                        start, end = int(bounds[0]), int(bounds[1])
                        for p in range(start, end + 1):
                            page_nums.add(p)
                elif part.isdigit():
                    page_nums.add(int(part))
            return list(page_nums) if page_nums else None

        # Get chunks to supplement context if it's a PDF
        pages_filter = parse_pages(payload.pages)
        if pages_filter:
            cur.execute("SELECT chunk_text FROM public.document_chunks WHERE item_id = %s AND page_number = ANY(%s) LIMIT 100", (payload.item_id, pages_filter))
        else:
            cur.execute("SELECT chunk_text FROM public.document_chunks WHERE item_id = %s LIMIT 30", (payload.item_id,))
        
        chunks = cur.fetchall()
        if chunks:
            context_text += "\n" + "\n".join([c[0] for c in chunks])
            
        cur.close()
        
        instructions_text = f"\nUSER CUSTOM INSTRUCTIONS / TOPIC: {payload.instructions}\n" if payload.instructions.strip() else ""
        pages_text = f"\nCRITICAL: ONLY focus on the content specifically from pages: {payload.pages}. Ignore other content.\n" if payload.pages.strip() and payload.pages.lower() != "all" else ""
        
        # Determine paragraph count based on duration
        para_count = "10 to 15" # default medium
        if "Short" in payload.duration:
            para_count = "4 to 6"
        elif "Long" in payload.duration:
            para_count = "25 to 35"

        if payload.format == "single-host":
            prompt = f"""You are a professional audio generation AI. 
Based on the following document context, generate an incredibly engaging and educational SINGLE-HOST MONOLOGUE. 
The host giving the monologue is named {payload.host1Name}.

CRITICAL: The monologue MUST be strictly in the following language: {payload.language}.
ABSOLUTELY NO LANGUAGE MIXING. Use ONLY {payload.language} vocabulary and alphabet. If {payload.language} is a regional language (e.g. Telugu), do NOT include other scripts like Tamil or Hindi.
{pages_text}
{instructions_text}

Respond strictly in JSON format with a single field "texts", which is an array of strings.
Each string is a paragraph of the monologue. 
DO NOT INCLUDE SPEAKER NAMES in the output, just the text paragraphs.
Generate exactly {para_count} distinct paragraphs/sections to match the requested duration of: {payload.duration}.
DO NOT MAKE IT A CONVERSATION. IT MUST BE ONE PERSON EXPLAINING THE TOPIC TO THE AUDIENCE.
"""
        else:
            prompt = f"""You are a professional podcast generation AI. 
Based on the following document context, generate an incredibly engaging, humorous, and educational podcast dialogue between two hosts: {payload.host1Name} and {payload.host2Name}.
They are discussing the document's main themes, making analogies, and bantering.

CRITICAL: The podcast MUST be strictly in the following language: {payload.language}.
ABSOLUTELY NO LANGUAGE MIXING. Use ONLY {payload.language} vocabulary and alphabet. If {payload.language} is a regional language (e.g. Telugu), do NOT include other scripts like Tamil or Hindi.
{pages_text}
{instructions_text}

Respond strictly in JSON format with a single field "script", which is an array of objects. 
Each object must have "speaker" (either "{payload.host1Name}" or "{payload.host2Name}") and "text" (the dialogue line).
Generate exactly {para_count} dialogue exchanges to match the requested duration of: {payload.duration}.
"""

        prompt += f"""
Context:
{context_text[:20000]}
"""
        script = []
        if USE_REAL_AI:
            if USE_OPENROUTER:
                headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
                res = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json={"model": "google/gemini-2.0-flash-001", "messages": [{"role": "user", "content": prompt}]},
                    timeout=45
                )
                if res.status_code == 200:
                    reply_text = res.json()['choices'][0]['message']['content']
                    json_match = re.search(r'\{.*\}', reply_text, re.DOTALL)
                    if json_match:
                        parsed = json.loads(json_match.group(0))
                        if payload.format == "single-host":
                            if "texts" in parsed:
                                script = [{"speaker": payload.host1Name, "text": t} for t in parsed["texts"]]
                            elif "script" in parsed:
                                script = [{"speaker": payload.host1Name, "text": s.get("text", "")} for s in parsed["script"]]
                            else:
                                script = []
                        else:
                            script = parsed.get("script", [])
            elif genai:
                model = genai.GenerativeModel("gemini-1.5-flash")
                response = model.generate_content(prompt)
                json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    if payload.format == "single-host":
                        if "texts" in parsed:
                            script = [{"speaker": payload.host1Name, "text": t} for t in parsed["texts"]]
                        elif "script" in parsed:
                            script = [{"speaker": payload.host1Name, "text": s.get("text", "")} for s in parsed["script"]]
                        else:
                            script = []
                    else:
                        script = parsed.get("script", [])
                    
        return {"script": script}
        
    except Exception as e:
        print(f"Error generating podcast: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@app.post("/generate-briefing")
async def generate_briefing(payload: GenerationPayload):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        cur = conn.cursor()
        cur.execute("SELECT content, transcript FROM public.study_items WHERE id = %s", (payload.item_id,))
        item_row = cur.fetchone()
        if not item_row:
            raise HTTPException(status_code=404, detail="Item not found")
        
        content = item_row[0] or ""
        transcript = item_row[1]
        
        context_text = content
        if transcript and isinstance(transcript, list) and len(transcript) > 0:
            context_text += "\n" + "\n".join([f"[{t.get('time','?')}] {t.get('text','')}" for t in transcript[:200]])
            
        cur.execute("SELECT chunk_text FROM public.document_chunks WHERE item_id = %s LIMIT 30", (payload.item_id,))
        chunks = cur.fetchall()
        if chunks:
            context_text += "\n" + "\n".join([c[0] for c in chunks])
            
        cur.close()
        
        prompt = f"""You are an expert Briefing Document creator.
Based on the following document context, generate a beautiful, highly structured Markdown briefing document.
It must include:
1. Executive Summary
2. FAQ (Frequently Asked Questions) - At least 5 insightful questions and answers.
3. Key Glossary - Define 5-10 core terms or concepts found in the text.
4. Chronology / Timeline (if applicable) or Major Takeaways.

Format beautifully with Markdown headers (H1, H2, H3), bold text, and bullet points.
Return ONLY the markdown string, do not wrap it in JSON.

Context:
{context_text[:20000]}
"""
        briefing_markdown = "# Briefing Document\n*Failed to generate briefing document.*"
        if USE_REAL_AI:
            if USE_OPENROUTER:
                headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
                res = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json={"model": "google/gemini-2.0-flash-001", "messages": [{"role": "user", "content": prompt}]},
                    timeout=45
                )
                if res.status_code == 200:
                    briefing_markdown = res.json()['choices'][0]['message']['content']
            elif genai:
                model = genai.GenerativeModel("gemini-1.5-flash")
                response = model.generate_content(prompt)
                briefing_markdown = response.text
                
        # Clean up markdown code blocks if any
        briefing_markdown = re.sub(r'^```(?:markdown)?\n?', '', briefing_markdown)
        briefing_markdown = re.sub(r'\n?```$', '', briefing_markdown)
                    
        return {"briefing_doc": briefing_markdown}
        
    except Exception as e:
        print(f"Error generating briefing: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()
