import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Flame,
  Paperclip,
  Youtube,
  Link2,
  Type,
  Search,
  X,
  LayoutGrid,
  List,
  ChevronDown,
  FileText,
  BookOpen,
  Sparkles,
  Send,
  Volume2,
  Edit2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MessageSquare,
  ArrowLeft,
  ExternalLink,
  Play,
  PlayCircle,
  Sun,
  Moon,
  ChevronRight,
  ChevronLeft,
  Check,
  Download,
  Terminal,
  Database,
  ArrowUp,
  Globe,
  Pin,
  Headphones,
  FileStack,
  Trash2,
  Pause,
} from "lucide-react";
import { toast } from "sonner";
import {
  StudyItem,
  MOCK_PDF_INDUSTRIAL_AUTOMATION,
  MOCK_PDF_QUANTUM_COMPUTING,
  MOCK_YOUTUBE_INTERNSHIP,
  generateMockWebsiteContent,
  generateMockTextContent,
  generateMockYoutubeContent,
  generateMockResearchContent,
  getSmartAgentResponse,
  generateMockPdfContentForTopic,
} from "../lib/mockData";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — LearnX" }],
  }),
  component: DashboardPage,
});

export default function DashboardPage() {
  const [showTrial, setShowTrial] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  // Database / Simulated mode switch (always active on Postgres)
  const useRealBackend = true;
  const [backendOffline, setBackendOffline] = useState(false);


  // Resource inputs state
  const [activeInputMode, setActiveInputMode] = useState<
    "none" | "files" | "youtube" | "websites" | "text" | "research"
  >("none");
  const [inputText, setInputText] = useState("");

  // Loading animation state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Study items state
  const [items, setItems] = useState<StudyItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [selectedDetailedItem, setSelectedDetailedItem] = useState<StudyItem | null>(null);
  const [isLoadingItem, setIsLoadingItem] = useState(false);

  // Store blob URLs for uploaded PDFs — keyed by item ID
  const blobUrlsRef = useRef<Map<string, string>>(new Map());

  // -------------------------------------------------------------
  // FETCH ITEMS - API GATEWAY OR LOCAL STORAGE
  // -------------------------------------------------------------
  const fetchItems = async (isChangeMode = false) => {
    if (useRealBackend) {
      try {
        const res = await fetch("http://localhost:3001/api/items");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setItems(data);
        setBackendOffline(false);
        if (isChangeMode) toast.success("Switched to PostgreSQL API Gateway Backend!");
      } catch (err) {
        setBackendOffline(true);
        toast.error("Could not connect to PostgreSQL API Gateway (localhost:3001). Using simulated local mode temporarily.");
        loadLocalItems();
      }
    } else {
      setBackendOffline(false);
      loadLocalItems();
      if (isChangeMode) toast.success("Switched to Simulated LocalStorage Mode.");
    }
  };

  const loadLocalItems = () => {
    const saved = localStorage.getItem("ultra_learn_items");
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        initializeDefaults();
      }
    } else {
      initializeDefaults();
    }
  };

  const initializeDefaults = () => {
    const defaultItems: StudyItem[] = [
      {
        id: "default-youtube",
        title: "Learning Session - 5/22/2026",
        createdAt: new Date("2026-05-22T14:30:00").toISOString(),
        kind: "youtube",
        content: MOCK_YOUTUBE_INTERNSHIP.content,
        youtubeUrl: MOCK_YOUTUBE_INTERNSHIP.youtubeUrl,
        videoId: MOCK_YOUTUBE_INTERNSHIP.videoId,
        chapters: MOCK_YOUTUBE_INTERNSHIP.chapters,
        transcript: MOCK_YOUTUBE_INTERNSHIP.transcript,
        flashcards: MOCK_YOUTUBE_INTERNSHIP.flashcards,
        quiz: MOCK_YOUTUBE_INTERNSHIP.quiz,
        notes: "Remember: Resumes must be ATS-friendly. Single column layout only! Startups are great for early jobs.",
        chatHistory: [
          { role: "assistant", content: `Hi! I've extracted the transcript from this YouTube video. Ask me anything about it!` }
        ],
      },
      {
        id: "default-pdf",
        title: "Learning Session - 5/22/2026",
        createdAt: new Date("2026-05-22T10:15:00").toISOString(),
        kind: "pdf",
        fileName: MOCK_PDF_INDUSTRIAL_AUTOMATION.fileName,
        content: MOCK_PDF_INDUSTRIAL_AUTOMATION.content,
        flashcards: MOCK_PDF_INDUSTRIAL_AUTOMATION.flashcards,
        quiz: MOCK_PDF_INDUSTRIAL_AUTOMATION.quiz,
        notes: "PLCs are Programmable Logic Controllers. SCADA is for supervisory control and data acquisition.",
        chatHistory: [
          { role: "assistant", content: `Hi! I've reviewed this document. Ask me anything about it!` }
        ],
      }
    ];
    setItems(defaultItems);
    localStorage.setItem("ultra_learn_items", JSON.stringify(defaultItems));
  };

  useEffect(() => {
    fetchItems();
  }, [useRealBackend]);

  // Load detailed study sessions
  useEffect(() => {
    if (!activeItemId) {
      setSelectedDetailedItem(null);
      setIsLoadingItem(false);
      return;
    }

    const loadDetails = async () => {
      setIsLoadingItem(true);
      if (useRealBackend) {
        try {
          const res = await fetch(`http://localhost:3001/api/items/${activeItemId}`);
          if (!res.ok) throw new Error();
          const data = await res.json();
          setSelectedDetailedItem(data);
          
          // Complete the full-screen analysis progress beautifully
          setAnalysisProgress(100);
          setAnalysisLogs((prev) => [...prev, "🚀 Study workspace ready!"]);
          setTimeout(() => {
            setIsAnalyzing(false);
          }, 800);
        } catch (e) {
          toast.error("Failed to load details from PostgreSQL.");
          setActiveItemId(null);
          setIsAnalyzing(false);
        } finally {
          setIsLoadingItem(false);
        }
      } else {
        const item = items.find((it) => it.id === activeItemId);
        setSelectedDetailedItem(item || null);
        
        // Sim mode: Complete progress & logs
        setAnalysisProgress(100);
        setAnalysisLogs((prev) => [...prev, "🚀 Study workspace ready!"]);
        setTimeout(() => {
          setIsAnalyzing(false);
        }, 800);
        setIsLoadingItem(false);
      }
    };

    loadDetails();
  }, [activeItemId, useRealBackend, items]);

  const saveLocalItems = (updated: StudyItem[]) => {
    setItems(updated);
    localStorage.setItem("ultra_learn_items", JSON.stringify(updated));
  };


  // Run progress animations
  const runSimulatedAnalysis = (
    kind: string,
    logs: string[],
    onComplete: () => void
  ) => {
    setIsAnalyzing(true);
    setAnalysisLogs([]);
    setAnalysisProgress(0);

    let currentLogIndex = 0;
    const progressInterval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 5;
      });
    }, 50);

    const logInterval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setAnalysisLogs((prev) => [...prev, logs[currentLogIndex]]);
        currentLogIndex++;
      } else {
        clearInterval(logInterval);
        onComplete();
      }
    }, 150);
  };

  // 1. Files select upload handler
  const onFilesSelect = (e: React.ChangeEvent<HTMLInputElement> | FileList | null) => {
    const files = e instanceof FileList ? e : e?.target.files;
    if (!files || !files.length) return;
    
    const file = files[0];
    const docData = generateMockPdfContentForTopic(file.name);

    const fileLogs = [
      `📂 Uploading ${file.name} to gateway...`,
      "🧬 Parsing PDF document structures & metadata...",
      "📝 Running text extraction & section matching...",
      "🧠 Indexing document paragraphs in PostgreSQL with pgvector...",
      "🤖 Synthesizing Socratic flashcards and quiz questions...",
      "⏳ RAG study session preparing..."
    ];

    const blobUrl = URL.createObjectURL(file);
    const formData = new FormData();
    formData.append("file", file);

    // ⚡ Speed Optimization: Start upload immediately while animation runs concurrently!
    const uploadPromise = useRealBackend
      ? fetch("http://localhost:3001/api/items/file", {
          method: "POST",
          body: formData,
        })
      : null;

    runSimulatedAnalysis("pdf", fileLogs, async () => {
      if (useRealBackend && uploadPromise) {
        try {
          const res = await uploadPromise;
          if (!res.ok) throw new Error("Fail upload");
          const data = await res.json();
          // Associate blob URL with the real DB item ID
          blobUrlsRef.current.set(data.id, blobUrl);
          
          setAnalysisLogs((prev) => [...prev, "⚡ Vector processing and index complete!"]);
          setAnalysisProgress(95);

          await fetchItems();
          setActiveItemId(data.id);
          toast.success(`PostgreSQL database indexed: ${file.name}`);
        } catch (e) {
          toast.error("Could not upload to PostgreSQL. Is Node.js backend running?");
          // Revoke the blob to avoid memory leaks when upload failed
          URL.revokeObjectURL(blobUrl);
          setIsAnalyzing(false);
        }
      } else {
        // Simulated local storage fallback
        const today = new Date();
        const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
        const newItem: StudyItem = {
          id: crypto.randomUUID(),
          title: `Learning Session - ${dateStr}`,
          createdAt: today.toISOString(),
          kind: "pdf",
          fileName: file.name,
          content: docData.content,
          localFileUrl: URL.createObjectURL(file),
          flashcards: docData.flashcards,
          quiz: docData.quiz,
          notes: "",
          chatHistory: [
            { role: "assistant", content: `Hi! I have indexed the PDF file: '${file.name}'. Ask me questions, practice flashcards, or take a quick quiz!` }
          ],
        };
        const updated = [newItem, ...items];
        saveLocalItems(updated);
        setActiveItemId(newItem.id);
        toast.success(`Mock-indexed ${file.name}`);
      }
      setActiveInputMode("none");
      setInputText("");
    });
  };

  // 2. YouTube Link ingest
  const onAddYoutube = () => {
    if (!inputText.trim()) {
      toast.error("Please enter a YouTube video URL");
      return;
    }

    const url = inputText.trim();
    const isInternship = url.includes("6PZX") || url.includes("internship") || url.includes("telugu");
    const ytData = isInternship ? MOCK_YOUTUBE_INTERNSHIP : generateMockYoutubeContent(url);

    const ytLogs = [
      "📡 Connecting to YouTube data API services...",
      `🎥 Fetching video details from: ${url}`,
      "🔊 Ingesting audio channel & extracting transcript...",
      "🏷️ Building chapters and aligning timelines...",
      "📚 Generating review Socratic flashcards...",
      "⏳ Lecture ingestion finalizing..."
    ];

    runSimulatedAnalysis("youtube", ytLogs, async () => {
      if (useRealBackend) {
        try {
          setAnalysisLogs((prev) => [...prev, "📡 Fetching transcript & running RAG pipeline..."]);
          const res = await fetch("http://localhost:3001/api/items/youtube", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          
          setAnalysisLogs((prev) => [...prev, "⚡ YouTube transcript chapters aligned!"]);
          setAnalysisProgress(95);

          await fetchItems();
          setActiveItemId(data.id);
          toast.success("YouTube video RAG pipeline setup complete!");
        } catch (e) {
          toast.error("YouTube ingestion failed in PostgreSQL.");
          setIsAnalyzing(false);
        }
      } else {
        const today = new Date();
        const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
        const newItem: StudyItem = {
          id: crypto.randomUUID(),
          title: `Learning Session - ${dateStr}`,
          createdAt: today.toISOString(),
          kind: "youtube",
          content: ytData.content,
          youtubeUrl: url,
          videoId: ytData.videoId,
          chapters: ytData.chapters,
          transcript: ytData.transcript,
          flashcards: ytData.flashcards,
          quiz: ytData.quiz,
          notes: "",
          chatHistory: [
            { role: "assistant", content: `Hi! I've loaded the YouTube lecture. You can watch it, search its transcript timestamps, and ask me questions about it.` }
          ],
        };
        const updated = [newItem, ...items];
        saveLocalItems(updated);
        setActiveItemId(newItem.id);
        toast.success("Mock YouTube ingested");
      }
      setActiveInputMode("none");
      setInputText("");
    });
  };

  // 3. Website Scraper ingest
  const onAddWebsite = () => {
    if (!inputText.trim()) {
      toast.error("Please enter a website link");
      return;
    }

    const url = inputText.trim();
    const siteLogs = [
      `🌐 Contacting domain crawler targeting: ${url}`,
      "🕷️ Scraping DOM tree structures...",
      "🧹 Stripping layout clutter, ads, and sidebars...",
      "🧠 Formulating study nodes from semantic texts...",
      "⏳ Scraping completing..."
    ];

    runSimulatedAnalysis("website", siteLogs, async () => {
      if (useRealBackend) {
        try {
          setAnalysisLogs((prev) => [...prev, "📡 Extracting DOM content & clean reading view..."]);
          const res = await fetch("http://localhost:3001/api/items/website", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          
          setAnalysisLogs((prev) => [...prev, "⚡ Webpage indexing finished!"]);
          setAnalysisProgress(95);

          await fetchItems();
          setActiveItemId(data.id);
          toast.success("Website scraped & saved to DB!");
        } catch (e) {
          toast.error("Website scraping failed.");
          setIsAnalyzing(false);
        }
      } else {
        const today = new Date();
        const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
        const webData = generateMockWebsiteContent(url);
        const newItem: StudyItem = {
          id: crypto.randomUUID(),
          title: `Learning Session - ${dateStr}`,
          createdAt: today.toISOString(),
          kind: "website",
          content: webData.content,
          flashcards: webData.flashcards,
          quiz: webData.quiz,
          notes: "",
          chatHistory: [
            { role: "assistant", content: `Hello! I have scraped and indexed the page content from ${url}. Let me know what you want to understand.` }
          ],
        };
        const updated = [newItem, ...items];
        saveLocalItems(updated);
        setActiveItemId(newItem.id);
        toast.success("Mock website scraped");
      }
      setActiveInputMode("none");
      setInputText("");
    });
  };

  // 4. Custom text ingest
  const onAddText = () => {
    if (!inputText.trim()) {
      toast.error("Please enter some text notes");
      return;
    }

    const textLogs = [
      "📝 Digesting text string details...",
      "🔍 Analyzing key nouns and concepts...",
      "🧠 Generating review flashcards...",
      "⏳ Custom text study session creating..."
    ];

    runSimulatedAnalysis("text", textLogs, async () => {
      if (useRealBackend) {
        try {
          setAnalysisLogs((prev) => [...prev, "📡 Compiling notes & creating semantic vector..."]);
          const res = await fetch("http://localhost:3001/api/items/text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: inputText }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          
          setAnalysisLogs((prev) => [...prev, "⚡ Text session indexed successfully!"]);
          setAnalysisProgress(95);

          await fetchItems();
          setActiveItemId(data.id);
          toast.success("Notes saved to PostgreSQL!");
        } catch (e) {
          toast.error("Pasted text save failed.");
          setIsAnalyzing(false);
        }
      } else {
        const today = new Date();
        const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
        const textData = generateMockTextContent(inputText);
        const newItem: StudyItem = {
          id: crypto.randomUUID(),
          title: `Learning Session - ${dateStr}`,
          createdAt: today.toISOString(),
          kind: "text",
          content: textData.content,
          flashcards: textData.flashcards,
          quiz: textData.quiz,
          notes: "",
          chatHistory: [
            { role: "assistant", content: "Hi! I have loaded your notes in the left editor pane. You can edit them anytime, and I will update my knowledge." }
          ],
        };
        const updated = [newItem, ...items];
        saveLocalItems(updated);
        setActiveItemId(newItem.id);
        toast.success("Mock text processed");
      }
      setActiveInputMode("none");
      setInputText("");
    });
  };

  // 5. Deep Research ingest
  const onAddDeepResearch = () => {
    if (!inputText.trim()) {
      toast.error("Please specify a topic to research");
      return;
    }

    const topic = inputText.trim();
    const researchLogs = [
      `🤖 Launching Deep Research agent for: "${topic}"`,
      "🔎 Querying database search engines...",
      "📚 Extracting claims and references...",
      "✍️ Drafting structured research dossier...",
      "🏁 Compiling study flashcards & quizzes...",
      "⏳ Research final steps..."
    ];

    runSimulatedAnalysis("research", researchLogs, async () => {
      if (useRealBackend) {
        try {
          setAnalysisLogs((prev) => [...prev, "📡 Launching web crawler agents & compiling dossiers..."]);
          const res = await fetch("http://localhost:3001/api/items/research", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          
          setAnalysisLogs((prev) => [...prev, "⚡ Deep research agent finalized report!"]);
          setAnalysisProgress(95);

          await fetchItems();
          setActiveItemId(data.id);
          toast.success("Deep research report synthesized in DB!");
        } catch (e) {
          toast.error("Deep research agent failed.");
          setIsAnalyzing(false);
        }
      } else {
        const today = new Date();
        const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
        const researchData = generateMockResearchContent(topic);
        const newItem: StudyItem = {
          id: crypto.randomUUID(),
          title: `Learning Session - ${dateStr}`,
          createdAt: today.toISOString(),
          kind: "research",
          content: researchData.content,
          flashcards: researchData.flashcards,
          quiz: researchData.quiz,
          notes: "",
          chatHistory: [
            { role: "assistant", content: `I have compiled a comprehensive deep research report on **${topic}**. You can read the structured report, examine references, and chat with me to explore the concepts.` }
          ],
        };
        const updated = [newItem, ...items];
        saveLocalItems(updated);
        setActiveItemId(newItem.id);
        toast.success("Mock research synthesized");
      }
      setActiveInputMode("none");
      setInputText("");
    });
  };

  // Delete study session
  const onDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = confirm("Are you sure you want to delete this study session?");
    if (!confirmed) return;

    if (useRealBackend) {
      try {
        const res = await fetch(`http://localhost:3001/api/items/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        fetchItems();
        toast.success("Deleted from PostgreSQL Database");
      } catch (e) {
        toast.error("Failed to delete from server.");
      }
    } else {
      const updated = items.filter((it) => it.id !== id);
      saveLocalItems(updated);
      toast.success("Deleted from LocalStorage");
    }
  };

  // Search filter and sort
  const filteredItems = items
    .filter((it) => {
      const q = query.toLowerCase();
      return (
        it.title.toLowerCase().includes(q) ||
        it.kind.toLowerCase().includes(q) ||
        (it.content || "").toLowerCase().includes(q) ||
        (it.fileName && it.fileName.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

  // Custom style overrides for 3D card flips
  const cardFlipStyle = `
    .perspective-1000 { perspective: 1000px; }
    .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
    .rotate-y-180 { transform: rotateY(180deg); }
    .transform-style-3d { transform-style: preserve-3d; }
  `;

  return (
    <div className="min-h-screen bg-[#060606] text-white selection:bg-[#4a2a1f]/60 selection:text-white font-sans antialiased">
      <style dangerouslySetInnerHTML={{ __html: cardFlipStyle }} />
      
      {/* BEAUTIFUL LOADING SCREEN — shows while analyzing OR loading details */}
      {isAnalyzing || (isLoadingItem && !selectedDetailedItem) ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060606]" style={{ fontFamily: "'Inter', sans-serif" }}>
          {/* Ambient glow backdrop */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-orange-600/5 blur-[120px] animate-pulse" />
            <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-amber-500/5 blur-[80px]" style={{ animation: 'pulse 3s ease-in-out infinite 1s' }} />
          </div>

          {/* Central pulsing orb */}
          <div className="relative mb-10">
            <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-2xl scale-150 animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/30 to-amber-600/10 border border-orange-500/30 flex items-center justify-center shadow-2xl"
              style={{ animation: 'spin 3s linear infinite' }}>
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500/20 to-transparent border border-orange-400/20 flex items-center justify-center"
                style={{ animation: 'spin 2s linear infinite reverse' }}>
                <div className="w-8 h-8 rounded-full bg-orange-500/40 border border-orange-400/40 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-semibold tracking-tight text-white mb-1">Building Your Study Workspace</h2>
          <p className="text-sm text-white/40 mb-8">
            {analysisLogs.length > 0 ? analysisLogs[analysisLogs.length - 1] : 'Initializing AI pipeline...'}
          </p>

          {/* Progress bar */}
          <div className="w-72 h-1.5 rounded-full bg-white/5 overflow-hidden mb-6">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300"
              style={{ width: `${Math.max(analysisProgress, 15)}%` }}
            />
          </div>

          {/* Scrolling log lines */}
          <div className="w-full max-w-sm space-y-1.5 px-4">
            {analysisLogs.slice(-4).map((log, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-white/40 font-mono"
                style={{ opacity: 1 - (analysisLogs.slice(-4).length - 1 - i) * 0.2 }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500/60 flex-shrink-0" />
                {log}
              </div>
            ))}
            {analysisLogs.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-white/30 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500/40 animate-pulse flex-shrink-0" />
                Connecting to study database...
              </div>
            )}
          </div>

          {/* Brand watermark */}
          <div className="absolute bottom-8 flex items-center gap-2 opacity-30">
            <div className="h-5 w-5 rotate-45 bg-white/80" style={{ clipPath: 'polygon(50% 0,100% 50%,50% 100%,0 50%)' }} />
            <span className="text-xs font-medium tracking-widest uppercase text-white">LearnX</span>
          </div>
        </div>

      /* RENDER STUDY WORKSPACE IF SELECTED */
      ) : selectedDetailedItem ? (
        <StudySessionPanel
          item={selectedDetailedItem}
          useRealBackend={useRealBackend}
          pdfBlobUrl={blobUrlsRef.current.get(selectedDetailedItem.id)}
          onBack={() => {
            setActiveItemId(null);
            fetchItems();
          }}
          onUpdateItem={(updatedItem) => {
            setSelectedDetailedItem(updatedItem);
            if (!useRealBackend) {
              const updated = items.map((it) => (it.id === updatedItem.id ? updatedItem : it));
              saveLocalItems(updated);
            }
          }}
        />
      ) : (
        /* OTHERWISE MAIN DASHBOARD */
        <>
          {/* Top Header bar matching screenshots */}
          <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/[0.04] bg-[#090909]/80 px-6 py-4 backdrop-blur-xl md:px-10 sticky top-0 z-50 gap-4">
            <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-[1.01]">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-tr from-white/10 to-white/5 border border-white/10 shadow-inner">
                <div className="h-4 w-4 rotate-45 bg-white/90" style={{ clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)" }} />
              </div>
              <span className="font-display text-2xl tracking-wide font-medium bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">LearnX</span>
            </Link>
            
            <div className="flex flex-wrap items-center gap-4">


              {/* Streak badge */}
              <div className="flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[0.05] px-3.5 py-1.5 text-sm transition-all hover:bg-orange-500/[0.08]">
                <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
                <span className="font-semibold text-orange-200">2 day</span>
                <span className="text-orange-500/50">/ 30</span>
              </div>
              {/* User profile */}
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4a2a1f] border border-orange-800/40 text-sm font-semibold uppercase text-orange-200 shadow-md">
                T
              </div>
            </div>
          </header>

          <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-10">
            


            {/* Title heading */}
            <div className="mb-4 text-center mt-6">
              <h1 className="text-5xl font-semibold tracking-tight md:text-6xl text-white">
                Let's learn, TANGUTURI
              </h1>
            </div>

            {/* EXPANDING DROPZONE CONTROLLER */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-6 shadow-xl backdrop-blur-md transition-all duration-300">
              {activeInputMode === "none" ? (
                <>
                  <p className="text-center text-white/80 font-medium">Add files, drag & drop to learn</p>
                  <p className="mt-1 text-center text-xs text-white/40">PDF, Word, and PowerPoint files up to 15 MB each</p>
                </>
              ) : (
                <div className="mb-6 rounded-xl border border-white/5 bg-white/[0.02] p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {activeInputMode === "youtube" && <Youtube className="h-5 w-5 text-red-500" />}
                      {activeInputMode === "websites" && <Link2 className="h-5 w-5 text-blue-400" />}
                      {activeInputMode === "text" && <Type className="h-5 w-5 text-purple-400" />}
                      {activeInputMode === "research" && <Search className="h-5 w-5 text-emerald-400" />}
                      <span className="font-semibold text-white capitalize">{activeInputMode === "text" ? "Add Custom Text" : activeInputMode === "research" ? "Deep Research Topic" : activeInputMode}</span>
                    </div>
                    <button
                      onClick={() => {
                        setActiveInputMode("none");
                        setInputText("");
                      }}
                      className="rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="mt-4">
                    {activeInputMode === "text" ? (
                      <div>
                        <textarea
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder="Paste your text here (up to infinity words)... We will index the content and generate active recall flashcards."
                          rows={6}
                          className="w-full rounded-lg border border-white/10 bg-black/40 p-3 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
                        />
                        <div className="mt-2 flex items-center justify-between text-xs text-white/40">
                          <span>
                            Words: {inputText.trim() ? inputText.trim().split(/\s+/).length : 0} | Characters: {inputText.length}
                          </span>
                          <span className="text-orange-400/80 font-hand text-sm">Takes inputs up to infinity words!</span>
                        </div>
                      </div>
                    ) : (
                      <input
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={
                          activeInputMode === "youtube"
                            ? "Paste YouTube Video Link (e.g. https://www.youtube.com/watch?v=6PZX-v-y0bE)"
                            : activeInputMode === "websites"
                            ? "Enter Website URL (e.g. https://en.wikipedia.org/wiki/Artificial_intelligence)"
                            : "Enter the topic you want to research (e.g., Quantum Computing, Photosynthesis)"
                        }
                        className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (activeInputMode === "youtube") onAddYoutube();
                            else if (activeInputMode === "websites") onAddWebsite();
                            else if (activeInputMode === "research") onAddDeepResearch();
                          }
                        }}
                      />
                    )}
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setActiveInputMode("none");
                        setInputText("");
                      }}
                      className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-white/60 hover:bg-white/5 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (activeInputMode === "youtube") onAddYoutube();
                        else if (activeInputMode === "websites") onAddWebsite();
                        else if (activeInputMode === "text") onAddText();
                        else if (activeInputMode === "research") onAddDeepResearch();
                      }}
                      className="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black hover:bg-white/90"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>{activeInputMode === "research" ? "Launch Research" : activeInputMode === "text" ? "Process Text" : "Ingest URL"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Horizontal menu bar inside the dropzone */}
              <div className="mx-auto mt-6 flex max-w-3xl items-center justify-between gap-2 rounded-full border border-white/[0.04] bg-white/[0.01] p-1.5 backdrop-blur-md">
                <div className="flex flex-1 flex-wrap items-center justify-around gap-1 text-sm text-white/70">
                  {/* File input */}
                  <label className="flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-white/80 hover:bg-white/5 hover:text-white transition-all">
                    <Paperclip className="h-4 w-4 text-orange-400" />
                    <span>Files</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                      className="hidden"
                      onChange={onFilesSelect}
                    />
                  </label>
                  
                  <button
                    onClick={() => setActiveInputMode("youtube")}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all ${
                      activeInputMode === "youtube" ? "bg-white/10 text-white font-medium" : "text-white/85 hover:bg-white/5"
                    }`}
                  >
                    <Youtube className="h-4 w-4 text-red-500" />
                    <span>Youtube</span>
                  </button>

                  <button
                    onClick={() => setActiveInputMode("websites")}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all ${
                      activeInputMode === "websites" ? "bg-white/10 text-white font-medium" : "text-white/85 hover:bg-white/5"
                    }`}
                  >
                    <Link2 className="h-4 w-4 text-blue-400" />
                    <span>Websites</span>
                  </button>

                  <button
                    onClick={() => setActiveInputMode("text")}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all ${
                      activeInputMode === "text" ? "bg-white/10 text-white font-medium" : "text-white/85 hover:bg-white/5"
                    }`}
                  >
                    <Type className="h-4 w-4 text-purple-400" />
                    <span>Add Text</span>
                  </button>

                  <button
                    onClick={() => setActiveInputMode("research")}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all ${
                      activeInputMode === "research" ? "bg-white/10 text-white font-medium" : "text-white/85 hover:bg-white/5"
                    }`}
                  >
                    <Search className="h-4 w-4 text-emerald-400" />
                    <span>Deep Research</span>
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (activeInputMode === "youtube") onAddYoutube();
                    else if (activeInputMode === "websites") onAddWebsite();
                    else if (activeInputMode === "text") onAddText();
                    else if (activeInputMode === "research") onAddDeepResearch();
                    else {
                      toast.info("Please select a chip to choose an input method!");
                    }
                  }}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all shadow-md"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Trial upgrade banner block */}
            {showTrial && (
              <div className="relative mt-8 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.02] to-white/[0.005] p-6 shadow-xl backdrop-blur-sm">
                <button
                  onClick={() => setShowTrial(false)}
                  className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">Trial Upgrade</p>
                <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-white">7 days left on your trial</h2>
                <p className="mt-2 text-sm text-white/60 max-w-2xl leading-relaxed">
                  Unlock uninterrupted study sessions, smarter review tools, and your full recents workspace with a monthly plan.
                </p>
                <div className="mt-4 flex gap-3">
                  <a
                    href="#"
                    className="flex items-center gap-1 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-white/95 transition-all duration-200 shadow-lg"
                  >
                    <span>Buy monthly to keep going</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button className="rounded-full border border-white/15 px-5 py-2 text-sm font-medium hover:bg-white/5 transition-colors">
                    Compare plans
                  </button>
                </div>
              </div>
            )}

            {/* Recents list & filters section */}
            <div className="mt-12">
              <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-3xl font-bold tracking-tight text-white">Recents</h3>
                  <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/50">{filteredItems.length} items</span>
                </div>
                
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search box */}
                  <div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-4 py-2 w-full md:w-80 focus-within:border-white/20 transition-all duration-300">
                    <Search className="h-4 w-4 text-white/40" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search titles, tags, or uploaded resources"
                      className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                    />
                  </div>

                  {/* Sort dropdown */}
                  <button
                    onClick={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
                    className="flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-4 py-2 text-xs text-white/70 hover:bg-white/5 transition-all"
                  >
                    <span>↕ {sortBy === "newest" ? "Newest first" : "Oldest first"}</span>
                    <ChevronDown className="h-3 w-3 text-white/40" />
                  </button>

                  {/* Grid/List toggler */}
                  <div className="flex items-center rounded-full border border-white/5 bg-white/[0.03] p-1 shadow-inner">
                    <button
                      onClick={() => setView("grid")}
                      className={`grid h-8 w-8 place-items-center rounded-full transition-all duration-300 ${
                        view === "grid" ? "bg-white text-black font-semibold shadow" : "text-white/50 hover:text-white"
                      }`}
                    >
                      <LayoutGrid className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={() => setView("list")}
                      className={`grid h-8 w-8 place-items-center rounded-full transition-all duration-300 ${
                        view === "list" ? "bg-white text-black font-semibold shadow" : "text-white/50 hover:text-white"
                      }`}
                    >
                      <List className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Render */}
              {filteredItems.length === 0 ? (
                <div className="mt-12 rounded-xl border border-dashed border-white/10 p-12 text-center text-white/40">
                  <BookOpen className="mx-auto h-12 w-12 text-white/20 mb-3 animate-pulse" />
                  <p>No study sessions match your query.</p>
                  <p className="text-xs mt-1 text-white/30">Add a file, YouTube video, or scrape a webpage to start.</p>
                </div>
              ) : (
                <div
                  className={
                    view === "grid"
                      ? "mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3"
                      : "mt-6 flex flex-col gap-3"
                  }
                >
                  {filteredItems.map((it) => (
                    <div
                      key={it.id}
                      onClick={() => setActiveItemId(it.id)}
                      className={`group cursor-pointer border border-white/10 bg-white/[0.02] transition-all duration-300 hover:border-white/25 hover:bg-white/[0.04] shadow-md hover:-translate-y-0.5 ${
                        view === "grid" ? "rounded-xl overflow-hidden" : "rounded-lg p-4 flex items-center justify-between"
                      }`}
                    >
                      {/* CARD GRID LAYOUT */}
                      {view === "grid" ? (
                        <>
                          <div className="relative h-40 w-full overflow-hidden">
                            {it.kind === "youtube" ? (
                              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url('https://img.youtube.com/vi/${it.videoId}/hqdefault.jpg')` }}>
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <div className="grid h-12 w-12 place-items-center rounded-full bg-red-600 border border-red-500 text-white shadow-xl hover:bg-red-700 transition-colors">
                                    <Play className="h-5 w-5 fill-white" />
                                  </div>
                                </div>
                              </div>
                            ) : it.kind === "pdf" ? (
                              <div className="absolute inset-0 bg-gradient-to-br from-red-600/85 to-red-800 flex items-center justify-center p-4">
                                <div className="rounded-lg bg-[#0e0e0e] border border-white/10 px-5 py-4 text-center shadow-2xl transition-transform duration-300 group-hover:scale-105">
                                  <div className="mx-auto mb-1 inline-block rounded bg-red-600 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                                    PDF
                                  </div>
                                  <FileText className="mx-auto h-8 w-8 text-red-500 mt-1" />
                                  <p className="mt-1.5 text-[10px] text-white/60 font-mono select-none">Document</p>
                                </div>
                                <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2.5 py-0.5 text-[9px] font-semibold text-white/90 border border-white/5 uppercase tracking-wide">Bundle</span>
                              </div>
                            ) : it.kind === "website" ? (
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-700/80 to-indigo-900 flex items-center justify-center">
                                <div className="rounded-full bg-black/40 p-4 border border-white/10">
                                  <Link2 className="h-8 w-8 text-blue-300" />
                                </div>
                                <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2.5 py-0.5 text-[9px] font-semibold text-white/90 border border-white/5 uppercase tracking-wide">Web Scrape</span>
                              </div>
                            ) : it.kind === "research" ? (
                              <div className="absolute inset-0 bg-gradient-to-br from-emerald-700/85 to-teal-900 flex items-center justify-center">
                                <div className="rounded-full bg-black/40 p-4 border border-white/10 animate-pulse">
                                  <Search className="h-8 w-8 text-emerald-300" />
                                </div>
                                <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2.5 py-0.5 text-[9px] font-semibold text-white/90 border border-white/5 uppercase tracking-wide">Research</span>
                              </div>
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-purple-700/85 to-fuchsia-900 flex items-center justify-center">
                                <div className="rounded-full bg-black/40 p-4 border border-white/10">
                                  <Type className="h-8 w-8 text-purple-300" />
                                </div>
                                <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2.5 py-0.5 text-[9px] font-semibold text-white/90 border border-white/5 uppercase tracking-wide">Text Input</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="p-4 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-white truncate text-base leading-snug group-hover:text-orange-400 transition-colors">{it.title}</h4>
                              <p className="mt-1 text-xs text-white/40 truncate text-left">
                                {it.kind === "pdf" && it.fileName ? it.fileName : it.kind === "youtube" ? "YouTube Source" : it.kind === "website" ? "Scraped Website" : it.kind === "research" ? "Research Agent Study" : "Pasted Notes"}
                              </p>
                              <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-white/40">
                                <span className="rounded bg-white/5 px-1.5 py-0.5 text-white/60 border border-white/5 capitalize">{it.kind}</span>
                                <span>•</span>
                                <span>{new Date(it.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => onDeleteItem(it.id, e)}
                              className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white transition-all shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        /* CARD LIST LAYOUT */
                        <>
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className={`grid h-10 w-10 place-items-center rounded-lg border shadow-inner ${
                              it.kind === "pdf" ? "bg-red-950/30 border-red-500/20 text-red-400" :
                              it.kind === "youtube" ? "bg-red-950/20 border-red-700/20 text-red-500" :
                              it.kind === "website" ? "bg-blue-950/20 border-blue-700/20 text-blue-400" :
                              it.kind === "research" ? "bg-emerald-950/20 border-emerald-700/20 text-emerald-400" :
                              "bg-purple-950/20 border-purple-700/20 text-purple-400"
                            }`}>
                              {it.kind === "pdf" ? <FileText className="h-5 w-5" /> :
                               it.kind === "youtube" ? <Youtube className="h-5 w-5" /> :
                               it.kind === "website" ? <Link2 className="h-5 w-5" /> :
                               it.kind === "research" ? <Search className="h-5 w-5" /> :
                               <Type className="h-5 w-5" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-white group-hover:text-orange-400 transition-colors truncate text-sm text-left">{it.title}</p>
                              <p className="text-xs text-white/40 truncate text-left">
                                {it.kind === "pdf" && it.fileName ? it.fileName : it.kind === "youtube" ? "YouTube Transcript" : it.kind === "website" ? "Scraped Page" : it.kind === "research" ? "Research Agent" : "Text Input"}
                                <span className="mx-2">•</span>
                                {new Date(it.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-white/5 border border-white/5 px-2 py-0.5 text-[10px] text-white/50 uppercase select-none tracking-wide">{it.kind}</span>
                            <button
                              onClick={(e) => onDeleteItem(it.id, e)}
                              className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white transition-all"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// STUDY WORKSPACE PANEL COMPONENT
// -------------------------------------------------------------
interface StudySessionPanelProps {
  item: StudyItem;
  useRealBackend: boolean;
  pdfBlobUrl?: string;  // In-memory blob URL captured at upload time (most reliable)
  onBack: () => void;
  onUpdateItem: (item: StudyItem) => void;
}

function StudySessionPanel({ item, useRealBackend, pdfBlobUrl, onBack, onUpdateItem }: StudySessionPanelProps) {
  const [activeTab, setActiveTab] = useState<"tutor" | "chat" | "notes" | "pins" | "briefing" | "podcast">("tutor");
  const [pdfPageNum, setPdfPageNum] = useState<number | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  
  // Left side settings
  const [zoom, setZoom] = useState(100);
  const [pdfDarkMode, setPdfDarkMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editTextVal, setEditTextVal] = useState(item.content || "");
  const [pdfViewMode, setPdfViewMode] = useState<"original" | "text">("original");

  // YouTube reader options
  const [ytActiveTab, setYtActiveTab] = useState<"chapters" | "transcripts">("transcripts");
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [videoSeconds, setVideoSeconds] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Flashcard states
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardLog, setFlashcardLog] = useState<{ [idx: number]: "got" | "review" }>({});

  // Quiz states
  const [quizActive, setQuizActive] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<{ [qIdx: number]: number }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Chat states
  const [chatInput, setChatInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [item.chatHistory, isBotTyping]);

  // Voice TTS handler
  const toggleTTS = () => {
    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance((item.content || "").slice(0, 800));
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis?.speak(utterance);
    }
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    const hasTranscript = item.transcript && item.transcript.length > 0;
    const hasChapters = item.chapters && item.chapters.length > 0;
    if (hasTranscript) {
      setYtActiveTab("transcripts");
    } else if (hasChapters) {
      setYtActiveTab("chapters");
    }
  }, [item.id, item.transcript, item.chapters]);

  useEffect(() => {
    setShowWelcome(true);
    setFlashcardIdx(0);
    setIsFlipped(false);
  }, [item.id]);

  // Sync study notes
  const onSaveNotes = async (notesText: string) => {
    onUpdateItem({ ...item, notes: notesText });
    if (useRealBackend) {
      try {
        await fetch(`http://localhost:3001/api/items/${item.id}/notes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: notesText }),
        });
      } catch (e) {
        console.error("Notes auto-save failed in PostgreSQL.");
      }
    }
  };

  const handleDownloadNotes = () => {
    const blob = new Blob([item.notes || "No notes yet."], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${item.title.replace(/\s+/g, "_")}_Notes.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Notes downloaded successfully!");
  };

  // Video seeking control
  const seekVideo = (seconds: number) => {
    setVideoSeconds(seconds);
    if (iframeRef.current && item.videoId) {
      iframeRef.current.src = `https://www.youtube.com/embed/${item.videoId}?start=${seconds}&autoplay=1`;
      toast.info(`Seeking to ${Math.floor(seconds / 60)}m ${seconds % 60}s`);
    }
  };

  // Modify document texts
  const saveDocumentEdits = () => {
    const textData = generateMockTextContent(editTextVal);
    onUpdateItem({
      ...item,
      content: editTextVal,
      flashcards: textData.flashcards,
      quiz: textData.quiz,
    });
    setIsEditingText(false);
    toast.success("Document updated & flashcards regenerated!");
  };

  // NotebookLM Features
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [playingAudioIdx, setPlayingAudioIdx] = useState<number>(-1);
  const synth = window.speechSynthesis;

  // Podcast Configuration States
  const [podcastFormat, setPodcastFormat] = useState("two-hosts");
  const [podcastLanguage, setPodcastLanguage] = useState("English");
  const [podcastInstructions, setPodcastInstructions] = useState("");
  const [podcastDuration, setPodcastDuration] = useState("Medium (~10 mins)");
  const [podcastPages, setPodcastPages] = useState("All");
  
  // Hardcoded Edge TTS voices for our supported languages
  const edgeVoices = [
    { lang: "English", id: "en-US-AriaNeural", name: "Aria (Female)" },
    { lang: "English", id: "en-US-GuyNeural", name: "Guy (Male)" },
    { lang: "English", id: "en-GB-SoniaNeural", name: "Sonia (Female, UK)" },
    { lang: "Spanish", id: "es-ES-ElviraNeural", name: "Elvira (Female)" },
    { lang: "Spanish", id: "es-ES-AlvaroNeural", name: "Alvaro (Male)" },
    { lang: "French", id: "fr-FR-DeniseNeural", name: "Denise (Female)" },
    { lang: "French", id: "fr-FR-HenriNeural", name: "Henri (Male)" },
    { lang: "German", id: "de-DE-KatjaNeural", name: "Katja (Female)" },
    { lang: "German", id: "de-DE-ConradNeural", name: "Conrad (Male)" },
    { lang: "Japanese", id: "ja-JP-NanamiNeural", name: "Nanami (Female)" },
    { lang: "Japanese", id: "ja-JP-KeitaNeural", name: "Keita (Male)" },
    { lang: "Hindi", id: "hi-IN-SwaraNeural", name: "Swara (Female)" },
    { lang: "Hindi", id: "hi-IN-MadhurNeural", name: "Madhur (Male)" },
    { lang: "Telugu", id: "te-IN-ShrutiNeural", name: "Shruti (Female)" },
    { lang: "Telugu", id: "te-IN-MohanNeural", name: "Mohan (Male)" },
    { lang: "Tamil", id: "ta-IN-PallaviNeural", name: "Pallavi (Female)" },
    { lang: "Tamil", id: "ta-IN-ValluvarNeural", name: "Valluvar (Male)" },
    { lang: "Kannada", id: "kn-IN-SapnaNeural", name: "Sapna (Female)" },
    { lang: "Kannada", id: "kn-IN-GaganNeural", name: "Gagan (Male)" },
    { lang: "Malayalam", id: "ml-IN-SobhanaNeural", name: "Sobhana (Female)" },
    { lang: "Malayalam", id: "ml-IN-MidhunNeural", name: "Midhun (Male)" },
  ];

  const [voice1Name, setVoice1Name] = useState<string>("en-US-GuyNeural");
  const [voice2Name, setVoice2Name] = useState<string>("en-US-AriaNeural");
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Automatically switch default voices when language changes
  useEffect(() => {
    const langVoices = edgeVoices.filter(v => v.lang === podcastLanguage);
    if (langVoices.length > 0) {
      setVoice1Name(langVoices[0].id);
      if (langVoices.length > 1) {
        setVoice2Name(langVoices[1].id);
      } else {
        setVoice2Name(langVoices[0].id);
      }
    }
  }, [podcastLanguage]);

  const generatePodcast = async () => {
    if (!useRealBackend) return toast.error("Requires Postgres backend.");
    setIsGeneratingPodcast(true);
    toast.info("Generating AI Podcast. This takes 15-30 seconds...");
    try {
      const h1Name = edgeVoices.find(v => v.id === voice1Name)?.name?.split(" ")[0] || "Host 1";
      const h2Name = edgeVoices.find(v => v.id === voice2Name)?.name?.split(" ")[0] || "Host 2";

      const res = await fetch(`http://localhost:3001/api/items/${item.id}/podcast`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          language: podcastLanguage, 
          instructions: podcastInstructions, 
          format: podcastFormat,
          duration: podcastDuration,
          pages: podcastPages,
          host1Name: h1Name,
          host2Name: h2Name
        })
      });
      const data = await res.json();
      onUpdateItem({ ...item, audioScript: data.script });
      toast.success("AI Podcast generated successfully!");
    } catch (e) {
      toast.error("Failed to generate podcast.");
    }
    setIsGeneratingPodcast(false);
  };

  const playPodcast = async () => {
    if (!item.audioScript || item.audioScript.length === 0) return;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setPlayingAudioIdx(-1);
      return;
    }

    playNext();
  };

  const stopPodcast = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setPlayingAudioIdx(-1);
  };

  const downloadPodcastScript = () => {
    if (!item.audioScript) return;
    const text = item.audioScript.map(l => `${l.speaker}: ${l.text}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${item.title.replace(/\s+/g, "_")}_Podcast_Script.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Podcast script downloaded!");
  };

  const generateBriefing = async () => {
    if (!useRealBackend) return toast.error("Requires Postgres backend.");
    setIsGeneratingBriefing(true);
    toast.info("Generating Briefing Doc...");
    try {
      const res = await fetch(`http://localhost:3001/api/items/${item.id}/briefing`, { method: "POST" });
      const data = await res.json();
      onUpdateItem({ ...item, briefingDoc: data.briefing_doc });
      toast.success("Briefing Doc generated!");
    } catch (e) {
      toast.error("Failed to generate briefing.");
    }
    setIsGeneratingBriefing(false);
  };

  const pinMessage = async (content: string) => {
    if (!useRealBackend) return toast.error("Requires Postgres backend.");
    try {
      const res = await fetch(`http://localhost:3001/api/items/${item.id}/pins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const newPin = await res.json();
      const currentPins = item.pinnedNotes || [];
      onUpdateItem({ ...item, pinnedNotes: [...currentPins, newPin] });
      toast.success("Pinned to Noteboard!");
    } catch (e) {
      toast.error("Failed to pin message.");
    }
  };

  const deletePin = async (pinId: string) => {
    if (!useRealBackend) return;
    try {
      await fetch(`http://localhost:3001/api/items/${item.id}/pins/${pinId}`, { method: "DELETE" });
      const currentPins = item.pinnedNotes || [];
      onUpdateItem({ ...item, pinnedNotes: currentPins.filter(p => p.id !== pinId) });
      toast.success("Pin removed.");
    } catch (e) {
      toast.error("Failed to delete pin.");
    }
  };

  // Send query to assistant
  const onSendMessage = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = customQuery || chatInput;
    if (!query.trim()) return;

    const userMsg = { role: "user" as const, content: query };
    const updatedHistory = [...item.chatHistory, userMsg];
    
    onUpdateItem({
      ...item,
      chatHistory: updatedHistory,
    });
    setChatInput("");
    setIsBotTyping(true);

    if (useRealBackend) {
      try {
        const res = await fetch(`http://localhost:3001/api/items/${item.id}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: query }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setIsBotTyping(false);
        onUpdateItem({
          ...item,
          chatHistory: [...updatedHistory, { role: "assistant" as const, content: data.content }],
        });
      } catch (err) {
        setIsBotTyping(false);
        toast.error("Failed to query RAG backend service.");
      }
    } else {
      // Local Storage simulated fallback
      setTimeout(() => {
        const response = getSmartAgentResponse(query, item);
        setIsBotTyping(false);
        onUpdateItem({
          ...item,
          chatHistory: [...updatedHistory, { role: "assistant" as const, content: response }],
        });
      }, 1000);
    }
  };

  const currentFlashcard = item.flashcards[flashcardIdx] || { question: "No cards available", answer: "No cards", hint: "N/A" };

  return (
    <div className="flex h-screen flex-col bg-[#070707] text-white overflow-hidden">
      
      {/* Top Session bar matching screenshots */}
      <header className="flex h-16 items-center justify-between px-6 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
          
          <div className="h-4 w-px bg-white/15" />
          
          <div className="min-w-0 text-left">
            <h1 className="font-semibold text-sm truncate max-w-xs md:max-w-md">{item.title}</h1>
            <p className="text-[10px] text-white/40 truncate mt-0.5">
              {item.kind === "pdf" && item.fileName ? item.fileName : item.kind === "youtube" ? "YouTube Link Session" : item.kind === "website" ? "Website Link Session" : item.kind === "research" ? "Deep Research Dossier" : "Pasted Note Session"}
            </p>
          </div>
        </div>

        {/* Sync indicators */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 md:flex">
            <span className="text-xs text-white/40 select-none">Source Code Progress:</span>
            <div className="flex items-center gap-1 rounded bg-[#101010] border border-white/5 px-2.5 py-1 text-xs">
              <span className="font-mono text-orange-400 font-semibold">
                {item.kind === "pdf" ? item.fileName : item.kind === "youtube" ? "Youtube-Lecture" : "Knowledge-Base"}
              </span>
              <span className="text-white/40">1/1</span>
              <span className="text-[10px] bg-green-500/25 border border-green-500/10 px-1 rounded text-green-300 text-[9px] uppercase font-bold tracking-wider">Sync</span>
            </div>
            
            {useRealBackend && (
              <span className="text-[9px] font-bold uppercase text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/10 ml-2 animate-pulse">
                RAG Active
              </span>
            )}
          </div>
        </div>
      </header>

      {/* TWO PANEL SPLIT-SCREEN WORKSPACE */}
      <div className="flex flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        
        {/* LEFT COLUMN: SOURCE VIEW PANEL */}
        <div className="flex flex-col border-r border-white/10 bg-[#0c0c0c] overflow-hidden">
          
          {/* PDF HEADER CONTROLS */}
          {item.kind === "pdf" && (
            <div className="flex items-center justify-between border-b border-white/5 bg-black/30 px-4 py-2 text-xs text-white/60">
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white/5 rounded-full p-0.5 border border-white/10 shrink-0">
                  <button
                    onClick={() => setPdfViewMode("original")}
                    className={`rounded-full px-2.5 py-1 transition-all text-[10px] font-semibold ${pdfViewMode === "original" ? "bg-white text-black" : "text-white/60 hover:text-white"}`}
                  >
                    Original PDF
                  </button>
                  <button
                    onClick={() => setPdfViewMode("text")}
                    className={`rounded-full px-2.5 py-1 transition-all text-[10px] font-semibold ${pdfViewMode === "text" ? "bg-white text-black" : "text-white/60 hover:text-white"}`}
                  >
                    Extracted Text
                  </button>
                </div>
                {pdfViewMode === "text" && (
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="rounded p-1 hover:bg-white/5 hover:text-white" title="Zoom Out"><ZoomOut className="h-3.5 w-3.5" /></button>
                    <span className="font-mono text-[10px]">{zoom}%</span>
                    <button onClick={() => setZoom(Math.min(150, zoom + 10))} className="rounded p-1 hover:bg-white/5 hover:text-white" title="Zoom In"><ZoomIn className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleTTS}
                  className={`flex items-center gap-1 rounded px-2 py-1 transition-all ${isSpeaking ? "bg-orange-500/20 text-orange-400 border border-orange-500/20 font-semibold" : "hover:bg-white/5 hover:text-white"}`}
                  title="Read Aloud"
                >
                  <Volume2 className={`h-3.5 w-3.5 ${isSpeaking ? "animate-bounce" : ""}`} />
                  <span>{isSpeaking ? "Reading..." : "Read PDF"}</span>
                </button>
                <div className="h-3 w-px bg-white/10" />
                <button onClick={() => setPdfDarkMode(!pdfDarkMode)} className="flex items-center gap-1 rounded px-2 py-1 hover:bg-white/5 hover:text-white transition-colors" title="Toggle Reader Mode">
                  {pdfDarkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                  <span>{pdfDarkMode ? "Light mode" : "Dark Mode"}</span>
                </button>
              </div>
            </div>
          )}

          {/* WEB BROWSER HEADER CONTROLS */}
          {item.kind === "website" && (
            <div className="flex items-center justify-between border-b border-white/5 bg-black/40 px-4 py-2 text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
                <div className="flex gap-1.5 shrink-0">
                  <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                </div>
                <div className="flex items-center gap-1.5 rounded bg-black/40 border border-white/5 px-3 py-1 font-mono text-[10px] text-white/50 truncate flex-1 max-w-lg">
                  <Globe className="h-3 w-3 text-blue-400 shrink-0" />
                  <span className="truncate">{item.youtubeUrl || "https://scraped-page.domain/source"}</span>
                </div>
              </div>
              <a href={item.youtubeUrl || "#"} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-white/50 hover:text-white">
                <span>Visit Web</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* EDIT DOCUMENT CONTROLS */}
          {item.kind === "text" && (
            <div className="flex items-center justify-between border-b border-white/5 bg-black/30 px-4 py-2 text-xs text-white/60">
              <span className="font-medium text-white/80">Text Node Document Viewer</span>
              <button
                onClick={() => {
                  if (isEditingText) {
                    saveDocumentEdits();
                  } else {
                    setEditTextVal(item.content || "");
                    setIsEditingText(true);
                  }
                }}
                className="flex items-center gap-1 rounded bg-white/5 border border-white/10 px-3 py-1 text-white hover:bg-white/10"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>{isEditingText ? "Save Changes" : "Edit Document"}</span>
              </button>
            </div>
          )}

          {/* DEEP RESEARCH HEADER CONTROLS */}
          {item.kind === "research" && (
            <div className="flex items-center justify-between border-b border-white/5 bg-black/30 px-4 py-2 text-xs text-white/60">
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Research Agent Dossier</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-500/25 border border-emerald-500/20 px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider text-emerald-300">
                  Synthesized Paper
                </span>
              </div>
            </div>
          )}

          {/* CONTENT SCROLLABLE INNER VIEWPORT */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            
            {/* 1. PDF VIEW TYPE */}
            {item.kind === "pdf" && (() => {
              // Priority: 1) In-memory blob URL (just uploaded), 2) localFileUrl (simulated mode),
              // 3) URL-encoded static server path (previously uploaded & saved to disk)
              const staticServerUrl = item.fileName
                ? `http://localhost:3001/uploads/${encodeURIComponent(item.id + "_" + item.fileName)}`
                : null;
              const basePdfSrc = pdfBlobUrl || item.localFileUrl || staticServerUrl;
              const pdfSrc = basePdfSrc ? (pdfPageNum ? `${basePdfSrc}#page=${pdfPageNum}` : basePdfSrc) : null;
              const isPdf = item.fileName?.toLowerCase().endsWith(".pdf") ?? true;

              return pdfViewMode === "original" ? (
                pdfSrc ? (
                  isPdf ? (
                    <div className="w-full h-full min-h-[calc(100vh-10rem)] rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-white flex flex-col">
                      <div className="flex items-center gap-3 bg-black/60 border-b border-white/10 px-4 py-2 text-xs text-white/60">
                        <span className="flex-1 font-mono truncate text-white/40">{item.fileName} {pdfPageNum ? `(Page ${pdfPageNum})` : ""}</span>
                        {pdfPageNum && (
                          <button onClick={() => setPdfPageNum(null)} className="flex items-center gap-1 rounded bg-white/10 hover:bg-white/20 px-2.5 py-1 text-white transition-colors mr-2">
                            Clear Page Jump
                          </button>
                        )}
                        <a href={basePdfSrc || undefined} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded bg-white/10 hover:bg-white/20 px-2.5 py-1 text-white transition-colors">
                          <ExternalLink className="h-3 w-3" />
                          <span>Open in new tab</span>
                        </a>
                      </div>
                      <iframe key={pdfSrc} src={pdfSrc} className="flex-1 w-full border-0 bg-white min-h-[calc(100vh-14rem)]" title="PDF Viewer" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-60 text-center px-6 pt-20">
                      <FileText className="h-12 w-12 mb-4" />
                      <p className="text-sm font-bold">Preview not available</p>
                      <p className="text-xs mt-2 mb-4">This file type ({item.fileName?.split('.').pop()}) cannot be previewed in the browser.</p>
                      <a href={basePdfSrc || undefined} download target="_blank" rel="noopener noreferrer" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                        Download File
                      </a>
                    </div>
                  )
                ) : (
                  // No file URL available — show a helpful message
                  <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-white/10 text-white/40 gap-3">
                    <FileText className="h-12 w-12 text-white/20" />
                    <p className="text-sm">Original PDF not available for preview.</p>
                    <p className="text-xs text-white/30">Switch to "Extracted Text" to read the content, or re-upload this file.</p>
                  </div>
                )
              ) : (
                <div
                  className="mx-auto rounded-lg shadow-2xl transition-all duration-300 border border-white/5 max-w-2xl p-8 md:p-12 text-left font-sans"
                  style={{
                    width: `${zoom}%`,
                    backgroundColor: pdfDarkMode ? "#1e1e1e" : "#ffffff",
                    color: pdfDarkMode ? "#e0e0e0" : "#000000",
                  }}
                >
                {(item.content || "").includes("Kalasalingam") ? (
                  // Structured template view for default sample PDF
                  <>
                    <div className="border-b-2 border-black/10 pb-6 mb-8 text-center" style={{ borderColor: pdfDarkMode ? "#333" : "#eaeaea" }}>
                      <h2 className="font-display text-4xl font-semibold tracking-tight">Kalasalingam Academy</h2>
                      <p className="text-xs uppercase tracking-widest text-black/50 mt-1" style={{ color: pdfDarkMode ? "#888" : "#666" }}>Deemed To Be University</p>
                      <p className="mt-4 font-mono text-[10px] bg-black/[0.05] inline-block px-3 py-1 rounded" style={{ backgroundColor: pdfDarkMode ? "#333" : "#f5f5f5" }}>
                        Course: 213MEC2313 • Professional Elective
                      </p>
                    </div>

                    <div className="prose prose-sm max-w-none">
                      <h1 className="font-display text-3xl font-bold leading-tight border-b pb-2" style={{ borderColor: pdfDarkMode ? "#333" : "#eee" }}>
                        Industrial Automation &amp; Control
                      </h1>
                      
                      <div className="mt-6 space-y-6 text-left">
                        <div>
                          <h3 className="font-bold text-lg text-orange-600">1. Definition of Automation</h3>
                          <p className="mt-2 text-sm leading-relaxed" style={{ color: pdfDarkMode ? "#b0b0b0" : "#333" }}>
                            Industrial automation represents the application of mechanical, electronic, and computer-based systems to operate and control production systems. It eliminates repetitive routines and maximizes quality levels.
                          </p>
                        </div>

                        <div className="my-6 rounded p-4 border" style={{ backgroundColor: pdfDarkMode ? "#252525" : "#fafafa", borderColor: pdfDarkMode ? "#333" : "#eaeaea" }}>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-black/50" style={{ color: pdfDarkMode ? "#aaa" : "#555" }}>PLC Logic Processor Brain</h4>
                          <p className="text-xs mt-1 leading-relaxed">
                            Programmable Logic Controllers (PLCs) represent the primary microprocessor element. They scan sensor inputs continuously, run programmed mathematical calculations or Boolean logic decisions, and write direct command loops back to actuators.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-bold text-lg text-orange-600">2. Automation Hierarchy Levels</h3>
                          <ul className="mt-2 space-y-2 text-sm list-disc pl-5" style={{ color: pdfDarkMode ? "#b0b0b0" : "#333" }}>
                            <li><b>Enterprise Level</b>: Managing corporate databases (ERP system integration).</li>
                            <li><b>Supervisory Level</b>: Graphical computer nodes monitor plant metrics (SCADA dashboards).</li>
                            <li><b>Control Level</b>: Computes logic loops locally (PLCs, digital PID control microcontrollers).</li>
                            <li><b>Field Level</b>: Sensing raw attributes and executing operations physically (Sensors &amp; Actuators).</li>
                          </ul>
                        </div>

                        <div className="mt-8 border-t pt-4 text-center text-[10px]" style={{ borderColor: pdfDarkMode ? "#333" : "#eaeaea", color: pdfDarkMode ? "#666" : "#aaa" }}>
                          Page 1 of 1 • Industrial_Automation_Unit1_Notes.pdf
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  // Dynamic, clean text rendering for your actual uploaded PDFs
                  <>
                    <div className="border-b pb-4 mb-6 flex justify-between items-center" style={{ borderColor: pdfDarkMode ? "#333" : "#eaeaea" }}>
                      <div>
                        <span className="rounded bg-red-600 px-2.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">PDF Document</span>
                        <h2 className="text-xl font-bold tracking-tight mt-1">{item.fileName || "Uploaded Document"}</h2>
                      </div>
                      <span className="text-[10px] opacity-60">Source File</span>
                    </div>

                    <div className="prose prose-sm max-w-none">
                      {item.content ? (
                        <div className="space-y-4 whitespace-pre-wrap leading-relaxed text-sm text-left">
                          {item.content}
                        </div>
                      ) : (
                        <p className="text-sm opacity-50 italic text-left">No text content available in database.</p>
                      )}
                    </div>

                    <div className="mt-8 border-t pt-4 text-center text-[10px] opacity-40" style={{ borderColor: pdfDarkMode ? "#333" : "#eaeaea" }}>
                      {item.fileName || "Document"}
                    </div>
                  </>
                )}
              </div>
            )})()}


            {/* 2. YOUTUBE VIEW TYPE */}
            {item.kind === "youtube" && (
              <div className="max-w-2xl mx-auto flex flex-col gap-4">
                <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                  {item.videoId ? (
                    <iframe
                      ref={iframeRef}
                      src={`https://www.youtube.com/embed/${item.videoId}?enablejsapi=1`}
                      title="YouTube player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full border-0"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
                      <PlayCircle className="h-16 w-16 text-white/20 mb-2" />
                      <p>Invalid YouTube Video URL</p>
                    </div>
                  )}
                </div>

                {((item.chapters && item.chapters.length > 0) || (item.transcript && item.transcript.length > 0)) && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    {/* Only show tab headers if BOTH are available */}
                    {item.chapters && item.chapters.length > 0 && item.transcript && item.transcript.length > 0 && (
                      <div className="flex border-b border-white/10 pb-2 mb-4">
                        <button
                          onClick={() => setYtActiveTab("transcripts")}
                          className={`flex-1 pb-2 text-center text-xs font-semibold uppercase tracking-wider transition-colors ${
                            ytActiveTab === "transcripts" ? "border-b border-orange-500 text-white" : "text-white/40 hover:text-white"
                          }`}
                        >
                          Transcripts
                        </button>
                        <button
                          onClick={() => setYtActiveTab("chapters")}
                          className={`flex-1 pb-2 text-center text-xs font-semibold uppercase tracking-wider transition-colors ${
                            ytActiveTab === "chapters" ? "border-b border-orange-500 text-white" : "text-white/40 hover:text-white"
                          }`}
                        >
                          Chapters
                        </button>
                      </div>
                    )}

                    {/* Render Chapters if active (or if it's the only one available) */}
                    {(ytActiveTab === "chapters" || !(item.transcript && item.transcript.length > 0)) && item.chapters && item.chapters.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                        {item.chapters.map((chap, idx) => (
                          <button
                            key={idx}
                            onClick={() => seekVideo(chap.seconds)}
                            className="flex w-full items-center justify-between rounded-lg bg-white/[0.02] border border-white/5 p-3 text-left text-xs transition-all hover:bg-white/5 hover:border-white/10"
                          >
                            <span className="font-semibold text-white/80">{chap.title}</span>
                            <span className="font-mono text-orange-400 text-[10px] rounded bg-white/5 px-2 py-0.5">{chap.time}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Render Transcript if active (or if it's the only one available) */}
                    {(ytActiveTab === "transcripts" || !(item.chapters && item.chapters.length > 0)) && item.transcript && item.transcript.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 rounded-lg bg-black/40 border border-white/5 px-3 py-1.5">
                          <Search className="h-3.5 w-3.5 text-white/40" />
                          <input
                            value={transcriptSearch}
                            onChange={(e) => setTranscriptSearch(e.target.value)}
                            placeholder="Search lines in transcript..."
                            className="w-full bg-transparent text-xs text-white placeholder:text-white/30 outline-none"
                          />
                        </div>

                        <div className="space-y-1 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                          {item.transcript
                            .filter((line) => line.text.toLowerCase().includes(transcriptSearch.toLowerCase()))
                            .map((line, idx) => (
                              <div
                                key={idx}
                                onClick={() => seekVideo(line.seconds)}
                                className="group flex gap-3 cursor-pointer rounded px-2.5 py-1.5 hover:bg-white/5 transition-all text-xs border border-transparent hover:border-white/5"
                              >
                                <span className="font-mono text-orange-400 group-hover:text-orange-300 font-semibold shrink-0 select-none">
                                  {line.time}
                                </span>
                                <span className="text-white/70 group-hover:text-white leading-relaxed text-left">{line.text}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. WEBSITE VIEW TYPE */}
            {item.kind === "website" && (
              <div className="max-w-2xl mx-auto rounded-xl border border-white/10 bg-[#080808] p-8 shadow-inner text-left">
                <article className="prose prose-invert prose-sm max-w-none text-left">
                  {(item.content || "").split("\n").map((line, idx) => {
                    if (line.startsWith("Title: ")) {
                      return <h1 key={idx} className="font-display text-4xl font-bold tracking-tight text-white mb-6 border-b border-white/10 pb-4">{line.replace("Title: ", "")}</h1>;
                    }
                    if (line.startsWith("Overview:") || line.startsWith("Key Findings:") || line.startsWith("Conclusion:")) {
                      return <h3 key={idx} className="text-lg font-bold text-blue-400 mt-6 mb-2 tracking-wide uppercase text-xs font-mono">{line}</h3>;
                    }
                    if (line.startsWith("- ") || line.startsWith("1. ") || line.startsWith("2. ") || line.startsWith("3. ") || line.startsWith("4. ")) {
                      return <p key={idx} className="text-sm text-white/80 leading-relaxed my-2 ml-4 list-item">{line.replace(/^[-1234]\.\s+/, "")}</p>;
                    }
                    if (line.trim() === "") return <div key={idx} className="h-3" />;
                    return <p key={idx} className="text-sm text-white/70 leading-relaxed my-2">{line}</p>;
                  })}
                </article>
              </div>
            )}

            {/* 4. PLAIN TEXT VIEW TYPE */}
            {item.kind === "text" && (
              <div className="max-w-2xl mx-auto">
                {isEditingText ? (
                  <div className="rounded-xl border border-white/15 bg-black/60 p-4">
                    <textarea
                      value={editTextVal}
                      onChange={(e) => setEditTextVal(e.target.value)}
                      rows={14}
                      className="w-full rounded-lg border border-white/10 bg-white/[0.02] p-4 font-mono text-sm leading-relaxed text-white focus:border-white/20 focus:outline-none"
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <button onClick={() => setIsEditingText(false)} className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-white/60 hover:bg-white/5 hover:text-white">Cancel</button>
                      <button onClick={saveDocumentEdits} className="rounded-full bg-white px-5 py-1.5 text-xs font-semibold text-black hover:bg-white/95">Save &amp; Parse</button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-[#080808] p-8 shadow-inner text-left">
                    <p className="text-xs text-white/40 font-mono mb-4 border-b border-white/5 pb-2">Notes Contents</p>
                    <div className="whitespace-pre-wrap text-base font-sans leading-relaxed text-white/80">{item.content}</div>
                  </div>
                )}
              </div>
            )}

            {/* 5. DEEP RESEARCH VIEW TYPE */}
            {item.kind === "research" && (
              <div className="max-w-2xl mx-auto rounded-xl border border-white/10 bg-[#080808] p-8 shadow-inner text-left font-serif">
                <article className="prose prose-invert prose-sm max-w-none text-white/80 text-left">
                  {(item.content || "").split("\n").map((line, idx) => {
                    if (line.startsWith("# ")) {
                      return <h1 key={idx} className="font-display text-4xl font-bold tracking-tight text-white mb-6 border-b border-white/10 pb-4">{line.replace("# ", "")}</h1>;
                    }
                    if (line.startsWith("## ")) {
                      return <h2 key={idx} className="text-xl font-bold text-emerald-400 mt-8 mb-3 tracking-wide">{line.replace("## ", "")}</h2>;
                    }
                    if (line.startsWith("- ")) {
                      return (
                        <li key={idx} className="text-sm text-white/70 leading-relaxed my-1 list-none flex items-start gap-2">
                          <span className="text-emerald-500 mt-1 shrink-0">•</span>
                          <span>{line.replace("- ", "")}</span>
                        </li>
                      );
                    }
                    if (line.startsWith("|")) {
                      const cells = line.split("|").filter((c) => c.trim() !== "");
                      if (cells[0].includes("---")) return null;
                      return (
                        <div key={idx} className="grid grid-cols-3 gap-2 border-b border-white/5 py-2 text-xs font-mono">
                          {cells.map((c, i) => (
                            <span key={i} className={idx === 14 ? "font-bold text-white/60 uppercase" : "text-white/80"}>{c.trim()}</span>
                          ))}
                        </div>
                      );
                    }
                    if (line.trim() === "---") return <hr key={idx} className="my-6 border-t border-white/10" />;
                    if (line.trim() === "") return <div key={idx} className="h-3" />;
                    return <p key={idx} className="text-sm leading-relaxed my-2 text-white/75">{line}</p>;
                  })}
                </article>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT COLUMN: AI AGENT TOOLS PANEL */}
        <div className="flex flex-col bg-[#080808] overflow-hidden">
          
          <div className="flex items-center justify-between border-b border-white/10 bg-[#090909]/70 px-4 py-3 shrink-0">
            <div className="flex rounded-full bg-white/5 p-1 text-xs">
              <button
                onClick={() => {
                  setQuizActive(false);
                  setActiveTab("tutor");
                }}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-all ${
                  activeTab === "tutor" && !quizActive ? "bg-white text-black font-semibold shadow" : "text-white/60 hover:text-white"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Tutor</span>
              </button>
              
              <button
                onClick={() => {
                  setQuizActive(false);
                  setActiveTab("chat");
                  setShowWelcome(false);
                }}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-all ${
                  activeTab === "chat" ? "bg-white text-black font-semibold shadow" : "text-white/60 hover:text-white"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Chat</span>
              </button>

              <button
                onClick={() => {
                  setQuizActive(false);
                  setActiveTab("notes");
                  setShowWelcome(false);
                }}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-all ${
                  activeTab === "notes" ? "bg-white text-black font-semibold shadow" : "text-white/60 hover:text-white"
                }`}
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Notes</span>
              </button>
              <button
                onClick={() => {
                  setQuizActive(false);
                  setActiveTab("pins");
                  setShowWelcome(false);
                }}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-all ${
                  activeTab === "pins" ? "bg-white text-black font-semibold shadow" : "text-white/60 hover:text-white"
                }`}
              >
                <Pin className="h-3.5 w-3.5" />
                <span>Noteboard</span>
              </button>

              <button
                onClick={() => {
                  setQuizActive(false);
                  setActiveTab("briefing");
                  setShowWelcome(false);
                }}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-all ${
                  activeTab === "briefing" ? "bg-white text-black font-semibold shadow" : "text-white/60 hover:text-white"
                }`}
              >
                <FileStack className="h-3.5 w-3.5" />
                <span>Briefing</span>
              </button>
              <button
                onClick={() => {
                  setQuizActive(false);
                  setActiveTab("podcast");
                  setShowWelcome(false);
                }}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-all ${
                  activeTab === "podcast" ? "bg-white text-black font-semibold shadow" : "text-white/60 hover:text-white"
                }`}
              >
                <Headphones className="h-3.5 w-3.5" />
                <span>Podcast</span>
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest select-none font-bold hidden xl:block">Notebook LM Agent</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            
            {/* A. TUTOR ACTIVE RECALL TAB */}
            {activeTab === "tutor" && (
              <div className="h-full flex flex-col justify-between">
                
                {showWelcome ? (
                  /* BEAUTIFUL WELCOME STUDY LOBBY */
                  <div className="h-full flex flex-col justify-center items-center text-center py-4 px-2">
                    <div className="space-y-3 mb-8">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-orange-400 uppercase font-bold bg-orange-500/10 border border-orange-500/20 px-3.5 py-1.5 rounded-full select-none shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        <span>AI Tutor Active</span>
                      </span>
                      <h2 className="text-3xl font-display font-bold tracking-tight text-white mt-4">Pick a study session</h2>
                      <p className="text-xs text-white/50 max-w-sm mx-auto leading-relaxed">
                        Start from a single source or learn across everything that is ready right now.
                      </p>
                    </div>

                    {/* Study Options Grid */}
                    <div className="w-full max-w-md space-y-3">
                      {/* Option 1: Flashcards Card */}
                      <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/10 to-amber-600/5 p-5 text-left transition-all hover:border-orange-500/30 hover:scale-[1.01] shadow-lg backdrop-blur-md">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-orange-500/5 rounded-full blur-xl group-hover:bg-orange-500/10 transition-all" />
                        <div className="flex justify-between items-center gap-4">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/10 font-mono">Active Recall</span>
                            <h3 className="font-bold text-white text-sm leading-snug truncate mt-1.5">{item.title}</h3>
                            <p className="text-[11px] text-white/50 font-mono">
                              {item.flashcards.length} Flashcards ready for review
                            </p>
                          </div>
                          <button
                            onClick={() => setShowWelcome(false)}
                            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-95 shrink-0 group-hover:shadow-orange-500/30 hover:brightness-110"
                          >
                            <span>Start</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Option 2: Practice Quiz Card */}
                      <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-purple-600/5 p-5 text-left transition-all hover:border-indigo-500/30 hover:scale-[1.01] shadow-lg backdrop-blur-md">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all" />
                        <div className="flex justify-between items-center gap-4">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/10 font-mono">Knowledge Test</span>
                            <h3 className="font-bold text-white text-sm leading-snug truncate mt-1.5">Socratic Practice Quiz</h3>
                            <p className="text-[11px] text-white/50 font-mono">
                              {item.quiz.length} Multiple-choice questions
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setShowWelcome(false);
                              setQuizActive(true);
                            }}
                            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95 shrink-0 group-hover:shadow-indigo-500/30 hover:brightness-110"
                          >
                            <span>Quiz</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Option 3: Chat Card */}
                      <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-teal-500/10 to-emerald-600/5 p-5 text-left transition-all hover:border-teal-500/30 hover:scale-[1.01] shadow-lg backdrop-blur-md">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-teal-500/5 rounded-full blur-xl group-hover:bg-teal-500/10 transition-all" />
                        <div className="flex justify-between items-center gap-4">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <span className="text-[10px] font-semibold text-teal-400 uppercase tracking-widest bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/10 font-mono">Q&A Chat</span>
                            <h3 className="font-bold text-white text-sm leading-snug truncate mt-1.5">Interactive AI Tutor</h3>
                            <p className="text-[11px] text-white/50 font-mono">
                              Ask page-specific RAG questions
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setShowWelcome(false);
                              setActiveTab("chat");
                            }}
                            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-teal-500/20 transition-all active:scale-95 shrink-0 group-hover:shadow-teal-500/30 hover:brightness-110"
                          >
                            <span>Chat</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : quizActive ? (
                  /* QUIZ MODE */
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                        <h3 className="font-semibold text-white">Interactive Practice Quiz</h3>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setShowWelcome(true)}
                            className="text-xs text-white/40 hover:text-white transition-colors"
                          >
                            Study Lobby
                          </button>
                          <button
                            onClick={() => setQuizActive(false)}
                            className="text-xs text-orange-400 hover:text-orange-300 font-semibold"
                          >
                            Back to Flashcards
                          </button>
                        </div>
                      </div>

                      <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
                        {item.quiz.map((q, qIdx) => {
                          const isAnswered = quizAnswers[qIdx] !== undefined;
                          const selectedAnswer = quizAnswers[qIdx];
                          return (
                            <div key={qIdx} className="rounded-xl border border-white/5 bg-white/[0.01] p-5 text-left">
                              <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">Question {qIdx + 1}</span>
                              <p className="mt-1 text-sm font-medium leading-relaxed">{q.question}</p>
                              
                              <div className="mt-4 space-y-2">
                                {q.options.map((opt, optIdx) => {
                                  let btnClass = "border-white/5 bg-white/[0.02] hover:bg-white/5 text-white/80";
                                  if (isAnswered) {
                                    if (optIdx === q.answer) {
                                      btnClass = "bg-green-500/20 border-green-500/35 text-green-300";
                                    } else if (selectedAnswer === optIdx) {
                                      btnClass = "bg-red-500/20 border-red-500/35 text-red-300";
                                    } else {
                                      btnClass = "border-white/5 bg-white/[0.01] text-white/30 cursor-default";
                                    }
                                  }
                                  return (
                                    <button
                                      key={optIdx}
                                      disabled={isAnswered}
                                      onClick={() => setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))}
                                      className={`w-full rounded-lg border p-3.5 text-left text-xs font-medium transition-all ${btnClass}`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>

                              {isAnswered && (
                                <div className="mt-4 rounded-lg bg-[#141414] border border-white/5 p-3.5 text-xs text-white/60 leading-relaxed text-left">
                                  <span className="font-bold text-white block mb-1">Explanation:</span>
                                  {q.explanation}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {Object.keys(quizAnswers).length === item.quiz.length && (
                      <div className="mt-10 rounded-xl bg-orange-500/10 border border-orange-500/20 p-5 text-center">
                        <h4 className="font-bold text-white text-base">Quiz Completed!</h4>
                        <p className="text-xs text-white/60 mt-1">You scored {item.quiz.filter((q, idx) => quizAnswers[idx] === q.answer).length} out of {item.quiz.length}</p>
                        <button onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); }} className="mt-4 rounded-full bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-white/90">Restart Practice</button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* FLASHCARD MODE */
                  <div className="flex flex-col h-full justify-between gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => setShowWelcome(true)}
                          className="text-xs text-white/40 hover:text-white flex items-center gap-1.5 font-semibold transition-colors"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          <span>Study Lobby</span>
                        </button>
                        <span className="text-[10px] text-white/30 font-mono">Flashcards Ready</span>
                      </div>

                      <p className="text-xs text-white/50 text-left">Here are some flashcards to help you remember:</p>
                      
                      <div className="mt-3 flex gap-1">
                        {item.flashcards.map((_, idx) => (
                          <div key={idx} className={`h-1 flex-1 rounded-full transition-all duration-300 ${idx === flashcardIdx ? "bg-orange-500" : "bg-white/10"}`} />
                        ))}
                      </div>

                      <div className="mt-6 perspective-1000">
                        <div
                          onClick={() => setIsFlipped(!isFlipped)}
                          className={`relative h-64 w-full cursor-pointer transition-transform duration-500 transform-style-3d ${isFlipped ? "rotate-y-180" : ""}`}
                        >
                          {/* Front */}
                          <div className="absolute inset-0 backface-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-8 flex flex-col justify-between shadow-lg backdrop-blur-md">
                            <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-widest font-mono text-left">Question {flashcardIdx + 1} of {item.flashcards.length}</span>
                            <div className="text-center my-auto">
                              <p className="text-base font-semibold leading-snug text-white/95">{currentFlashcard.question}</p>
                            </div>
                            <span className="text-[10px] text-white/35 font-medium uppercase tracking-wider">tap to reveal</span>
                          </div>

                          {/* Back */}
                          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl border border-white/15 bg-[#121212] p-8 flex flex-col justify-between shadow-2xl">
                            <span className="text-[10px] font-semibold text-green-400 uppercase tracking-widest font-mono text-left">Answer revealed</span>
                            <div className="overflow-y-auto my-auto pr-1 text-left scrollbar-thin">
                              <p className="text-sm leading-relaxed text-white/90">{currentFlashcard.answer}</p>
                              {currentFlashcard.hint && (
                                <p className="mt-3 text-xs italic text-white/40 leading-relaxed">💡 {currentFlashcard.hint}</p>
                              )}
                            </div>
                            <span className="text-[10px] text-white/35">Click card to show question</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => {
                            setFlashcardLog((prev) => ({ ...prev, [flashcardIdx]: "review" }));
                            toast.info("Marked for review");
                            if (flashcardIdx < item.flashcards.length - 1) {
                              setIsFlipped(false);
                              setTimeout(() => setFlashcardIdx(flashcardIdx + 1), 200);
                            }
                          }}
                          className={`flex-1 flex justify-center items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition-all ${flashcardLog[flashcardIdx] === "review" ? "bg-red-500/15 border-red-500/30 text-red-300" : "border-white/10 hover:bg-white/5 text-white/80"}`}
                        >
                          Review later
                        </button>
                        <button
                          onClick={() => {
                            setFlashcardLog((prev) => ({ ...prev, [flashcardIdx]: "got" }));
                            toast.success("Mastered!");
                            if (flashcardIdx < item.flashcards.length - 1) {
                              setIsFlipped(false);
                              setTimeout(() => setFlashcardIdx(flashcardIdx + 1), 200);
                            }
                          }}
                          className={`flex-1 flex justify-center items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition-all ${flashcardLog[flashcardIdx] === "got" ? "bg-green-500/15 border-green-500/30 text-green-300" : "border-white/10 hover:bg-white/5 text-white/80"}`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Got it!</span>
                        </button>
                      </div>

                      <div className="mt-6 flex items-center justify-between">
                        <button disabled={flashcardIdx === 0} onClick={() => { setIsFlipped(false); setTimeout(() => setFlashcardIdx(flashcardIdx - 1), 150); }} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"><ChevronLeft className="h-5 w-5" /></button>
                        <button onClick={() => { setIsFlipped(false); toast.info("Reset flashcards"); }} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"><RotateCcw className="h-4 w-4" /></button>
                        <button disabled={flashcardIdx === item.flashcards.length - 1} onClick={() => { setIsFlipped(false); setTimeout(() => setFlashcardIdx(flashcardIdx + 1), 150); }} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"><ChevronRight className="h-5 w-5" /></button>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-6 text-center">
                      <button onClick={() => setQuizActive(true)} className="inline-flex items-center gap-1.5 rounded-full bg-white px-6 py-2.5 text-xs font-semibold text-black hover:bg-white/95"><Sparkles className="h-3.5 w-3.5 text-orange-500 fill-orange-500" /><span>Start Practice Quiz</span></button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* B. CHAT TAB */}
            {activeTab === "chat" && (
              <div className="h-full flex flex-col justify-between min-h-[350px]">
                <div className="space-y-4 flex-1 overflow-y-auto mb-4 pr-1 scrollbar-thin">
                  {item.chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 text-xs leading-relaxed ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && <div className="h-6 w-6 shrink-0 rounded-full bg-[#4a2a1f] flex items-center justify-center font-bold text-[10px] text-orange-200 border border-orange-800/40 select-none">AI</div>}
                      <div className={`rounded-2xl border px-4 py-3 max-w-[85%] text-left ${msg.role === "user" ? "bg-white/[0.04] border-white/10 text-white rounded-tr-none" : "bg-[#111111] border-white/5 text-white/90 rounded-tl-none"}`}>
                        {msg.role === "assistant" ? (
                          <div className="space-y-2 relative group/msg">
                            <button 
                              onClick={() => pinMessage(msg.content)}
                              className="absolute -top-2 -right-2 bg-black/50 p-1.5 rounded-full text-white/40 hover:text-orange-400 hover:bg-white/10 opacity-0 group-hover/msg:opacity-100 transition-all border border-white/10"
                              title="Pin to Noteboard"
                            >
                              <Pin className="h-3 w-3" />
                            </button>
                            {msg.content.split("\n").map((line, lidx) => {
                              const renderBold = (str: string) => {
                                return str.split(/(\*\*.*?\*\*)/g).map((p, j) => {
                                  if (p.startsWith("**") && p.endsWith("**")) {
                                    return <strong key={j} className="font-semibold text-white/95">{p.slice(2, -2)}</strong>;
                                  }
                                  return <span key={j}>{p}</span>;
                                });
                              };
                              const renderLine = (text: string) => {
                                const parts = text.split(/(\[Page \d+\])/g);
                                return parts.map((part, i) => {
                                  const match = part.match(/\[Page (\d+)\]/);
                                  if (match) {
                                    return (
                                      <button 
                                        key={i} 
                                        onClick={() => setPdfPageNum(parseInt(match[1]))}
                                        className="mx-1 align-baseline inline-flex items-center gap-1 bg-white/5 hover:bg-white/15 border border-white/5 text-white/40 hover:text-white text-[9px] rounded-full px-1.5 py-0.5 transition-all"
                                        title={`Jump to Page ${match[1]}`}
                                      >
                                        <BookOpen className="h-3 w-3" />
                                        <span>{match[1]}</span>
                                      </button>
                                    );
                                  }
                                  return <span key={i}>{renderBold(part)}</span>;
                                });
                              };
                              
                              let processedLine = line;
                              if (processedLine.startsWith("### ")) return <h4 key={lidx} className="font-bold text-white text-xs mt-2 uppercase tracking-wide text-orange-400">{renderLine(processedLine.replace("### ", ""))}</h4>;
                              if (processedLine.startsWith("- ") || processedLine.startsWith("* ")) return <li key={lidx} className="list-disc pl-4 text-white/70 ml-1">{renderLine(processedLine.replace(/^[-*]\s+/, ""))}</li>;
                              return <p key={lidx} className="mb-2 last:mb-0">{renderLine(processedLine)}</p>;
                            })}
                          </div>
                        ) : <p>{msg.content}</p>}
                      </div>
                    </div>
                  ))}

                  {isBotTyping && (
                    <div className="flex gap-3 text-xs justify-start items-center">
                      <div className="h-6 w-6 shrink-0 rounded-full bg-[#4a2a1f] flex items-center justify-center font-bold text-[10px] text-orange-200 border border-orange-800/40 select-none animate-pulse">AI</div>
                      <div className="rounded-2xl border border-white/5 bg-[#111111] px-4 py-3 text-white/40">
                        <span className="flex gap-1"><span className="animate-bounce font-bold">.</span><span className="animate-bounce delay-100 font-bold">.</span><span className="animate-bounce delay-200 font-bold">.</span></span>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <div className="border-t border-white/10 pt-4 bg-[#080808]">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button onClick={() => onSendMessage(undefined, "Summarize this resource")} className="rounded-full bg-white/5 border border-white/5 px-3 py-1 text-[10px] text-white/60 hover:bg-white/10 hover:text-white">Summarize</button>
                    <button onClick={() => onSendMessage(undefined, "What are the core concepts and terms?")} className="rounded-full bg-white/5 border border-white/5 px-3 py-1 text-[10px] text-white/60 hover:bg-white/10 hover:text-white">Core Concepts</button>
                    <button onClick={() => onSendMessage(undefined, "Give me a practice exam question")} className="rounded-full bg-white/5 border border-white/5 px-3 py-1 text-[10px] text-white/60 hover:bg-white/10 hover:text-white">Test Me</button>
                  </div>

                  <form onSubmit={onSendMessage} className="flex gap-2">
                    <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask the AI Tutor anything about the document..." className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none" />
                    <button type="submit" className="grid h-9 w-9 place-items-center rounded-xl bg-white text-black hover:bg-white/90"><Send className="h-4 w-4" /></button>
                  </form>
                </div>
              </div>
            )}

            {/* C. NOTES TAB */}
            {activeTab === "notes" && (
              <div className="h-full flex flex-col justify-between gap-4">
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                    <span className="text-xs text-white/40">Auto-saved personal workspace</span>
                    <button onClick={handleDownloadNotes} className="flex items-center gap-1 text-[10px] font-semibold text-orange-400 hover:text-orange-300"><Download className="h-3 w-3" /><span>Export Text</span></button>
                  </div>
                  <textarea value={item.notes} onChange={(e) => onSaveNotes(e.target.value)} placeholder="Type study summaries, key terms, or homework reminders here..." className="w-full flex-1 rounded-xl border border-white/5 bg-[#0b0b0b] p-4 text-xs leading-relaxed text-white placeholder:text-white/20 focus:outline-none resize-none font-medium h-[280px]" />
                </div>
              </div>
            )}

            {/* D. PINS TAB (NOTEBOARD) */}
            {activeTab === "pins" && (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                  <span className="text-xs text-white/40">Pinned AI Insights</span>
                  <span className="text-[10px] font-semibold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">{item.pinnedNotes?.length || 0} Pins</span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin pb-6">
                  {(!item.pinnedNotes || item.pinnedNotes.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-full opacity-30 text-center">
                      <Pin className="h-8 w-8 mb-2" />
                      <p className="text-xs">No pinned notes yet.<br/>Pin messages from the chat!</p>
                    </div>
                  )}
                  
                  {item.pinnedNotes?.map((pin) => (
                    <div key={pin.id} className="relative group bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                      <button 
                        onClick={() => deletePin(pin.id)}
                        className="absolute top-2 right-2 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <div className="text-xs text-white/80 pr-6 leading-relaxed line-clamp-6">
                        {pin.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* E. BRIEFING TAB */}
            {activeTab === "briefing" && (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                  <span className="text-xs text-white/40">Auto-Generated Briefing Document</span>
                  {!item.briefingDoc && (
                    <button 
                      onClick={generateBriefing}
                      disabled={isGeneratingBriefing}
                      className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-1 text-[10px] font-bold rounded-full transition-colors"
                    >
                      <Sparkles className="h-3 w-3" />
                      {isGeneratingBriefing ? "Generating..." : "Generate Briefing"}
                    </button>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin pb-6">
                  {!item.briefingDoc ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-30 text-center px-6">
                      <FileStack className="h-10 w-10 mb-4" />
                      <p className="text-sm font-bold">No Briefing Doc available</p>
                      <p className="text-xs mt-2">Generate a briefing document to get a highly structured FAQ, glossary, and executive summary of your resource.</p>
                    </div>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none text-white/80">
                      {item.briefingDoc.split("\n").map((line, lidx) => {
                        if (line.startsWith("# ")) return <h1 key={lidx} className="text-xl font-bold text-white mb-4 mt-6">{line.replace("# ", "")}</h1>;
                        if (line.startsWith("## ")) return <h2 key={lidx} className="text-lg font-bold text-orange-400 mb-3 mt-5">{line.replace("## ", "")}</h2>;
                        if (line.startsWith("### ")) return <h3 key={lidx} className="text-md font-bold text-white/90 mb-2 mt-4">{line.replace("### ", "")}</h3>;
                        if (line.startsWith("- ")) return <li key={lidx} className="list-disc ml-4 my-1">{line.replace("- ", "")}</li>;
                        if (line.trim() === "") return <br key={lidx} />;
                        return <p key={lidx} className="my-2 leading-relaxed">{line}</p>;
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* F. PODCAST TAB */}
            {activeTab === "podcast" && (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                  <span className="text-xs text-white/40">AI Podcast Studio</span>
                  {item.audioScript && item.audioScript.length > 0 && (
                    <button onClick={downloadPodcastScript} className="flex items-center gap-1 text-[10px] font-semibold text-orange-400 hover:text-orange-300">
                      <Download className="h-3 w-3" /><span>Download Script</span>
                    </button>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin pb-6 space-y-6">
                  {/* Configuration Section */}
                  <div className="bg-[#111111] border border-white/10 rounded-2xl p-5 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Headphones className="h-4 w-4 text-orange-400" />
                      Podcast Settings
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Format</label>
                        <select 
                          value={podcastFormat}
                          onChange={(e) => setPodcastFormat(e.target.value)}
                          className="w-full bg-[#080808] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-orange-500/50"
                        >
                          <option value="two-hosts">Two Hosts (Debate/Banter)</option>
                          <option value="single-host">Single Host (Monologue)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Duration</label>
                        <select 
                          value={podcastDuration}
                          onChange={(e) => setPodcastDuration(e.target.value)}
                          className="w-full bg-[#080808] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-orange-500/50"
                        >
                          <option value="Short (~3 mins)">Short (~3 mins)</option>
                          <option value="Medium (~10 mins)">Medium (~10 mins)</option>
                          <option value="Long (~20 mins)">Long (~20 mins)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Language</label>
                        <select 
                          value={podcastLanguage}
                          onChange={(e) => setPodcastLanguage(e.target.value)}
                          className="w-full bg-[#080808] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-orange-500/50"
                        >
                          {Array.from(new Set(edgeVoices.map(v => v.lang))).map(l => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Target Pages</label>
                        <input 
                          type="text"
                          value={podcastPages}
                          onChange={(e) => setPodcastPages(e.target.value)}
                          placeholder="e.g. 1-5, 10, All"
                          className="w-full bg-[#080808] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-orange-500/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Host 1 Voice</label>
                        <select 
                          value={voice1Name}
                          onChange={(e) => setVoice1Name(e.target.value)}
                          className="w-full bg-[#080808] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-orange-500/50"
                        >
                          {edgeVoices.filter(v => v.lang === podcastLanguage).map(v => (
                            <option key={`v1-${v.id}`} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                      {podcastFormat === "two-hosts" && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Host 2 Voice</label>
                          <select 
                            value={voice2Name}
                            onChange={(e) => setVoice2Name(e.target.value)}
                            className="w-full bg-[#080808] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-orange-500/50"
                          >
                            {edgeVoices.filter(v => v.lang === podcastLanguage).map(v => (
                              <option key={`v2-${v.id}`} value={v.id}>{v.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Topic / Custom Instructions (Optional)</label>
                      <textarea 
                        value={podcastInstructions}
                        onChange={(e) => setPodcastInstructions(e.target.value)}
                        placeholder="e.g. Make it a debate, focus on the second chapter, explain like I'm 5..."
                        className="w-full bg-[#080808] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-orange-500/50 h-16 resize-none"
                      />
                    </div>

                    <button 
                      onClick={generatePodcast} 
                      disabled={isGeneratingPodcast}
                      className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      {isGeneratingPodcast ? "Generating..." : "Generate Audio Script"}
                    </button>
                  </div>

                  {/* Playback Section */}
                  {(item.audioScript && item.audioScript.length > 0) && (
                    <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">Audio Script</h3>
                        <div className="flex gap-2">
                          {playingAudioIdx >= 0 ? (
                            <button onClick={stopPodcast} className="flex items-center gap-2 bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold hover:bg-white/90 transition-colors">
                              <Pause className="h-3.5 w-3.5 fill-current" /> Stop Playing
                            </button>
                          ) : (
                            <button onClick={playPodcast} className="flex items-center gap-2 bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold hover:bg-white/90 transition-colors">
                              <Play className="h-3.5 w-3.5 fill-current" /> Play Podcast
                            </button>
                          )}
                          <a 
                            href={`http://localhost:8000/tts-full/${item.id}?voice1=${voice1Name}&voice2=${voice2Name}&h1Name=${encodeURIComponent(edgeVoices.find(v => v.id === voice1Name)?.name?.split(" ")[0] || "Host 1")}`}
                            download={`podcast_${item.id}.mp3`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-[#080808] text-white/80 hover:text-white border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold hover:border-orange-500/50 transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" /> Download MP3
                          </a>
                        </div>
                      </div>
                      
                      <div className="bg-[#080808] p-5 rounded-xl border border-white/5 max-h-[300px] overflow-y-auto scrollbar-thin space-y-4">
                        {item.audioScript.map((line, idx) => {
                          let displaySpeaker = line.speaker;
                          if (line.speaker === "Alex") {
                            displaySpeaker = edgeVoices.find(v => v.id === voice1Name)?.name?.split(" ")[0] || "Host 1";
                          } else if (line.speaker === "Sam") {
                            displaySpeaker = edgeVoices.find(v => v.id === voice2Name)?.name?.split(" ")[0] || "Host 2";
                          }
                          return (
                          <p key={idx} className="text-white/80 text-[13px] leading-relaxed">
                            <strong className="text-orange-400 mr-2">{displaySpeaker}:</strong>
                            {line.text}
                          </p>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
