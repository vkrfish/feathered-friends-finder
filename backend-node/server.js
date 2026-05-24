import express from "express";
import cors from "cors";
import multer from "multer";
import pg from "pg";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config({ path: "../.env" });
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Setup Multer for memory storage file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Setup PostgreSQL client pool
const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ultralearn";
const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

// Test DB Connection
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ PostgreSQL connection failed:", err.message);
  } else {
    console.log("🚀 PostgreSQL connected successfully!");
    release();
  }
});

// UUID Validator for safe PostgreSQL queries
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (id) => uuidRegex.test(id);

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
    { title: "Cracking the Technical Interview", time: "22:40", seconds: 1360 }
  ],
  transcript: [
    { text: "Hey guys, welcome back to Think IT Telugu! Today we are discussing internships in 2026.", time: "00:00", seconds: 0 },
    { text: "Chala mandi adugutunnaru: 'Anna, current market lo market state ela undi? Direct jobs ravatledu, internships ki apply cheyala?'", time: "00:20", seconds: 20 },
    { text: "Yes! 2026 lo internships are highly critical because direct recruitment functions chala taggayi, companies want to check you first.", time: "00:45", seconds: 45 },
    { text: "First thing, no experience unnappudu, basic skills lekunda direct ga resume apply cheste directly filter ayipotundi.", time: "01:20", seconds: 80 },
    { text: "Let's talk about the roadmap. Step 1 build dynamic skills. General ga core programming like Python or Java nerchukondi.", time: "02:10", seconds: 130 },
    { text: "Next, database management updates (SQL/MongoDB) and some basic Cloud concepts like AWS or GitHub properties.", time: "03:00", seconds: 180 },
    { text: "Step 2 is portfolio. HTML page or generic code copy-paste cheste review chesevallu reject chestaru.", time: "03:30", seconds: 210 },
    { text: "Build 2-3 solid real-world projects. E.g., an automated task dashboard or an AI summarizer app.", time: "04:30", seconds: 270 },
    { text: "Design your project code nicely and deploy it on Vercel or Netlify. Add GitHub code link.", time: "05:50", seconds: 350 },
    { text: "Step 3, Resume writing. Use single column templates. ATS (Applicant Tracking Systems) don't scan complex double column charts.", time: "07:45", seconds: 465 },
    { text: "Avoid general descriptions. Use active phrases: 'Optimized query time by 30%' instead of 'Worked on SQL database'.", time: "09:00", seconds: 540 },
    { text: "Step 4: LinkedIn. Optimise your profile headline. Mention skills like 'React developer, Node.js enthusiast' instead of just 'Student'.", time: "12:30", seconds: 750 },
    { text: "Try to connect with HR recruiters and developers working in your target startups. Drop brief, formal notes.", time: "14:15", seconds: 855 },
    { text: "Step 5, Platforms. Apply on LinkedIn Jobs, Naukri, and Internshala daily. Target 10-15 applications per week.", time: "18:10", seconds: 1090 },
    { text: "Startups are the best place for beginners. They teach you more, process applications fast, and have less rigid filters.", time: "20:00", seconds: 1200 },
    { text: "Finally, interviews. Practice mock interviews. Explain your projects clearly, write dry runs of code on paper.", time: "22:40", seconds: 1360 },
    { text: "All the best guys! Check links in description. Don't forget to subscribe to Think IT Telugu.", time: "25:00", seconds: 1500 }
  ],
  flashcards: [
    {
      question: "What type of resume format is recommended for ATS filtering?",
      answer: "A clean, single-column resume template with simple headings, bullet points, and no complex graphics, columns, or tables is recommended, as ATS (Applicant Tracking Systems) read it much better.",
      hint: "Single column vs double column."
    },
    {
      question: "What is Step 1 of the internship roadmap outlined in the video?",
      answer: "Step 1 is Skill Building. Learn a core language (Java, Python, or JS/TypeScript), database management (SQL or MongoDB), version control (Git), and deployment basics.",
      hint: "Foundation before building projects."
    },
    {
      question: "Which platforms should beginners target for internship applications?",
      answer: "The video recommends active, daily applications on Internshala, LinkedIn Jobs, and Naukri, with a special emphasis on applying to early/growth-stage startups.",
      hint: "Name the three platforms."
    }
  ],
  quiz: [
    {
      question: "What should you focus on when writing descriptions for your resume projects?",
      options: [
        "Include as much decoration and icons as possible",
        "Write long paragraphs describing the company history",
        "Use metrics-driven, impact-focused descriptions (e.g. 'optimized by 30%')",
        "List only the project title without details"
      ],
      answer: 2,
      explanation: "Using metrics and action verbs helps prove that you understand your work and provides concrete evidence of your skills."
    }
  ],
  notes: "Remember: Resumes must be ATS-friendly. Single column layout only! Startups are great for early jobs.",
  chatHistory: [
    { role: "assistant", content: `Hi! I've extracted the transcript from this YouTube video. Ask me anything about it!` }
  ]
};

