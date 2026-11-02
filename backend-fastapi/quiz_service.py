import json
import re
from typing import List, Dict, Any, Optional

QUIZ_SYSTEM_PROMPT = """You are an expert academic quiz generator and rigorous examiner.
Your task is to generate high-quality multiple-choice questions strictly from the provided source context.
Do not use outside knowledge.
Do not hallucinate or fabricate facts.
Every question, option, and explanation must be directly grounded in the provided document chunks."""

def parse_llm_json(raw_text: str) -> Dict[str, Any]:
    """Extract and parse clean JSON from LLM output, stripping markdown blocks if present."""
    clean_text = raw_text.strip()
    clean_text = re.sub(r"^```(?:json)?\s*", "", clean_text, flags=re.MULTILINE)
    clean_text = re.sub(r"\s*```$", "", clean_text, flags=re.MULTILINE)
    clean_text = clean_text.strip()
    return json.loads(clean_text)

def generate_rag_quiz(
    conn,
    get_embedding_fn,
    call_llm_fn,
    item_ids: List[str],
    topic: Optional[str] = None,
    num_questions: int = 5,
    difficulty: str = "medium"
) -> List[Dict[str, Any]]:
    """
    Retrieves grounded document chunks and generates structured multiple-choice questions.
    """
    # 1. Clamp and validate settings
    num_questions = max(1, min(15, int(num_questions)))
    difficulty = difficulty.lower().strip()
    if difficulty not in ["easy", "medium", "hard"]:
        difficulty = "medium"

    # 2. Retrieve relevant chunks using existing pgvector infrastructure
    cur = conn.cursor()
    chunks = []
    
    clean_topic = (topic or "").strip()
    if clean_topic:
        # Semantically targeted retrieval for topic
        query_emb = get_embedding_fn(clean_topic, fast=False)
        cur.execute(
            """
            SELECT c.chunk_text, c.page_number, s.title, s.file_name, c.item_id, (c.embedding <=> %s::vector) AS dist
            FROM public.document_chunks c
            JOIN public.study_items s ON c.item_id = s.id
            WHERE c.item_id = ANY(%s::uuid[])
            ORDER BY c.embedding <=> %s::vector ASC
            LIMIT 10
            """,
            (query_emb, item_ids, query_emb)
        )
        chunks = cur.fetchall()
    
    if not chunks:
        # Document-wide representative retrieval
        cur.execute(
            """
            SELECT c.chunk_text, c.page_number, s.title, s.file_name, c.item_id, 0.0 AS dist
            FROM public.document_chunks c
            JOIN public.study_items s ON c.item_id = s.id
            WHERE c.item_id = ANY(%s::uuid[])
            ORDER BY c.page_number ASC, c.id ASC
            LIMIT 14
            """,
            (item_ids,)
        )
        chunks = cur.fetchall()

    # Fallback to study_items.content if no chunks were vectorized
    if not chunks:
        cur.execute(
            """
            SELECT content, 1 AS page_number, title, file_name, id, 0.0 AS dist
            FROM public.study_items
            WHERE id = ANY(%s::uuid[]) AND content IS NOT NULL AND trim(content) != ''
            LIMIT 5
            """,
            (item_ids,)
        )
        items_fallback = cur.fetchall()
        if items_fallback:
            for it in items_fallback:
                chunks.append((it[0][:2000], 1, it[2], it[3], it[4], 0.0))

    if not chunks:
        raise ValueError("Selected document contains insufficient content for quiz generation. Please verify that documents are ingested.")

    # 3. Format context string with chunk identifiers
    context_blocks = []
    chunk_meta_map = {}
    for idx, row in enumerate(chunks):
        c_text, page_num, title, file_name, item_id, _ = row
        chunk_id = idx + 1
        chunk_meta_map[chunk_id] = {
            "page_number": int(page_num or 1),
            "title": title or "Source Document"
        }
        context_blocks.append(f"[Section {chunk_id} | Page {page_num} | {title}]\n{c_text.strip()}\n")

    combined_context = "\n---\n".join(context_blocks)
    if len(combined_context) > 16000:
        combined_context = combined_context[:16000]

    # 4. Construct prompt based on difficulty & topic
    difficulty_instructions = {
        "easy": "Focus on explicit definitions, terminology, and direct factual statements stated clearly in the context.",
        "medium": "Focus on conceptual understanding, cause-and-effect relationships, and comparing ideas from the context.",
        "hard": "Focus on deep analytical reasoning, application scenarios, and plausible, tricky distractors derived from the context."
    }

    topic_instruction = f"Topic to emphasize: '{clean_topic}'." if clean_topic else "Cover key concepts evenly across all provided sections."

    prompt = f"""Generate exactly {num_questions} multiple-choice questions (MCQs) strictly from the provided study context.

Context:
---
{combined_context}
---

Requirements:
- Target Number of Questions: {num_questions}
- Difficulty Level: {difficulty.upper()} ({difficulty_instructions[difficulty]})
- {topic_instruction}

Strict Rules:
1. Every question must be fully grounded in the provided context. Do NOT use outside knowledge.
2. Provide exactly 4 distinct answer options for each question.
3. Only ONE option must be correct. The other 3 must be plausible distractors based on the text.
4. Specify 'answer' as an integer index (0 for first option, 1 for second, 2 for third, 3 for fourth).
5. In 'explanation', provide a concise 1-2 sentence rationale citing the facts from the context.
6. In 'source_section', specify the section number (e.g. 1, 2, 3...) from which the question was generated.
7. In 'source_excerpt', provide a 1-sentence verbatim or near-verbatim quote from that section.
8. Do NOT refer to 'the passage', 'the text', or 'according to the context' in the question wording. Formulate questions as academic exam items.

Return JSON strictly matching this schema:
{{
  "questions": [
    {{
      "question": "Question text here?",
      "options": ["First option", "Second option", "Third option", "Fourth option"],
      "answer": 0,
      "explanation": "Clear explanation of why this answer is correct based on the text.",
      "source_section": 1,
      "source_excerpt": "Relevant sentence from the text."
    }}
  ]
}}"""

    # 5. Execute LLM call with JSON mode
    raw_response = call_llm_fn(prompt, system_instruction=QUIZ_SYSTEM_PROMPT, json_mode=True, timeout=40)
    if not raw_response or not raw_response.strip():
        raise RuntimeError("LLM did not return a response for quiz generation.")

    try:
        parsed_data = parse_llm_json(raw_response)
    except Exception as e:
        print(f"[QuizService] First JSON parse attempt failed: {e}. Raw was: {raw_response[:200]}")
        # Try extracting JSON object via regex
        match = re.search(r"\{.*\}", raw_response, re.DOTALL)
        if match:
            parsed_data = json.loads(match.group(0))
        else:
            raise ValueError("LLM returned non-JSON format for quiz generation.")

    raw_questions = parsed_data.get("questions") or parsed_data.get("mcqs") or []
    if not isinstance(raw_questions, list) or len(raw_questions) == 0:
        raise ValueError("LLM generated an empty question list.")

    # 6. Validate and sanitize questions
    valid_questions = []
    for idx, q in enumerate(raw_questions):
        q_text = str(q.get("question") or "").strip()
        if not q_text or len(q_text) < 10:
            continue

        raw_opts = q.get("options")
        clean_opts = []
        if isinstance(raw_opts, list):
            clean_opts = [str(o).strip() for o in raw_opts if str(o).strip()]
        elif isinstance(raw_opts, dict):
            # Formats like {"A": "...", "B": "..."}
            for k in ["A", "B", "C", "D", "a", "b", "c", "d"]:
                if k in raw_opts:
                    clean_opts.append(str(raw_opts[k]).strip())

        if len(clean_opts) < 4:
            continue
        clean_opts = clean_opts[:4]

        # Normalize answer index
        ans_val = q.get("answer", 0)
        if isinstance(ans_val, str):
            ans_str = ans_val.strip().upper()
            letter_map = {"A": 0, "B": 1, "C": 2, "D": 3}
            ans_idx = letter_map.get(ans_str, 0)
        elif isinstance(ans_val, int):
            ans_idx = max(0, min(3, ans_val))
        else:
            ans_idx = 0

        explanation = str(q.get("explanation") or "").strip()
        if not explanation:
            explanation = f"Correct answer is {clean_opts[ans_idx]} based on the study document."

        # Map source section to page number
        sec_num = q.get("source_section")
        try:
            sec_num = int(sec_num)
        except (TypeError, ValueError):
            sec_num = 1

        sec_meta = chunk_meta_map.get(sec_num) or chunk_meta_map.get(1, {"page_number": 1, "title": "Document"})
        excerpt = str(q.get("source_excerpt") or "").strip()

        valid_questions.append({
            "id": f"q_{len(valid_questions)}",
            "question": q_text,
            "options": clean_opts,
            "answer": ans_idx,
            "explanation": explanation,
            "source_reference": {
                "page_number": sec_meta.get("page_number", 1),
                "title": sec_meta.get("title", "Document"),
                "excerpt": excerpt
            }
        })

        if len(valid_questions) >= num_questions:
            break

    if len(valid_questions) == 0:
        raise ValueError("Could not extract valid quiz questions from model response.")

    return valid_questions

def evaluate_quiz_submission(
    session_questions: List[Dict[str, Any]],
    user_answers: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluates submitted user answers against stored correct answers.
    Calculates score, percentage, and detailed question breakdown.
    """
    score = 0
    total = len(session_questions)
    detailed_results = []

    for q in session_questions:
        q_id = q.get("id")
        user_choice = user_answers.get(q_id)
        
        # Parse user answer to int if possible
        user_choice_idx = None
        if user_choice is not None:
            try:
                user_choice_idx = int(user_choice)
            except (ValueError, TypeError):
                user_choice_idx = None

        correct_idx = q.get("answer", 0)
        is_correct = (user_choice_idx is not None and user_choice_idx == correct_idx)

        if is_correct:
            score += 1

        detailed_results.append({
            "id": q_id,
            "question": q.get("question"),
            "options": q.get("options", []),
            "selected_option": user_choice_idx,
            "correct_option": correct_idx,
            "is_correct": is_correct,
            "explanation": q.get("explanation", ""),
            "source_reference": q.get("source_reference", {})
        })

    percentage = round((score / total) * 100) if total > 0 else 0

    return {
        "score": score,
        "total_questions": total,
        "percentage": percentage,
        "results": detailed_results
    }

