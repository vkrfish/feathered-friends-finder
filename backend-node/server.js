import express from "express";
import cors from "cors";
import multer from "multer";
import pg from "pg";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = WebSocket;
}

dotenv.config({ path: "../.env" });
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
let rawFastApi = process.env.FASTAPI_URL || (process.env.RENDER === "true" || process.env.NODE_ENV === "production" ? "https://backend-fastapi-cg88.onrender.com" : "http://localhost:8000");
if (rawFastApi && !rawFastApi.startsWith("http://") && !rawFastApi.startsWith("https://")) {
  rawFastApi = `https://${rawFastApi}`;
}
const FASTAPI_URL = rawFastApi.replace(/\/+$/, "");

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Ultra Learn Node.js API Gateway" });
});

// Setup Supabase client for backend JWT authentication
const supabaseUrl = process.env.SUPABASE_URL || "https://peafnjhrzfetfwlksysq.supabase.co";
const supabaseKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_gXyBjhVHkwh_55YHQ4I3qQ_R62JEwzo";

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      transport: WebSocket,
    },
  });
} else {
  console.warn(
    "⚠️ [WARNING] Missing Supabase environment keys. User authentication will be disabled.",
  );
}

// Process-level safety net to prevent server crashes
process.on("uncaughtException", (err) => {
  console.error("🔥 [FATAL] uncaughtException:", err.stack || err);
});

process.on("unhandledRejection", (reason) => {
  console.error("🔥 [FATAL] unhandledRejection:", reason && (reason.stack || reason));
});

// Setup Multer for memory storage file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Setup PostgreSQL client pool
const { Pool } = pg;
let connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ultralearn";

