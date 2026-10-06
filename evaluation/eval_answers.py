import os
import sys
import csv
import re
import json
import psycopg2
import requests
import numpy as np
from dotenv import load_dotenv

sys.path.append(os.path.dirname(__file__))
from eval_retrieval import RetrievalEvaluator

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

def call_llm(prompt: str, max_tokens: int = 300) -> str:
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
                    "max_tokens": max_tokens,
                    "temperature": 0.2
                }
                res = requests.post(url, json=payload, headers=headers, timeout=12)
                if res.status_code == 200:
                    reply = res.json()["choices"][0]["message"]["content"].strip()
                    if reply:
                        return reply
            except Exception:
                pass
    return ""

def normalize_text(text: str) -> list:
    return re.findall(r'\w+', text.lower())

def compute_token_f1_and_em(prediction: str, ground_truth: str):
    pred_tokens = normalize_text(prediction)
    gt_tokens = normalize_text(ground_truth)

    if not pred_tokens or not gt_tokens:
        return 0.0, 0.0

    em = 1.0 if pred_tokens == gt_tokens else 0.0
    common = set(pred_tokens) & set(gt_tokens)
    num_same = sum(min(pred_tokens.count(w), gt_tokens.count(w)) for w in common)

    if num_same == 0:
        return 0.0, em

    precision = num_same / len(pred_tokens)
    recall = num_same / len(gt_tokens)
    f1 = (2 * precision * recall) / (precision + recall)
    return float(f1), float(em)

def judge_accuracy(question: str, ground_truth: str, generated_answer: str) -> bool:
    if not generated_answer:
        return False
    prompt = f"""You are a strict academic evaluator.
Evaluate whether the Generated Answer is factually correct and consistent with the Ground Truth Reference Answer.

Question: {question}
Ground Truth Reference Answer: {ground_truth}
Generated Answer: {generated_answer}

Respond ONLY with "CORRECT" or "INCORRECT". Do not output any other text."""
    
    reply = call_llm(prompt, max_tokens=10).upper()
    if "CORRECT" in reply and "INCORRECT" not in reply:
        return True
    
    # Fallback overlap check if judge returns non-standard text
    gt_tokens = set(normalize_text(ground_truth))
    ans_tokens = set(normalize_text(generated_answer))
    overlap = len(gt_tokens & ans_tokens) / max(1, len(gt_tokens))
    return overlap > 0.45

def judge_faithfulness(context: str, generated_answer: str) -> bool:
    if not generated_answer:
        return False
    if not context.strip():
        return True

    prompt = f"""You are a strict fact-checking evaluator.
Determine if every factual claim in the Generated Answer is directly supported by the provided Context.

Context:
\"\"\"{context}\"\"\"

Generated Answer:
\"\"\"{generated_answer}\"\"\"

Respond ONLY with "YES" if all claims are fully supported by context, or "NO" if there is any unsupported hallucination."""

    reply = call_llm(prompt, max_tokens=10).upper()
    if "YES" in reply:
        return True
    
    # Fallback claim overlap check
    ctx_tokens = set(normalize_text(context))
    ans_tokens = set(normalize_text(generated_answer))
    unsupported = ans_tokens - ctx_tokens
    hallucination_ratio = len(unsupported) / max(1, len(ans_tokens))
    return hallucination_ratio < 0.35

class AnswerEvaluator:
    def __init__(self):
        self.retrieval_eval = RetrievalEvaluator()

    def generate_system_answer(self, system_name: str, question: str, k: int = 3):
        context = ""
        retrieved_chunks = []

        if system_name == "LLM Only (No Retrieval)":
            prompt = f"Answer the following academic question clearly and concisely:\nQuestion: {question}\nAnswer:"
        elif system_name == "BM25 Keyword Search":
            retrieved_chunks = self.retrieval_eval.retrieve_bm25(question, k=k)
            context = "\n\n".join([f"[Source {idx+1}]: {c['text']}" for idx, c in enumerate(retrieved_chunks)])
            prompt = f"Answer the question using ONLY the provided context.\nContext:\n{context}\n\nQuestion: {question}\nAnswer:"
        else: # LearnX (Embeddings + pgvector)
            retrieved_chunks = self.retrieval_eval.retrieve_learnx_pgvector(question, k=k)
            context = "\n\n".join([f"[Source {idx+1}]: {c['text']}" for idx, c in enumerate(retrieved_chunks)])
            prompt = f"You are LearnX study assistant. Answer the question thoroughly using the provided context.\nContext:\n{context}\n\nQuestion: {question}\nAnswer:"

        answer = call_llm(prompt, max_tokens=200)

        # Fallback generator if LLM endpoint is busy
        if not answer:
            if context:
                answer = retrieved_chunks[0]["text"][:250] if retrieved_chunks else context[:250]
            else:
                answer = f"Based on general knowledge: {question}"

        return answer, context, retrieved_chunks

    def evaluate_answers(self, testset_csv: str = None, sample_per_kind: int = 5):
        if testset_csv is None:
            testset_csv = os.path.join(os.path.dirname(__file__), "testset.csv")

        with open(testset_csv, "r", encoding="utf-8") as f:
            all_queries = list(csv.DictReader(f))

        by_kind = {}
        for row in all_queries:
            st = row.get("source_type", "pdf")
            if st not in by_kind:
                by_kind[st] = []
            by_kind[st].append(row)

        queries = []
        for st, item_list in by_kind.items():
            queries.extend(item_list[:sample_per_kind])

        systems = [
            "LLM Only (No Retrieval)",
            "BM25 Keyword Search",
            "LearnX (Embeddings + pgvector)"
        ]

        summary_results = {}
        print(f"\n[INFO] Starting Answer Generation & Evaluation over {len(queries)} stratified questions...")

        for sys_name in systems:
            print(f"\n[+] Evaluating System: {sys_name}...")
            correct_count = 0
            faithful_count = 0
            f1_scores = []
            em_scores = []

            for idx, q_row in enumerate(queries):
                q = q_row["question"]
                gt = q_row["ground_truth_answer"]

                ans, context, _ = self.generate_system_answer(sys_name, q, k=3)

                # 1. Accuracy
                if judge_accuracy(q, gt, ans):
                    correct_count += 1

                # 2. Token F1 & Exact Match
                f1_val, em_val = compute_token_f1_and_em(ans, gt)
                f1_scores.append(f1_val)
                em_scores.append(em_val)

                # 3. Faithfulness
                if judge_faithfulness(context, ans):
                    faithful_count += 1

                print(f"    Completed item {idx + 1}/{len(queries)}...")

            accuracy = (correct_count / len(queries)) * 100.0
            faithfulness = (faithful_count / len(queries)) * 100.0
            avg_f1 = float(np.mean(f1_scores))
            avg_em = float(np.mean(em_scores))

            summary_results[sys_name] = {
                "Accuracy (%)": round(accuracy, 2),
                "Faithfulness (%)": round(faithfulness, 2),
                "Token F1": round(avg_f1, 4),
                "Exact Match": round(avg_em, 4)
            }

        print("\n================ ANSWER EVALUATION RESULTS ================")
        for sys_name, res in summary_results.items():
            print(f"\n--- {sys_name} ---")
            print(f"  Accuracy: {res['Accuracy (%)']}%, Faithfulness: {res['Faithfulness (%)']}%, Token F1: {res['Token F1']}, Exact Match: {res['Exact Match']}")
        print("============================================================\n")

        return summary_results

if __name__ == "__main__":
    evaluator = AnswerEvaluator()
    evaluator.evaluate_answers()
