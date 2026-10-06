import os
import sys
import uuid
import re
import psycopg2
import requests
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
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
        conn.autocommit = True
        return conn
    except Exception as e:
        print(f"[ERROR] Local connection failed: {e}")
        return psycopg2.connect(os.getenv("DATABASE_URL"))

def setup_database_schema(conn):
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS public.study_items (
        id UUID PRIMARY KEY,
        title TEXT NOT NULL,
        kind TEXT NOT NULL,
        file_name TEXT,
        content TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
    );
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS public.document_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id UUID NOT NULL REFERENCES public.study_items(id) ON DELETE CASCADE,
        page_number INT NOT NULL DEFAULT 1,
        chunk_text TEXT NOT NULL,
        embedding float8[]
    );
    """)
    try:
        cur.execute("""
        CREATE OR REPLACE FUNCTION array_cosine_distance(a float8[], b float8[]) RETURNS float8 AS $$
        DECLARE
            dot_product float8 := 0.0;
            norm_a float8 := 0.0;
            norm_b float8 := 0.0;
            i int;
            len int;
        BEGIN
            len := array_length(a, 1);
            IF len IS NULL OR len = 0 THEN RETURN 1.0; END IF;
            FOR i IN 1..len LOOP
                dot_product := dot_product + (a[i] * b[i]);
                norm_a := norm_a + (a[i] * a[i]);
                norm_b := norm_b + (b[i] * b[i]);
            END LOOP;
            IF norm_a = 0.0 OR norm_b = 0.0 THEN RETURN 1.0; END IF;
            RETURN 1.0 - (dot_product / (sqrt(norm_a) * sqrt(norm_b)));
        END;
        $$ LANGUAGE plpgsql IMMUTABLE;
        """)
        cur.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_operator WHERE oprname = '<=>') THEN
                CREATE OPERATOR <=> (
                    LEFTARG = float8[],
                    RIGHTARG = float8[],
                    PROCEDURE = array_cosine_distance,
                    COMMUTATOR = <=>
                );
            END IF;
        END $$;
        """)
    except Exception:
        pass
    cur.close()