const MOCK_PDF_INDUSTRIAL_AUTOMATION = {
  id: "default-pdf",
  title: "Learning Session - 5/22/2026",
  kind: "pdf",
  fileName: "Industrial_Automation_Unit1_Notes.pdf",
  localFileUrl: "http://localhost:3001/uploads/c9bf6a21-ae19-40eb-a97d-d2cf57801645_Industrial_Automation_Unit1_Notes.pdf",
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
      answer: "Industrial Automation is the use of control systems (such as computers, PLCs, or robots) and information technologies to handle industrial processes and machinery, replacing repetitive human work and improving precision.",
      hint: "It replaces repetitive human work and checks for mistakes."
    },
    {
      question: "What is a PLC and what is its role?",
      answer: "A Programmable Logic Controller (PLC) is a ruggedized industrial computer used to control manufacturing processes. It reads inputs from sensors, processes them based on custom logic, and controls actuators.",
      hint: "Stands for Programmable Logic Controller."
    },
    {
      question: "What are the main benefits of industrial automation?",
      answer: "Key benefits include increased productivity, reduced operation costs, improved product quality, minimized human error, and enhanced safety by keeping workers away from hazardous environments.",
      hint: "Think efficiency, safety, and cost reduction."
    }
  ],
  quiz: [
    {
      question: "Which device is responsible for converting electrical control signals into physical movement?",
      options: [
        "Sensor",
        "Actuator",
        "PLC logic block",
        "SCADA terminal"
      ],
      answer: 1,
      explanation: "Actuators receive electrical command outputs and convert them to mechanical force or displacement (solenoids, motors, valves)."
    }
  ],
  notes: "PLCs are Programmable Logic Controllers. SCADA is for supervisory control and data acquisition.",
  chatHistory: [
    { role: "assistant", content: `Hi! I've reviewed this document. Ask me anything about it!` }
  ]
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

