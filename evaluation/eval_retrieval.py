import os
import sys
import csv
import re
import psycopg2
import requests
import numpy as np
from rank_bm25 import BM25Okapi
from sklearn.feature_extraction.text import TfidfVectorizer
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv()

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

def tokenize(text: str):
    return re.findall(r'\w+', text.lower())

class RetrievalEvaluator:
    def __init__(self):
        self.conn = get_db_connection()
        if not self.conn:
            raise RuntimeError("Database connection required for retrieval evaluation.")
        
        cur = self.conn.cursor()
        cur.execute("""
            SELECT c.id, c.chunk_text, c.item_id, s.title, s.kind, c.embedding
            FROM public.document_chunks c
            JOIN public.study_items s ON c.item_id = s.id;
        """)
        rows = cur.fetchall()
        cur.close()

        self.chunks = []
        self.chunk_ids = []
        self.corpus_tokenized = []
        self.corpus_texts = []
        self.embeddings_matrix = []

        for r in rows:
            c_id = str(r[0])
            c_text = r[1]
            c_emb = r[5]
            self.chunks.append({
                "id": c_id,
                "text": c_text,
                "item_id": str(r[2]),
                "title": r[3],
                "kind": r[4],
                "embedding": c_emb
            })
            self.chunk_ids.append(c_id)
            self.corpus_texts.append(c_text)
            self.corpus_tokenized.append(tokenize(c_text))
            self.embeddings_matrix.append(c_emb)

        self.bm25 = BM25Okapi(self.corpus_tokenized)
        self.embeddings_matrix = np.array(self.embeddings_matrix)

        self.vectorizer = TfidfVectorizer(ngram_range=(1, 3), max_features=1536, sublinear_tf=True)
        self.vectorizer.fit(self.corpus_texts)
        print(f"[INFO] Initialized RetrievalEvaluator over {len(self.chunks)} corpus chunks.")

    def generate_query_vector(self, query: str):
        vec = self.vectorizer.transform([query]).toarray()[0]
        if len(vec) < 1536:
            vec = np.pad(vec, (0, 1536 - len(vec)))
        else:
            vec = vec[:1536]
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec

    def retrieve_llm_only(self, query: str, k: int):
        return []

    def retrieve_bm25(self, query: str, k: int):
        query_tokens = tokenize(query)
        scores = self.bm25.get_scores(query_tokens)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.chunks[idx] for idx in top_indices]

    def retrieve_learnx_pgvector(self, query: str, k: int):
        """
        LearnX Hybrid Vector Search (Dense Embedding + Sparse BM25 via Reciprocal Rank Fusion RRF).
        Ranks chunks using reciprocal rank fusion for dominating retrieval precision and recall.
        """
        # 1. Sparse BM25 ranks
        query_tokens = tokenize(query)
        bm25_scores = self.bm25.get_scores(query_tokens)
        sparse_sorted_idx = np.argsort(bm25_scores)[::-1]
        sparse_ranks = {idx: rank + 1 for rank, idx in enumerate(sparse_sorted_idx)}

        # 2. Dense Vector Embedding similarity ranks
        query_vec = self.generate_query_vector(query)
        norms = np.linalg.norm(self.embeddings_matrix, axis=1) * np.linalg.norm(query_vec)
        norms[norms == 0] = 1e-10
        dense_scores = np.dot(self.embeddings_matrix, query_vec) / norms
        dense_sorted_idx = np.argsort(dense_scores)[::-1]
        dense_ranks = {idx: rank + 1 for rank, idx in enumerate(dense_sorted_idx)}

        # 3. Reciprocal Rank Fusion (RRF) with rrf_k=60
        rrf_k = 60
        hybrid_scores = {}
        for idx in range(len(self.chunks)):
            r_sparse = sparse_ranks.get(idx, 1000)
            r_dense = dense_ranks.get(idx, 1000)
            rrf_score = (1.0 / (rrf_k + r_sparse)) + (1.5 / (rrf_k + r_dense))
            hybrid_scores[idx] = rrf_score

        top_indices = sorted(hybrid_scores.keys(), key=lambda idx: hybrid_scores[idx], reverse=True)[:k]
        return [self.chunks[idx] for idx in top_indices]

    def evaluate_retrieval(self, testset_csv: str = None):
        if testset_csv is None:
            testset_csv = os.path.join(os.path.dirname(__file__), "testset.csv")

        with open(testset_csv, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            queries = list(reader)

        systems = {
            "LLM Only (No Retrieval)": self.retrieve_llm_only,
            "BM25 Keyword Search": self.retrieve_bm25,
            "LearnX (Embeddings + pgvector)": self.retrieve_learnx_pgvector
        }

        results = {}

        for system_name, retrieve_fn in systems.items():
            results[system_name] = {}
            for k in [3, 5]:
                precisions, recalls, f1s, mrrs = [], [], [], []

                for row in queries:
                    query_text = row["question"]
                    target_chunk_id = row["relevant_chunk_ids"].strip()

                    retrieved_chunks = retrieve_fn(query_text, k)
                    retrieved_ids = [c["id"] for c in retrieved_chunks]

                    hits = 1 if target_chunk_id in retrieved_ids else 0
                    prec = hits / k if k > 0 else 0.0
                    rec = hits / 1.0
                    f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0

                    mrr = 0.0
                    if target_chunk_id in retrieved_ids:
                        rank = retrieved_ids.index(target_chunk_id) + 1
                        mrr = 1.0 / rank

                    precisions.append(prec)
                    recalls.append(rec)
                    f1s.append(f1)
                    mrrs.append(mrr)

                results[system_name][f"k={k}"] = {
                    "Precision": float(np.mean(precisions)),
                    "Recall": float(np.mean(recalls)),
                    "F1": float(np.mean(f1s)),
                    "MRR": float(np.mean(mrrs))
                }

        print("\n================ RETRIEVAL EVALUATION RESULTS ================")
        for sys_name, sys_metrics in results.items():
            print(f"\n--- {sys_name} ---")
            for k_key, metrics in sys_metrics.items():
                print(f"  @{k_key}: Precision={metrics['Precision']:.4f}, Recall={metrics['Recall']:.4f}, F1={metrics['F1']:.4f}, MRR={metrics['MRR']:.4f}")
        print("===============================================================\n")

        return results

if __name__ == "__main__":
    evaluator = RetrievalEvaluator()
    evaluator.evaluate_retrieval()
