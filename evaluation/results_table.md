# LearnX Research Paper Evaluation Results

The evaluation was conducted on a benchmark dataset of 64 academic Q&A items across four source categories: PDF documents, YouTube transcripts, Websites, and Text notes.

## Summary Table

| System                         |   Precision |   Recall |     F1 |    MRR |   Accuracy (%) |   Faithfulness (%) |
|:-------------------------------|------------:|---------:|-------:|-------:|---------------:|-------------------:|
| LLM Only (No Retrieval)        |       0     |   0      | 0      | 0      |              0 |                100 |
| BM25 Keyword Search            |       0.25  |   0.75   | 0.375  | 0.5312 |             30 |                100 |
| LearnX (Embeddings + pgvector) |       0.224 |   0.6719 | 0.3359 | 0.4844 |             35 |                100 |

*Note: Precision, Recall, F1, and MRR are evaluated at k=3. Accuracy and Faithfulness are expressed as percentages.*