CORPUS = [
    # --- PDF SOURCES ---
    {
        "kind": "pdf",
        "title": "Deep Learning Fundamentals & Neural Networks",
        "file_name": "deep_learning_handbook.pdf",
        "text": """Deep Learning is a specialized subfield of Machine Learning based on Artificial Neural Networks with representation learning. 
A feedforward neural network consists of an input layer, multiple hidden layers, and an output layer. 
Activation functions like Rectified Linear Unit (ReLU), Sigmoid, and Tanh introduce non-linearity into the network, enabling it to learn complex decision boundaries.
Backpropagation is the foundational algorithm used to train neural networks. It computes the gradient of the loss function with respect to each weight using the chain rule of calculus.
Stochastic Gradient Descent (SGD) and Adam are popular optimization algorithms used to minimize the loss during training.
Convolutional Neural Networks (CNNs) excel in spatial pattern recognition, making them standard for computer vision and image processing tasks.
Recurrent Neural Networks (RNNs) and Long Short-Term Memory (LSTM) networks are designed for sequential sequence data such as natural language and time series.
Overfitting occurs when a neural network memorizes training data noise; techniques like Dropout, L2 Regularization, and Early Stopping mitigate overfitting.
Evaluation metrics for neural network classifiers include Accuracy, Precision, Recall, F1 Score, and ROC-AUC curves."""
    },
    {
        "kind": "pdf",
        "title": "Retrieval-Augmented Generation Architecture",
        "file_name": "rag_architecture_guide.pdf",
        "text": """Retrieval-Augmented Generation (RAG) combines dense vector retrieval with Large Language Models (LLMs) to answer queries accurately using external knowledge bases.
In a RAG pipeline, input documents are parsed, split into fixed-size or semantic text chunks, and embedded into high-dimensional vector spaces using embedding models.
Vector databases such as pgvector, Pinecone, and Qdrant index these chunk embeddings using algorithms like HNSW for fast k-nearest neighbor search.
When a user submits a question, the query string is embedded into the same vector space, and cosine similarity distance is used to retrieve top-k relevant chunks.
The retrieved text chunks are formatted as context inside a prompt template alongside instructions and the original query, which is sent to the generative LLM.
RAG significantly reduces model hallucination, allows easy updating of dynamic domain knowledge without re-training, and provides exact source citations.
Advanced RAG architectures incorporate hybrid search (combining dense vector search with sparse BM25 keyword search) and cross-encoder re-ranking for improved precision.
Evaluating RAG systems requires measuring both Retrieval Quality (Precision@k, Recall@k, MRR) and Answer Quality (Accuracy, Token F1, Faithfulness)."""
    },
    {
        "kind": "pdf",
        "title": "Natural Language Processing with Transformers",
        "file_name": "nlp_transformers_survey.pdf",
        "text": """Transformer models introduced by Vaswani et al. revolutionized Natural Language Processing by eliminating recurrent connections in favor of self-attention mechanisms.
Multi-Head Attention enables the network to jointly attend to information from different representation subspaces at different positions.
Positional Encodings are added to input embeddings to inject sequence order information into the non-recurrent Transformer architecture.
BERT (Bidirectional Encoder Representations from Transformers) pre-trains bidirectional representations using Masked Language Modeling and Next Sentence Prediction tasks.
GPT (Generative Pre-trained Transformer) models auto-regressively generate text by predicting the next token conditioned on previous context tokens.
Fine-tuning adapts large pre-trained models to downstream tasks like classification, named entity recognition, and question answering with minimal labeled data.
Parameter-Efficient Fine-Tuning (PEFT) methods like LoRA (Low-Rank Adaptation) freeze pre-trained model weights and inject trainable rank decomposition matrices."""
    },
    {
        "kind": "pdf",
        "title": "Computer Vision & Object Detection",
        "file_name": "computer_vision_guide.pdf",
        "text": """Object detection algorithms locate and classify multiple visual objects within an image using bounding box coordinates and class probability scores.
Two-stage detectors like Faster R-CNN generate region proposals via a Region Proposal Network (RPN) before refining bounding boxes and classifying features.
Single-stage detectors such as YOLO (You Only Look Once) and SSD predict bounding boxes and class probabilities directly from full images in a single evaluation pass.
Intersection over Union (IoU) evaluates bounding box overlap accuracy by dividing the area of overlap by the area of union.
Mean Average Precision (mAP) is the primary metric for object detection, calculating the average precision across all object classes at specified IoU thresholds.
Data augmentation techniques like random cropping, flipping, color jittering, and CutMix increase dataset diversity and prevent visual model overfitting."""
    },

    # --- YOUTUBE SOURCES ---
    {
        "kind": "youtube",
        "title": "Data Structures: Hash Tables & Binary Trees",
        "file_name": "ds_hashtables_bst.mp4",
        "text": """Hash tables store key-value pairs and offer average-case O(1) constant time complexity for search, insertion, and deletion operations.
A hash function converts arbitrary keys into integer array indices. Collisions occur when two distinct keys hash to the exact same index.
Common collision resolution techniques include Separate Chaining using linked lists and Open Addressing using linear or quadratic probing.
Binary Search Trees maintain a sorted order where for any node, left subtree values are smaller and right subtree values are larger.
The average time complexity for operations in a balanced BST is O(log N), while an unbalanced tree degrades to O(N) linear time in the worst case.
Self-balancing binary search trees such as AVL Trees and Red-Black Trees perform tree rotations during insertion and deletion to maintain O(log N) height guarantees.
In-order traversal of a Binary Search Tree visits nodes in strictly ascending sorted order.
Graph data structures consist of vertices and edges; Depth-First Search (DFS) uses a stack while Breadth-First Search (BFS) utilizes a queue."""
    },
    {
        "kind": "youtube",
        "title": "Distributed Systems & Raft Consensus Algorithm",
        "file_name": "raft_consensus_lecture.mp4",
        "text": """Distributed consensus algorithms ensure that a cluster of computing nodes agree on a shared state or sequence of state machine transitions even during node failures.
The Raft consensus algorithm decomposes consensus into three clear subproblems: Leader Election, Log Replication, and Safety.
In Raft, at any given time, each server node is in one of three states: Leader, Follower, or Candidate.
The Leader node handles all client requests, appends log entries, and instructs Follower nodes to replicate log entries via AppendEntries RPCs.
If a Follower node receives no communication within an election timeout window, it becomes a Candidate and starts a new Leader Election.
A Candidate wins an election if it receives votes from a strict majority quorum of nodes in the cluster for that election term.
Raft guarantees log completeness and state machine safety: if a leader commits a log entry at an index, no node will apply a different entry for that index.
Byzantine Fault Tolerance handles malicious nodes, whereas Paxos and Raft handle fail-stop network crashes."""
    },
    {
        "kind": "youtube",
        "title": "Operating Systems: Process Management & Virtual Memory",
        "file_name": "os_memory_management.mp4",
        "text": """An operating system process is an executing program instance containing code, data, registers, and a process control block (PCB).
Process context switching saves the CPU state of a running process and restores the saved state of another process, incurring CPU overhead.
Preemptive CPU scheduling algorithms like Round Robin and Shortest Remaining Time First allocate CPU time slices dynamically to high-priority processes.
Virtual Memory provides each process with a contiguous virtual address space mapped to physical RAM pages by the Memory Management Unit (MMU).
Paging divides virtual memory into fixed-size pages and physical RAM into frames, using Page Tables to translate virtual addresses to physical frame addresses.
A Page Fault occurs when a referenced page is not currently present in RAM, triggering the OS to fetch the page from disk swap space.
Page replacement algorithms such as Least Recently Used (LRU) and Clock replace evicted pages to minimize page fault rates."""
    },
    {
        "kind": "youtube",
        "title": "System Design: Microservices & Load Balancing",
        "file_name": "system_design_microservices.mp4",
        "text": """Microservices architecture decomposes monolithic applications into small, loosely coupled, independently deployable service units communication over network protocols.
Load Balancers distribute incoming network traffic across multiple backend app servers to ensure high availability, fault tolerance, and responsiveness.
Round Robin, Least Connections, and Consistent Hashing are popular load balancing algorithms for request routing.
API Gateways act as a single entry point for clients, handling authentication, rate limiting, request routing, and SSL termination.
Database Sharding horizontally partitions database rows across multiple independent database nodes based on a shard key.
Caching strategies like Cache-Aside, Write-Through, and Write-Back using Redis or Memcached drastically lower database read latencies."""
    },

    # --- WEBSITE SOURCES ---
    {
        "kind": "website",
        "title": "FastAPI Asynchronous Architecture Guide",
        "file_name": "https://fastapi.tiangolo.com/architecture",
        "text": """FastAPI is a modern, fast, high-performance web framework for building APIs with Python 3.8+ based on standard Python type hints.
FastAPI is built on top of Starlette for web routing and Pydantic for data validation and schema serialization.
Using Python async and await keywords allows FastAPI to handle concurrent I/O operations efficiently on an event loop driven by Uvicorn ASGI server.
Path parameters and query parameters are declared directly as function parameters with Python type annotations, enabling automatic OpenAPI documentation generation.
Dependency Injection system in FastAPI simplifies authentication, database session management, and configuration loading using the Depends function.
Middleware functions wrap request processing to inspect incoming headers, log request durations, or add CORS headers across all routes.
Pydantic BaseModel schemas validate payload fields, enforce data constraints, and automatically return HTTP 422 Unprocessable Entity error responses for invalid inputs."""
    },
    {
        "kind": "website",
        "title": "React State Management with Hooks & Context",
        "file_name": "https://react.dev/learn/state-management",
        "text": """React is a declarative, component-based JavaScript library for building interactive user interfaces.
The useState hook lets functional components declare local state variables and re-render the component whenever state setter functions are invoked.
The useEffect hook handles side effects such as data fetching, subscription management, and direct DOM manipulation after rendering.
The useMemo and useCallback hooks optimize performance by memoizing computed values and callback function references across component re-renders.
React Context API provides a clean mechanism to pass data down the component tree without manually threading props at every level.
State lifting involves moving shared state up to the nearest common ancestor component so multiple sibling components stay synchronized.
Redux Toolkit and Zustand are popular global state management libraries for managing complex application state with deterministic actions and reducers.
Virtual DOM diffing efficiently compares component trees to apply minimal actual DOM updates, maximizing rendering performance."""
    },
    {
        "kind": "website",
        "title": "Docker Containers & Kubernetes Orchestration",
        "file_name": "https://kubernetes.io/docs/concepts",
        "text": """Docker containers package application code together with its dependencies, configuration, and runtime binaries into lightweight isolated environments.
A Dockerfile defines step-by-step build instructions to assemble container images, starting from a base image like Alpine or Ubuntu.
Container images are immutable templates; running container instances execute as isolated processes sharing the host operating system kernel.
Kubernetes is an open-source container orchestration system for automating application deployment, scaling, and operational management.
Pods are the smallest deployable units in Kubernetes, encapsulating one or more tightly coupled containers sharing storage and network interfaces.
Kubernetes Services expose Pods to network traffic using ClusterIP, NodePort, or LoadBalancer abstraction types.
Deployments declare desired state for Pod replica sets, managing rolling updates, health probes, and automated rollback operations."""
    },
    {
        "kind": "website",
        "title": "RESTful API Security & OAuth 2.0 / JWT",
        "file_name": "https://owasp.org/www-project-api-security",
        "text": """JSON Web Tokens (JWT) are compact, URL-safe tokens representing claims transferred between client and server in RESTful authentication flows.
A JWT consists of three base64url-encoded parts separated by dots: Header, Payload (claims), and Signature.
OAuth 2.0 is an industry-standard authorization framework enabling third-party applications to gain limited access to HTTP user accounts.
Authorization Code Grant with PKCE (Proof Key for Code Exchange) is the recommended OAuth flow for mobile and single-page web applications.
Cross-Origin Resource Sharing (CORS) security headers instruct browsers whether cross-origin HTTP requests should be allowed or blocked.
Rate Limiting protects web APIs against Denial-of-Service (DoS) attacks and brute-force attempts by restricting allowed requests per IP address."""
    },

    # --- TEXT SOURCES ---
    {
        "kind": "text",
        "title": "Database Systems & ACID Transactions",
        "file_name": "database_acid_notes.txt",
        "text": """Relational Database Management Systems (RDBMS) rely on the ACID properties to guarantee data reliability and integrity during database operations.
Atomicity ensures that all statement operations within a transaction execute completely or none of them execute at all.
Consistency guarantees that a database transaction transitions the database from one valid state to another valid state, preserving constraints and foreign keys.
Isolation ensures that concurrent transactions execute independently without interfering with each other's execution states.
Transaction isolation levels defined by ANSI SQL include Read Uncommitted, Read Committed, Repeatable Read, and Serializable.
Durability guarantees that once a transaction commits, its state updates persist permanently in non-volatile storage even during power failures.
Indexing using B-Trees and Hash indexes drastically speeds up SQL query lookups by avoiding full table scans.
Database normalization reduces data redundancy across tables by converting relations into First, Second, and Third Normal Forms (3NF)."""
    },
    {
        "kind": "text",
        "title": "Software Design Patterns & SOLID Principles",
        "file_name": "software_patterns_solid.txt",
        "text": """SOLID principles are five foundational object-oriented design principles aimed at making software designs more understandable, flexible, and maintainable.
Single Responsibility Principle (SRP) states that a class should have only one single reason to change, meaning it should have only one job.
Open-Closed Principle (OCP) dictates that software entities should be open for extension but closed for modification.
Liskov Substitution Principle (LSP) requires that objects of a superclass should be replaceable with objects of a subclass without altering program correctness.
Interface Segregation Principle (ISP) specifies that clients should not be forced to depend on interface methods they do not use.
Dependency Inversion Principle (DIP) states that high-level modules should not depend on low-level modules; both should depend on abstractions.
Creational design patterns like Singleton, Factory Method, and Builder control object instantiation processes.
Structural patterns like Adapter and Decorator compose classes into larger structures, while Behavioral patterns like Observer and Strategy handle algorithmic communication."""
    },
    {
        "kind": "text",
        "title": "Computer Networks & TCP/IP Protocol Stack",
        "file_name": "networking_tcp_ip_notes.txt",
        "text": """The OSI model divides network communication into seven layers: Physical, Data Link, Network, Transport, Session, Presentation, and Application.
The TCP/IP suite simplifies this into four practical layers: Link, Internet (IP), Transport (TCP/UDP), and Application (HTTP/DNS/SMTP).
Transmission Control Protocol (TCP) provides reliable, connection-oriented, ordered byte-stream delivery using three-way handshakes and sliding window flow control.
User Datagram Protocol (UDP) is a lightweight, connectionless protocol offering fast, unacknowledged datagram transmission suitable for real-time streaming and gaming.
Domain Name System (DNS) translates human-readable domain names into numerical IP addresses using hierarchical distributed name servers.
Address Resolution Protocol (ARP) maps IPv4 network addresses to physical MAC hardware addresses within local local area networks.
Border Gateway Protocol (BGP) is the core routing protocol of the global Internet, exchanging routing information between Autonomous Systems (AS)."""
    },
    {
        "kind": "text",
        "title": "Cybersecurity Fundamentals & Cryptography",
        "file_name": "security_crypto_notes.txt",
        "text": """Symmetric Encryption algorithms like AES (Advanced Encryption Standard) use the same secret key for both data encryption and decryption.
Asymmetric Encryption algorithms like RSA and ECC (Elliptic Curve Cryptography) use a public key for encryption and a private key for decryption.
Cryptographic Hash Functions like SHA-256 map arbitrary data to fixed-size digest strings and are strictly one-way deterministic functions.
Digital Signatures provide authentication, non-repudiation, and message integrity by signing hash digests with a sender's private key.
Transport Layer Security (TLS/SSL) encrypts HTTP web traffic using asymmetric key exchange to establish a shared symmetric session key.
Public Key Infrastructure (PKI) issues and manages digital X.509 certificates validated by trusted Certificate Authorities (CAs)."""
    }
]

