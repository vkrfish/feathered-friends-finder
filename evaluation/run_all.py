import os
import sys
import csv
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from dotenv import load_dotenv

# Ensure evaluation directory is on sys.path
eval_dir = os.path.dirname(__file__)
sys.path.append(eval_dir)

from make_testset import make_testset
from eval_retrieval import RetrievalEvaluator
from eval_answers import AnswerEvaluator

def run_pipeline():
    print("==========================================================")
    print("      LearnX RAG System Research Paper Evaluation          ")
    print("==========================================================\n")

    testset_path = os.path.join(eval_dir, "testset.csv")
    if not os.path.exists(testset_path):
        print("[STEP 1/3] Testset CSV not found. Generating new benchmark testset...")
        make_testset(target_count=64, output_csv=testset_path)
    else:
        print("[STEP 1/3] Using existing benchmark testset:", testset_path)

    # 1. Run Retrieval Evaluation
    print("\n[STEP 2/3] Executing Retrieval Evaluation (k=3 & k=5)...")
    retrieval_eval = RetrievalEvaluator()
    retrieval_results = retrieval_eval.evaluate_retrieval(testset_csv=testset_path)

    # 2. Run Answer Evaluation
    print("\n[STEP 3/3] Executing Answer Quality & Faithfulness Evaluation...")
    answer_eval = AnswerEvaluator()
    answer_results = answer_eval.evaluate_answers(testset_csv=testset_path, sample_per_kind=5)

    # Combine Results into unified dataset
    combined_rows = []

    systems = [
        "LLM Only (No Retrieval)",
        "BM25 Keyword Search",
        "LearnX (Embeddings + pgvector)"
    ]

    for sys_name in systems:
        r_metrics_k3 = retrieval_results.get(sys_name, {}).get("k=3", {})
        a_metrics = answer_results.get(sys_name, {})

        combined_rows.append({
            "System": sys_name,
            "Precision": round(r_metrics_k3.get("Precision", 0.0), 4),
            "Recall": round(r_metrics_k3.get("Recall", 0.0), 4),
            "F1": round(r_metrics_k3.get("F1", 0.0), 4),
            "MRR": round(r_metrics_k3.get("MRR", 0.0), 4),
            "Accuracy (%)": a_metrics.get("Accuracy (%)", 0.0),
            "Faithfulness (%)": a_metrics.get("Faithfulness (%)", 0.0)
        })

    df_results = pd.DataFrame(combined_rows)

    # Save results.csv
    results_csv_path = os.path.join(eval_dir, "results.csv")
    df_results.to_csv(results_csv_path, index=False)
    print(f"\n[OUTPUT] Saved metrics CSV to '{results_csv_path}'.")

    # Generate results_table.md
    markdown_table = df_results.to_markdown(index=False)
    md_content = f"""# LearnX Research Paper Evaluation Results

The evaluation was conducted on a benchmark dataset of 64 academic Q&A items across four source categories: PDF documents, YouTube transcripts, Websites, and Text notes.

## Summary Table

{markdown_table}

*Note: Precision, Recall, F1, and MRR are evaluated at k=3. Accuracy and Faithfulness are expressed as percentages.*
"""
    results_md_path = os.path.join(eval_dir, "results_table.md")
    with open(results_md_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"[OUTPUT] Saved Markdown results table to '{results_md_path}'.")

    # Generate comparison bar chart png
    plt.style.use("ggplot")
    fig, ax = plt.subplots(figsize=(10, 6))

    metrics_to_plot = ["Precision", "Recall", "F1", "Accuracy (%)", "Faithfulness (%)"]
    x = np.arange(len(metrics_to_plot))
    width = 0.25

    for idx, sys_name in enumerate(systems):
        row = df_results[df_results["System"] == sys_name].iloc[0]
        values = [
            row["Precision"],
            row["Recall"],
            row["F1"],
            row["Accuracy (%)"] / 100.0,
            row["Faithfulness (%)"] / 100.0
        ]
        ax.bar(x + (idx - 1) * width, values, width, label=sys_name)

    ax.set_ylabel("Score (0.0 - 1.0 Normalized)")
    ax.set_title("Performance Comparison Across Baseline Systems & LearnX RAG")
    ax.set_xticks(x)
    ax.set_xticklabels(metrics_to_plot, fontweight="bold")
    ax.set_ylim(0, 1.15)
    ax.legend(loc="upper left")
    plt.tight_layout()

    chart_path = os.path.join(eval_dir, "comparison.png")
    plt.savefig(chart_path, dpi=300)
    plt.close()
    print(f"[OUTPUT] Saved comparison bar chart to '{chart_path}'.")

    # Print Markdown table to stdout
    print("\n================ FINAL RESULTS TABLE ================\n")
    print(markdown_table)
    print("\n=====================================================")
    return df_results

if __name__ == "__main__":
    run_pipeline()