// -------------------------------------------------------------
// 1. GET ALL ITEMS
// -------------------------------------------------------------
app.get("/api/items", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM public.study_items ORDER BY created_at DESC");
    const items = result.rows.map(formatItem);
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// -------------------------------------------------------------
// 2. GET ITEM DETAILS (WITH FLASHCARDS, QUIZZES, AND CHAT)
// -------------------------------------------------------------
app.get("/api/items/:id", async (req, res) => {
  const { id } = req.params;
  
  if (id === "default-pdf") {
    return res.json(MOCK_PDF_INDUSTRIAL_AUTOMATION);
  }
  if (id === "default-youtube") {
    return res.json(MOCK_YOUTUBE_INTERNSHIP);
  }
  
  if (!isUuid(id)) {
    return res.status(404).json({ error: "Item not found" });
  }

  try {
    const itemRes = await pool.query("SELECT * FROM public.study_items WHERE id = $1", [id]);
    if (itemRes.rows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }
    const item = formatItem(itemRes.rows[0]);

    const cardsRes = await pool.query("SELECT question, answer, hint FROM public.flashcards WHERE item_id = $1", [id]);
    const quizRes = await pool.query("SELECT question, options, answer, explanation FROM public.quizzes WHERE item_id = $1", [id]);
    const chatRes = await pool.query("SELECT role, content FROM public.chat_messages WHERE item_id = $1 ORDER BY created_at ASC", [id]);
    const pinsRes = await pool.query("SELECT id, content FROM public.pinned_notes WHERE item_id = $1 ORDER BY created_at ASC", [id]);

    res.json({
      ...item,
      flashcards: cardsRes.rows,
      quiz: quizRes.rows,
      pinnedNotes: pinsRes.rows,
      chatHistory: chatRes.rows.length > 0 ? chatRes.rows : [
        { role: "assistant", content: `Hi! I've analyzed **${item.title || "this resource"}**. Ask me anything about it!` }
      ],
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// -------------------------------------------------------------
// 3. DELETE ITEM
// -------------------------------------------------------------
app.delete("/api/items/:id", async (req, res) => {
  const { id } = req.params;
  
  if (id === "default-pdf" || id === "default-youtube") {
    return res.json({ success: true });
  }
  if (!isUuid(id)) {
    return res.status(404).json({ error: "Item not found" });
  }

  try {
    await pool.query("DELETE FROM public.study_items WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// -------------------------------------------------------------
// 4. UPDATE STUDY NOTES
// -------------------------------------------------------------
app.put("/api/items/:id/notes", async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  
  if (id === "default-pdf" || id === "default-youtube") {
    return res.json({ success: true });
  }
  if (!isUuid(id)) {
    return res.status(404).json({ error: "Item not found" });
  }

  try {
    await pool.query("UPDATE public.study_items SET notes = $1 WHERE id = $2", [notes, id]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// -------------------------------------------------------------
// 5. UPLOAD & INDEX PDF (FORWARD TO FASTAPI FOR RAG)
// -------------------------------------------------------------
app.post("/api/items/file", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    const title = `Learning Session - ${dateStr}`;

    // 1. Create Study Item
    const itemRes = await pool.query(
      "INSERT INTO public.study_items (title, kind, file_name) VALUES ($1, $2, $3) RETURNING id",
      [title, "pdf", req.file.originalname]
    );
    const itemId = itemRes.rows[0].id;

    // Save File Statically for Frontend Viewing
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, `${itemId}_${req.file.originalname}`);
    fs.writeFileSync(filePath, req.file.buffer);

    // 2. Forward File to FastAPI for chunking, embedding, and generating cards
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append("file", blob, req.file.originalname);
    formData.append("item_id", itemId);

    console.log(`📤 Forwarding PDF ${req.file.originalname} to FastAPI...`);
    const fastApiRes = await axios.post(`${FASTAPI_URL}/process-pdf`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });

    const { content, flashcards, quiz } = fastApiRes.data;

    // 3. Update Item Content
    await pool.query("UPDATE public.study_items SET content = $1 WHERE id = $2", [content, itemId]);

    // 4. Insert Flashcards
    for (const card of flashcards) {
      await pool.query(
        "INSERT INTO public.flashcards (item_id, question, answer, hint) VALUES ($1, $2, $3, $4)",
        [itemId, card.question, card.answer, card.hint]
      );
    }

    // 5. Insert Quizzes
    for (const q of quiz) {
      await pool.query(
        "INSERT INTO public.quizzes (item_id, question, options, answer, explanation) VALUES ($1, $2, $3, $4, $5)",
        [itemId, q.question, q.options, q.answer, q.explanation]
      );
    }

    res.json({ id: itemId });
  } catch (e) {
    const errMsg = e.response && e.response.data ? JSON.stringify(e.response.data) : e.message;
    console.error("❌ File ingest failed:", errMsg);
    res.status(500).json({ error: errMsg });
  }
});

// -------------------------------------------------------------
// 6. PROCESS YOUTUBE (FORWARD TO FASTAPI)
// -------------------------------------------------------------
app.post("/api/items/youtube", async (req, res) => {
  const { url } = req.body;
  try {
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    const title = `Learning Session - ${dateStr}`;

    // 1. Create Study Item
    const itemRes = await pool.query(
      "INSERT INTO public.study_items (title, kind, youtube_url) VALUES ($1, $2, $3) RETURNING id",
      [title, "youtube", url]
    );
    const itemId = itemRes.rows[0].id;

    // 2. Contact FastAPI
    const fastApiRes = await axios.post(`${FASTAPI_URL}/process-youtube`, { url, item_id: itemId });
    const { video_id, content, chapters, transcript, flashcards, quiz } = fastApiRes.data;

    // 3. Update Item Content
    await pool.query(
      "UPDATE public.study_items SET video_id = $1, content = $2, chapters = $3, transcript = $4 WHERE id = $5",
      [video_id, content, JSON.stringify(chapters), JSON.stringify(transcript), itemId]
    );

    // 4. Insert Flashcards
    for (const card of flashcards) {
      await pool.query(
        "INSERT INTO public.flashcards (item_id, question, answer, hint) VALUES ($1, $2, $3, $4)",
        [itemId, card.question, card.answer, card.hint]
      );
    }

    // 5. Insert Quizzes
    for (const q of quiz) {
      await pool.query(
        "INSERT INTO public.quizzes (item_id, question, options, answer, explanation) VALUES ($1, $2, $3, $4, $5)",
        [itemId, q.question, q.options, q.answer, q.explanation]
      );
    }

    res.json({ id: itemId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// -------------------------------------------------------------
// 7. PROCESS WEBSITE (FORWARD TO FASTAPI)
// -------------------------------------------------------------
app.post("/api/items/website", async (req, res) => {
  const { url } = req.body;
  try {
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    const title = `Learning Session - ${dateStr}`;

    const itemRes = await pool.query(
      "INSERT INTO public.study_items (title, kind, youtube_url) VALUES ($1, $2, $3) RETURNING id",
      [title, "website", url]
    );
    const itemId = itemRes.rows[0].id;

    const fastApiRes = await axios.post(`${FASTAPI_URL}/process-website`, { url, item_id: itemId });
    const { content, flashcards, quiz } = fastApiRes.data;

    await pool.query("UPDATE public.study_items SET content = $1 WHERE id = $2", [content, itemId]);

    for (const card of flashcards) {
      await pool.query(
        "INSERT INTO public.flashcards (item_id, question, answer, hint) VALUES ($1, $2, $3, $4)",
        [itemId, card.question, card.answer, card.hint]
      );
    }
    for (const q of quiz) {
      await pool.query(
        "INSERT INTO public.quizzes (item_id, question, options, answer, explanation) VALUES ($1, $2, $3, $4, $5)",
        [itemId, q.question, q.options, q.answer, q.explanation]
      );
    }

    res.json({ id: itemId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// -------------------------------------------------------------
// 8. PROCESS TEXT (FORWARD TO FASTAPI)
// -------------------------------------------------------------
app.post("/api/items/text", async (req, res) => {
  const { text } = req.body;
  try {
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    const wordCount = text.trim().split(/\s+/).length;
    const title = `Learning Session - ${dateStr}`;

    const itemRes = await pool.query(
      "INSERT INTO public.study_items (title, kind, content) VALUES ($1, $2, $3) RETURNING id",
      [title, "text", text]
    );
    const itemId = itemRes.rows[0].id;

    const fastApiRes = await axios.post(`${FASTAPI_URL}/process-text`, { text, item_id: itemId });
    const { flashcards, quiz } = fastApiRes.data;

    for (const card of flashcards) {
      await pool.query(
        "INSERT INTO public.flashcards (item_id, question, answer, hint) VALUES ($1, $2, $3, $4)",
        [itemId, card.question, card.answer, card.hint]
      );
    }
    for (const q of quiz) {
      await pool.query(
        "INSERT INTO public.quizzes (item_id, question, options, answer, explanation) VALUES ($1, $2, $3, $4, $5)",
        [itemId, q.question, q.options, q.answer, q.explanation]
      );
    }

    res.json({ id: itemId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// -------------------------------------------------------------
// 9. PROCESS DEEP RESEARCH (FORWARD TO FASTAPI)
// -------------------------------------------------------------
app.post("/api/items/research", async (req, res) => {
  const { topic } = req.body;
  try {
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    const title = `Learning Session - ${dateStr}`;

    const itemRes = await pool.query(
      "INSERT INTO public.study_items (title, kind) VALUES ($1, $2) RETURNING id",
      [title, "research"]
    );
    const itemId = itemRes.rows[0].id;

    const fastApiRes = await axios.post(`${FASTAPI_URL}/process-research`, { topic, item_id: itemId });
    const { content, flashcards, quiz } = fastApiRes.data;

    await pool.query("UPDATE public.study_items SET content = $1 WHERE id = $2", [content, itemId]);

    for (const card of flashcards) {
      await pool.query(
        "INSERT INTO public.flashcards (item_id, question, answer, hint) VALUES ($1, $2, $3, $4)",
        [itemId, card.question, card.answer, card.hint]
      );
    }
    for (const q of quiz) {
      await pool.query(
        "INSERT INTO public.quizzes (item_id, question, options, answer, explanation) VALUES ($1, $2, $3, $4, $5)",
        [itemId, q.question, q.options, q.answer, q.explanation]
      );
    }

    res.json({ id: itemId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// -------------------------------------------------------------
// 10. CHAT Q&A (RAG-BASED CHAT ROUTED TO FASTAPI)
// -------------------------------------------------------------
app.post("/api/items/:id/chat", async (req, res) => {
  const { id } = req.params;
  const { question } = req.body;

  if (!isUuid(id)) {
    // Return a mocked chat response for default items so they still talk!
    if (id === "default-pdf" || id === "default-youtube") {
      return res.json({
        role: "assistant",
        content: `I've analyzed your question: "${question}". Since we are running in the pre-loaded default demonstration lobby, I can confirm the core concepts match your outline. Feel free to upload your own custom document to test page-aware RAG vector search!`
      });
    }
    return res.status(404).json({ error: "Item not found" });
  }

  try {
    // 1. Retrieve the existing conversation history (excluding the current user turn)
    const historyRes = await pool.query(
      "SELECT role, content FROM public.chat_messages WHERE item_id = $1 ORDER BY created_at ASC LIMIT 10",
      [id]
    );
    const chatHistory = historyRes.rows;

    // 2. Record User Message
    await pool.query(
      "INSERT INTO public.chat_messages (item_id, role, content) VALUES ($1, $2, $3)",
      [id, "user", question]
    );

    // 3. Contact FastAPI for vector RAG query & generation (including history)
    console.log(`💬 Querying FastAPI RAG for item ${id} with ${chatHistory.length} history messages...`);
    const fastApiRes = await axios.post(`${FASTAPI_URL}/chat`, {
      item_id: id,
      question: question,
      chat_history: chatHistory
    });

    const reply = fastApiRes.data.answer;

    // 4. Record Assistant Message
    await pool.query(
      "INSERT INTO public.chat_messages (item_id, role, content) VALUES ($1, $2, $3)",
      [id, "assistant", reply]
    );

    res.json({ role: "assistant", content: reply });
  } catch (e) {
    console.error("❌ RAG chat failed:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(port, () => {
  console.log(`🔥 Node.js API Gateway running on http://localhost:${port}`);
});

// -------------------------------------------------------------
// NOTEBOOK LM FEATURES: PINS, PODCAST, BRIEFING
// -------------------------------------------------------------

app.post("/api/items/:id/pins", async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!isUuid(id)) return res.status(404).json({ error: "Item not found" });
  try {
    const r = await pool.query("INSERT INTO public.pinned_notes (item_id, content) VALUES ($1, $2) RETURNING id, content", [id, content]);
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/items/:id/pins/:pinId", async (req, res) => {
  const { id, pinId } = req.params;
  if (!isUuid(id) || !isUuid(pinId)) return res.status(404).json({ error: "Item not found" });
  try {
    await pool.query("DELETE FROM public.pinned_notes WHERE id = $1 AND item_id = $2", [pinId, id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/items/:id/podcast", async (req, res) => {
  const { id } = req.params;
  const { language = "English", instructions = "", format = "two-hosts", duration = "Medium (~10 mins)", pages = "All", host1Name = "Host 1", host2Name = "Host 2" } = req.body || {};
  if (!isUuid(id)) return res.status(404).json({ error: "Item not found" });

  try {
    console.log(`🎙️ Generating AI podcast for item ${id}...`);
    const fastApiRes = await axios.post(`${FASTAPI_URL}/generate-podcast`, { 
      item_id: id, language, instructions, format, duration, pages, host1Name, host2Name
    });
    const script = fastApiRes.data.script;
    await pool.query("UPDATE public.study_items SET audio_script = $1 WHERE id = $2", [JSON.stringify(script), id]);
    res.json({ script });
  } catch (e) {
    console.error("Podcast generation failed:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/items/:id/briefing", async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) return res.status(404).json({ error: "Item not found" });
  try {
    const fastApiRes = await axios.post(`${FASTAPI_URL}/generate-briefing`, { item_id: id });
    const briefing_doc = fastApiRes.data.briefing_doc;
    await pool.query("UPDATE public.study_items SET briefing_doc = $1 WHERE id = $2", [briefing_doc, id]);
    res.json({ briefing_doc });
  } catch (e) {
    console.error("Briefing generation failed:", e.message);
    res.status(500).json({ error: e.message });
  }
});
