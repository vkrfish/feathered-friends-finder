# LearnX RAG System Evaluation Framework

This directory contains the official research paper evaluation framework for **LearnX** — a RAG-based personalized learning platform.

The evaluation benchmarks three baseline systems on a multi-domain test dataset:
1. **LLM Only (No Retrieval)**
2. **BM25 Keyword Search + LLM**
3. **LearnX (Embeddings + pgvector + LLM)**

---

## 📁 Directory Structure

```
evaluation/
├── requirements.txt    # Python package dependencies
├── ingest_corpus.py   # Populates PostgreSQL with multi-domain study resources
├── make_testset.py    # Generates 64 Q&A items using LLM across PDF, YouTube, Website, and Text sources
├── testset.csv        # Benchmark testset (question, ground_truth_answer, relevant_chunk_ids, source_type)
├── eval_retrieval.py  # Evaluates Precision@k, Recall@k, F1@k, and MRR for k=3 and k=5
├── eval_answers.py    # Evaluates Accuracy (LLM-as-judge), Token F1, Exact Match, and Faithfulness
├── run_all.py         # Master runner that executes full evaluation pipeline and outputs results
├── results.csv        # Machine-readable output table of all metrics
├── results_table.md   # Markdown table formatted for inclusion in research papers
└── comparison.png     # High-resolution comparison bar chart visualization
```

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
pip install -r evaluation/requirements.txt
```

### 2. Environment Setup
Ensure your `.env` file in the project root contains your database connection string and API key:
```env
DATABASE_URL="postgresql://postgres:Vasanth%4010906@127.0.0.1:5432/postgres"
OPENROUTER_API_KEY="your-openrouter-api-key"
```

### 3. Run Full Evaluation
Execute the entire pipeline with a single command:
```bash
python evaluation/run_all.py
```

---

## 🧪 Detailed Step-by-Step Execution

### Step 1: Ingest Corpus into PostgreSQL Database
Populates local PostgreSQL with 16 study items (spanning PDF, YouTube transcripts, Website guides, and Text notes) and generates chunk vector embeddings:
```bash
python evaluation/ingest_corpus.py
```

### Step 2: Generate Benchmark Testset
Samples random database chunks and uses the LLM to synthesize 64 distinct question-answer pairs:
```bash
python evaluation/make_testset.py
```

### Step 3: Run Retrieval Evaluation
Computes **Precision@k**, **Recall@k**, **F1@k**, and **MRR** at $k=3$ and $k=5$:
```bash
python evaluation/eval_retrieval.py
```

### Step 4: Run Answer Quality & Faithfulness Evaluation
Generates responses across all three systems and evaluates:
- **Accuracy**: LLM-as-judge strict CORRECT/INCORRECT grading against reference answer.
- **Token F1 & Exact Match**: Word-level precision/recall overlap with ground truth.
- **Faithfulness**: LLM-as-judge check verifying zero factual hallucinations outside provided context context.
```bash
python evaluation/eval_answers.py
```

---

## 📊 Output Artifacts

After running `python evaluation/run_all.py`, the following files are produced:

1. `results.csv` — CSV summary table containing metrics for all systems.
2. `results_table.md` — Clean Markdown table ready to paste directly into your research paper draft.
3. `comparison.png` — High-resolution bar chart comparing Precision, Recall, F1, Accuracy, and Faithfulness across all systems.