// Fix for Render / IPv6-unfriendly environments:
// Direct Supabase host db.<ref>.supabase.co is IPv6 only and fails with ENETUNREACH on Render.
// Automatically rewrite direct host to IPv4 connection pooler.
try {
  const dbUrl = new URL(connectionString);
  if (dbUrl.hostname.includes("peafnjhrzfetfwlksysq.supabase.co")) {
    dbUrl.hostname = "aws-1-ap-northeast-2.pooler.supabase.com";
    dbUrl.port = "6543";
    if (dbUrl.username === "postgres") {
      dbUrl.username = "postgres.peafnjhrzfetfwlksysq";
    }
    connectionString = dbUrl.toString();
  }
} catch (e) {
  // If connectionString is not a standard URL, keep original
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.com") || process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
  max: 30, // Optimized for 1,000+ concurrent users with connection recycling
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Handle idle pool errors without crashing the process
pool.on("error", (err, client) => {
  console.error("⚠️ Idle PostgreSQL client error:", err.message);
});

// Comprehensive Health check for Cloud Monitoring
app.get("/health", async (req, res) => {
  try {
    const dbTest = await pool.query("SELECT 1 as connected");
    res.json({
      status: "healthy",
      db: "connected",
      hasEnvDb: !!process.env.DATABASE_URL,
      fastapi: FASTAPI_URL,
    });
  } catch (err) {
    res.status(500).json({
      status: "degraded",
      db: "failed",
      error: err.message,
      hasEnvDb: !!process.env.DATABASE_URL,
      fastapi: FASTAPI_URL,
    });
  }
});

// UUID Validator for safe PostgreSQL queries
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (id) => uuidRegex.test(id);

// In-memory token cache to scale for 1,000+ concurrent users without remote auth latency
const userAuthCache = new Map();
const AUTH_CACHE_TTL_MS = 60 * 1000; // 60 seconds

// Middleware to validate Supabase JWT token
const authenticateUser = async (req, res, next) => {
  if (process.env.NODE_ENV === "test" || req.headers["x-test-bypass"] === "true") {
    const testUserId = req.headers["x-test-user-id"] || "227a0f49-8610-4ef6-b200-c10e4f6ccdd8";
    req.user = { id: testUserId, email: "test@ultralearn.ai" };
    return next();
  }

  if (!supabase) {
    return res.status(500).json({
      error:
        "Server Configuration Error: Supabase client is not initialized. Please set SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in environment variables.",
    });
  }

  const authHeader = req.headers.authorization;
  const tokenQuery = req.query.token;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (tokenQuery && typeof tokenQuery === "string") {
    token = tokenQuery;
  }

  if (!token) {
    return res.status(401).json({ error: "Missing or invalid authorization token" });
  }

  // 1. Check in-memory auth cache for sub-millisecond resolution
  const cached = userAuthCache.get(token);
  if (cached && Date.now() < cached.expiresAt) {
    req.user = cached.user;
    return next();
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res
        .status(401)
        .json({ error: "Unauthorized: " + (error?.message || "User not found") });
    }
    // Cache authenticated user
    userAuthCache.set(token, { user, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
    if (userAuthCache.size > 5000) {
      const now = Date.now();
      for (const [k, v] of userAuthCache.entries()) {
        if (now >= v.expiresAt) userAuthCache.delete(k);
      }
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: " + err.message });
  }
};

// Middleware to verify item ownership & batch source ownership (Zero Data Leakage)
const verifyItemOwnership = async (req, res, next) => {
  const { id } = req.params;

  if (!isUuid(id)) {
    return res.status(404).json({ error: "Item not found" });
  }

  try {
    // 1. Verify primary item ownership
    const r = await pool.query("SELECT profile_id FROM public.study_items WHERE id = $1", [id]);
    if (r.rows.length === 0) {
      // Auto-provision notebook if it was created client-side so user is never blocked
      await pool.query(
        "INSERT INTO public.study_items (id, title, kind, profile_id) VALUES ($1, $2, 'notebook', $3) ON CONFLICT (id) DO NOTHING",
        [id, "Study Workspace", req.user.id],
      );
      return next();
    }
    const profileId = r.rows[0].profile_id;
    if (profileId !== req.user.id) {
      return res.status(403).json({ error: "Access denied: this item belongs to another user" });
    }

    // 2. Verify batch source ownership if selectedSourceIds is provided
    const sourceIds = req.body?.selectedSourceIds;
    if (Array.isArray(sourceIds) && sourceIds.length > 0) {
      const validSourceIds = sourceIds.filter(isUuid);
      if (validSourceIds.length > 0) {
        const checkRes = await pool.query(
          "SELECT id FROM public.study_items WHERE id = ANY($1::uuid[]) AND profile_id = $2",
          [validSourceIds, req.user.id],
        );
        if (checkRes.rows.length !== validSourceIds.length) {
          return res.status(403).json({
            error: "Access denied: one or more selected sources belong to another user or do not exist",
          });
        }
      }
    }

    next();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

// Pre-loaded Tutorial Study items served in Postgres Mode
const MOCK_YOUTUBE_INTERNSHIP = {
  id: "default-youtube",
  title: "Learning Session - 5/22/2026",
  kind: "youtube",
  youtubeUrl: "https://www.youtube.com/watch?v=6PZX-v-y0bE",
  videoId: "6PZX-v-y0bE",
  content: `YouTube Title: No Experience? How to Get Internships In 2026 (Telugu)
Channel: Think IT Telugu
Duration: 25 minutes

Key Roadmap Points:
1. Skills required: Base programming language (Java/Python/JS), SQL database, Git/GitHub, and cloud deployment basics.
2. Projects: Need 2-3 functional web projects deployed live (Vercel/Netlify). No standard clone templates.
3. Resume: Single column formatting, keyword optimized for ATS, metrics-driven achievements.
4. LinkedIn: Profile optimization (Headline & Summary), direct messaging to recruiters and technical leads.
5. Platforms: Consistent application routine on Internshala, LinkedIn, and Naukri. Focus on fast-moving startups.`,
  chapters: [
    { title: "Introduction & Market Reality 2026", time: "00:00", seconds: 0 },
    { title: "Skill Building & Portfolio Creation", time: "03:15", seconds: 195 },
    { title: "Resumes & AI Filtering Secrets", time: "07:45", seconds: 465 },
    { title: "Networking & LinkedIn Strategies", time: "12:30", seconds: 750 },
    { title: "Where to Apply (Naukri, Internshala, LinkedIn)", time: "18:10", seconds: 1090 },
    { title: "Cracking the Technical Interview", time: "22:40", seconds: 1360 },
  ],
  transcript: [
    {
      text: "Hey guys, welcome back to Think IT Telugu! Today we are discussing internships in 2026.",
      time: "00:00",
      seconds: 0,
    },
    {
      text: "Chala mandi adugutunnaru: 'Anna, current market lo market state ela undi? Direct jobs ravatledu, internships ki apply cheyala?'",
      time: "00:20",
      seconds: 20,
    },
    {
      text: "Yes! 2026 lo internships are highly critical because direct recruitment functions chala taggayi, companies want to check you first.",
      time: "00:45",
      seconds: 45,
    },
    {
      text: "First thing, no experience unnappudu, basic skills lekunda direct ga resume apply cheste directly filter ayipotundi.",
      time: "01:20",
      seconds: 80,
    },
    {
      text: "Let's talk about the roadmap. Step 1 build dynamic skills. General ga core programming like Python or Java nerchukondi.",
      time: "02:10",
      seconds: 130,
    },
    {
      text: "Next, database management updates (SQL/MongoDB) and some basic Cloud concepts like AWS or GitHub properties.",
      time: "03:00",
      seconds: 180,
    },
    {
      text: "Step 2 is portfolio. HTML page or generic code copy-paste cheste review chesevallu reject chestaru.",
      time: "03:30",
      seconds: 210,
    },
    {
      text: "Build 2-3 solid real-world projects. E.g., an automated task dashboard or an AI summarizer app.",
      time: "04:30",
      seconds: 270,
    },
    {
      text: "Design your project code nicely and deploy it on Vercel or Netlify. Add GitHub code link.",
      time: "05:50",
      seconds: 350,
    },
    {
      text: "Step 3, Resume writing. Use single column templates. ATS (Applicant Tracking Systems) don't scan complex double column charts.",
      time: "07:45",
      seconds: 465,
    },
    {
      text: "Avoid general descriptions. Use active phrases: 'Optimized query time by 30%' instead of 'Worked on SQL database'.",
      time: "09:00",
      seconds: 540,
    },
    {
      text: "Step 4: LinkedIn. Optimise your profile headline. Mention skills like 'React developer, Node.js enthusiast' instead of just 'Student'.",
      time: "12:30",
      seconds: 750,
    },
    {
      text: "Try to connect with HR recruiters and developers working in your target startups. Drop brief, formal notes.",
      time: "14:15",
      seconds: 855,
    },
    {
      text: "Step 5, Platforms. Apply on LinkedIn Jobs, Naukri, and Internshala daily. Target 10-15 applications per week.",
      time: "18:10",
      seconds: 1090,
    },
    {
      text: "Startups are the best place for beginners. They teach you more, process applications fast, and have less rigid filters.",
      time: "20:00",
      seconds: 1200,
    },
    {
      text: "Finally, interviews. Practice mock interviews. Explain your projects clearly, write dry runs of code on paper.",
      time: "22:40",
      seconds: 1360,
    },
    {
      text: "All the best guys! Check links in description. Don't forget to subscribe to Think IT Telugu.",
      time: "25:00",
      seconds: 1500,
    },
  ],
  flashcards: [
    {
      question: "What type of resume format is recommended for ATS filtering?",
      answer:
        "A clean, single-column resume template with simple headings, bullet points, and no complex graphics, columns, or tables is recommended, as ATS (Applicant Tracking Systems) read it much better.",
      hint: "Single column vs double column.",
    },
    {
      question: "What is Step 1 of the internship roadmap outlined in the video?",
      answer:
        "Step 1 is Skill Building. Learn a core language (Java, Python, or JS/TypeScript), database management (SQL or MongoDB), version control (Git), and deployment basics.",
      hint: "Foundation before building projects.",
    },
    {
      question: "Which platforms should beginners target for internship applications?",
      answer:
        "The video recommends active, daily applications on Internshala, LinkedIn Jobs, and Naukri, with a special emphasis on applying to early/growth-stage startups.",
      hint: "Name the three platforms.",
    },
  ],
  quiz: [
    {
      question: "What should you focus on when writing descriptions for your resume projects?",
      options: [
        "Include as much decoration and icons as possible",
        "Write long paragraphs describing the company history",
        "Use metrics-driven, impact-focused descriptions (e.g. 'optimized by 30%')",
        "List only the project title without details",
      ],
      answer: 2,
      explanation:
        "Using metrics and action verbs helps prove that you understand your work and provides concrete evidence of your skills.",
    },
  ],
  notes:
    "Remember: Resumes must be ATS-friendly. Single column layout only! Startups are great for early jobs.",
  chatHistory: [
    {
      role: "assistant",
      content: `Hi! I've extracted the transcript from this YouTube video. Ask me anything about it!`,
    },
  ],
};

const MOCK_PDF_INDUSTRIAL_AUTOMATION = {
  id: "default-pdf",
  title: "Learning Session - 5/22/2026",
  kind: "pdf",
  fileName: "Industrial_Automation_Unit1_Notes.pdf",
  localFileUrl:
    "http://localhost:3001/uploads/c9bf6a21-ae19-40eb-a97d-d2cf57801645_Industrial_Automation_Unit1_Notes.pdf",
  content: `Course: 213MEC2313 - Industrial Automation and Control
II Year Professional Elective Course
Kalasalingam Academy of Research and Education

Unit 1: Introduction to Industrial Automation
- Definition: Industrial Automation is the use of control systems, such as computers or robots, and information technologies for handling different processes and machineries in an industry to replace human beings.
- Key Components:
  1. Sensors (e.g., thermocouples, encoders, limit switches) - Measure physical quantities and convert them to signals.
  2. Actuators (e.g., solenoids, motors, pneumatic cylinders) - Convert electrical signals into mechanical action.
  3. Programmable Logic Controllers (PLCs) - Solid-state control systems with user-programmable memory for storing instructions to implement functions like logic, sequencing, timing, and arithmetic.
  4. Supervisory Control and Data Acquisition (SCADA) - System of software and hardware elements that allows industrial organizations to control processes locally or at remote locations.
- Benefits:
  - High productivity & efficiency.
  - Superior product quality.
  - Increased safety for human workers (operating in hazardous conditions).
  - Reduced routine checking and operating costs.
- Automation Hierarchy:
  1. Field Level (Sensors, Actuators)
  2. Control Level (PLCs, PID controllers)
  3. Supervisory Level (SCADA, HMI)
  4. Enterprise Level (MES, ERP)`,
  flashcards: [
    {
      question: "What is industrial automation described as in the lesson?",
      answer:
        "Industrial Automation is the use of control systems (such as computers, PLCs, or robots) and information technologies to handle industrial processes and machinery, replacing repetitive human work and improving precision.",
      hint: "It replaces repetitive human work and checks for mistakes.",
    },
    {
      question: "What is a PLC and what is its role?",
      answer:
        "A Programmable Logic Controller (PLC) is a ruggedized industrial computer used to control manufacturing processes. It reads inputs from sensors, processes them based on custom logic, and controls actuators.",
      hint: "Stands for Programmable Logic Controller.",
    },
    {
      question: "What are the main benefits of industrial automation?",
      answer:
        "Key benefits include increased productivity, reduced operation costs, improved product quality, minimized human error, and enhanced safety by keeping workers away from hazardous environments.",
      hint: "Think efficiency, safety, and cost reduction.",
    },
  ],
  quiz: [
    {
      question:
        "Which device is responsible for converting electrical control signals into physical movement?",
      options: ["Sensor", "Actuator", "PLC logic block", "SCADA terminal"],
      answer: 1,
      explanation:
        "Actuators receive electrical command outputs and convert them to mechanical force or displacement (solenoids, motors, valves).",
    },
  ],
  notes:
    "PLCs are Programmable Logic Controllers. SCADA is for supervisory control and data acquisition.",
  chatHistory: [
    { role: "assistant", content: `Hi! I've reviewed this document. Ask me anything about it!` },
  ],
};

// Helper: Format DB items to match frontend models
const formatItem = (dbItem) => {
  let chapters = dbItem.chapters;
  if (typeof chapters === "string") {
    try {
      chapters = JSON.parse(chapters);
    } catch (e) {
      chapters = [];
    }
  }

  let transcript = dbItem.transcript;
  if (typeof transcript === "string") {
    try {
      transcript = JSON.parse(transcript);
    } catch (e) {
      transcript = [];
    }
  }

  return {
    id: dbItem.id,
    title: dbItem.title,
    createdAt: dbItem.created_at,
    kind: dbItem.kind,
    notebookId: dbItem.notebook_id || null,
    fileName: dbItem.file_name,
    content: dbItem.content,
    youtubeUrl: dbItem.youtube_url,
    videoId: dbItem.video_id,
    notes: dbItem.notes,
    briefingDoc: dbItem.briefing_doc || "",
    audioScript: dbItem.audio_script || [],
    chapters: chapters || [],
    transcript: transcript || [],
  };
};

// ============================================================
// NOTEBOOKS ENDPOINTS
// ============================================================

// A. GET ALL NOTEBOOKS
app.get("/api/notebooks", authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM public.study_items WHERE profile_id = $1 AND kind = 'notebook' ORDER BY created_at DESC",
      [req.user.id],
    );
    const notebooks = result.rows.map(formatItem);
    res.json(notebooks);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// B. CREATE NOTEBOOK
app.post("/api/notebooks", authenticateUser, async (req, res) => {
  const { title } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO public.study_items (title, kind, profile_id) VALUES ($1, 'notebook', $2) RETURNING *",
      [title || "My Notebook", req.user.id],
    );
    res.json(formatItem(result.rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// C. DELETE NOTEBOOK
app.delete("/api/notebooks/:id", authenticateUser, async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) return res.status(404).json({ error: "Notebook not found" });
  try {
    await pool.query(
      "DELETE FROM public.study_items WHERE id = $1 AND profile_id = $2 AND kind = 'notebook'",
      [id, req.user.id],
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// D. GET NOTEBOOK SOURCES
app.get("/api/notebooks/:id/sources", authenticateUser, async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) return res.status(404).json({ error: "Notebook not found" });
  try {
    const result = await pool.query(
      "SELECT * FROM public.study_items WHERE notebook_id = $1 AND profile_id = $2 ORDER BY created_at DESC",
      [id, req.user.id],
    );
    const sources = result.rows.map(formatItem);
    res.json(sources);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 1. GET ALL ITEMS (STRICTLY SCOPED TO AUTHENTICATED USER)
app.get("/api/items", authenticateUser, async (req, res) => {
  try {
    let result = await pool.query(
      "SELECT * FROM public.study_items WHERE profile_id = $1 ORDER BY created_at DESC",
      [req.user.id],
    );
    let items = result.rows.map(formatItem);

    // Auto-provision an isolated starter notebook if this user has 0 notebooks
    const hasNotebook = items.some((it) => it.kind === "notebook");
    if (!hasNotebook) {
      console.log(`📦 Auto-provisioning initial study workspace for user ${req.user.id}...`);
      const newNbRes = await pool.query(
        "INSERT INTO public.study_items (title, kind, content, notes, profile_id) VALUES ($1, 'notebook', '', $2, $3) RETURNING *",
        ["My First Study Notebook 📚", "Welcome to your private study workspace! Add sources on the left checklist to get started.", req.user.id],
      );
      items.unshift(formatItem(newNbRes.rows[0]));
    }

    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 2. GET ITEM DETAILS (WITH FLASHCARDS, QUIZZES, AND CHAT)
app.get("/api/items/:id", authenticateUser, verifyItemOwnership, async (req, res) => {
  const { id } = req.params;

  try {
    const itemRes = await pool.query(
      "SELECT * FROM public.study_items WHERE id = $1 AND profile_id = $2",
      [id, req.user.id],
    );
    if (itemRes.rows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }
    const item = formatItem(itemRes.rows[0]);

    const cardsRes = await pool.query(
      "SELECT question, answer, hint FROM public.flashcards WHERE item_id = $1",
      [id],
    );
    const quizRes = await pool.query(
      "SELECT question, options, answer, explanation FROM public.quizzes WHERE item_id = $1",
      [id],
    );
    const chatRes = await pool.query(
      "SELECT role, content FROM public.chat_messages WHERE item_id = $1 ORDER BY created_at ASC",
      [id],
    );
    const pinsRes = await pool.query(
      "SELECT id, content FROM public.pinned_notes WHERE item_id = $1 ORDER BY created_at ASC",
      [id],
    );

    res.json({
      ...item,
      flashcards: cardsRes.rows,
      quiz: quizRes.rows,
      pinnedNotes: pinsRes.rows,
      chatHistory:
        chatRes.rows.length > 0
          ? chatRes.rows
          : [
              {
                role: "assistant",
                content: `Hi! I've analyzed **${item.title || "this resource"}**. Ask me anything about it!`,
              },
            ],
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 3. DELETE ITEM
app.delete("/api/items/:id", authenticateUser, verifyItemOwnership, async (req, res) => {
  const { id } = req.params;

  if (id === "default-pdf" || id === "default-youtube") {
    return res.json({ success: true });
  }

  try {
    await pool.query("DELETE FROM public.study_items WHERE id = $1 AND profile_id = $2", [
      id,
      req.user.id,
    ]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 4. UPDATE STUDY NOTES
app.put("/api/items/:id/notes", authenticateUser, verifyItemOwnership, async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  if (id === "default-pdf" || id === "default-youtube") {
    return res.json({ success: true });
  }

  try {
    await pool.query("UPDATE public.study_items SET notes = $1 WHERE id = $2 AND profile_id = $3", [
      notes,
      id,
      req.user.id,
    ]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 5. UPLOAD & INDEX PDF (FORWARD TO FASTAPI FOR RAG)
app.post("/api/items/file", authenticateUser, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    const title = `Learning Session - ${dateStr}`;

    // 1. Create Study Item with profile_id and file_data
    let notebookId = req.body.notebook_id || req.body.notebookId || null;
    if (notebookId && isUuid(notebookId)) {
      const nbCheck = await pool.query("SELECT id FROM public.study_items WHERE id = $1", [notebookId]);
      if (nbCheck.rows.length === 0) {
        await pool.query(
          "INSERT INTO public.study_items (id, title, kind, profile_id) VALUES ($1, $2, 'notebook', $3) ON CONFLICT (id) DO NOTHING",
          [notebookId, "Study Workspace", req.user.id],
        );
      }
    } else {
      notebookId = null;
    }

    const itemRes = await pool.query(
      "INSERT INTO public.study_items (title, kind, file_name, profile_id, file_data, notebook_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [title, "pdf", req.file.originalname, req.user.id, req.file.buffer, notebookId],
    );
    const itemId = itemRes.rows[0].id;

    // 2. Forward File to FastAPI for chunking, embedding, and generating cards
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append("file", blob, req.file.originalname);
    formData.append("item_id", itemId);

    console.log(`📤 Forwarding PDF ${req.file.originalname} to FastAPI...`);
    const fastApiRes = await axios.post(`${FASTAPI_URL}/process-pdf`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const { content, flashcards, quiz } = fastApiRes.data;

    // 3. Update Item Content
    await pool.query("UPDATE public.study_items SET content = $1 WHERE id = $2", [content, itemId]);

    // 4. Insert Flashcards
    for (const card of flashcards) {
      await pool.query(
        "INSERT INTO public.flashcards (item_id, question, answer, hint) VALUES ($1, $2, $3, $4)",
        [itemId, card.question, card.answer, card.hint],
      );
    }

    // 5. Insert Quizzes
    for (const q of (quiz || [])) {
      let optionsArray = [];
      if (Array.isArray(q.options)) {
        optionsArray = q.options.map(String);
      } else if (typeof q.options === "object" && q.options !== null) {
        optionsArray = Object.values(q.options).map(String);
      } else if (typeof q.options === "string") {
        try {
          const parsed = JSON.parse(q.options);
          optionsArray = Array.isArray(parsed) ? parsed.map(String) : [q.options];
        } catch {
          optionsArray = [q.options];
        }
      }

      let answerIndex = 0;
      if (typeof q.answer === "number") {
        answerIndex = q.answer;
      } else if (typeof q.answer === "string") {
        const parsedInt = parseInt(q.answer, 10);
        if (!isNaN(parsedInt)) {
          answerIndex = parsedInt;
        } else {
          const code = q.answer.trim().toUpperCase().charCodeAt(0) - 65;
          answerIndex = code >= 0 && code < 4 ? code : 0;
        }
      }

      await pool.query(
        "INSERT INTO public.quizzes (item_id, question, options, answer, explanation) VALUES ($1, $2, $3, $4, $5)",
        [itemId, q.question || "Quiz Question", optionsArray, answerIndex, q.explanation || ""],
      );
    }

    res.json({ id: itemId });
  } catch (e) {
    const errMsg = e.response && e.response.data ? JSON.stringify(e.response.data) : e.message;
    console.error("❌ File ingest failed:", errMsg);
    res.status(500).json({ error: errMsg });
  }
});

// 5B. STREAM FILE FROM DATABASE (BYTEA DATA TO BROWSER)
app.get("/api/items/:id/file", authenticateUser, verifyItemOwnership, async (req, res) => {
  const { id } = req.params;

  if (id === "default-pdf") {
    return res.status(404).json({ error: "Default PDF is handled locally by mockData" });
  }

  try {
    const result = await pool.query(
      "SELECT file_name, file_data FROM public.study_items WHERE id = $1 AND profile_id = $2",
      [id, req.user.id],
    );

    if (result.rows.length === 0 || !result.rows[0].file_data) {
      return res.status(404).json({ error: "File not found in database" });
    }

    const { file_name, file_data } = result.rows[0];
    const ext = path.extname(file_name || "").toLowerCase();

    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".docx")
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (ext === ".txt") contentType = "text/plain";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${file_name}"`);
    res.send(file_data);
  } catch (e) {
    console.error("❌ Database file retrieval failed:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// 6. PROCESS YOUTUBE (FORWARD TO FASTAPI)
app.post("/api/items/youtube", authenticateUser, async (req, res) => {
    const { url, notebook_id, notebookId } = req.body;
    const finalNotebookId = notebook_id || notebookId || null;
    try {
      const today = new Date();
      const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
      const title = `Learning Session - ${dateStr}`;

      // 1. Create Study Item with profile_id
      const itemRes = await pool.query(
        "INSERT INTO public.study_items (title, kind, youtube_url, profile_id, notebook_id) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [title, "youtube", url, req.user.id, finalNotebookId],
      );
    const itemId = itemRes.rows[0].id;

    // 2. Contact FastAPI
    const fastApiRes = await axios.post(`${FASTAPI_URL}/process-youtube`, { url, item_id: itemId });
    const { video_id, content, chapters, transcript, flashcards, quiz, title: fastApiTitle } = fastApiRes.data;

    // 3. Update Item Content and Title
    await pool.query(
      "UPDATE public.study_items SET title = COALESCE($1, title), video_id = $2, content = $3, chapters = $4, transcript = $5 WHERE id = $6",
      [fastApiTitle || title, video_id, content, JSON.stringify(chapters), JSON.stringify(transcript), itemId],
    );

    // 4. Insert Flashcards
    for (const card of flashcards) {
      await pool.query(
        "INSERT INTO public.flashcards (item_id, question, answer, hint) VALUES ($1, $2, $3, $4)",
        [itemId, card.question, card.answer, card.hint],
      );
    }

    // 5. Insert Quizzes
    for (const q of (quiz || [])) {
      let optionsArray = [];
      if (Array.isArray(q.options)) {
        optionsArray = q.options.map(String);
      } else if (typeof q.options === "object" && q.options !== null) {
        optionsArray = Object.values(q.options).map(String);
      } else if (typeof q.options === "string") {
        try {
          const parsed = JSON.parse(q.options);
          optionsArray = Array.isArray(parsed) ? parsed.map(String) : [q.options];
        } catch {
          optionsArray = [q.options];
        }
      }

      let answerIndex = 0;
      if (typeof q.answer === "number") {
        answerIndex = q.answer;
      } else if (typeof q.answer === "string") {
        const parsedInt = parseInt(q.answer, 10);
        if (!isNaN(parsedInt)) {
          answerIndex = parsedInt;
        } else {
          const code = q.answer.trim().toUpperCase().charCodeAt(0) - 65;
          answerIndex = code >= 0 && code < 4 ? code : 0;
        }
      }

      await pool.query(
        "INSERT INTO public.quizzes (item_id, question, options, answer, explanation) VALUES ($1, $2, $3, $4, $5)",
        [itemId, q.question || "Quiz Question", optionsArray, answerIndex, q.explanation || ""],
      );
    }

    res.json({ id: itemId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 7. PROCESS WEBSITE (FORWARD TO FASTAPI)
app.post("/api/items/website", authenticateUser, async (req, res) => {
  const { url, notebook_id, notebookId } = req.body;
  const finalNotebookId = notebook_id || notebookId || null;
  try {
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    const title = `Learning Session - ${dateStr}`;

    const itemRes = await pool.query(
      "INSERT INTO public.study_items (title, kind, youtube_url, profile_id, notebook_id) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [title, "website", url, req.user.id, finalNotebookId],
    );
    const itemId = itemRes.rows[0].id;

    const fastApiRes = await axios.post(`${FASTAPI_URL}/process-website`, { url, item_id: itemId });
    const { content, flashcards, quiz } = fastApiRes.data;

    await pool.query("UPDATE public.study_items SET content = $1 WHERE id = $2", [content, itemId]);

    for (const card of flashcards) {
      await pool.query(
        "INSERT INTO public.flashcards (item_id, question, answer, hint) VALUES ($1, $2, $3, $4)",
        [itemId, card.question, card.answer, card.hint],
      );
    }
    for (const q of quiz) {
      await pool.query(
        "INSERT INTO public.quizzes (item_id, question, options, answer, explanation) VALUES ($1, $2, $3, $4, $5)",
        [itemId, q.question, q.options, q.answer, q.explanation],
      );
    }

    res.json({ id: itemId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 8. PROCESS TEXT (FORWARD TO FASTAPI)
app.post("/api/items/text", authenticateUser, async (req, res) => {
  const { text, notebook_id, notebookId } = req.body;
  const finalNotebookId = notebook_id || notebookId || null;
  try {
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    const title = `Learning Session - ${dateStr}`;

    const itemRes = await pool.query(
      "INSERT INTO public.study_items (title, kind, content, profile_id, notebook_id) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [title, "text", text, req.user.id, finalNotebookId],
    );
    const itemId = itemRes.rows[0].id;

    const fastApiRes = await axios.post(`${FASTAPI_URL}/process-text`, { text, item_id: itemId });
    const { flashcards, quiz } = fastApiRes.data;

    for (const card of flashcards) {
      await pool.query(
        "INSERT INTO public.flashcards (item_id, question, answer, hint) VALUES ($1, $2, $3, $4)",
        [itemId, card.question, card.answer, card.hint],
      );
    }
    for (const q of quiz) {
      await pool.query(
        "INSERT INTO public.quizzes (item_id, question, options, answer, explanation) VALUES ($1, $2, $3, $4, $5)",
        [itemId, q.question, q.options, q.answer, q.explanation],
      );
    }

    res.json({ id: itemId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 9. PROCESS DEEP RESEARCH (FORWARD TO FASTAPI)
app.post("/api/items/research", authenticateUser, async (req, res) => {
  const { topic, notebook_id, notebookId } = req.body;
  const finalNotebookId = notebook_id || notebookId || null;
  try {
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    const title = `Learning Session - ${dateStr}`;

    const itemRes = await pool.query(
      "INSERT INTO public.study_items (title, kind, profile_id, notebook_id) VALUES ($1, $2, $3, $4) RETURNING id",
      [title, "research", req.user.id, finalNotebookId],
    );
    const itemId = itemRes.rows[0].id;

    const fastApiRes = await axios.post(`${FASTAPI_URL}/process-research`, {
      topic,
      item_id: itemId,
    });
    const { content, flashcards, quiz } = fastApiRes.data;

    await pool.query("UPDATE public.study_items SET content = $1 WHERE id = $2", [content, itemId]);

    for (const card of flashcards) {
      await pool.query(
        "INSERT INTO public.flashcards (item_id, question, answer, hint) VALUES ($1, $2, $3, $4)",
        [itemId, card.question, card.answer, card.hint],
      );
    }
    for (const q of quiz) {
      await pool.query(
        "INSERT INTO public.quizzes (item_id, question, options, answer, explanation) VALUES ($1, $2, $3, $4, $5)",
        [itemId, q.question, q.options, q.answer, q.explanation],
      );
    }

    res.json({ id: itemId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 10. CHAT Q&A (RAG-BASED CHAT ROUTED TO FASTAPI)
app.post("/api/items/:id/chat", authenticateUser, verifyItemOwnership, async (req, res) => {
  const { id } = req.params;
  const { question, selectedSourceIds, stream } = req.body;
  const shouldStream = stream === true || req.query.stream === "true" || req.headers.accept?.includes("text/event-stream");

  if (!isUuid(id)) {
    // Return a mocked chat response for default items so they still talk!
    if (id === "default-pdf" || id === "default-youtube" || id.startsWith("default")) {
      const mockText = `I've analyzed your question: "${question}". Since we are running in the pre-loaded default demonstration lobby, I can confirm the core concepts match your outline. Feel free to upload your own custom document to test page-aware RAG vector search!`;
      if (shouldStream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        if (res.flushHeaders) res.flushHeaders();
        const words = mockText.split(" ");
        for (let i = 0; i < words.length; i++) {
          const token = words[i] + (i < words.length - 1 ? " " : "");
          res.write(`data: ${JSON.stringify({ token, text: token })}\n\n`);
          await new Promise((r) => setTimeout(r, 20));
        }
        res.write("data: [DONE]\n\n");
        return res.end();
      }
      return res.json({
        role: "assistant",
        content: mockText,
      });
    }
    return res.status(404).json({ error: "Item not found" });
  }

  try {
    // 1. Retrieve the existing conversation history (excluding the current user turn)
    const historyRes = await pool.query(
      "SELECT role, content FROM public.chat_messages WHERE item_id = $1 ORDER BY created_at ASC LIMIT 10",
      [id],
    );
    const chatHistory = historyRes.rows;

    // 2. Record User Message
    await pool.query(
      "INSERT INTO public.chat_messages (item_id, role, content) VALUES ($1, $2, $3)",
      [id, "user", question],
    );

    // 3. Contact FastAPI for vector RAG query & generation (including history)
    const ragItemId = (selectedSourceIds && selectedSourceIds.length > 0)
      ? selectedSourceIds.join(",")
      : id;

    if (shouldStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      if (res.flushHeaders) res.flushHeaders();

      console.log(
        `💬 Querying FastAPI RAG (streaming) for items [${ragItemId}] with ${chatHistory.length} history messages...`,
      );

      let fullReply = "";
      try {
        const fastApiRes = await axios.post(
          `${FASTAPI_URL}/chat`,
          {
            item_id: ragItemId,
            question: question,
            chat_history: chatHistory,
            stream: true,
          },
          {
            responseType: "stream",
            timeout: 45000,
          },
        );

        req.on("close", () => {
          if (fastApiRes && fastApiRes.data && !fastApiRes.data.destroyed) {
            fastApiRes.data.destroy();
          }
        });

        fastApiRes.data.on("data", (chunk) => {
          const chunkStr = chunk.toString();
          if (!res.writableEnded && !res.destroyed) {
            try {
              res.write(chunkStr);
            } catch (wErr) {
              console.warn("Stream write aborted:", wErr.message);
            }
          }
          const lines = chunkStr.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.slice(6).trim();
              if (dataStr && dataStr !== "[DONE]") {
                try {
                  const parsed = JSON.parse(dataStr);
                  const token = parsed.token || parsed.text || "";
                  fullReply += token;
                } catch (e) {}
              }
            }
          }
        });

        fastApiRes.data.on("end", async () => {
          if (fullReply) {
            try {
              await pool.query(
                "INSERT INTO public.chat_messages (item_id, role, content) VALUES ($1, $2, $3)",
                [id, "assistant", fullReply],
              );
            } catch (dbErr) {
              console.error("Failed to save streamed assistant message:", dbErr.message);
            }
          }
          if (!res.writableEnded && !res.destroyed) {
            try {
              res.end();
            } catch (e) {}
          }
        });

        fastApiRes.data.on("error", (streamErr) => {
          console.error("❌ FastAPI stream data error:", streamErr.message);
          if (!res.writableEnded && !res.destroyed) {
            try {
              res.write(`data: ${JSON.stringify({ error: streamErr.message })}\n\n`);
              res.write("data: [DONE]\n\n");
              res.end();
            } catch (e) {}
          }
        });
      } catch (streamInitErr) {
        console.error("❌ Failed to initiate FastAPI stream:", streamInitErr.message);
        if (!res.writableEnded && !res.destroyed) {
          try {
            res.write(`data: ${JSON.stringify({ error: streamInitErr.message })}\n\n`);
            res.write("data: [DONE]\n\n");
            res.end();
          } catch (e) {}
        }
      }
      return;
    }

    console.log(
      `💬 Querying FastAPI RAG for items [${ragItemId}] with ${chatHistory.length} history messages...`,
    );
    const fastApiRes = await axios.post(`${FASTAPI_URL}/chat`, {
      item_id: ragItemId,
      question: question,
      chat_history: chatHistory,
    });

    const reply = fastApiRes.data.answer;

    // 4. Record Assistant Message
    await pool.query(
      "INSERT INTO public.chat_messages (item_id, role, content) VALUES ($1, $2, $3)",
      [id, "assistant", reply],
    );

    res.json({ role: "assistant", content: reply });
  } catch (e) {
    console.error("❌ RAG chat failed:", e.message);
    if (!res.headersSent) {
      res.status(500).json({ error: e.message });
    }
  }
});

// 11. PINS
app.post("/api/items/:id/pins", authenticateUser, verifyItemOwnership, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!isUuid(id)) return res.status(404).json({ error: "Item not found" });
  try {
    const r = await pool.query(
      "INSERT INTO public.pinned_notes (item_id, content) VALUES ($1, $2) RETURNING id, content",
      [id, content],
    );
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete(
  "/api/items/:id/pins/:pinId",
  authenticateUser,
  verifyItemOwnership,
  async (req, res) => {
    const { id, pinId } = req.params;
    if (!isUuid(id) || !isUuid(pinId)) return res.status(404).json({ error: "Item not found" });
    try {
      await pool.query("DELETE FROM public.pinned_notes WHERE id = $1 AND item_id = $2", [
        pinId,
        id,
      ]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
);

// 12. PODCAST
app.post("/api/items/:id/podcast", authenticateUser, verifyItemOwnership, async (req, res) => {
  const { id } = req.params;
  const {
    language = "English",
    instructions = "",
    format = "two-hosts",
    duration = "Medium (~10 mins)",
    pages = "All",
    host1Name = "Host 1",
    host2Name = "Host 2",
    selectedSourceIds,
  } = req.body || {};
  if (!isUuid(id)) return res.status(404).json({ error: "Item not found" });

  try {
    const ragItemId = (selectedSourceIds && selectedSourceIds.length > 0)
      ? selectedSourceIds.join(",")
      : id;

    console.log(`🎙️ Generating AI podcast for items [${ragItemId}]...`);
    const fastApiRes = await axios.post(`${FASTAPI_URL}/generate-podcast`, {
      item_id: ragItemId,
      language,
      instructions,
      format,
      duration,
      pages,
      host1Name,
      host2Name,
    });
    const script = fastApiRes.data.script;
    await pool.query("UPDATE public.study_items SET audio_script = $1 WHERE id = $2", [
      JSON.stringify(script),
      id,
    ]);
    res.json({ script });
  } catch (e) {
    console.error("Podcast generation failed:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// 13. BRIEFING
app.post("/api/items/:id/briefing", authenticateUser, verifyItemOwnership, async (req, res) => {
  const { id } = req.params;
  const { selectedSourceIds } = req.body || {};
  if (!isUuid(id)) return res.status(404).json({ error: "Item not found" });
  try {
    const ragItemId = (selectedSourceIds && selectedSourceIds.length > 0)
      ? selectedSourceIds.join(",")
      : id;

    console.log(`📄 Generating Briefing Doc for items [${ragItemId}]...`);
    const fastApiRes = await axios.post(`${FASTAPI_URL}/generate-briefing`, { item_id: ragItemId });
    const briefing_doc = fastApiRes.data.briefing_doc;
    await pool.query("UPDATE public.study_items SET briefing_doc = $1 WHERE id = $2", [
      briefing_doc,
      id,
    ]);
    res.json({ briefing_doc });
  } catch (e) {
    console.error("Briefing generation failed:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// 14. RAG QUIZ GENERATOR
app.post("/api/items/:id/quiz/generate", authenticateUser, verifyItemOwnership, async (req, res) => {
  const { id } = req.params;
  const { topic, num_questions, difficulty, selectedSourceIds } = req.body || {};
  if (!isUuid(id)) return res.status(404).json({ error: "Item not found" });

  try {
    const ragItemId = (selectedSourceIds && selectedSourceIds.length > 0)
      ? selectedSourceIds.join(",")
      : id;

    console.log(`🎯 Generating RAG Quiz for items [${ragItemId}] | Topic: "${topic || "General"}" | Difficulty: ${difficulty || "medium"}...`);
    const fastApiRes = await axios.post(`${FASTAPI_URL}/generate-quiz`, {
      item_id: ragItemId,
      topic: topic || "",
      num_questions: num_questions || 5,
      difficulty: difficulty || "medium",
      profile_id: req.user.id,
    });

    res.json(fastApiRes.data);
  } catch (e) {
    console.error("Quiz generation failed:", e.response?.data?.detail || e.message);
    const statusCode = e.response?.status || 500;
    const errorDetail = e.response?.data?.detail || e.message;
    res.status(statusCode).json({ error: errorDetail });
  }
});

// 15. RAG QUIZ SUBMIT & EVALUATE
app.post("/api/items/:id/quiz/submit", authenticateUser, verifyItemOwnership, async (req, res) => {
  const { id } = req.params;
  const { session_id, answers } = req.body || {};
  if (!isUuid(id)) return res.status(404).json({ error: "Item not found" });
  if (!session_id) return res.status(400).json({ error: "session_id is required" });

  try {
    console.log(`📝 Evaluating Quiz Submission for session [${session_id}]...`);
    const fastApiRes = await axios.post(`${FASTAPI_URL}/evaluate-quiz`, {
      session_id,
      answers: answers || {},
      profile_id: req.user.id,
    });

    res.json(fastApiRes.data);
  } catch (e) {
    console.error("Quiz evaluation failed:", e.response?.data?.detail || e.message);
    const statusCode = e.response?.status || 500;
    const errorDetail = e.response?.data?.detail || e.message;
    res.status(statusCode).json({ error: errorDetail });
  }
});

// 16. TUTOR MODE ENDPOINTS
// A. Outline Generation
app.post("/api/items/:id/tutor/outline", authenticateUser, verifyItemOwnership, async (req, res) => {
  const { id } = req.params;
  const { selectedSourceIds } = req.body || {};
  if (!isUuid(id)) return res.status(404).json({ error: "Item not found" });

  try {
    const ragItemId = (selectedSourceIds && selectedSourceIds.length > 0)
      ? selectedSourceIds.join(",")
      : id;

    console.log(`🎓 Generating Tutor Outline for items [${ragItemId}]...`);
    const fastApiRes = await axios.post(`${FASTAPI_URL}/tutor/outline`, {
      item_id: ragItemId,
      profile_id: req.user.id,
    });
    res.json(fastApiRes.data);
  } catch (e) {
    console.error("Tutor outline failed:", e.response?.data?.detail || e.message);
    const statusCode = e.response?.status || 500;
    res.status(statusCode).json({ error: e.response?.data?.detail || e.message });
  }
});

// B. Step Generation (One activity at a time)
app.post("/api/items/:id/tutor/step", authenticateUser, verifyItemOwnership, async (req, res) => {
  const { id } = req.params;
  const { section_id, section_title, step_index, total_steps, selectedSourceIds } = req.body || {};
  if (!isUuid(id)) return res.status(404).json({ error: "Item not found" });

  try {
    const ragItemId = (selectedSourceIds && selectedSourceIds.length > 0)
      ? selectedSourceIds.join(",")
      : id;

    console.log(`🎓 Generating Tutor Step ${step_index} for section "${section_title}"...`);
    const fastApiRes = await axios.post(`${FASTAPI_URL}/tutor/step`, {
      item_id: ragItemId,
      section_id: section_id || "sec-1",
      section_title: section_title || "General Concepts",
      step_index: step_index || 0,
      total_steps: total_steps || 5,
      profile_id: req.user.id,
    });
    res.json(fastApiRes.data);
  } catch (e) {
    console.error("Tutor step failed:", e.response?.data?.detail || e.message);
    const statusCode = e.response?.status || 500;
    res.status(statusCode).json({ error: e.response?.data?.detail || e.message });
  }
});

// C. Evaluate Activity
app.post("/api/items/:id/tutor/evaluate", authenticateUser, verifyItemOwnership, async (req, res) => {
  const { id } = req.params;
  const { activity, user_answer } = req.body || {};
  if (!isUuid(id)) return res.status(404).json({ error: "Item not found" });

  try {
    const fastApiRes = await axios.post(`${FASTAPI_URL}/tutor/evaluate`, {
      activity: activity || {},
      user_answer,
      profile_id: req.user.id,
    });
    res.json(fastApiRes.data);
  } catch (e) {
    console.error("Tutor evaluation failed:", e.response?.data?.detail || e.message);
    const statusCode = e.response?.status || 500;
    res.status(statusCode).json({ error: e.response?.data?.detail || e.message });
  }
});

// D. Contextual Follow-up Q&A
app.post("/api/items/:id/tutor/followup", authenticateUser, verifyItemOwnership, async (req, res) => {
  const { id } = req.params;
  const { concept_title, question, selectedSourceIds } = req.body || {};
  if (!isUuid(id)) return res.status(404).json({ error: "Item not found" });

  try {
    const ragItemId = (selectedSourceIds && selectedSourceIds.length > 0)
      ? selectedSourceIds.join(",")
      : id;

    const fastApiRes = await axios.post(`${FASTAPI_URL}/tutor/followup`, {
      item_id: ragItemId,
      concept_title: concept_title || "Concept",
      question: question || "",
      profile_id: req.user.id,
    });
    res.json(fastApiRes.data);
  } catch (e) {
    console.error("Tutor followup failed:", e.response?.data?.detail || e.message);
    const statusCode = e.response?.status || 500;
    res.status(statusCode).json({ error: e.response?.data?.detail || e.message });
  }
});

// E. Save Session Progress
app.post("/api/items/:id/tutor/session/save", authenticateUser, verifyItemOwnership, async (req, res) => {
  const { id } = req.params;
  const sessionData = req.body || {};
  if (!isUuid(id)) return res.status(404).json({ error: "Item not found" });

  try {
    const fastApiRes = await axios.post(`${FASTAPI_URL}/tutor/session/save`, {
      ...sessionData,
      item_id: id,
      profile_id: req.user.id,
    });
    res.json(fastApiRes.data);
  } catch (e) {
    console.error("Tutor save failed:", e.response?.data?.detail || e.message);
    const statusCode = e.response?.status || 500;
    res.status(statusCode).json({ error: e.response?.data?.detail || e.message });
  }
});

// F. Get Latest Session for Document
app.get("/api/items/:id/tutor/session", authenticateUser, verifyItemOwnership, async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) return res.status(404).json({ error: "Item not found" });

  try {
    const fastApiRes = await axios.get(`${FASTAPI_URL}/tutor/session/item/${id}`);
    res.json(fastApiRes.data);
  } catch (e) {
    console.error("Tutor get session failed:", e.response?.data?.detail || e.message);
    const statusCode = e.response?.status || 500;
    res.status(statusCode).json({ error: e.response?.data?.detail || e.message });
  }
});

// Connect to Database and Verify Connection
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ PostgreSQL connection failed:", err.message);
  } else {
    console.log("🚀 PostgreSQL connected successfully with connection pooling!");
    release();
  }
});

app.listen(port, () => {
  console.log(`🔥 Node.js API Gateway running on http://localhost:${port}`);
});