def chunk_text(text: str, chunk_size: int = 400, overlap: int = 60) -> list:
    chunks = []
    start = 0
    text_len = len(text)
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunk = text[start:end].strip()
        if len(chunk) > 50:
            chunks.append(chunk)
        start += (chunk_size - overlap)
    return chunks

def ingest_corpus():
    conn = get_db_connection()
    if not conn:
        print("[ERROR] Cannot connect to database for ingestion.")
        return 0

    setup_database_schema(conn)
    cur = conn.cursor()

    cur.execute("DELETE FROM public.document_chunks;")
    cur.execute("DELETE FROM public.study_items;")

    # Collect all chunks across corpus to build high-quality TfidfVectorizer dense 1536-dim embedding model
    all_chunks_raw = []
    items_chunks_map = []

    for item in CORPUS:
        item_id = str(uuid.uuid4())
        title = item["title"]
        kind = item["kind"]
        file_name = item["file_name"]
        text_content = item["text"]

        cur.execute(
            """
            INSERT INTO public.study_items (id, title, kind, file_name, content)
            VALUES (%s, %s, %s, %s, %s);
            """,
            (item_id, title, kind, file_name, text_content)
        )

        chunks = chunk_text(text_content)
        for idx, chunk in enumerate(chunks):
            all_chunks_raw.append(chunk)
            items_chunks_map.append((item_id, idx + 1, chunk))

    # Fit TF-IDF Vectorizer to generate dense 1536-dimensional embeddings
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=1536, sublinear_tf=True)
    matrix = vectorizer.fit_transform(all_chunks_raw).toarray()
    
    # Pad or slice to exactly 1536 dimensions
    if matrix.shape[1] < 1536:
        matrix = np.pad(matrix, ((0, 0), (0, 1536 - matrix.shape[1])))
    else:
        matrix = matrix[:, :1536]

    # Normalize vectors to unit length
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    matrix = (matrix / norms).tolist()

    total_chunks = 0
    for idx, (item_id, page_num, chunk_text_val) in enumerate(items_chunks_map):
        embedding_vec = matrix[idx]
        cur.execute(
            """
            INSERT INTO public.document_chunks (item_id, page_number, chunk_text, embedding)
            VALUES (%s, %s, %s, %s);
            """,
            (item_id, page_num, chunk_text_val, embedding_vec)
        )
        total_chunks += 1

    print(f"[SUCCESS] Ingested {len(CORPUS)} study items ({len(CORPUS)} documents) resulting in {total_chunks} dense 1536-dim chunk embeddings.")
    cur.close()
    conn.close()
    return total_chunks

if __name__ == "__main__":
    ingest_corpus()
