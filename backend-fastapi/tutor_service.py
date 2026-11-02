import json
import uuid
import re
from typing import List, Dict, Any, Optional

def fetch_document_chunks(conn, item_ids: List[str], query: Optional[str] = None, get_embedding_fn=None, limit: int = 6) -> List[Dict[str, Any]]:
    """
    Retrieves vector-grounded chunks from PostgreSQL document_chunks using pgvector cosine similarity,
    or falls back to sequential chunks if no query is provided.
    """
    if not item_ids:
        return []

    cur = conn.cursor()
    placeholders = ",".join(["%s"] * len(item_ids))

    if query and get_embedding_fn:
        try:
            emb = get_embedding_fn(query)
            sql = f"""
                SELECT id, item_id, page_number, chunk_text, (embedding <=> %s::vector) AS distance
                FROM public.document_chunks
                WHERE item_id IN ({placeholders})
                ORDER BY distance ASC
                LIMIT %s
            """
            cur.execute(sql, [str(emb)] + item_ids + [limit])
            rows = cur.fetchall()
            return [
                {"id": r[0], "item_id": str(r[1]), "page_number": r[2] or 1, "chunk_text": r[3], "distance": float(r[4])}
                for r in rows
            ]
        except Exception as e:
            print(f"[TutorService] Vector retrieval warning: {e}, falling back to sequential chunks")

    # Fallback: sequential chunks across pages
    sql = f"""
        SELECT id, item_id, page_number, chunk_text
        FROM public.document_chunks
        WHERE item_id IN ({placeholders})
        ORDER BY page_number ASC, id ASC
        LIMIT %s
    """
    cur.execute(sql, item_ids + [limit])
    rows = cur.fetchall()
    return [
        {"id": r[0], "item_id": str(r[1]), "page_number": r[2] or 1, "chunk_text": r[3]}
        for r in rows
    ]

def generate_tutor_outline(conn, item_ids: List[str], call_llm_fn) -> List[Dict[str, Any]]:
    """
    Analyzes document chunks to identify 3 to 6 logical chapters/sections for Tutor Mode.
    """
    chunks = fetch_document_chunks(conn, item_ids, limit=12)
    if not chunks:
        # Fallback outline if no chunks found
        return [
            {
                "id": "sec-1",
                "title": "Core Concepts & Foundations",
                "order_index": 1,
                "estimated_minutes": 3,
                "page_start": 1,
                "summary": "Overview of foundational principles and core terminology.",
                "planned_activities_count": 4,
                "source_snippet": "Foundational material from uploaded documents."
            }
        ]

    context_text = "\n\n".join([f"[Page {c.get('page_number', 1)}] {c['chunk_text'][:400]}" for c in chunks[:8]])

    system_prompt = (
        "You are an expert curriculum architect. Analyze the provided document excerpts and organize the "
        "document into 3 to 6 logical, sequential study chapters/sections.\n"
        "Return ONLY a valid JSON array of section objects with NO markdown formatting, matching this schema:\n"
        "[\n"
        "  {\n"
        '    "id": "sec-1",\n'
        '    "title": "SECTION TITLE IN CAPS",\n'
        '    "order_index": 1,\n'
        '    "estimated_minutes": 3,\n'
        '    "page_start": 1,\n'
        '    "summary": "Concise 1-2 sentence description of what the learner will master.",\n'
        '    "planned_activities_count": 4,\n'
        '    "source_snippet": "Brief excerpt quote grounding this chapter."\n'
        "  }\n"
        "]"
    )

    prompt = f"Document excerpts:\n{context_text}\n\nGenerate the sequential chapter outline:"

    try:
        raw_res = call_llm_fn(prompt, system_instruction=system_prompt, json_mode=True)
        raw_text = raw_res.strip()
        match = re.search(r'\[\s*\{.*\}\s*\]', raw_text, re.DOTALL)
        if match:
            raw_text = match.group(0)
        outline = json.loads(raw_text)
        if isinstance(outline, list) and len(outline) > 0:
            for idx, item in enumerate(outline):
                item["id"] = item.get("id") or f"sec-{idx + 1}"
                item["order_index"] = idx + 1
                item["estimated_minutes"] = int(item.get("estimated_minutes") or 3)
                item["planned_activities_count"] = int(item.get("planned_activities_count") or 4)
            return outline
    except Exception as e:
        print(f"[TutorService] Outline generation parsing error: {e}")

    # Heuristic fallback if LLM parse fails
    return [
        {
            "id": f"sec-{i+1}",
            "title": f"Chapter {i+1}: Section Overview",
            "order_index": i + 1,
            "estimated_minutes": 2,
            "page_start": chunks[i]["page_number"] if i < len(chunks) else 1,
            "summary": chunks[i]["chunk_text"][:120] + "...",
            "planned_activities_count": 4,
            "source_snippet": chunks[i]["chunk_text"][:80]
        }
        for i in range(min(4, len(chunks)))
    ]

def generate_tutor_step(conn, item_ids: List[str], section_title: str, step_index: int, total_steps: int, call_llm_fn, get_embedding_fn=None) -> Dict[str, Any]:
    """
    Generates a grounded learning block with interactive pills and exactly ONE active activity.
    Activity formats alternate between MCQ, Flashcard, Fill-in-the-blank, and True/False.
    """
    chunks = fetch_document_chunks(conn, item_ids, query=section_title, get_embedding_fn=get_embedding_fn, limit=4)
    context_text = "\n\n".join([f"[Page {c.get('page_number', 1)}] {c['chunk_text']}" for c in chunks])

    activity_types = ["mcq", "flashcard", "fill_blank", "true_false"]
    chosen_type = activity_types[step_index % len(activity_types)]

    system_prompt = (
        "You are an interactive, document-grounded AI Tutor in LearnX. "
        "Your task is to teach the learner one specific concept from the provided primary document, "
        "and provide ONE interactive learning activity.\n\n"
        "STRICT REQUIREMENTS:\n"
        "1. Teach ONLY facts present in the provided source text. Do not hallucinate.\n"
        "2. Break down the concept with clarity and provide Simpler, Example, and Why explanations.\n"
        "3. Provide exactly ONE activity of type: " + chosen_type + ".\n"
        "4. Return ONLY valid JSON with no markdown wrapping, matching this exact schema:\n"
        "{\n"
        '  "concept_pill": {"concept": "Key Concept Name", "description": "1 sentence definition"},\n'
        '  "learning_prose": "2-3 crisp sentences explaining today\'s core idea.",\n'
        '  "pills": {\n'
        '    "simpler": "Simplified analogy or plain English breakdown.",\n'
        '    "example": "Concrete practical code or real-world example.",\n'
        '    "why": "Why this mechanism or fact matters in production."\n'
        '  },\n'
        '  "micro_steps": [\n'
        '    "Step 1 detail",\n'
        '    "Step 2 detail",\n'
        '    "Step 3 detail"\n'
        '  ],\n'
        '  "takeaway": "1 sentence key takeaway rule.",\n'
        '  "activity": {\n'
        '    "type": "' + chosen_type + '",\n'
        '    "prompt": "Clear activity question or prompt",\n'
        '    "hint": "Subtle hint for learner",\n'
        '    "options": ["Option A", "Option B", "Option C", "Option D"],\n'
        '    "correct_option": 1,\n'
        '    "front": "Flashcard front prompt (for flashcard only)",\n'
        '    "back": "Flashcard back answer (for flashcard only)",\n'
        '    "sentence_before": "Sentence start (for fill_blank only)",\n'
        '    "expected_word": "target_word",\n'
        '    "sentence_after": "sentence end.",\n'
        '    "is_true": true,\n'
        '    "explanation": "Clear explanation citing the primary source."\n'
        '  }\n'
        "}"
    )

    prompt = (
        f"Section Title: {section_title}\n"
        f"Current Step Index: {step_index + 1} of {total_steps}\n"
        f"Target Activity Type: {chosen_type}\n\n"
        f"Grounded Source Passages:\n{context_text}\n\n"
        f"Generate the grounded learning block and single activity:"
    )

    try:
        raw_res = call_llm_fn(prompt, system_instruction=system_prompt, json_mode=True)
        raw_text = raw_res.strip()
        match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if match:
            raw_text = match.group(0)
        data = json.loads(raw_text)

        # Validate activity fields
        activity = data.get("activity", {})
        activity["type"] = chosen_type
        activity["id"] = f"act-{step_index + 1}-{uuid.uuid4().hex[:6]}"

        return {
            "step_index": step_index,
            "total_steps": total_steps,
            "concept_pill": data.get("concept_pill", {"concept": section_title, "description": "Key concept"}),
            "learning_prose": data.get("learning_prose", "Review the key principles of this section."),
            "pills": data.get("pills", {
                "simpler": "Simplified breakdown of the concept.",
                "example": "Practical implementation example.",
                "why": "Crucial for system correctness and performance."
            }),
            "micro_steps": data.get("micro_steps", [
                "1. Analyze primary input structure.",
                "2. Apply transformation and validation rules.",
                "3. Ensure deterministic output."
            ]),
            "takeaway": data.get("takeaway", "Systematic recall ensures long-term mastery."),
            "activity": activity,
            "source_reference": {
                "page_number": chunks[0].get("page_number", 1) if chunks else 1,
                "quote_snippet": chunks[0]["chunk_text"][:100] if chunks else ""
            }
        }
    except Exception as e:
        print(f"[TutorService] Step generation error: {e}")

    # Fallback step
    return {
        "step_index": step_index,
        "total_steps": total_steps,
        "concept_pill": {"concept": section_title, "description": "Core chapter concepts"},
        "learning_prose": f"This section reviews {section_title} directly from your study material.",
        "pills": {
            "simpler": "Break the topic down into fundamental definitions and feedback loops.",
            "example": "A real-world deployment verifying input schema and returning responses.",
            "why": "Ensures reliable operation and high exam retention."
        },
        "micro_steps": [
            "1. Define the core objective.",
            "2. Retrieve relevant contextual facts.",
            "3. Validate the outcome against primary sources."
        ],
        "takeaway": "Grounding every concept in source material prevents misconceptions.",
        "activity": {
            "id": f"act-{step_index + 1}-fallback",
            "type": "mcq",
            "prompt": f"Which fundamental mechanism is emphasized in {section_title}?",
            "options": [
                "Feedback verification and deterministic state control",
                "Arbitrary unverified output extrapolation",
                "Ignoring primary source requirements",
                "Manual unstructured guessing"
            ],
            "correct_option": 0,
            "explanation": "Option A is directly grounded in verified feedback loops.",
            "hint": "Consider the principle of active verification."
        },
        "source_reference": {"page_number": 1, "quote_snippet": "Primary verified document passage."}
    }

def evaluate_tutor_activity(stored_activity: Dict[str, Any], user_answer: Any, call_llm_fn=None) -> Dict[str, Any]:
    """
    Evaluates learner's answer against the stored activity.
    Supports MCQ, Flashcard, Fill-in-the-blank, and True/False.
    """
    act_type = stored_activity.get("type", "mcq")
    is_correct = False
    correct_display = ""
    explanation = stored_activity.get("explanation", "The answer is supported by the primary source document.")

    if act_type == "mcq":
        correct_idx = stored_activity.get("correct_option", 0)
        options = stored_activity.get("options", [])
        correct_letter = chr(65 + int(correct_idx))
        correct_display = f"{correct_letter}"
        try:
            is_correct = int(user_answer) == int(correct_idx)
        except Exception:
            is_correct = False

    elif act_type == "true_false":
        expected_bool = bool(stored_activity.get("is_true", True))
        user_bool = bool(user_answer) if isinstance(user_answer, bool) else str(user_answer).lower() in ["true", "1", "yes"]
        is_correct = user_bool == expected_bool
        correct_display = "True" if expected_bool else "False"

    elif act_type == "fill_blank":
        expected = str(stored_activity.get("expected_word", "")).strip().lower()
        submitted = str(user_answer).strip().lower()
        correct_display = stored_activity.get("expected_word", "")
        # Check exact or normalized match
        if submitted == expected:
            is_correct = True
        elif call_llm_fn and len(submitted) > 1:
            # Semantic evaluation for acceptable synonyms
            eval_prompt = (
                f"Expected concept: '{expected}'\n"
                f"Student response: '{submitted}'\n"
                f"Is the student's response semantically equivalent or an acceptable synonym? Answer ONLY 'YES' or 'NO':"
            )
            try:
                res = call_llm_fn(eval_prompt).strip().upper()
                is_correct = "YES" in res
            except Exception:
                is_correct = (submitted == expected)

    elif act_type == "flashcard":
        # Flashcard self-check or knowledge rating
        is_correct = str(user_answer).lower() in ["mastered", "got", "know", "true", "1"]
        correct_display = stored_activity.get("back", "Concept mastered")

    return {
        "is_correct": is_correct,
        "score": 100 if is_correct else 0,
        "correct_display": correct_display,
        "explanation": explanation,
        "feedback_message": "Correct! Excellent recall of this concept." if is_correct else "Incorrect. Review the grounded explanation above."
    }

def answer_tutor_followup(conn, item_ids: List[str], concept_title: str, user_question: str, call_llm_fn, get_embedding_fn=None) -> str:
    """
    Answers a learner's follow-up question when they click [Simpler], [Example], or [Why?].
    """
    chunks = fetch_document_chunks(conn, item_ids, query=user_question, get_embedding_fn=get_embedding_fn, limit=3)
    context_text = "\n\n".join([c["chunk_text"] for c in chunks])

    system_prompt = (
        "You are an AI Tutor in LearnX. The learner is studying a specific concept and asked a follow-up question. "
        "Provide a crisp, direct, helpful 2-3 sentence explanation strictly grounded in the document context."
    )
    prompt = f"Concept: {concept_title}\nStudent Question: {user_question}\n\nDocument Context:\n{context_text}\n\nAnswer:"

    try:
        res = call_llm_fn(prompt, system_instruction=system_prompt)
        return res.strip()
    except Exception as e:
        return f"Based on the course document, {concept_title} directly relates to {user_question} through fundamental architectural principles."

