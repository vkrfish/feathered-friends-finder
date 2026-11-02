import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../integrations/supabase/client";

const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
const API_BASE_URL = (
  (isLocal ? (import.meta.env.VITE_LOCAL_API_GATEWAY_URL || "http://localhost:3001") : (import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:3001"))
).replace(/\/+$/, "");
const FASTAPI_BASE_URL = (
  (isLocal ? (import.meta.env.VITE_LOCAL_FASTAPI_URL || "http://localhost:8000") : (import.meta.env.VITE_FASTAPI_URL || "http://localhost:8000"))
).replace(/\/+$/, "");

// Authenticated fetch helper
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = new Headers(options.headers || {});
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  return fetch(url, { ...options, headers });
}

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
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Download,
  Trash2,
  Pause,
  Plus,
  ArrowUp,
  Globe,
  Pin,
  GraduationCap,
  Lightbulb,
  Eye,
  Clock,
  HelpCircle,
  Headphones,
  FileStack,
} from "lucide-react";
import { toast } from "sonner";
import {
  StudyItem,
  MOCK_PDF_INDUSTRIAL_AUTOMATION,
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
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [profileName, setProfileName] = useState("User");
  const [profileInitial, setProfileInitial] = useState("U");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [showTrial, setShowTrial] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  // Database / Simulated mode switch
  const [useRealBackend, setUseRealBackend] = useState(true);
  const [backendOffline, setBackendOffline] = useState(false);

  // Ingestion input states
  const [activeInputMode, setActiveInputMode] = useState<
    "none" | "files" | "youtube" | "websites" | "text" | "research"
  >("none");
  const [inputText, setInputText] = useState("");

  // Loading animation state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Notebooks and sources state
  const [notebooks, setNotebooks] = useState<StudyItem[]>([]);
  const [sources, setSources] = useState<StudyItem[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [activeNotebook, setActiveNotebook] = useState<StudyItem | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  
  // Custom dialog state for creating a notebook
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newNotebookTitle, setNewNotebookTitle] = useState("");

  // Store blob URLs for uploaded PDFs — keyed by item ID
  const blobUrlsRef = useRef<Map<string, string>>(new Map());

  // Check user session and fetch profile
  useEffect(() => {
    const checkUserSession = async () => {
      let {
        data: { session: activeSession },
      } = await supabase.auth.getSession();

      if (!activeSession && typeof window !== "undefined" && window.location.hash.includes("access_token")) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (accessToken && refreshToken) {
          const { data } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (data?.session) {
            activeSession = data.session;
            window.history.replaceState(null, "", window.location.pathname);
          }
        }
      }

      if (!activeSession) {
        toast.error("Please sign in to access your workspace.");
        navigate({ to: "/signin" });
        return;
      }
      setSession(activeSession);
      setLoadingSession(false);

      const user = activeSession.user;
      const email = user.email || "";
      const metaName =
        user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0];
      setProfileName(metaName);
      setProfileInitial(metaName.charAt(0).toUpperCase());

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (profile && !error) {
          const name = profile.display_name || metaName;
          setProfileName(name);
          setProfileInitial(name.charAt(0).toUpperCase());
        }
      } catch (err) {
        console.error("Error fetching profile details:", err);
      }
    };

    checkUserSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, activeSession) => {
      setSession(activeSession);
      if (activeSession) {
        setLoadingSession(false);
      } else if (event === "SIGNED_OUT") {
        navigate({ to: "/signin" });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully.");
    navigate({ to: "/signin" });
  };

  // Fetch Items - Notebooks & Sources
  const fetchItems = async (isChangeMode = false) => {
    if (useRealBackend) {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/items`);
        if (!res.ok) throw new Error("Failed to fetch");
        const allItems: StudyItem[] = await res.json();
        setBackendOffline(false);

        // Filter notebooks
        const nbs = allItems.filter((it) => it.kind === "notebook");
        setNotebooks(nbs);

        // Filter sources of active notebook
        if (activeNotebookId) {
          const srcList = allItems.filter((it) => it.notebookId === activeNotebookId);
          setSources(srcList);

          // Auto-check all sources by default when opening notebook
          if (selectedSourceIds.length === 0 && srcList.length > 0) {
            setSelectedSourceIds(srcList.map(s => s.id));
          }

          // Fetch active notebook detail (with chat history, notes, etc.)
          const nbDetailRes = await fetchWithAuth(`${API_BASE_URL}/api/items/${activeNotebookId}`);
          if (nbDetailRes.ok) {
            const nbDetail = await nbDetailRes.json();
            setActiveNotebook(nbDetail);
          } else {
            const currentNb = nbs.find((n) => n.id === activeNotebookId);
            if (currentNb) setActiveNotebook(currentNb);
          }
        }

        if (isChangeMode) toast.success("Connected to PostgreSQL Gateway Backend!");
      } catch (err) {
        setBackendOffline(true);
        toast.error("PostgreSQL Gateway offline. Falling back to simulated mode.");
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
        const allItems: StudyItem[] = JSON.parse(saved);
        const nbs = allItems.filter((it) => it.kind === "notebook");
        setNotebooks(nbs);

        if (activeNotebookId) {
          const srcList = allItems.filter((it) => it.notebookId === activeNotebookId);
          setSources(srcList);
          
          if (selectedSourceIds.length === 0 && srcList.length > 0) {
            setSelectedSourceIds(srcList.map(s => s.id));
          }

          const activeNb = allItems.find((it) => it.id === activeNotebookId);
          setActiveNotebook(activeNb || null);
        }
      } catch (e) {
        initializeDefaults();
      }
    } else {
      initializeDefaults();
    }
  };

  const initializeDefaults = () => {
    const defaultNotebookId = "d0000000-0000-0000-0000-000000000000";
    const defaultNotebook: StudyItem = {
      id: defaultNotebookId,
      title: "My First Study Notebook 📚",
      createdAt: new Date().toISOString(),
      kind: "notebook",
      content: "",
      notes: "Remember: Resumes must be ATS-friendly. PLCs are Programmable Logic Controllers.",
      flashcards: [],
      quiz: [],
      chatHistory: [
        {
          role: "assistant",
          content: "Welcome to your first study notebook! I've pre-loaded some sources on the left checklist. Select them to include them in my context, and let's get cramming!",
        },
      ],
    };

    const defaultItems: StudyItem[] = [
      defaultNotebook,
      {
        id: "d0000000-0000-0000-0000-000000000001",
        title: "No Experience? How to Get Internships In 2026 (Telugu)",
        createdAt: new Date("2026-05-22T14:30:00").toISOString(),
        kind: "youtube",
        notebookId: defaultNotebookId,
        content: MOCK_YOUTUBE_INTERNSHIP.content,
        youtubeUrl: MOCK_YOUTUBE_INTERNSHIP.youtubeUrl,
        videoId: MOCK_YOUTUBE_INTERNSHIP.videoId,
        chapters: MOCK_YOUTUBE_INTERNSHIP.chapters,
        transcript: MOCK_YOUTUBE_INTERNSHIP.transcript,
        flashcards: MOCK_YOUTUBE_INTERNSHIP.flashcards,
        quiz: MOCK_YOUTUBE_INTERNSHIP.quiz,
        notes: "",
        chatHistory: [],
      },
      {
        id: "d0000000-0000-0000-0000-000000000002",
        title: "Industrial Automation Unit 1 Notes",
        createdAt: new Date("2026-05-22T10:15:00").toISOString(),
        kind: "pdf",
        notebookId: defaultNotebookId,
        fileName: MOCK_PDF_INDUSTRIAL_AUTOMATION.fileName,
        content: MOCK_PDF_INDUSTRIAL_AUTOMATION.content,
        flashcards: MOCK_PDF_INDUSTRIAL_AUTOMATION.flashcards,
        quiz: MOCK_PDF_INDUSTRIAL_AUTOMATION.quiz,
        notes: "",
        chatHistory: [],
      },
    ];

    setNotebooks([defaultNotebook]);
    if (activeNotebookId === defaultNotebookId) {
      setSources(defaultItems.filter((it) => it.notebookId === defaultNotebookId));
      setActiveNotebook(defaultNotebook);
      setSelectedSourceIds(["d0000000-0000-0000-0000-000000000001", "d0000000-0000-0000-0000-000000000002"]);
    }
    localStorage.setItem("ultra_learn_items", JSON.stringify(defaultItems));
  };

  useEffect(() => {
    fetchItems();
  }, [useRealBackend, activeNotebookId]);

  // Save modified local items to localStorage
  const saveLocalItems = (updated: StudyItem[]) => {
    localStorage.setItem("ultra_learn_items", JSON.stringify(updated));
    // refresh current states
    const nbs = updated.filter((it) => it.kind === "notebook");
    setNotebooks(nbs);
    if (activeNotebookId) {
      setSources(updated.filter((it) => it.notebookId === activeNotebookId));
      setActiveNotebook(updated.find((it) => it.id === activeNotebookId) || null);
    }
  };

  // Run progress loading screen
  const runSimulatedAnalysis = (logs: string[], onComplete: () => void) => {
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

  // Create notebook
  const onCreateNotebook = async () => {
    const funnyTitles = [
      "Midterm Crisis Survival Kit 😭",
      "Cooked Exam Prep (fr fr) 🔥",
      "Delulu Cram Session 🤡",
      "Physics Panic Room 🚨",
      "Syllabus memorizer (trust me bro) 🧬",
      "2 AM Final Project Panic ☕",
    ];
    const finalTitle =
      newNotebookTitle.trim() || funnyTitles[Math.floor(Math.random() * funnyTitles.length)];

    if (useRealBackend && !backendOffline) {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/notebooks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: finalTitle }),
        });
        if (!res.ok) throw new Error("Create failed");
        const data = await res.json();
        setActiveNotebookId(data.id);
        setSelectedSourceIds([]);
        setSources([]);
        setShowCreateDialog(false);
        setNewNotebookTitle("");
        toast.success(`Created Notebook: ${finalTitle}`);
        fetchItems();
      } catch (e) {
        toast.error("Could not write to Postgres DB.");
      }
    } else {
      const allItems = localStorage.getItem("ultra_learn_items")
        ? JSON.parse(localStorage.getItem("ultra_learn_items")!)
        : [];
      const newNb: StudyItem = {
        id: crypto.randomUUID(),
        title: finalTitle,
        createdAt: new Date().toISOString(),
        kind: "notebook",
        content: "",
        notes: "",
        flashcards: [],
        quiz: [],
        chatHistory: [
          {
            role: "assistant",
            content:
              "Hi! This is your new study notebook. Ingest some sources on the left checklist, select them to add them to my knowledge base, and let's get cramming!",
          },
        ],
      };
      const updated = [newNb, ...allItems];
      saveLocalItems(updated);
      setActiveNotebookId(newNb.id);
      setSelectedSourceIds([]);
      setSources([]);
      setShowCreateDialog(false);
      setNewNotebookTitle("");
      toast.success(`Mock Created Notebook: ${finalTitle}`);
    }
  };

  // Delete notebook
  const onDeleteNotebook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = confirm(
      "Are you sure you want to delete this study notebook? All nested sources will be permanently deleted."
    );
    if (!confirmed) return;

    if (useRealBackend && !backendOffline) {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/notebooks/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Delete failed");
        if (activeNotebookId === id) {
          setActiveNotebookId(null);
          setActiveNotebook(null);
        }
        fetchItems();
        toast.success("Notebook deleted.");
      } catch (e) {
        toast.error("Failed to delete notebook.");
      }
    } else {
      const allItems: StudyItem[] = localStorage.getItem("ultra_learn_items")
        ? JSON.parse(localStorage.getItem("ultra_learn_items")!)
        : [];
      // Delete notebook AND all sources under it
      const updated = allItems.filter((it) => it.id !== id && it.notebookId !== id);
      saveLocalItems(updated);
      if (activeNotebookId === id) {
        setActiveNotebookId(null);
        setActiveNotebook(null);
      }
      toast.success("Deleted from LocalStorage");
    }
  };

  // Ingest source handlers
  const onFilesSelect = (e: React.ChangeEvent<HTMLInputElement> | FileList | null) => {
    const files = e instanceof FileList ? e : e?.target.files;
    if (!files || !files.length || !activeNotebookId) return;

    const file = files[0];
    const docData = generateMockPdfContentForTopic(file.name);

    const fileLogs = [
      `📂 Uploading ${file.name} to notebook...`,
      "🧬 Parsing PDF document structures...",
      "📝 Running layout text extraction...",
      "🧠 Indexing document vectors in PostgreSQL (pgvector)...",
      "🤖 Synthesizing active recall flashcards & Socratic quizzes...",
      "⏳ Cram session workspace preparing...",
    ];

    const blobUrl = URL.createObjectURL(file);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("notebook_id", activeNotebookId);

    runSimulatedAnalysis(fileLogs, async () => {
      let uploadedSuccessfully = false;

      // 1. Try Node API Gateway
      if (useRealBackend && !backendOffline) {
        try {
          const res = await fetchWithAuth(`${API_BASE_URL}/api/items/file`, {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            blobUrlsRef.current.set(data.id, blobUrl);
            setAnalysisLogs((prev) => [...prev, "⚡ Vector processing and index complete!"]);
            setAnalysisProgress(95);
            await fetchItems();
            setSelectedSourceIds((prev) => Array.from(new Set([...prev, data.id])));
            toast.success(`Indexed successfully: ${file.name}`);
            uploadedSuccessfully = true;
          }
        } catch (e) {
          console.warn("Node gateway PDF upload failed, trying direct FastAPI call...");
        }
      }

      // 2. Direct FastAPI PDF processing fallback if Node Gateway is offline
      if (!uploadedSuccessfully) {
        try {
          const fastApiFormData = new FormData();
          const itemId = crypto.randomUUID();
          fastApiFormData.append("file", file);
          fastApiFormData.append("item_id", itemId);

          const fRes = await fetch(`${FASTAPI_BASE_URL}/process-pdf`, {
            method: "POST",
            body: fastApiFormData,
          });

          if (fRes.ok) {
            const fData = await fRes.json();
            const today = new Date();
            const newItem: StudyItem = {
              id: itemId,
              notebookId: activeNotebookId,
              title: file.name.split(".")[0],
              createdAt: today.toISOString(),
              kind: "pdf",
              fileName: file.name,
              content: fData.content || docData.content,
              localFileUrl: blobUrl,
              flashcards: fData.flashcards && fData.flashcards.length > 0 ? fData.flashcards : docData.flashcards,
              quiz: fData.quiz && fData.quiz.length > 0 ? fData.quiz : docData.quiz,
              notes: "",
              chatHistory: [],
            };

            const allItems = localStorage.getItem("ultra_learn_items")
              ? JSON.parse(localStorage.getItem("ultra_learn_items")!)
              : [];
            saveLocalItems([newItem, ...allItems]);
            setSelectedSourceIds((prev) => [...prev, newItem.id]);
            setNotebooks((prev) => prev.map((n) => n.id === activeNotebookId ? { ...n } : n));
            setSources((prev) => [newItem, ...prev]);
            toast.success(`Indexed successfully via RAG AI: ${file.name}`);
            uploadedSuccessfully = true;
          }
        } catch (fErr) {
          console.warn("Direct FastAPI PDF processing failed:", fErr);
        }
      }

      // 3. Fallback mock if both backends are down
      if (!uploadedSuccessfully) {
        const today = new Date();
        const newItem: StudyItem = {
          id: crypto.randomUUID(),
          notebookId: activeNotebookId,
          title: file.name.split(".")[0],
          createdAt: today.toISOString(),
          kind: "pdf",
          fileName: file.name,
          content: docData.content,
          localFileUrl: blobUrl,
          flashcards: docData.flashcards,
          quiz: docData.quiz,
          notes: "",
          chatHistory: [],
        };
        const allItems = localStorage.getItem("ultra_learn_items")
          ? JSON.parse(localStorage.getItem("ultra_learn_items")!)
          : [];
        saveLocalItems([newItem, ...allItems]);
        setSelectedSourceIds((prev) => [...prev, newItem.id]);
        setSources((prev) => [newItem, ...prev]);
        toast.success(`Processed ${file.name}`);
      }

      setIsAnalyzing(false);
      setActiveInputMode("none");
      setInputText("");
    });
  };

  const onAddYoutube = () => {
    if (!inputText.trim() || !activeNotebookId) {
      toast.error("Please enter a YouTube video URL");
      return;
    }

    const url = inputText.trim();
    const isInternship =
      url.includes("6PZX") || url.includes("internship") || url.includes("telugu");
    const ytData = isInternship ? MOCK_YOUTUBE_INTERNSHIP : generateMockYoutubeContent(url);

    const ytLogs = [
      "📡 Connecting to YouTube API...",
      `🎥 Fetching video details: ${url}`,
      "🔊 Ingesting transcript tracks...",
      "🏷️ Aligning chapters and timelines...",
      "📚 Generating Socratic study aids...",
      "⏳ Ingest complete!",
    ];

    runSimulatedAnalysis(ytLogs, async () => {
      if (useRealBackend && !backendOffline) {
        try {
          const res = await fetchWithAuth(`${API_BASE_URL}/api/items/youtube`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, notebook_id: activeNotebookId }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();

          setAnalysisLogs((prev) => [...prev, "⚡ YouTube transcript chapters aligned!"]);
          setAnalysisProgress(95);

          await fetchItems();
          setSelectedSourceIds((prev) => Array.from(new Set([...prev, data.id])));
          toast.success("YouTube video ingested!");
        } catch (e) {
          toast.error("YouTube ingestion failed.");
          setIsAnalyzing(false);
        }
      } else {
        const today = new Date();
        const newItem: StudyItem = {
          id: crypto.randomUUID(),
          notebookId: activeNotebookId,
          title: ytData.title,
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
          chatHistory: [],
        };
        const allItems = localStorage.getItem("ultra_learn_items")
          ? JSON.parse(localStorage.getItem("ultra_learn_items")!)
          : [];
        const updated = [newItem, ...allItems];
        saveLocalItems(updated);
        setSelectedSourceIds((prev) => [...prev, newItem.id]);
        toast.success("Mock YouTube video ingested");
      }
      setIsAnalyzing(false);
      setActiveInputMode("none");
      setInputText("");
    });
  };

  const onAddWebsite = () => {
    if (!inputText.trim() || !activeNotebookId) {
      toast.error("Please enter a website link");
      return;
    }

    const url = inputText.trim();
    const siteLogs = [
      `🌐 Crawling target domain: ${url}`,
      "🕷️ Scraping layout tree...",
      "🧹 Stripping ads and scripts...",
      "🧠 Formulating study nodes...",
      "⏳ Saving to index...",
    ];

    runSimulatedAnalysis(siteLogs, async () => {
      if (useRealBackend && !backendOffline) {
        try {
          const res = await fetchWithAuth(`${API_BASE_URL}/api/items/website`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, notebook_id: activeNotebookId }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();

          setAnalysisLogs((prev) => [...prev, "⚡ Webpage indexing finished!"]);
          setAnalysisProgress(95);

          await fetchItems();
          setSelectedSourceIds((prev) => Array.from(new Set([...prev, data.id])));
          toast.success("Website scraped & saved!");
        } catch (e) {
          toast.error("Website scraping failed.");
          setIsAnalyzing(false);
        }
      } else {
        const today = new Date();
        const webData = generateMockWebsiteContent(url);
        const newItem: StudyItem = {
          id: crypto.randomUUID(),
          notebookId: activeNotebookId,
          title: webData.title,
          createdAt: today.toISOString(),
          kind: "website",
          content: webData.content,
          flashcards: webData.flashcards,
          quiz: webData.quiz,
          notes: "",
          chatHistory: [],
        };
        const allItems = localStorage.getItem("ultra_learn_items")
          ? JSON.parse(localStorage.getItem("ultra_learn_items")!)
          : [];
        const updated = [newItem, ...allItems];
        saveLocalItems(updated);
        setSelectedSourceIds((prev) => [...prev, newItem.id]);
        toast.success("Mock website scraped");
      }
      setIsAnalyzing(false);
      setActiveInputMode("none");
      setInputText("");
    });
  };

  const onAddText = () => {
    if (!inputText.trim() || !activeNotebookId) {
      toast.error("Please enter some text notes");
      return;
    }

    const textLogs = [
      "📝 Analyzing raw text nodes...",
      "🧠 Building semantic memory indices...",
      "⏳ Formatting study aids...",
    ];

    runSimulatedAnalysis(textLogs, async () => {
      if (useRealBackend && !backendOffline) {
        try {
          const res = await fetchWithAuth(`${API_BASE_URL}/api/items/text`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: inputText, notebook_id: activeNotebookId }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();

          setAnalysisLogs((prev) => [...prev, "⚡ Text session indexed successfully!"]);
          setAnalysisProgress(95);

          await fetchItems();
          setSelectedSourceIds((prev) => Array.from(new Set([...prev, data.id])));
          toast.success("Notes saved to notebook!");
        } catch (e) {
          toast.error("Pasted text save failed.");
          setIsAnalyzing(false);
        }
      } else {
        const today = new Date();
        const textData = generateMockTextContent(inputText);
        const newItem: StudyItem = {
          id: crypto.randomUUID(),
          notebookId: activeNotebookId,
          title: textData.title,
          createdAt: today.toISOString(),
          kind: "text",
          content: textData.content,
          flashcards: textData.flashcards,
          quiz: textData.quiz,
          notes: "",
          chatHistory: [],
        };
        const allItems = localStorage.getItem("ultra_learn_items")
          ? JSON.parse(localStorage.getItem("ultra_learn_items")!)
          : [];
        const updated = [newItem, ...allItems];
        saveLocalItems(updated);
        setSelectedSourceIds((prev) => [...prev, newItem.id]);
        toast.success("Mock text processed");
      }
      setIsAnalyzing(false);
      setActiveInputMode("none");
      setInputText("");
    });
  };

  const onAddDeepResearch = () => {
    if (!inputText.trim() || !activeNotebookId) {
      toast.error("Please specify a topic to research");
      return;
    }

    const topic = inputText.trim();
    const researchLogs = [
      `🤖 Launching Deep Research agent for: "${topic}"`,
      "🔎 Querying database search engines...",
      "📚 Compiling citation references...",
      "✍️ Drafting structured dossier...",
      "⏳ Compiling study card parameters...",
    ];

    runSimulatedAnalysis(researchLogs, async () => {
      if (useRealBackend && !backendOffline) {
        try {
          const res = await fetchWithAuth(`${API_BASE_URL}/api/items/research`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic, notebook_id: activeNotebookId }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();

          setAnalysisLogs((prev) => [...prev, "⚡ Deep research agent finalized report!"]);
          setAnalysisProgress(95);

          await fetchItems();
          setSelectedSourceIds((prev) => Array.from(new Set([...prev, data.id])));
          toast.success("Deep research report synthesized!");
        } catch (e) {
          toast.error("Deep research agent failed.");
          setIsAnalyzing(false);
        }
      } else {
        const today = new Date();
        const researchData = generateMockResearchContent(topic);
        const newItem: StudyItem = {
          id: crypto.randomUUID(),
          notebookId: activeNotebookId,
          title: researchData.title,
          createdAt: today.toISOString(),
          kind: "research",
          content: researchData.content,
          flashcards: researchData.flashcards,
          quiz: researchData.quiz,
          notes: "",
          chatHistory: [],
        };
        const allItems = localStorage.getItem("ultra_learn_items")
          ? JSON.parse(localStorage.getItem("ultra_learn_items")!)
          : [];
        const updated = [newItem, ...allItems];
        saveLocalItems(updated);
        setSelectedSourceIds((prev) => [...prev, newItem.id]);
        toast.success("Mock research synthesized");
      }
      setIsAnalyzing(false);
      setActiveInputMode("none");
      setInputText("");
    });
  };

  // Delete a source from notebook
  const onDeleteSource = async (id: string) => {
    const confirmed = confirm("Are you sure you want to delete this source?");
    if (!confirmed) return;

    if (useRealBackend && !backendOffline) {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/items/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Delete failed");
        toast.success("Source deleted");
        setSelectedSourceIds((prev) => prev.filter((i) => i !== id));
        fetchItems();
      } catch (e) {
        toast.error("Failed to delete source.");
      }
    } else {
      const allItems: StudyItem[] = localStorage.getItem("ultra_learn_items")
        ? JSON.parse(localStorage.getItem("ultra_learn_items")!)
        : [];
      const updated = allItems.filter((it) => it.id !== id);
      saveLocalItems(updated);
      setSelectedSourceIds((prev) => prev.filter((i) => i !== id));
      toast.success("Deleted from LocalStorage");
    }
  };

  // Search filter and sort notebooks
  const filteredNotebooks = notebooks
    .filter((nb) => {
      const q = query.toLowerCase();
      return (
        nb.title.toLowerCase().includes(q) ||
        (nb.notes || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-white font-sans antialiased overflow-x-hidden">
      
      {/* 1. LOADING OVERLAY */}
      {(isAnalyzing || loadingSession) && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07080a]">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] animate-pulse" />
          </div>

          <div className="relative mb-8">
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-transparent border border-primary/20 flex items-center justify-center animate-spin">
              <div className="w-10 h-10 rounded-full border border-primary/40" />
            </div>
          </div>

          <h2 className="text-xl font-semibold tracking-tight text-white mb-1 font-display">
            {loadingSession ? "Loading credentials..." : "Indexing Knowledge Source"}
          </h2>
          <p className="text-xs text-muted-foreground mb-6 font-mono max-w-sm px-6 text-center truncate">
            {loadingSession
              ? "Connecting credentials..."
              : analysisLogs.length > 0
                ? analysisLogs[analysisLogs.length - 1]
                : "Parsing elements..."}
          </p>

          <div className="w-64 h-1 rounded-full bg-white/5 overflow-hidden mb-6">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 shadow-[0_0_10px_oklch(0.82_0.14_160/0.4)]"
              style={{ width: `${Math.max(analysisProgress, 15)}%` }}
            />
          </div>

          <div className="w-full max-w-xs space-y-1">
            {analysisLogs.slice(-3).map((log, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono truncate"
                style={{ opacity: 1 - (analysisLogs.slice(-3).length - 1 - i) * 0.25 }}
              >
                <span className="w-1 h-1 rounded-full bg-primary shrink-0 animate-pulse" />
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. ACTIVE NOTEBOOK WORKSPACE */}
      {activeNotebookId && activeNotebook ? (
        <StudySessionPanel
          session={session}
          notebook={activeNotebook}
          sources={sources}
          selectedSourceIds={selectedSourceIds}
          onToggleSource={(id) => {
            setSelectedSourceIds((prev) =>
              prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
            );
          }}
          onDeleteSource={onDeleteSource}
          useRealBackend={useRealBackend && !backendOffline}
          pdfBlobUrl={(id) => blobUrlsRef.current.get(id)}
          onBack={() => {
            setActiveNotebookId(null);
            setActiveNotebook(null);
            fetchItems();
          }}
          onUpdateNotebook={(updatedNb) => {
            setActiveNotebook(updatedNb);
            setNotebooks((prev) => prev.map((n) => (n.id === updatedNb.id ? updatedNb : n)));
            if (!useRealBackend || backendOffline) {
              const allItems: StudyItem[] = localStorage.getItem("ultra_learn_items")
                ? JSON.parse(localStorage.getItem("ultra_learn_items")!)
                : [];
              const updated = allItems.map((it) => (it.id === updatedNb.id ? updatedNb : it));
              saveLocalItems(updated);
            }
          }}
          activeInputMode={activeInputMode}
          setActiveInputMode={setActiveInputMode}
          inputText={inputText}
          setInputText={setInputText}
          onAddYoutube={onAddYoutube}
          onAddWebsite={onAddWebsite}
          onAddText={onAddText}
          onAddDeepResearch={onAddDeepResearch}
          onFilesSelect={onFilesSelect}
        />
      ) : (
        /* 3. LOBBY VIEW (MY NOTEBOOKS GRID) */
        <div className="flex flex-col min-h-screen">
          
          {/* Top Header bar */}
          <header className="flex items-center justify-between border-b border-border bg-card/85 px-6 py-3.5 backdrop-blur-md sticky top-0 z-40 gap-4">
            <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 border border-primary/25">
                <div
                  className="h-3.5 w-3.5 rotate-45 bg-primary"
                  style={{ clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)" }}
                />
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                LearnX
              </span>
            </Link>

            <div className="flex items-center gap-3">
              {/* Backend Mode Switch */}
              <button
                onClick={() => {
                  setUseRealBackend(!useRealBackend);
                  toast.info(
                    !useRealBackend
                      ? "Connecting to PostgreSQL API Gateway..."
                      : "Switched to local simulated memory mode."
                  );
                }}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-mono font-medium border transition-colors ${
                  useRealBackend && !backendOffline
                    ? "bg-primary/10 border-primary/25 text-primary"
                    : "bg-secondary border-border text-muted-foreground"
                }`}
                title="Toggle between PostgreSQL Cloud Gateway and Local Simulated Storage"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${useRealBackend && !backendOffline ? "bg-primary" : "bg-muted-foreground"}`} />
                <span>{useRealBackend && !backendOffline ? "Postgres Gateway" : "Simulated Local"}</span>
              </button>

              {/* Streak Badge */}
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 py-1 text-xs font-medium text-foreground select-none">
                <Flame className="h-3.5 w-3.5 text-primary" />
                <span>3-day streak</span>
              </div>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 border border-primary/25 text-xs font-semibold uppercase text-primary hover:opacity-90 active:scale-95 transition-all outline-none"
                >
                  {profileInitial}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-lg border border-border bg-card p-1 shadow-lg z-50 text-left">
                    <div className="px-3 py-2 border-b border-border text-[11px] text-muted-foreground truncate font-mono">
                      {session?.user?.email}
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-xs text-destructive hover:bg-secondary transition-colors text-left font-medium"
                    >
                      <X className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1140px] w-full px-6 pb-24 pt-8 flex-1 flex flex-col justify-start text-left">
            
            {/* Title heading */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-foreground font-display md:text-4xl">
                Welcome back, {profileName}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                Select a study notebook to resume your active session, or create a new workspace to ingest materials.
              </p>
            </div>

            {/* Trial Banner */}
            {showTrial && (
              <div className="relative mb-8 rounded-lg border border-border bg-secondary/30 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <button
                  onClick={() => setShowTrial(false)}
                  className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div>
                  <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-primary" />
                    <span>Active Study Workspace</span>
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-xl leading-relaxed">
                    Full semantic vector retrieval, active recall flashcards, and Socratic tutoring are enabled.
                  </p>
                </div>
                <button
                  onClick={() => setShowTrial(false)}
                  className="rounded-md border border-border bg-secondary px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors inline-block shadow-xs shrink-0 self-start md:self-auto"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Lobby List header & search */}
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between border-b border-border pb-3.5">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold tracking-tight text-foreground font-display">
                    Study Notebooks
                  </h3>
                  <span className="rounded-md bg-secondary border border-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {filteredNotebooks.length}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Search box */}
                  <div className="flex items-center gap-2 rounded-md border border-input bg-secondary/20 px-3 py-1.5 w-full sm:w-60 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30 transition-all">
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search notebooks..."
                      className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none"
                    />
                  </div>

                  {/* Sort dropdown */}
                  <button
                    onClick={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                  >
                    <span>{sortBy === "newest" ? "Newest" : "Oldest"}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Grid / List render */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* 1. Add Notebook Card */}
                <div
                  onClick={() => setShowCreateDialog(true)}
                  className="group cursor-pointer rounded-lg border border-dashed border-border hover:border-primary/50 bg-secondary/15 hover:bg-secondary/35 h-44 flex flex-col items-center justify-center transition-all shadow-xs"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 border border-primary/20 text-primary mb-2.5 group-hover:scale-105 transition-transform">
                    <Plus className="h-4.5 w-4.5" />
                  </div>
                  <span className="font-display font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                    New Notebook
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    Create a structured study workspace
                  </span>
                </div>

                {/* 2. Grid Notebooks */}
                {filteredNotebooks.map((nb) => (
                  <div
                    key={nb.id}
                    onClick={() => {
                      setActiveNotebookId(nb.id);
                      setSelectedSourceIds([]);
                      setSources([]);
                    }}
                    className="group cursor-pointer rounded-lg border border-border bg-card p-5 hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between h-44 text-left relative"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="rounded-md bg-primary/10 border border-primary/20 p-1.5 text-primary">
                          <FileStack className="h-4 w-4" />
                        </div>
                        <button
                          onClick={(e) => onDeleteNotebook(nb.id, e)}
                          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete Notebook"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <h4 className="font-display font-bold text-foreground text-sm mt-3 truncate group-hover:text-primary transition-colors">
                        {nb.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {nb.notes || "No notes in this notebook yet."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-2.5 mt-3 text-[10px] text-muted-foreground">
                      <span>
                        {new Date(nb.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                        Workspace
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. MODAL DIALOG TO CREATE NOTEBOOK */}
          {showCreateDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
              <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl text-left">
                <h3 className="font-display font-bold text-base text-foreground mb-1.5">
                  Create Study Notebook
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Enter a title for your new workspace to organize related lecture notes, textbooks, and flashcards.
                </p>

                <input
                  value={newNotebookTitle}
                  onChange={(e) => setNewNotebookTitle(e.target.value)}
                  placeholder="e.g. Molecular Biology Midterm, Macroeconomics Q3"
                  className="w-full rounded-md border border-input bg-secondary/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-1 focus:ring-primary/30 outline-none transition-colors mb-4"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCreateNotebook();
                  }}
                  autoFocus
                />

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowCreateDialog(false);
                      setNewNotebookTitle("");
                    }}
                    className="rounded-md border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onCreateNotebook}
                    className="rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-xs"
                  >
                    Create Notebook
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================
// RAG QUIZ GENERATOR DATA MODELS
// =============================================================
interface RagQuizQuestion {
  id: string;
  question: string;
  options: string[];
  source_reference?: {
    chunk_id?: number | string;
    page_number?: number;
    quote_snippet?: string;
  };
}

interface RagQuizResultItem {
  id: string;
  question: string;
  options: string[];
  user_answer: number | null;
  correct_answer: number;
  is_correct: boolean;
  explanation: string;
  source_reference?: {
    chunk_id?: number | string;
    page_number?: number;
    quote_snippet?: string;
  };
}

interface RagQuizEvaluation {
  score: number;
  total_questions: number;
  percentage: number;
  results: RagQuizResultItem[];
}

// =============================================================
// TUTOR MODE DATA MODELS
// =============================================================
interface TutorChapter {
  id: string;
  title: string;
  order_index: number;
  estimated_minutes: number;
  page_start: number;
  summary: string;
  planned_activities_count: number;
  source_snippet?: string;
}

interface TutorActivity {
  id: string;
  type: "mcq" | "flashcard" | "fill_blank" | "true_false";
  prompt?: string;
  hint?: string;
  options?: string[];
  front?: string;
  back?: string;
  sentence_before?: string;
  expected_word?: string;
  sentence_after?: string;
  is_true?: boolean;
  explanation?: string;
}

interface TutorStepData {
  step_index: number;
  total_steps: number;
  concept_pill: {
    concept: string;
    description: string;
  };
  learning_prose: string;
  pills: {
    simpler: string;
    example: string;
    why: string;
  };
  micro_steps: string[];
  takeaway: string;
  activity: TutorActivity;
  source_reference?: {
    page_number?: number;
    quote_snippet?: string;
  };
}

interface TutorEvaluationResult {
  is_correct: boolean;
  score: number;
  correct_display: string;
  explanation: string;
  feedback_message: string;
}

// =============================================================
// 5. THREE-COLUMN NOTEBOOK WORKSPACE PANEL
// =============================================================
interface StudySessionPanelProps {
  notebook: StudyItem;
  sources: StudyItem[];
  selectedSourceIds: string[];
  onToggleSource: (id: string) => void;
  onDeleteSource: (id: string) => void;
  useRealBackend: boolean;
  pdfBlobUrl: (id: string) => string | undefined;
  onBack: () => void;
  onUpdateNotebook: (nb: StudyItem) => void;
  
  // Ingestion states passed from parent
  activeInputMode: "none" | "files" | "youtube" | "websites" | "text" | "research";
  setActiveInputMode: (mode: "none" | "files" | "youtube" | "websites" | "text" | "research") => void;
  inputText: string;
  setInputText: (text: string) => void;
  onAddYoutube: () => void;
  onAddWebsite: () => void;
  onAddText: () => void;
  onAddDeepResearch: () => void;
  onFilesSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session?: any;
}

function StudySessionPanel({
  notebook,
  sources,
  selectedSourceIds,
  onToggleSource,
  onDeleteSource,
  useRealBackend,
  pdfBlobUrl,
  onBack,
  onUpdateNotebook,
  activeInputMode,
  setActiveInputMode,
  inputText,
  setInputText,
  onAddYoutube,
  onAddWebsite,
  onAddText,
  onAddDeepResearch,
  onFilesSelect,
  session,
}: StudySessionPanelProps) {
  
  // High-level Mode Switch: Notebook Mode vs Tutor Mode
  const [studyMode, setStudyMode] = useState<"notebook" | "tutor">("notebook");
  const [authToken, setAuthToken] = useState<string>(() => session?.access_token || "");

  useEffect(() => {
    if (session?.access_token) {
      setAuthToken(session.access_token);
    } else {
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (s?.access_token) setAuthToken(s.access_token);
      }).catch(() => {});
    }
  }, [session]);

  const [activeTab, setActiveTab] = useState<
    "notes" | "briefing" | "podcast" | "flashcards" | "quiz"
  >("notes");

  // -------------------------------------------------------------
  // TUTOR MODE WORKFLOW STATES
  // -------------------------------------------------------------
  const [tutorView, setTutorView] = useState<"landing" | "studying" | "completed">("landing");
  const [tutorScope, setTutorScope] = useState<"whole" | "chapters">("whole");
  const [tutorOutline, setTutorOutline] = useState<TutorChapter[]>([]);
  const [isLoadingOutline, setIsLoadingOutline] = useState(false);
  const [activeChapterIdx, setActiveChapterIdx] = useState<number>(0);

  // Active step & learning block states
  const [tutorStepIndex, setTutorStepIndex] = useState<number>(0);
  const [tutorStepData, setTutorStepData] = useState<TutorStepData | null>(null);
  const [isLoadingStep, setIsLoadingStep] = useState(false);
  const [isConceptPillExpanded, setIsConceptPillExpanded] = useState(false);
  const [activePillDetail, setActivePillDetail] = useState<"simpler" | "example" | "why" | null>(null);
  const [followupQuestion, setFollowupQuestion] = useState("");
  const [followupAnswer, setFollowupAnswer] = useState<string | null>(null);
  const [isLoadingFollowup, setIsLoadingFollowup] = useState(false);

  // Activity interaction states
  const [activityResponse, setActivityResponse] = useState<any>(null);
  const [isEvaluatingActivity, setIsEvaluatingActivity] = useState(false);
  const [activityEvaluation, setActivityEvaluation] = useState<TutorEvaluationResult | null>(null);
  const [isFlashcardRevealed, setIsFlashcardRevealed] = useState(false);

  // Progress tracking across section & overall
  const [sectionProgressHistory, setSectionProgressHistory] = useState<boolean[]>([]);
  const [tutorSessionStats, setTutorSessionStats] = useState<{
    completedActivities: number;
    totalActivities: number;
    accuracy: number;
  }>({
    completedActivities: 0,
    totalActivities: 0,
    accuracy: 0,
  });
  
  // Right tabs welcome states
  const [showRightWelcome, setShowRightWelcome] = useState(false);

  // Left Preview State
  const [activeSourcePreviewId, setActiveSourcePreviewId] = useState<string | null>(null);
  const [pdfPageNum, setPdfPageNum] = useState<number | null>(null);
  const [pdfViewMode, setPdfViewMode] = useState<"original" | "text">("original");
  const [zoom, setZoom] = useState(100);
  const [pdfDarkMode, setPdfDarkMode] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEditingSource, setIsEditingSource] = useState(false);
  const [editSourceVal, setEditSourceVal] = useState("");

  // YouTube reader controls
  const [ytActiveTab, setYtActiveTab] = useState<"chapters" | "transcripts">("transcripts");
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Chat states
  const [chatInput, setChatInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Spaced repetition flashcards state
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardLog, setFlashcardLog] = useState<{ [idx: number]: "got" | "review" }>({});

  // RAG Quiz states
  const [quizStep, setQuizStep] = useState<"config" | "taking" | "results">("config");
  const [quizTopic, setQuizTopic] = useState("");
  const [quizDifficulty, setQuizDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [quizNumQuestions, setQuizNumQuestions] = useState<number>(5);
  const [quizTargetSourceId, setQuizTargetSourceId] = useState<string>("all");
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [activeQuizSessionId, setActiveQuizSessionId] = useState<string | null>(null);
  const [ragQuizQuestions, setRagQuizQuestions] = useState<RagQuizQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [userSelectedAnswers, setUserSelectedAnswers] = useState<{ [questionId: string]: number }>({});
  const [quizEvaluation, setQuizEvaluation] = useState<RagQuizEvaluation | null>(null);
  
  // Pinned Custom Card State
  const [showAddCard, setShowAddCard] = useState(false);
  const [customCardContent, setCustomCardContent] = useState("");

  // Briefing and Podcast synthesis states
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [playingAudioIdx, setPlayingAudioIdx] = useState<number>(-1);

  // Podcast parameters
  const [podcastFormat, setPodcastFormat] = useState("two-hosts");
  const [podcastLanguage, setPodcastLanguage] = useState("English");
  const [podcastInstructions, setPodcastInstructions] = useState("");
  const [podcastDuration, setPodcastDuration] = useState("Medium (~10 mins)");
  const [podcastPages, setPodcastPages] = useState("All");

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
  ];

  const [voice1Name, setVoice1Name] = useState<string>("en-US-GuyNeural");
  const [voice2Name, setVoice2Name] = useState<string>("en-US-AriaNeural");
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Auto scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notebook.chatHistory, isBotTyping, streamingMessage]);

  // Read aloud source text
  const toggleTTS = (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 1000));
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

  // Update default voices on lang change
  useEffect(() => {
    const langVoices = edgeVoices.filter((v) => v.lang === podcastLanguage);
    if (langVoices.length > 0) {
      setVoice1Name(langVoices[0].id);
      if (langVoices.length > 1) {
        setVoice2Name(langVoices[1].id);
      } else {
        setVoice2Name(langVoices[0].id);
      }
    }
  }, [podcastLanguage]);

  // Save edit changes on text sources
  const saveSourceTextEdits = () => {
    if (!activeSourcePreviewId) return;
    const allItems: StudyItem[] = localStorage.getItem("ultra_learn_items")
      ? JSON.parse(localStorage.getItem("ultra_learn_items")!)
      : [];
    const updated = allItems.map((item) => {
      if (item.id === activeSourcePreviewId) {
        return {
          ...item,
          content: editSourceVal,
        };
      }
      return item;
    });
    localStorage.setItem("ultra_learn_items", JSON.stringify(updated));
    // update parent states
    onUpdateNotebook({ ...notebook });
    setIsEditingSource(false);
    toast.success("Source notes updated.");
  };

  // Aggregated flashcards from active checked sources
  const activeFlashcards = sources
    .filter((s) => selectedSourceIds.includes(s.id))
    .flatMap((s) => s.flashcards || []);

  const currentFlashcard = activeFlashcards[flashcardIdx] || {
    question: "No recall cards available for active sources.",
    answer: "Check active sources on the left checklist or add study materials to compile flashcards.",
    hint: "Select a source to load flashcards.",
  };


  // Save notebook notes auto-save
  const onSaveNotes = async (notesText: string) => {
    onUpdateNotebook({ ...notebook, notes: notesText });
    if (useRealBackend) {
      try {
        await fetchWithAuth(`${API_BASE_URL}/api/items/${notebook.id}/notes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: notesText }),
        });
      } catch (e) {
        console.error("Notes auto-save failed.");
      }
    }
  };

  // Export notes
  const handleDownloadNotes = () => {
    const blob = new Blob([notebook.notes || "No notes yet."], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${notebook.title.replace(/\s+/g, "_")}_Notes.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Notes exported successfully!");
  };

  // Export podcast script
  const downloadPodcastScript = () => {
    if (!notebook.audioScript || notebook.audioScript.length === 0) {
      toast.error("No podcast script generated yet.");
      return;
    }
    const scriptText = notebook.audioScript
      .map((line) => `[${line.speaker}]: ${line.text}`)
      .join("\n\n");
    const blob = new Blob([scriptText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${notebook.title.replace(/\s+/g, "_")}_Podcast_Script.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Podcast script exported successfully!");
  };

  // Pin insights
  const pinMessage = async (content: string) => {
    if (useRealBackend) {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/items/${notebook.id}/pins`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) throw new Error();
        const newPin = await res.json();
        const currentPins = notebook.pinnedNotes || [];
        onUpdateNotebook({ ...notebook, pinnedNotes: [...currentPins, newPin] });
        toast.success("Pinned to Noteboard!");
      } catch (e) {
        toast.error("Failed to pin message.");
      }
    } else {
      const newPin = { id: crypto.randomUUID(), content };
      const currentPins = notebook.pinnedNotes || [];
      const updatedNb = { ...notebook, pinnedNotes: [...currentPins, newPin] };
      onUpdateNotebook(updatedNb);
      toast.success("Mock Pinned to Noteboard!");
    }
  };

  // Delete pins
  const deletePin = async (pinId: string) => {
    if (useRealBackend) {
      try {
        await fetchWithAuth(`${API_BASE_URL}/api/items/${notebook.id}/pins/${pinId}`, {
          method: "DELETE",
        });
        const currentPins = notebook.pinnedNotes || [];
        onUpdateNotebook({ ...notebook, pinnedNotes: currentPins.filter((p) => p.id !== pinId) });
        toast.success("Pin removed.");
      } catch (e) {
        toast.error("Failed to delete pin.");
      }
    } else {
      const currentPins = notebook.pinnedNotes || [];
      const updatedNb = { ...notebook, pinnedNotes: currentPins.filter((p) => p.id !== pinId) };
      onUpdateNotebook(updatedNb);
      toast.success("Mock Pin removed.");
    }
  };

  // Add custom pin card
  const addCustomCard = () => {
    if (!customCardContent.trim()) return;
    pinMessage(customCardContent);
    setCustomCardContent("");
    setShowAddCard(false);
  };

  // Send RAG chat query
  const onSendMessage = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = customQuery || chatInput;
    if (!query.trim()) return;

    if (selectedSourceIds.length === 0) {
      toast.warning("Check at least one active source in the Left checklist before querying.");
      return;
    }

    const userMsg = { role: "user" as const, content: query };
    const updatedHistory = [...(notebook.chatHistory || []), userMsg];

    onUpdateNotebook({
      ...notebook,
      chatHistory: updatedHistory,
    });
    setChatInput("");
    setIsBotTyping(true);
    setStreamingMessage("");

    const activeItems = sources.filter((s) => selectedSourceIds.includes(s.id));
    const activeContext = activeItems
      .map((s) => `[Source: ${s.title}]:\n${s.content || ""}`)
      .join("\n\n");

    const handleStreamReader = async (response: Response): Promise<string> => {
      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(dataStr);
            const token = parsed.token ?? parsed.text ?? "";
            if (token) {
              accumulated += token;
              setIsBotTyping(false);
              setStreamingMessage(accumulated);
            }
          } catch {
            if (dataStr && !dataStr.startsWith("{")) {
              accumulated += dataStr;
              setIsBotTyping(false);
              setStreamingMessage(accumulated);
            }
          }
        }
      }
      return accumulated;
    };

    if (useRealBackend) {
      let streamed = "";
      let streamSuccess = false;
      const uniqueSourceIds = Array.from(new Set(selectedSourceIds));

      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/items/${notebook.id}/chat?stream=true`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
          },
          body: JSON.stringify({
            question: query,
            selectedSourceIds: uniqueSourceIds,
            context: activeContext,
            stream: true,
          }),
        });

        if (res.ok && res.body) {
          streamed = await handleStreamReader(res);
          if (streamed) streamSuccess = true;
        }
      } catch (err) {
        console.warn("Node gateway chat stream failed, trying direct FastAPI call...", err);
      }

      // Try contacting FastAPI directly at http://localhost:8000/chat
      if (!streamSuccess) {
        try {
          const fastApiRes = await fetch(`${FASTAPI_BASE_URL}/chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "text/event-stream",
            },
            body: JSON.stringify({
              item_id: uniqueSourceIds.join(",") || notebook.id,
              question: query,
              chat_history: notebook.chatHistory || [],
              context: activeContext,
              stream: true,
            }),
          });
          if (fastApiRes.ok && fastApiRes.body) {
            streamed = await handleStreamReader(fastApiRes);
            if (streamed) streamSuccess = true;
          }
        } catch (fErr) {
          console.warn("Direct FastAPI stream failed:", fErr);
        }
      }

      if (streamSuccess && streamed) {
        setIsBotTyping(false);
        setStreamingMessage(null);
        onUpdateNotebook({
          ...notebook,
          chatHistory: [...updatedHistory, { role: "assistant" as const, content: streamed }],
        });
        return;
      }
    }

    // Local simulated response mapping active sources keywords
    setTimeout(() => {
      let reply = "";

      if (activeItems.length === 0) {
        reply = `Please select at least one study resource from the left panel so I can use its context to answer your question!`;
      } else {
        let matchedReply = "";
        for (const item of activeItems) {
          const agentResponse = getSmartAgentResponse(query, item);
          if (agentResponse && !agentResponse.includes("The document focuses on explaining related concepts")) {
            matchedReply = agentResponse;
            break;
          }
        }

        if (matchedReply) {
          reply = matchedReply;
        } else {
          const sourceTitles = activeItems.map(s => `**${s.title}**`).join(", ");
          let excerpt = "";
          const lowerQuery = query.toLowerCase().trim();
          const isGeneralInquiry = ["explain", "abstract", "summary", "summarize", "overview", "what", "intro", "introduction", "tell me"].some(kw => lowerQuery.includes(kw));

          for (const item of activeItems) {
            if (item.content && item.content.length > 30) {
              const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);
              const lines = item.content.split("\n").filter(l => l.trim().length > 20);

              // 1. Try keyword line match
              for (const line of lines) {
                if (queryWords.some(word => line.toLowerCase().includes(word))) {
                  excerpt = line.trim();
                  break;
                }
              }

              // 2. If general inquiry (explain, abstract, overview), take the first major descriptive paragraph
              if (!excerpt && isGeneralInquiry && lines.length > 0) {
                excerpt = lines.slice(0, 3).join("\n\n").trim();
              }

              if (excerpt) break;
            }
          }

          if (excerpt) {
            reply = `Based on ${sourceTitles}:\n\n> "${excerpt}"\n\nWould you like me to dive deeper into any specific section or topic?`;
          } else {
            reply = `I analyzed your selected study sources (${sourceTitles}) for **"${query}"**.\n\nHere is an overview of the core themes in your active documents:\n\n> ${activeItems[0]?.content?.slice(0, 300) || "Document content indexed."}...\n\nFeel free to ask more specific questions or explore particular concepts!`;
          }
        }
      }

      setIsBotTyping(false);
      setStreamingMessage(null);
      onUpdateNotebook({
        ...notebook,
        chatHistory: [
          ...updatedHistory,
          { role: "assistant" as const, content: reply },
        ],
      });
    }, 800);
  };

  // Generate briefing doc
  const generateBriefing = async () => {
    if (selectedSourceIds.length === 0) return toast.warning("Check at least one active source.");
    setIsGeneratingBriefing(true);
    toast.info("Generating Briefing Doc summarizing selected sources...");
    try {
      if (useRealBackend) {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/items/${notebook.id}/briefing`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedSourceIds }),
        });
        const data = await res.json();
        onUpdateNotebook({ ...notebook, briefingDoc: data.briefing_doc });
        toast.success("Briefing Doc compiled!");
      } else {
        setTimeout(() => {
          const activeItems = sources.filter((s) => selectedSourceIds.includes(s.id));
          const sourceTitles = activeItems.map(s => `* **${s.title}** (${s.kind.toUpperCase()})`).join("\n");
          const glossaryItems = activeItems.map(s => {
            if (s.kind === "youtube") {
              return `* **Video Insights**: Highlights career roadmaps, LinkedIn strategies, and ATS resume scanning tricks from the video **"${s.title}"**.`;
            } else if (s.kind === "pdf") {
              return `* **Document Concepts**: Synthesizes formal definitions, system components, and hierarchical models found in **"${s.title}"**.`;
            } else {
              return `* **Additional Reference**: Key notes on "${s.title}" containing active study content.`;
            }
          }).join("\n");

          const briefing = `# 📄 Briefing Document: ${notebook.title}\n\n## 🚀 Executive Summary\nThis briefing aggregates your active study topics. It summarizes key findings across your checked resources, ensuring you won't be cooked for the exams.\n\n## 📚 Grounded Sources Used\n${sourceTitles || "No active sources checked."}\n\n## 🧠 Key Insights & Glossary\n${glossaryItems || "*No specific glossary terms extracted.*"}\n\n## ❓ FAQ\n**Q1: What is the main objective of this study set?**\nTo secure a thorough conceptual understanding and practice active recall before exam day using interactive flashcards and practice quizzes.`;
          onUpdateNotebook({ ...notebook, briefingDoc: briefing });
          toast.success("Briefing Doc compiled!");
        }, 1500);
      }
    } catch (e) {
      toast.error("Failed to compile briefing.");
    }
    setIsGeneratingBriefing(false);
  };

  // Generate audio overview podcast
  const generatePodcast = async () => {
    if (selectedSourceIds.length === 0) return toast.warning("Check at least one active source.");
    setIsGeneratingPodcast(true);
    toast.info("Synthesizing AI Podcast Overview. Grab a coffee, this takes 15-30s...");
    try {
      const h1Name = edgeVoices.find((v) => v.id === voice1Name)?.name?.split(" ")[0] || "Host 1";
      const h2Name = edgeVoices.find((v) => v.id === voice2Name)?.name?.split(" ")[0] || "Host 2";

      if (useRealBackend) {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/items/${notebook.id}/podcast`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: podcastLanguage,
            instructions: podcastInstructions,
            format: podcastFormat,
            duration: podcastDuration,
            pages: podcastPages,
            host1Name: h1Name,
            host2Name: h2Name,
            selectedSourceIds,
          }),
        });
        const data = await res.json();
        onUpdateNotebook({ ...notebook, audioScript: data.script });
        toast.success("AI Podcast Overview generated successfully!");
      } else {
        setTimeout(() => {
          const activeItems = sources.filter((s) => selectedSourceIds.includes(s.id));
          const primarySource = activeItems[0]?.title || "your study sources";
          const script = [
            { speaker: h1Name, text: `Welcome back to your Study Podcast! Today we are locking in on some really interesting topics, specifically looking at ${primarySource}.` },
            { speaker: h2Name, text: "Yes, exactly! No cap, these notes are pretty cooked, but we are going to break them down for you so they actually make sense." },
            { speaker: h1Name, text: `We have ${activeItems.length} active resources loaded. They cover key definitions, architectures, and career roadmaps.` },
            { speaker: h2Name, text: "For real. Let's make sure we study everything thoroughly, run active recall, and ace these exams. Let's get this bread!" },
          ];
          onUpdateNotebook({ ...notebook, audioScript: script });
          toast.success("AI Podcast Overview generated!");
        }, 2000);
      }
    } catch (e) {
      toast.error("Failed to generate podcast overview.");
    }
    setIsGeneratingPodcast(false);
  };

  // Play audio overview podcast
  const playPodcast = async () => {
    if (!notebook.audioScript || notebook.audioScript.length === 0) return;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setPlayingAudioIdx(-1);
      return;
    }

    const h1Name = edgeVoices.find((v) => v.id === voice1Name)?.name?.split(" ")[0] || "Host 1";
    const h2Name = edgeVoices.find((v) => v.id === voice2Name)?.name?.split(" ")[0] || "Host 2";
    const audioUrl = `${FASTAPI_BASE_URL}/tts-full/${notebook.id}?voice1=${voice1Name}&voice2=${voice2Name}&h1Name=${encodeURIComponent(h1Name)}&h2Name=${encodeURIComponent(h2Name)}`;

    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;
    setPlayingAudioIdx(0);
    audio.play();
    audio.onended = () => {
      setPlayingAudioIdx(-1);
      currentAudioRef.current = null;
    };
  };

  const stopPodcast = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setPlayingAudioIdx(-1);
  };

  // YouTube seek handler
  const seekVideo = (seconds: number) => {
    if (iframeRef.current && activeSourcePreviewId) {
      const activeSrc = sources.find(s => s.id === activeSourcePreviewId);
      if (activeSrc && activeSrc.videoId) {
        iframeRef.current.src = `https://www.youtube.com/embed/${activeSrc.videoId}?start=${seconds}&autoplay=1`;
        toast.info(`Seeking video: ${Math.floor(seconds / 60)}m ${seconds % 60}s`);
      }
    }
  };

  // -------------------------------------------------------------
  // RAG QUIZ GENERATOR ACTIONS
  // -------------------------------------------------------------
  const handleGenerateRagQuiz = async () => {
    const targetSourceIds =
      quizTargetSourceId !== "all"
        ? [quizTargetSourceId]
        : selectedSourceIds.length > 0
        ? selectedSourceIds
        : sources.map((s) => s.id);

    if (targetSourceIds.length === 0) {
      toast.warning("Please check or add at least one source material.");
      return;
    }

    setIsGeneratingQuiz(true);
    setUserSelectedAnswers({});
    setCurrentQuestionIdx(0);
    setQuizEvaluation(null);

    try {
      if (useRealBackend) {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/items/${notebook.id}/quiz/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: quizTopic.trim() || undefined,
            num_questions: quizNumQuestions,
            difficulty: quizDifficulty,
            selectedSourceIds: targetSourceIds,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}: Failed to generate quiz`);
        }

        const data = await res.json();
        if (!data.questions || data.questions.length === 0) {
          throw new Error("No grounded questions could be generated from the selected materials.");
        }

        setActiveQuizSessionId(data.session_id);
        setRagQuizQuestions(data.questions);
        setQuizStep("taking");
        toast.success(`Generated ${data.questions.length} grounded questions!`);
      } else {
        // Offline / preview mock generation
        const mockQuestions: RagQuizQuestion[] = [
          {
            id: "rag-q1",
            question: `In the context of ${quizTopic || "this study domain"}, what primary mechanism governs system stability?`,
            options: [
              "Closed-loop feedback calibration with strict error boundaries",
              "Uncontrolled feedforward extrapolation without damping",
              "Asynchronous signal delays exceeding thermal thresholds",
              "Static lookup tables devoid of real-time parameter tuning",
            ],
            source_reference: {
              page_number: 1,
              quote_snippet: "Closed-loop feedback loops ensure deterministic operational bounds.",
            },
          },
          {
            id: "rag-q2",
            question: "Why does active recall substantially improve long-term retention compared to passive reading?",
            options: [
              "Retrieval practice forces neural reconsolidation and strengthens synaptic pathways",
              "It increases the speed of optical scanning across printed lines",
              "It reduces the need to understand fundamental theoretical principles",
              "Passive reading causes immediate permanent memory loss",
            ],
            source_reference: {
              page_number: 2,
              quote_snippet: "Active retrieval demands cognitive reconstruction, deepening semantic memory.",
            },
          },
          {
            id: "rag-q3",
            question: `How are edge cases handled when synthesizing exam questions at ${quizDifficulty} difficulty?`,
            options: [
              "By analyzing multi-hop inferences across disparate passage chunks",
              "By ignoring edge cases and focusing exclusively on surface keywords",
              "By generating trick questions disconnected from the primary text",
              "By copying verbatim introductory sentences only",
            ],
            source_reference: {
              page_number: 3,
              quote_snippet: "Higher-order assessment requires synthesizing interdependent principles.",
            },
          },
        ];

        setActiveQuizSessionId("mock-session-" + Date.now());
        setRagQuizQuestions(mockQuestions.slice(0, quizNumQuestions));
        setQuizStep("taking");
        toast.info("Offline mode: generated grounded practice quiz.");
      }
    } catch (err: any) {
      console.error("Quiz generation error:", err);
      toast.error(err.message || "Failed to generate quiz. Please check backend connection.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSubmitRagQuiz = async () => {
    if (!activeQuizSessionId) return;

    const answeredCount = Object.keys(userSelectedAnswers).length;
    if (answeredCount < ragQuizQuestions.length) {
      const confirmSubmit = window.confirm(
        `You have answered ${answeredCount} of ${ragQuizQuestions.length} questions. Unanswered questions will be evaluated as incorrect. Do you want to submit now?`
      );
      if (!confirmSubmit) return;
    }

    setIsSubmittingQuiz(true);
    try {
      if (useRealBackend) {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/items/${notebook.id}/quiz/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: activeQuizSessionId,
            answers: userSelectedAnswers,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}: Failed to evaluate quiz`);
        }

        const data: RagQuizEvaluation = await res.json();
        setQuizEvaluation(data);
        setQuizStep("results");
        toast.success(`Quiz evaluated: ${data.score}/${data.total_questions} (${data.percentage}%)`);
      } else {
        // Offline / preview mock evaluation
        const mockResults: RagQuizResultItem[] = ragQuizQuestions.map((q, idx) => {
          const userAns = userSelectedAnswers[q.id];
          const isCorrect = userAns === 0; // index 0 is correct in mock
          return {
            id: q.id,
            question: q.question,
            options: q.options,
            user_answer: userAns !== undefined ? userAns : null,
            correct_answer: 0,
            is_correct: isCorrect,
            explanation: `Option A is directly supported by the source text on page ${q.source_reference?.page_number || 1}. It accurately details the mechanism required for optimal system operation.`,
            source_reference: q.source_reference,
          };
        });

        const correctCount = mockResults.filter((r) => r.is_correct).length;
        setQuizEvaluation({
          score: correctCount,
          total_questions: mockResults.length,
          percentage: Math.round((correctCount / mockResults.length) * 100),
          results: mockResults,
        });
        setQuizStep("results");
      }
    } catch (err: any) {
      console.error("Quiz evaluation error:", err);
      toast.error(err.message || "Failed to evaluate quiz submission.");
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const handleResetRagQuiz = () => {
    setQuizStep("config");
    setActiveQuizSessionId(null);
    setRagQuizQuestions([]);
    setUserSelectedAnswers({});
    setQuizEvaluation(null);
    setCurrentQuestionIdx(0);
  };

  // -------------------------------------------------------------
  // TUTOR MODE ACTION HANDLERS
  // -------------------------------------------------------------
  const handleLoadTutorOutline = async () => {
    setIsLoadingOutline(true);
    const targetSourceIds = selectedSourceIds.length > 0 ? selectedSourceIds : sources.map((s) => s.id);

    try {
      if (useRealBackend) {
        // First check for an existing session to support Resume
        try {
          const sessRes = await fetchWithAuth(`${API_BASE_URL}/api/items/${notebook.id}/tutor/session`);
          if (sessRes.ok) {
            const sessData = await sessRes.json();
            if (sessData.session && sessData.session.outline && sessData.session.outline.length > 0) {
              setTutorOutline(sessData.session.outline);
              setActiveChapterIdx(sessData.session.current_section_idx || 0);
              setTutorStepIndex(sessData.session.current_step_idx || 0);
              setTutorSessionStats({
                completedActivities: sessData.session.completed_activities || 0,
                totalActivities: sessData.session.total_activities || 0,
                accuracy: sessData.session.accuracy || 0,
              });
              setIsLoadingOutline(false);
              return;
            }
          }
        } catch (e) {
          console.warn("Could not check previous tutor session:", e);
        }

        const res = await fetchWithAuth(`${API_BASE_URL}/api/items/${notebook.id}/tutor/outline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedSourceIds: targetSourceIds }),
        });
        if (!res.ok) throw new Error("Failed to load tutor outline");
        const data = await res.json();
        setTutorOutline(data.outline || []);
      } else {
        // Offline / preview mock outline
        const mockOutline: TutorChapter[] = [
          {
            id: "sec-1",
            title: "PROFESSIONAL SUMMARY & CORE DOMAIN",
            order_index: 1,
            estimated_minutes: 2,
            page_start: 1,
            summary: "Analyzes high-level background, domain expertise, and core competencies.",
            planned_activities_count: 5,
            source_snippet: "Final-year B.Tech Computer Science student specializing in AI & ML.",
          },
          {
            id: "sec-2",
            title: "TECHNICAL SKILLS & ARCHITECTURES",
            order_index: 2,
            estimated_minutes: 3,
            page_start: 1,
            summary: "Examines generative AI integration, RAG pipelines, FastAPI, React, and vector search.",
            planned_activities_count: 5,
            source_snippet: "AI and Generative AI: LLM integration, pgvector, Supabase, embeddings.",
          },
          {
            id: "sec-3",
            title: "ENGINEERING PROJECTS & REAL-TIME SYSTEMS",
            order_index: 3,
            estimated_minutes: 3,
            page_start: 1,
            summary: "Deep-dives into Audiora and UltraLearn architectural mechanisms.",
            planned_activities_count: 4,
            source_snippet: "Audiora - AI Podcast Platform, and UltraLearn - AI-Powered RAG Workspace.",
          },
          {
            id: "sec-4",
            title: "ACADEMIC FOUNDATIONS & DEPLOYMENT",
            order_index: 4,
            estimated_minutes: 2,
            page_start: 1,
            summary: "Covers database pooling, CI/CD, and production deployment best practices.",
            planned_activities_count: 3,
            source_snippet: "Hands-on implementation of production deployment pipelines.",
          },
        ];
        setTutorOutline(mockOutline);
      }
    } catch (e) {
      console.error("Tutor outline error:", e);
      toast.error("Could not generate tutor outline.");
    } finally {
      setIsLoadingOutline(false);
    }
  };

  const handleStartTutorChapter = async (chapterIdx: number) => {
    setActiveChapterIdx(chapterIdx);
    setTutorStepIndex(0);
    setSectionProgressHistory([]);
    setTutorView("studying");
    await handleLoadTutorStep(chapterIdx, 0);
  };

  const handleLoadTutorStep = async (chapterIdx: number, stepIdx: number) => {
    const chapter = tutorOutline[chapterIdx];
    if (!chapter) return;

    setIsLoadingStep(true);
    setActivityResponse(null);
    setActivityEvaluation(null);
    setIsFlashcardRevealed(false);
    setActivePillDetail(null);
    setFollowupAnswer(null);
    setFollowupQuestion("");

    const targetSourceIds = selectedSourceIds.length > 0 ? selectedSourceIds : sources.map((s) => s.id);

    try {
      if (useRealBackend) {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/items/${notebook.id}/tutor/step`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section_id: chapter.id,
            section_title: chapter.title,
            step_index: stepIdx,
            total_steps: chapter.planned_activities_count || 5,
            selectedSourceIds: targetSourceIds,
          }),
        });
        if (!res.ok) throw new Error("Failed to load tutor step");
        const data = await res.json();
        setTutorStepData(data);
      } else {
        // Offline / preview mock step data
        const mockActivities: TutorActivity[] = [
          {
            id: `act-${stepIdx}-1`,
            type: "flashcard",
            prompt: "What is the primary objective of a Retrieval-Augmented Generation (RAG) pipeline?",
            hint: "Focus on how real-time database context enhances LLM responses.",
            front: "What is the primary purpose of RAG in modern AI applications?",
            back: "RAG connects an LLM to external verified databases (e.g. pgvector), providing real-time domain facts to prevent hallucinated claims.",
          },
          {
            id: `act-${stepIdx}-2`,
            type: "mcq",
            prompt: "Which mechanism best ensures that asynchronous API calls do not freeze the user interface?",
            hint: "Consider JavaScript promise-based execution.",
            options: [
              "Synchronous blocking while waiting for network responses",
              "Promise-based background fetching with state-driven UI updates",
              "Polling the server continuously every millisecond",
              "Restarting the application on every HTTP request",
            ],
            explanation: "Promise-based asynchronous calls allow background data loading without blocking the main rendering thread.",
          },
          {
            id: `act-${stepIdx}-3`,
            type: "fill_blank",
            sentence_before: "In FastAPI applications, input validation is enforced using ",
            expected_word: "pydantic",
            sentence_after: " models to guarantee strict schema compliance.",
            hint: "Think of Python's most popular type-hint validation library.",
            explanation: "Pydantic models validate request payloads before they reach business logic handlers.",
          },
          {
            id: `act-${stepIdx}-4`,
            type: "true_false",
            prompt: "Statement: A vector database using cosine distance orders more semantically similar chunks with smaller distance values.",
            is_true: true,
            explanation: "Cosine distance equals 1 - cosine similarity, so smaller distance corresponds to higher semantic relevance.",
          },
        ];

        const chosenMockAct = mockActivities[stepIdx % mockActivities.length];

        setTutorStepData({
          step_index: stepIdx,
          total_steps: chapter.planned_activities_count || 4,
          concept_pill: {
            concept: "Asynchronous Data Processing & Vector RAG",
            description: "Ensures responsive UI interactions while retrieving context from PostgreSQL.",
          },
          learning_prose:
            "Modern AI learning workspaces combine client-side reactivity with grounded server pipelines. " +
            "By offloading retrieval to vector embeddings, the tutor presents verified facts without ungrounded hallucinations.",
          pills: {
            simpler: "Think of it like an open-book exam: the AI references your document before answering instead of guessing from memory.",
            example: "FastAPI handles the request, queries PostgreSQL via pgvector, and streams back the evaluated response.",
            why: "Guarantees that every quiz question and study flashcard is 100% grounded in your actual uploaded notes.",
          },
          micro_steps: [
            "1. Define request schema with strict types.",
            "2. Retrieve relevant passage embeddings via cosine distance.",
            "3. Synthesize the question and hold the answer key on the server.",
            "4. Return clean, un-leaked activity prompts to the student.",
          ],
          takeaway: "Sequential active recall with source-grounded feedback produces 3x higher retention than passive reading.",
          activity: chosenMockAct,
          source_reference: {
            page_number: chapter.page_start || 1,
            quote_snippet: chapter.source_snippet || "Grounding context from course material.",
          },
        });
      }
    } catch (e) {
      console.error("Tutor step error:", e);
      toast.error("Could not load tutor step.");
    } finally {
      setIsLoadingStep(false);
    }
  };

  const handleSubmitTutorActivity = async () => {
    if (!tutorStepData?.activity || activityResponse === null || activityResponse === undefined || activityResponse === "") {
      toast.warning("Please select or enter an answer before checking.");
      return;
    }

    setIsEvaluatingActivity(true);
    try {
      if (useRealBackend) {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/items/${notebook.id}/tutor/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activity: tutorStepData.activity,
            user_answer: activityResponse,
          }),
        });
        if (!res.ok) throw new Error("Evaluation request failed");
        const evalData: TutorEvaluationResult = await res.json();
        setActivityEvaluation(evalData);

        // Update progress history
        setSectionProgressHistory((prev) => [...prev, evalData.is_correct]);
        setTutorSessionStats((prev) => {
          const newCompleted = prev.completedActivities + 1;
          const newAccuracy = Math.round(
            ((prev.accuracy * prev.completedActivities + (evalData.is_correct ? 100 : 0)) / newCompleted)
          );
          return {
            completedActivities: newCompleted,
            totalActivities: Math.max(newCompleted, prev.totalActivities),
            accuracy: newAccuracy,
          };
        });

        // Persist session to backend
        fetchWithAuth(`${API_BASE_URL}/api/items/${notebook.id}/tutor/session/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outline: tutorOutline,
            current_section_idx: activeChapterIdx,
            current_step_idx: tutorStepIndex,
            completed_activities: tutorSessionStats.completedActivities + 1,
            total_activities: tutorOutline.reduce((acc, c) => acc + (c.planned_activities_count || 4), 0),
            accuracy: evalData.is_correct ? 100 : 80,
          }),
        }).catch((err) => console.warn("Session save warning:", err));
      } else {
        // Offline / preview evaluation
        const isMcq = tutorStepData.activity.type === "mcq";
        const isCorrect = isMcq
          ? Number(activityResponse) === 1
          : String(activityResponse).trim().toLowerCase().includes("pydantic") ||
            activityResponse === true ||
            activityResponse === "mastered";

        const evalData: TutorEvaluationResult = {
          is_correct: isCorrect,
          score: isCorrect ? 100 : 0,
          correct_display: isMcq ? "B" : "Correct Concept",
          explanation: tutorStepData.activity.explanation || "Grounded directly in your document passage.",
          feedback_message: isCorrect
            ? "Correct! Explain the rule that makes this answer work before moving on."
            : "Review the grounded explanation above to solidify this concept.",
        };
        setActivityEvaluation(evalData);
        setSectionProgressHistory((prev) => [...prev, evalData.is_correct]);
      }
    } catch (e) {
      console.error("Evaluation error:", e);
      toast.error("Could not evaluate answer.");
    } finally {
      setIsEvaluatingActivity(false);
    }
  };

  const handleTutorContinue = async () => {
    const currentChapter = tutorOutline[activeChapterIdx];
    const totalStepsInChapter = currentChapter?.planned_activities_count || 4;

    if (tutorStepIndex + 1 < totalStepsInChapter) {
      // Advance to next micro-step in the same chapter
      const nextStepIdx = tutorStepIndex + 1;
      setTutorStepIndex(nextStepIdx);
      await handleLoadTutorStep(activeChapterIdx, nextStepIdx);
    } else {
      // Completed all steps in this chapter!
      if (activeChapterIdx + 1 < tutorOutline.length) {
        // Advance to next chapter
        const nextChapterIdx = activeChapterIdx + 1;
        setActiveChapterIdx(nextChapterIdx);
        setTutorStepIndex(0);
        setSectionProgressHistory([]);
        toast.success(`Completed chapter! Moving to ${tutorOutline[nextChapterIdx]?.title}`);
        await handleLoadTutorStep(nextChapterIdx, 0);
      } else {
        // Entire tutor outline completed!
        setTutorView("completed");
        toast.success("Congratulations! You've mastered all chapters in this document.");
      }
    }
  };

  const handleAskTutorFollowup = async () => {
    if (!followupQuestion.trim()) return;
    setIsLoadingFollowup(true);
    const targetSourceIds = selectedSourceIds.length > 0 ? selectedSourceIds : sources.map((s) => s.id);

    try {
      if (useRealBackend) {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/items/${notebook.id}/tutor/followup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concept_title: tutorStepData?.concept_pill.concept || "Concept",
            question: followupQuestion.trim(),
            selectedSourceIds: targetSourceIds,
          }),
        });
        if (!res.ok) throw new Error("Followup failed");
        const data = await res.json();
        setFollowupAnswer(data.answer);
      } else {
        setFollowupAnswer(
          `According to the document, ${followupQuestion} aligns with the established framework to provide bounded, context-aware execution.`
        );
      }
    } catch (e) {
      toast.error("Could not answer follow-up question.");
    } finally {
      setIsLoadingFollowup(false);
    }
  };

  const previewSource = sources.find((s) => s.id === activeSourcePreviewId);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      
      {/* 1. TOP HEADER BAR */}
      <header className="flex h-14 items-center justify-between px-5 border-b border-border/60 bg-card/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-md border border-border/70 bg-secondary/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary hover:border-border transition-colors outline-none"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Notebooks</span>
          </button>

          <div className="h-4 w-px bg-border/60" />

          <div className="min-w-0 text-left">
            <h1 className="font-semibold text-sm text-foreground truncate max-w-xs md:max-w-md">
              {notebook.title}
            </h1>
            <p className="text-[11px] text-muted-foreground truncate font-mono">
              {selectedSourceIds.length} of {sources.length} sources active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {useRealBackend && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-primary px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 select-none">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              RAG Engine Live
            </span>
          )}
        </div>
      </header>

      {/* 2. THREE-COLUMN VIEW CONTAINER */}
      <div className="flex flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* COLUMN 1: LEFT SOURCE sidebar checklist (lg:col-span-3) */}
        <div className="lg:col-span-3 flex flex-col border-r border-border/60 bg-card/40 overflow-hidden">
          {activeSourcePreviewId && previewSource ? (
            /* SOURCE PREVIEW MODE (SLIDES OVER THE CHECKLIST) */
            <div className="flex flex-col h-full overflow-hidden">
              {/* Preview controls header */}
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-3.5 py-2 text-xs text-muted-foreground shrink-0">
                <button
                  onClick={() => {
                    setActiveSourcePreviewId(null);
                    setPdfPageNum(null);
                  }}
                  className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors font-medium text-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Sources</span>
                </button>
                
                {previewSource.kind === "pdf" && (
                  <div className="flex items-center bg-secondary/80 rounded-md p-0.5 border border-border/60 shrink-0">
                    <button
                      onClick={() => setPdfViewMode("original")}
                      className={`rounded px-2 py-0.5 text-[10px] font-mono font-medium transition-colors ${pdfViewMode === "original" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => setPdfViewMode("text")}
                      className={`rounded px-2 py-0.5 text-[10px] font-mono font-medium transition-colors ${pdfViewMode === "text" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      TXT
                    </button>
                  </div>
                )}

                <button
                  onClick={() => toggleTTS(previewSource.content)}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${isSpeaking ? "bg-primary/15 text-primary font-medium" : "hover:text-foreground text-muted-foreground"}`}
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>{isSpeaking ? "Speaking" : "Read"}</span>
                </button>
              </div>

              {/* Preview Body */}
              <div className="flex-1 overflow-y-auto p-4 scrollbar-thin text-left">
                {previewSource.kind === "pdf" && (
                  pdfViewMode === "original" ? (
                    (() => {
                      const tokenParam = authToken ? `?token=${encodeURIComponent(authToken)}` : "";
                      const staticServerUrl = previewSource.fileName
                        ? `${API_BASE_URL}/api/items/${previewSource.id}/file${tokenParam}`
                        : null;
                      const basePdfSrc = pdfBlobUrl(previewSource.id) || previewSource.localFileUrl || staticServerUrl;
                      const pdfSrc = basePdfSrc
                        ? pdfPageNum
                          ? `${basePdfSrc}#page=${pdfPageNum}`
                          : basePdfSrc
                        : null;

                      return pdfSrc ? (
                        <iframe
                          key={pdfSrc}
                          src={pdfSrc}
                          className="w-full h-full min-h-[calc(100vh-12rem)] border-0 bg-white"
                          title="PDF Preview"
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground p-6">PDF preview offline. Toggle 'TXT' mode to read.</p>
                      );
                    })()
                  ) : (
                    <div className="text-xs whitespace-pre-wrap leading-relaxed text-white/80 p-2 select-text font-sans">
                      {previewSource.content}
                    </div>
                  )
                )}

                {previewSource.kind === "youtube" && (
                  <div className="space-y-4">
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/5">
                      {previewSource.videoId ? (
                        <iframe
                          ref={iframeRef}
                          src={`https://www.youtube.com/embed/${previewSource.videoId}?enablejsapi=1`}
                          title="Youtube player"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                          allowFullScreen
                          className="absolute inset-0 h-full w-full border-0"
                        />
                      ) : (
                        <p className="text-xs p-8 text-center text-muted-foreground">Invalid Video ID</p>
                      )}
                    </div>

                    <div className="flex gap-2 border-b border-white/5 pb-2 text-[10px] font-bold shrink-0 uppercase">
                      <button
                        onClick={() => setYtActiveTab("transcripts")}
                        className={`flex-1 pb-1 text-center ${ytActiveTab === "transcripts" ? "text-primary border-b border-primary" : "text-muted-foreground"}`}
                      >
                        Transcript
                      </button>
                      <button
                        onClick={() => setYtActiveTab("chapters")}
                        className={`flex-1 pb-1 text-center ${ytActiveTab === "chapters" ? "text-primary border-b border-primary" : "text-muted-foreground"}`}
                      >
                        Chapters
                      </button>
                    </div>

                    {ytActiveTab === "chapters" && previewSource.chapters && (
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                        {previewSource.chapters.map((chap, idx) => (
                          <div
                            key={idx}
                            onClick={() => seekVideo(chap.seconds)}
                            className="flex justify-between items-center text-[10px] bg-white/[0.02] border border-white/5 p-2 rounded hover:bg-white/5 cursor-pointer"
                          >
                            <span className="font-semibold text-white/80 truncate max-w-[120px]">{chap.title}</span>
                            <span className="text-primary font-mono">{chap.time}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {ytActiveTab === "transcripts" && previewSource.transcript && (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                        {previewSource.transcript.map((line, idx) => (
                          <div
                            key={idx}
                            onClick={() => seekVideo(line.seconds)}
                            className="text-[10px] text-white/70 hover:text-white cursor-pointer hover:bg-white/5 p-1 rounded transition-colors text-left"
                          >
                            <span className="text-primary font-mono font-bold mr-2">{line.time}</span>
                            <span>{line.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {previewSource.kind === "website" && (
                  <div className="text-xs leading-relaxed text-white/80 whitespace-pre-wrap font-sans p-2">
                    {previewSource.content}
                  </div>
                )}

                {previewSource.kind === "text" && (
                  <div>
                    {isEditingSource ? (
                      <div className="space-y-2.5">
                        <textarea
                          value={editSourceVal}
                          onChange={(e) => setEditSourceVal(e.target.value)}
                          rows={12}
                          className="w-full bg-[#08090d] border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-primary resize-none font-mono"
                        />
                        <div className="flex justify-end gap-2 text-[10px]">
                          <button
                            onClick={() => setIsEditingSource(false)}
                            className="px-3 py-1 border border-white/10 rounded-full hover:bg-white/5"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveSourceTextEdits}
                            className="px-3 py-1 bg-primary text-primary-foreground font-bold rounded-full hover:brightness-110"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            setEditSourceVal(previewSource.content);
                            setIsEditingSource(true);
                          }}
                          className="text-[10px] font-bold text-primary flex items-center gap-1"
                        >
                          <Edit2 className="h-3 w-3" /> Edit notes text
                        </button>
                        <div className="text-xs leading-relaxed text-white/80 whitespace-pre-wrap font-sans p-1 select-text">
                          {previewSource.content}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {previewSource.kind === "research" && (
                  <div className="text-xs leading-relaxed text-white/80 whitespace-pre-wrap p-1 select-text">
                    {previewSource.content}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* SOURCES LIST CHECKLIST VIEW */
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-3 shrink-0">
                <span className="font-semibold text-xs tracking-tight text-foreground">Sources ({sources.length})</span>
                
                {/* Trigger Add Source Panel */}
                <button
                  onClick={() => setActiveInputMode(activeInputMode === "none" ? "files" : "none")}
                  className="rounded-md bg-secondary/80 border border-border/70 hover:bg-secondary text-foreground p-1.5 transition-colors outline-none"
                  title="Add source to notebook"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Dynamic Add Source Panel Overlay inside Left panel */}
              {activeInputMode !== "none" && (
                <div className="border-b border-border/60 bg-secondary/20 p-4 text-left shrink-0">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-3">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-primary">
                      Ingest: {activeInputMode}
                    </span>
                    <button
                      onClick={() => {
                        setActiveInputMode("none");
                        setInputText("");
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {activeInputMode === "files" ? (
                    <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-border/80 rounded-lg p-5 hover:border-primary/50 bg-background/50 hover:bg-secondary/40 transition-colors text-center">
                      <Paperclip className="h-5 w-5 text-muted-foreground mb-2" />
                      <span className="text-xs font-medium text-foreground">Select File</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">PDF, Word, TXT, MD up to 15MB</span>
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        className="hidden"
                        onChange={onFilesSelect}
                      />
                    </label>
                  ) : (
                    <div className="space-y-3">
                      {activeInputMode === "text" ? (
                        <textarea
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder="Paste lecture notes or reference text..."
                          rows={4}
                          className="w-full bg-background border border-border/70 rounded-md p-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 font-sans resize-none"
                        />
                      ) : (
                        <input
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder={
                            activeInputMode === "youtube"
                              ? "Paste YouTube URL..."
                              : activeInputMode === "websites"
                                ? "Paste Website URL..."
                                : "Research topic..."
                          }
                          className="w-full bg-background border border-border/70 rounded-md px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (activeInputMode === "youtube") onAddYoutube();
                              else if (activeInputMode === "websites") onAddWebsite();
                              else if (activeInputMode === "research") onAddDeepResearch();
                            }
                          }}
                        />
                      )}
                      
                      <div className="flex justify-end gap-1.5 text-xs">
                        <button
                          onClick={() => {
                            setActiveInputMode("none");
                            setInputText("");
                          }}
                          className="px-2.5 py-1 border border-border/60 rounded-md hover:bg-secondary transition-colors text-muted-foreground"
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
                          className="px-3 py-1 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors"
                        >
                          Add Source
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mode switch tabs */}
                  <div className="flex justify-between items-center mt-3 border-t border-border/40 pt-2 text-muted-foreground">
                    <button onClick={() => setActiveInputMode("files")} className={`p-1 hover:text-foreground rounded transition-colors ${activeInputMode === "files" ? "text-primary" : ""}`} title="Upload PDF"><Paperclip className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setActiveInputMode("youtube")} className={`p-1 hover:text-foreground rounded transition-colors ${activeInputMode === "youtube" ? "text-primary" : ""}`} title="YouTube link"><Youtube className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setActiveInputMode("websites")} className={`p-1 hover:text-foreground rounded transition-colors ${activeInputMode === "websites" ? "text-primary" : ""}`} title="Web Page"><Link2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setActiveInputMode("text")} className={`p-1 hover:text-foreground rounded transition-colors ${activeInputMode === "text" ? "text-primary" : ""}`} title="Text paste"><Type className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setActiveInputMode("research")} className={`p-1 hover:text-foreground rounded transition-colors ${activeInputMode === "research" ? "text-primary" : ""}`} title="Deep Research"><Search className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              )}

              {/* Scrollable list of source cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 pr-2 scrollbar-thin">
                {sources.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 opacity-40 text-center my-6">
                    <FileStack className="h-8 w-8 mb-2" />
                    <p className="text-xs text-muted-foreground">No sources added yet.</p>
                  </div>
                ) : (
                  sources.map((src) => {
                    const isActive = selectedSourceIds.includes(src.id);
                    return (
                      <div
                        key={src.id}
                        onClick={() => setActiveSourcePreviewId(src.id)}
                        className={`group cursor-pointer rounded-lg border p-2.5 flex items-center justify-between text-left transition-colors ${
                          isActive
                            ? "bg-primary/[0.04] border-primary/30"
                            : "bg-secondary/30 border-border/50 hover:border-border hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          
                          {/* Checkbox wrapper */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSource(src.id);
                            }}
                            className={`grid h-4 w-4 place-items-center rounded border transition-colors shrink-0 ${
                              isActive
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border/80 bg-background hover:border-foreground/50"
                            }`}
                          >
                            {isActive && <Check className="h-3 w-3 stroke-[2.5]" />}
                          </div>

                          <div className="min-w-0">
                            <h5 className="font-medium text-foreground text-xs group-hover:text-primary transition-colors truncate">
                              {src.title}
                            </h5>
                            <span className="text-[10px] text-muted-foreground capitalize font-mono mt-0.5 flex items-center gap-1">
                              {src.kind === "pdf" ? (
                                <FileText className="h-2.5 w-2.5 text-red-400" />
                              ) : src.kind === "youtube" ? (
                                <Youtube className="h-2.5 w-2.5 text-red-500" />
                              ) : src.kind === "website" ? (
                                <Globe className="h-2.5 w-2.5 text-blue-400" />
                              ) : src.kind === "research" ? (
                                <Search className="h-2.5 w-2.5 text-emerald-400" />
                              ) : (
                                <Type className="h-2.5 w-2.5 text-purple-400" />
                              )}
                              <span>{src.kind}</span>
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSource(src.id);
                          }}
                          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* COLUMN 2: CENTER PANEL: GROUNDED CHAT & EMPTY LOADER (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col bg-background border-r border-border/60 overflow-hidden relative">
          {sources.length === 0 ? (
            /* EMPTY NOTEBOOK STATE OVERLAY */
            <div className="flex-1 flex flex-col justify-center items-center text-center p-6 bg-background">
              <div className="mb-4">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <FileStack className="h-6 w-6" />
                </div>
              </div>

              <h2 className="text-base font-semibold text-foreground mb-1">Add knowledge sources</h2>
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mb-6">
                This study workspace is empty. Load course documents, lecture recordings, research, or notes to begin questioning.
              </p>

              {/* Ingestion shortcuts */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm text-left">
                <div
                  onClick={() => setActiveInputMode("files")}
                  className="rounded-lg border border-border/70 bg-card p-3 hover:border-primary/40 hover:bg-secondary/40 transition-colors cursor-pointer"
                >
                  <Paperclip className="h-4 w-4 text-primary mb-1.5" />
                  <span className="font-medium text-xs text-foreground block">Upload Documents</span>
                  <span className="text-[10px] text-muted-foreground block font-mono">PDF, TXT, DOCX</span>
                </div>
                <div
                  onClick={() => setActiveInputMode("youtube")}
                  className="rounded-lg border border-border/70 bg-card p-3 hover:border-primary/40 hover:bg-secondary/40 transition-colors cursor-pointer"
                >
                  <Youtube className="h-4 w-4 text-red-500 mb-1.5" />
                  <span className="font-medium text-xs text-foreground block">YouTube Video</span>
                  <span className="text-[10px] text-muted-foreground block font-mono">Lecture link</span>
                </div>
                <div
                  onClick={() => setActiveInputMode("websites")}
                  className="rounded-lg border border-border/70 bg-card p-3 hover:border-primary/40 hover:bg-secondary/40 transition-colors cursor-pointer"
                >
                  <Globe className="h-4 w-4 text-blue-400 mb-1.5" />
                  <span className="font-medium text-xs text-foreground block">Web Documentation</span>
                  <span className="text-[10px] text-muted-foreground block font-mono">Articles, Docs</span>
                </div>
                <div
                  onClick={() => setActiveInputMode("research")}
                  className="rounded-lg border border-border/70 bg-card p-3 hover:border-primary/40 hover:bg-secondary/40 transition-colors cursor-pointer"
                >
                  <Search className="h-4 w-4 text-emerald-400 mb-1.5" />
                  <span className="font-medium text-xs text-foreground block">Deep Topic Research</span>
                  <span className="text-[10px] text-muted-foreground block font-mono">Automated synthesis</span>
                </div>
              </div>
            </div>
          ) : (
            /* CONVERSATION THREAD CHAT WORKSPACE */
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              
              {/* Grounded chat header */}
              <div className="border-b border-border/60 bg-muted/20 px-4 py-2.5 text-left shrink-0 select-none flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-primary uppercase font-semibold tracking-wider">
                    Socratic AI Tutor
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Grounded in {selectedSourceIds.length} checked source{selectedSourceIds.length !== 1 && "s"}
                  </p>
                </div>

                {selectedSourceIds.length === 0 && (
                  <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                    No source selected
                  </span>
                )}
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {(notebook.chatHistory || []).map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 text-xs leading-relaxed ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-[10px] text-primary shrink-0 select-none font-mono">
                        AI
                      </div>
                    )}
                    
                    <div
                      className={`rounded-lg border p-3.5 max-w-[85%] text-left relative group/bubble ${
                        msg.role === "user"
                          ? "bg-secondary/70 border-border/60 text-foreground"
                          : "bg-card border-border/60 text-card-foreground shadow-xs"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <button
                          onClick={() => pinMessage(msg.content)}
                          className="absolute top-2 right-2 bg-background border border-border/70 p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary opacity-0 group-hover/bubble:opacity-100 transition-opacity z-10"
                          title="Pin response to Noteboard"
                        >
                          <Pin className="h-3 w-3" />
                        </button>
                      )}

                      {msg.role === "assistant" ? (
                        <div className="space-y-2">
                          {msg.content.split("\n").map((line, lidx) => {
                            
                            // Render **bold text**
                            const renderBold = (str: string) => {
                              return str.split(/(\*\*.*?\*\*)/g).map((p, j) => {
                                if (p.startsWith("**") && p.endsWith("**")) {
                                  return (
                                    <strong key={j} className="font-semibold text-foreground">
                                      {p.slice(2, -2)}
                                    </strong>
                                  );
                                }
                                return <span key={j}>{p}</span>;
                              });
                            };

                            // Render inline citations: [Page X] or [Source: name]
                            const renderCitations = (text: string) => {
                              const parts = text.split(/(\[Page \d+\])/g);
                              return parts.map((part, i) => {
                                const match = part.match(/\[Page (\d+)\]/);
                                if (match) {
                                  const page = parseInt(match[1]);
                                  return (
                                    <button
                                      key={i}
                                      onClick={() => {
                                        const pdfSrc = sources.find(s => s.kind === "pdf");
                                        if (pdfSrc) {
                                          setActiveSourcePreviewId(pdfSrc.id);
                                          setPdfViewMode("original");
                                          setPdfPageNum(page);
                                          toast.success(`Opening page ${page} in ${pdfSrc.title}`);
                                        } else {
                                          toast.info(`Source cited: Page ${page}`);
                                        }
                                      }}
                                      className="mx-1 align-baseline inline-flex items-center gap-1 bg-primary/10 hover:bg-primary/20 border border-primary/25 text-primary text-[10px] rounded px-1.5 py-0.5 transition-colors font-mono font-medium"
                                      title={`Jump to Page ${page}`}
                                    >
                                      <BookOpen className="h-2.5 w-2.5" />
                                      <span>p.{page}</span>
                                    </button>
                                  );
                                }
                                return <span key={i}>{renderBold(part)}</span>;
                              });
                            };

                            const cleanLine = line;
                            if (cleanLine.startsWith("### ")) {
                              return (
                                <h5 key={lidx} className="font-semibold text-foreground text-xs mt-3 uppercase tracking-wider text-primary font-mono flex items-center gap-1">
                                  <span>{renderCitations(cleanLine.replace("### ", ""))}</span>
                                </h5>
                              );
                            }
                            if (cleanLine.startsWith("- ") || cleanLine.startsWith("* ")) {
                              return (
                                <li key={lidx} className="list-disc pl-4 text-muted-foreground ml-1 leading-relaxed text-xs">
                                  {renderCitations(cleanLine.replace(/^[-*]\s+/, ""))}
                                </li>
                              );
                            }
                            return (
                              <p key={lidx} className="mb-1.5 last:mb-0 leading-relaxed text-xs text-foreground/90">
                                {renderCitations(cleanLine)}
                              </p>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="leading-relaxed text-xs text-foreground">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Active Real-Time Streaming Message Bubble */}
                {streamingMessage !== null && streamingMessage.length > 0 && (
                  <div className="flex gap-3 text-xs leading-relaxed justify-start">
                    <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-[10px] text-primary shrink-0 select-none font-mono">
                      AI
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card p-3.5 max-w-[85%] text-left relative text-card-foreground shadow-xs">
                      <div className="space-y-2">
                        {streamingMessage.split("\n").map((line, lidx, arr) => {
                          const isLastLine = lidx === arr.length - 1;
                          const cleanLine = line;

                          const renderBold = (str: string) => {
                            return str.split(/(\*\*.*?\*\*)/g).map((p, j) => {
                              if (p.startsWith("**") && p.endsWith("**")) {
                                return (
                                  <strong key={j} className="font-semibold text-foreground">
                                    {p.slice(2, -2)}
                                  </strong>
                                );
                              }
                              return <span key={j}>{p}</span>;
                            });
                          };

                          const renderCitations = (text: string) => {
                            const parts = text.split(/(\[Page \d+\])/g);
                            return parts.map((part, i) => {
                              const match = part.match(/\[Page (\d+)\]/);
                              if (match) {
                                const page = parseInt(match[1]);
                                return (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      const pdfSrc = sources.find(s => s.kind === "pdf");
                                      if (pdfSrc) {
                                        setActiveSourcePreviewId(pdfSrc.id);
                                        setPdfViewMode("original");
                                        setPdfPageNum(page);
                                        toast.success(`Opening page ${page} in ${pdfSrc.title}`);
                                      } else {
                                        toast.info(`Source cited: Page ${page}`);
                                      }
                                    }}
                                    className="mx-1 align-baseline inline-flex items-center gap-1 bg-primary/10 hover:bg-primary/20 border border-primary/25 text-primary text-[10px] rounded px-1.5 py-0.5 transition-colors font-mono font-medium"
                                    title={`Jump to Page ${page}`}
                                  >
                                    <BookOpen className="h-2.5 w-2.5" />
                                    <span>p.{page}</span>
                                  </button>
                                );
                              }
                              return <span key={i}>{renderBold(part)}</span>;
                            });
                          };

                          if (cleanLine.startsWith("### ")) {
                            return (
                              <h5 key={lidx} className="font-semibold text-foreground text-xs mt-3 uppercase tracking-wider text-primary font-mono flex items-center gap-1">
                                <span>{renderCitations(cleanLine.replace("### ", ""))}</span>
                                {isLastLine && (
                                  <span className="inline-block w-1.5 h-3 bg-primary ml-1 animate-pulse align-middle rounded-xs" />
                                )}
                              </h5>
                            );
                          }
                          if (cleanLine.startsWith("- ") || cleanLine.startsWith("* ")) {
                            return (
                              <li key={lidx} className="list-disc pl-4 text-muted-foreground ml-1 leading-relaxed text-xs">
                                {renderCitations(cleanLine.replace(/^[-*]\s+/, ""))}
                                {isLastLine && (
                                  <span className="inline-block w-1.5 h-3 bg-primary ml-1 animate-pulse align-middle rounded-xs" />
                                )}
                              </li>
                            );
                          }
                          return (
                            <p key={lidx} className="mb-1.5 last:mb-0 leading-relaxed text-xs text-foreground/90">
                              {renderCitations(cleanLine)}
                              {isLastLine && (
                                <span className="inline-block w-1.5 h-3 bg-primary ml-1 animate-pulse align-middle rounded-xs" />
                              )}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {(isBotTyping || (streamingMessage !== null && streamingMessage.length === 0)) && (
                  <div className="flex gap-3 text-xs justify-start items-center">
                    <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-[10px] text-primary shrink-0 select-none animate-pulse font-mono">
                      AI
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card px-3.5 py-2 text-muted-foreground">
                      <span className="flex gap-1">
                        <span className="animate-bounce font-bold">.</span>
                        <span className="animate-bounce delay-100 font-bold">.</span>
                        <span className="animate-bounce delay-200 font-bold">.</span>
                      </span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input & Suggestions bar */}
              <div className="border-t border-border/60 pt-3 bg-card/40 p-4 shrink-0">
                <div className="flex flex-wrap gap-1.5 mb-2.5 select-none">
                  <button
                    onClick={() => onSendMessage(undefined, "Generate FAQ with Q&A overview")}
                    className="rounded-md bg-secondary/70 border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    Generate FAQ
                  </button>
                  <button
                    onClick={() => onSendMessage(undefined, "Give me a Socratic practice question")}
                    className="rounded-md bg-secondary/70 border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    Test My Knowledge
                  </button>
                  <button
                    onClick={() => onSendMessage(undefined, "Summarize key terms and equations")}
                    className="rounded-md bg-secondary/70 border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    Terminology
                  </button>
                </div>

                <form
                  onSubmit={onSendMessage}
                  className="flex gap-2 rounded-lg border border-border/70 bg-background px-3 py-1.5 items-center justify-between focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20"
                >
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question about the active materials..."
                    className="bg-transparent text-xs text-foreground outline-none w-full placeholder:text-muted-foreground"
                  />
                  <button
                    type="submit"
                    className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-colors shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* COLUMN 3: RIGHT PANEL: SYNTHESIS TAB SYSTEM (lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col bg-background overflow-hidden">
          
          {/* Navigation Tab selection & Mode Switch */}
          <div className="flex flex-wrap items-center justify-between border-b border-border/60 bg-muted/20 px-3 py-2 shrink-0 select-none gap-2">
            {/* Primary Mode Toggle: [Notebook] [Tutor Mode] */}
            <div className="flex rounded-lg bg-secondary/80 p-0.5 text-xs border border-border/60 gap-0.5">
              <button
                type="button"
                onClick={() => setStudyMode("notebook")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  studyMode === "notebook"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Notebook</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStudyMode("tutor");
                  if (tutorOutline.length === 0) {
                    handleLoadTutorOutline();
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  studyMode === "tutor"
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Tutor Mode</span>
              </button>
            </div>

            {/* When in Notebook Mode: show the 5 study sub-tabs */}
            {studyMode === "notebook" ? (
              <div className="flex rounded-lg bg-secondary/50 p-0.5 text-xs overflow-x-auto max-w-full border border-border/50 gap-0.5">
                <button
                  onClick={() => {
                    setActiveTab("notes");
                    setShowRightWelcome(false);
                  }}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors text-xs font-medium ${
                    activeTab === "notes" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Notes</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("briefing");
                    setShowRightWelcome(false);
                  }}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors text-xs font-medium ${
                    activeTab === "briefing" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <FileStack className="h-3 w-3" />
                  <span>Briefing</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("podcast");
                    setShowRightWelcome(false);
                  }}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors text-xs font-medium ${
                    activeTab === "podcast" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <Headphones className="h-3 w-3" />
                  <span>Audio</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("flashcards");
                    setShowRightWelcome(false);
                  }}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors text-xs font-medium ${
                    activeTab === "flashcards" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Cards</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("quiz");
                    setShowRightWelcome(false);
                  }}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors text-xs font-medium ${
                    activeTab === "quiz" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <HelpCircle className="h-3 w-3" />
                  <span>Quiz</span>
                </button>
              </div>
            ) : (
              /* When in Tutor Mode: show active state or back navigation */
              <div className="flex items-center gap-2 text-xs">
                {tutorView === "studying" && (
                  <button
                    type="button"
                    onClick={() => setTutorView("landing")}
                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border/60 bg-secondary/40"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    <span>Chapters</span>
                  </button>
                )}
                <span className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                  Grounded Tutor
                </span>
              </div>
            )}
          </div>

          {/* TAB CONTENTS CONTAINER */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            
            {/* ========================================================= */}
            {/* TUTOR MODE INTERFACE (Inspired by Reference Screenshots)   */}
            {/* ========================================================= */}
            {studyMode === "tutor" && (
              <div className="h-full flex flex-col justify-start text-left">
                {isLoadingOutline ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                    <Loader2 className="h-7 w-7 text-primary animate-spin" />
                    <p className="text-xs font-semibold text-foreground">Analyzing document structure...</p>
                    <p className="text-[11px] text-muted-foreground max-w-xs">
                      Extracting grounded sections and generating sequential study outline.
                    </p>
                  </div>
                ) : tutorView === "landing" ? (
                  /* A. TUTOR LANDING: WHOLE VS CHAPTERS SELECTION */
                  <div className="space-y-4 pb-8">
                    {/* Document Info Header */}
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground truncate max-w-sm">
                          {previewSource?.title || notebook.title}
                        </h3>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {previewSource?.kind.toUpperCase() || "DOCUMENT"} • ~{tutorOutline.reduce((a, b) => a + (b.estimated_minutes || 2), 0)} min total
                        </p>
                      </div>
                    </div>

                    {/* Scope Selector: Whole vs Chapters */}
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg border border-border/70 bg-secondary/30">
                      <button
                        type="button"
                        onClick={() => setTutorScope("whole")}
                        className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          tutorScope === "whole"
                            ? "bg-card text-foreground shadow-xs border border-border/60"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Whole Source</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTutorScope("chapters")}
                        className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          tutorScope === "chapters"
                            ? "bg-card text-foreground shadow-xs border border-border/60"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Chapters ({tutorOutline.length})</span>
                      </button>
                    </div>

                    {/* Resume Card (if session in progress) */}
                    {tutorSessionStats.completedActivities > 0 && (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04] p-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-semibold uppercase tracking-wider">
                            <Clock className="h-3 w-3" />
                            <span>In-Progress Session</span>
                          </div>
                          <h4 className="text-xs font-semibold text-foreground mt-1">
                            {tutorOutline[activeChapterIdx]?.title || "Resume Chapter"}
                          </h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                            {tutorSessionStats.completedActivities} completed • {tutorSessionStats.accuracy || 100}% accuracy
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStartTutorChapter(activeChapterIdx)}
                          className="flex items-center gap-1 rounded-md bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 active:scale-95 transition-all shadow-xs"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>Resume</span>
                        </button>
                      </div>
                    )}

                    {/* Scope: Whole Source View */}
                    {tutorScope === "whole" ? (
                      <div className="space-y-4">
                        <div className="rounded-lg border border-border/70 bg-card p-4 space-y-2 text-left">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                              <BookOpen className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-foreground">Full Document Mastery</h4>
                              <p className="text-[11px] text-muted-foreground">The AI tutor guides you through all {tutorOutline.length} chapters sequentially.</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                            Every chapter introduces core grounded concepts, micro-steps, and one interactive activity at a time.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStartTutorChapter(0)}
                          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.99] transition-all"
                        >
                          <Play className="h-4 w-4 fill-current" />
                          <span>Start Tutor</span>
                        </button>
                      </div>
                    ) : (
                      /* Scope: Individual Chapters View */
                      <div className="space-y-2.5">
                        {tutorOutline.map((chapter, cIdx) => (
                          <div
                            key={chapter.id || cIdx}
                            className="rounded-lg border border-border/70 bg-card p-3.5 flex items-start justify-between gap-3 hover:border-border transition-colors text-left"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="grid h-5 w-5 place-items-center rounded bg-secondary text-[11px] font-mono font-bold text-foreground">
                                  {chapter.order_index}
                                </span>
                                <h4 className="text-xs font-semibold text-foreground truncate">
                                  {chapter.title}
                                </h4>
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                {chapter.summary}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground pt-0.5">
                                <span>Page {chapter.page_start}</span>
                                <span>•</span>
                                <span>~{chapter.estimated_minutes} min</span>
                                <span>•</span>
                                <span>{chapter.planned_activities_count} activities</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleStartTutorChapter(cIdx)}
                              className="flex items-center gap-1 rounded-md border border-border/70 bg-secondary/60 hover:bg-secondary px-3 py-1.5 text-xs font-medium text-foreground shrink-0 transition-colors"
                            >
                              <span>Start</span>
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : tutorView === "studying" ? (
                  /* B. ACTIVE TUTOR SESSION (Concept, Micro-steps, Activity) */
                  <div className="space-y-4 pb-12">
                    {/* Section Header Card */}
                    <div className="rounded-lg border border-border/70 bg-card p-3.5 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-semibold text-primary uppercase tracking-wider bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                            Focus Chapter
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            ~{tutorOutline[activeChapterIdx]?.estimated_minutes || 2} min
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-foreground mt-1 truncate">
                          {tutorOutline[activeChapterIdx]?.title}
                        </h4>
                      </div>

                      {/* Top Right Mini Step Progress */}
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-mono font-medium text-muted-foreground">
                          {tutorStepIndex + 1}/{tutorOutline[activeChapterIdx]?.planned_activities_count || 4}
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          {Array.from({ length: tutorOutline[activeChapterIdx]?.planned_activities_count || 4 }).map((_, idx) => (
                            <span
                              key={idx}
                              className={`h-1.5 w-3 rounded-full transition-colors ${
                                idx < tutorStepIndex
                                  ? "bg-emerald-500"
                                  : idx === tutorStepIndex
                                  ? "bg-primary animate-pulse"
                                  : "bg-secondary"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {isLoadingStep ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                        <p className="text-xs font-medium text-foreground">Synthesizing grounded lesson step...</p>
                        <p className="text-[10px] text-muted-foreground font-mono">Retrieving verified vector chunks</p>
                      </div>
                    ) : tutorStepData ? (
                      <div className="space-y-4">
                        {/* Concept Pill */}
                        <div className="rounded-md border border-border/60 bg-secondary/30 p-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="text-xs font-semibold text-foreground truncate">
                                {tutorStepData.concept_pill.concept}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsConceptPillExpanded(!isConceptPillExpanded)}
                              className="text-[10px] text-muted-foreground hover:text-foreground font-mono transition-colors shrink-0"
                            >
                              {isConceptPillExpanded ? "collapse" : "expand"}
                            </button>
                          </div>
                          {isConceptPillExpanded && (
                            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed pt-1 border-t border-border/40">
                              {tutorStepData.concept_pill.description}
                            </p>
                          )}
                        </div>

                        {/* Grounded Learning Prose */}
                        <p className="text-xs text-foreground/90 leading-relaxed font-sans">
                          {tutorStepData.learning_prose}
                        </p>

                        {/* Interactive Deep-Dive Exploration Pills */}
                        <div className="flex items-center gap-1.5 select-none">
                          {(["simpler", "example", "why"] as const).map((pill) => {
                            const isActive = activePillDetail === pill;
                            const label = pill === "simpler" ? "Simpler" : pill === "example" ? "Example" : "Why?";
                            return (
                              <button
                                key={pill}
                                type="button"
                                onClick={() => setActivePillDetail(isActive ? null : pill)}
                                className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                                  isActive
                                    ? "bg-amber-500/15 border-amber-500/40 text-amber-400 font-semibold"
                                    : "bg-secondary/40 border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Deep-Dive Expandable Detail Card with Follow-up */}
                        {activePillDetail && (
                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.03] p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-semibold uppercase text-amber-400">
                                {activePillDetail.toUpperCase()} BREAKDOWN
                              </span>
                              <button
                                type="button"
                                onClick={() => setActivePillDetail(null)}
                                className="text-[10px] text-muted-foreground hover:text-foreground"
                              >
                                Close
                              </button>
                            </div>
                            <p className="text-xs text-foreground/90 leading-relaxed">
                              {tutorStepData.pills[activePillDetail]}
                            </p>

                            {/* Mini Follow-up Q&A Form */}
                            <div className="pt-2 border-t border-border/50">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={followupQuestion}
                                  onChange={(e) => setFollowupQuestion(e.target.value)}
                                  placeholder="Ask a quick follow-up question..."
                                  onKeyDown={(e) => e.key === "Enter" && handleAskTutorFollowup()}
                                  className="flex-1 bg-background border border-border/60 rounded px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                                <button
                                  type="button"
                                  disabled={isLoadingFollowup || !followupQuestion.trim()}
                                  onClick={handleAskTutorFollowup}
                                  className="rounded bg-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-400 disabled:opacity-40 transition-colors shrink-0"
                                >
                                  {isLoadingFollowup ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ask"}
                                </button>
                              </div>

                              {followupAnswer && (
                                <p className="text-xs text-foreground/90 bg-background/80 p-2.5 rounded border border-border/50 mt-2 leading-relaxed">
                                  {followupAnswer}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Micro-Steps */}
                        {tutorStepData.micro_steps && tutorStepData.micro_steps.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                              Micro-steps
                            </span>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              {tutorStepData.micro_steps.map((stepText, sIdx) => (
                                <p key={sIdx} className="leading-relaxed text-foreground/80">
                                  {stepText}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Takeaway Box */}
                        {tutorStepData.takeaway && (
                          <div className="rounded-md border border-border/60 bg-secondary/40 p-3 text-xs text-foreground/90 leading-relaxed">
                            <span className="font-semibold text-primary mr-1">Takeaway:</span>
                            {tutorStepData.takeaway}
                          </div>
                        )}

                        {/* Emerald Segmented Progress Bar */}
                        <div className="space-y-1 pt-2">
                          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                            <span>Activity {tutorStepIndex + 1} of {tutorStepData.total_steps}</span>
                            <span>{Math.round(((tutorStepIndex + (activityEvaluation ? 1 : 0)) / tutorStepData.total_steps) * 100)}%</span>
                          </div>
                          <div className="flex items-center gap-1.5 w-full">
                            {Array.from({ length: tutorStepData.total_steps }).map((_, segIdx) => (
                              <div
                                key={segIdx}
                                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                  segIdx < tutorStepIndex || (segIdx === tutorStepIndex && activityEvaluation?.is_correct)
                                    ? "bg-emerald-500"
                                    : segIdx === tutorStepIndex
                                    ? "bg-primary"
                                    : "bg-secondary/80"
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* ============================================== */}
                        {/* THE SINGLE ACTIVE ACTIVITY CARD                */}
                        {/* ============================================== */}
                        {tutorStepData.activity && (
                          <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                                {tutorStepData.activity.type.toUpperCase()}
                              </span>
                              {tutorStepData.activity.hint && !activityEvaluation && (
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  Hint available
                                </span>
                              )}
                            </div>

                            {/* 1. Multiple-Choice Activity */}
                            {tutorStepData.activity.type === "mcq" && (
                              <div className="space-y-3">
                                <p className="text-xs font-semibold leading-relaxed text-foreground">
                                  {tutorStepData.activity.prompt}
                                </p>

                                <div className="space-y-2">
                                  {tutorStepData.activity.options?.map((opt, optIdx) => {
                                    const isSelected = activityResponse === optIdx;
                                    const letter = String.fromCharCode(65 + optIdx);
                                    let btnStyle = "border-border/70 bg-secondary/20 hover:bg-secondary/40 text-foreground";
                                    if (activityEvaluation) {
                                      if (optIdx === (tutorStepData.activity.correct_option ?? 1)) {
                                        btnStyle = "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-semibold";
                                      } else if (isSelected && !activityEvaluation.is_correct) {
                                        btnStyle = "border-destructive/50 bg-destructive/10 text-destructive";
                                      }
                                    } else if (isSelected) {
                                      btnStyle = "border-primary bg-primary/10 text-foreground ring-1 ring-primary";
                                    }

                                    return (
                                      <button
                                        key={optIdx}
                                        type="button"
                                        disabled={activityEvaluation !== null}
                                        onClick={() => setActivityResponse(optIdx)}
                                        className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${btnStyle}`}
                                      >
                                        <span
                                          className={`grid h-5 w-5 shrink-0 place-items-center rounded text-[11px] font-mono font-bold ${
                                            isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                                          }`}
                                        >
                                          {letter}
                                        </span>
                                        <span className="text-xs leading-relaxed pt-0.5">{opt}</span>
                                        {activityEvaluation && optIdx === (tutorStepData.activity.correct_option ?? 1) && (
                                          <Check className="h-4 w-4 text-emerald-400 ml-auto shrink-0" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* 2. Flashcard Activity */}
                            {tutorStepData.activity.type === "flashcard" && (
                              <div className="space-y-3 text-center">
                                <div className="rounded-lg border border-border/70 bg-secondary/30 p-5 space-y-2">
                                  <p className="text-xs font-semibold text-foreground leading-relaxed">
                                    {tutorStepData.activity.front || tutorStepData.activity.prompt}
                                  </p>
                                  {tutorStepData.activity.hint && !isFlashcardRevealed && (
                                    <p className="text-[11px] text-muted-foreground italic">
                                      Hint: {tutorStepData.activity.hint}
                                    </p>
                                  )}

                                  {isFlashcardRevealed ? (
                                    <div className="pt-3 border-t border-border/50 text-xs text-foreground/90 font-medium">
                                      {tutorStepData.activity.back}
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsFlashcardRevealed(true);
                                        setActivityResponse("mastered");
                                      }}
                                      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-4 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                                    >
                                      <Eye className="h-3.5 w-3.5 text-primary" />
                                      <span>Tap to reveal</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 3. Fill in the Blank Activity */}
                            {tutorStepData.activity.type === "fill_blank" && (
                              <div className="space-y-3">
                                <p className="text-xs leading-relaxed text-foreground font-medium">
                                  {tutorStepData.activity.sentence_before}
                                  <input
                                    type="text"
                                    disabled={activityEvaluation !== null}
                                    value={activityResponse || ""}
                                    onChange={(e) => setActivityResponse(e.target.value)}
                                    placeholder="your answer"
                                    className="mx-1.5 inline-block w-36 rounded border border-border/70 bg-background px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                  {tutorStepData.activity.sentence_after}
                                </p>
                                {tutorStepData.activity.hint && (
                                  <p className="text-[10px] text-muted-foreground italic">
                                    💡 Need a hint? {tutorStepData.activity.hint}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* 4. True / False Activity */}
                            {tutorStepData.activity.type === "true_false" && (
                              <div className="space-y-3">
                                <p className="text-xs font-semibold leading-relaxed text-foreground">
                                  {tutorStepData.activity.prompt}
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {[
                                    { val: true, label: "True" },
                                    { val: false, label: "False" },
                                  ].map((choice) => (
                                    <button
                                      key={String(choice.val)}
                                      type="button"
                                      disabled={activityEvaluation !== null}
                                      onClick={() => setActivityResponse(choice.val)}
                                      className={`py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                                        activityResponse === choice.val
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-border/70 bg-secondary/30 text-muted-foreground hover:text-foreground"
                                      }`}
                                    >
                                      {choice.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Submit / Check Answer Button */}
                            {!activityEvaluation && (
                              <button
                                type="button"
                                disabled={isEvaluatingActivity || activityResponse === null || activityResponse === ""}
                                onClick={handleSubmitTutorActivity}
                                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40"
                              >
                                {isEvaluatingActivity ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Evaluating...</span>
                                  </>
                                ) : (
                                  <span>Check Answer</span>
                                )}
                              </button>
                            )}

                            {/* Real-Time Evaluation Result Card & Continue */}
                            {activityEvaluation && (
                              <div className="space-y-3 pt-2 border-t border-border/50">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      {activityEvaluation.is_correct ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                      ) : (
                                        <AlertCircle className="h-4 w-4 text-destructive" />
                                      )}
                                      <span
                                        className={`text-xs font-semibold ${
                                          activityEvaluation.is_correct ? "text-emerald-400" : "text-destructive"
                                        }`}
                                      >
                                        {activityEvaluation.is_correct ? "Correct" : "Needs Review"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                      {activityEvaluation.feedback_message}
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    <span className="text-xs font-mono font-bold text-foreground">
                                      {activityEvaluation.score}%
                                    </span>
                                  </div>
                                </div>

                                {/* Grounded Explanation */}
                                <div className="rounded-md border border-border/60 bg-secondary/40 p-3 text-xs text-foreground/90 leading-relaxed">
                                  <span className="font-semibold text-foreground block mb-0.5">Explanation:</span>
                                  {activityEvaluation.explanation}
                                </div>

                                {/* Continue Action */}
                                <button
                                  type="button"
                                  onClick={handleTutorContinue}
                                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.99] transition-all shadow-xs"
                                >
                                  <span>Continue</span>
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  /* C. SESSION COMPLETED RECAP */
                  <div className="space-y-4 py-8 text-center">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-foreground">Document Tutor Completed!</h3>
                      <p className="text-xs text-muted-foreground">
                        You have mastered all {tutorOutline.length} chapters grounded in your primary document.
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/70 bg-card p-4 max-w-sm mx-auto grid grid-cols-2 gap-2 text-center">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-muted-foreground">Chapters</span>
                        <div className="text-lg font-bold text-foreground mt-0.5">{tutorOutline.length}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-muted-foreground">Accuracy</span>
                        <div className="text-lg font-bold text-emerald-400 mt-0.5">{tutorSessionStats.accuracy || 100}%</div>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTutorView("landing");
                          handleLoadTutorOutline();
                        }}
                        className="rounded-md border border-border/70 px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                      >
                        Review Chapters
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudyMode("notebook")}
                        className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-colors"
                      >
                        Return to Notebook
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* NOTEBOOK MODE INTERFACE (Preserving All Existing Features) */}
            {/* ========================================================= */}
            {studyMode === "notebook" && (
              <>
            {/* B. NOTES TAB (AUTOSAVING MARKDOWN EDITOR) */}
            {activeTab === "notes" && (
              <div className="h-full flex flex-col justify-start gap-3 text-left">
                <div className="flex justify-between items-center border-b border-border/60 pb-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                    Study Notes
                  </span>
                  <button
                    onClick={handleDownloadNotes}
                    className="text-xs font-medium text-primary flex items-center gap-1 hover:text-primary/80 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Export TXT
                  </button>
                </div>

                <textarea
                  value={notebook.notes || ""}
                  onChange={(e) => onSaveNotes(e.target.value)}
                  placeholder="Summarize lessons, jot down exam formulations, or write active recall notes here. Auto-saved."
                  className="w-full bg-card border border-border/60 rounded-lg p-3.5 text-xs font-mono leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:outline-none resize-none min-h-[calc(100vh-14rem)]"
                />
              </div>
            )}

            {/* C. BRIEFING TAB */}
            {activeTab === "briefing" && (
              <div className="h-full flex flex-col justify-start text-left">
                <div className="flex justify-between items-center border-b border-border/60 pb-2 mb-4">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                    Executive Briefing Doc
                  </span>
                  <button
                    onClick={generateBriefing}
                    disabled={isGeneratingBriefing}
                    className="flex items-center gap-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-2.5 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                  >
                    {isGeneratingBriefing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : notebook.briefingDoc ? (
                      <RefreshCw className="h-3 w-3" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    <span>
                      {isGeneratingBriefing
                        ? "Compiling..."
                        : notebook.briefingDoc
                          ? "Regenerate Briefing"
                          : "Compile Briefing"}
                    </span>
                  </button>
                </div>

                <div className="pb-6">
                  {!notebook.briefingDoc ? (
                    <div className="flex flex-col items-center justify-center py-16 opacity-40 text-center px-4">
                      <FileStack className="h-8 w-8 mb-2 text-muted-foreground" />
                      <p className="text-xs font-medium text-foreground">No Briefing compiled</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs leading-normal">
                        Compile a structured study guide, executive summaries, and FAQs across all checked sources.
                      </p>
                    </div>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none text-foreground/85">
                      {notebook.briefingDoc.split("\n").map((line, lidx) => {
                        if (line.startsWith("# "))
                          return (
                            <h2 key={lidx} className="text-sm font-semibold text-foreground mb-3 mt-5 border-b border-border/60 pb-1.5">
                              {line.replace("# ", "")}
                            </h2>
                          );
                        if (line.startsWith("## "))
                          return (
                            <h3 key={lidx} className="text-xs font-mono font-semibold text-primary mb-2 mt-4 tracking-wide uppercase">
                              {line.replace("## ", "")}
                            </h3>
                          );
                        if (line.startsWith("### "))
                          return (
                            <h4 key={lidx} className="text-xs font-medium text-foreground mb-1.5 mt-3">
                              {line.replace("### ", "")}
                            </h4>
                          );
                        if (line.startsWith("- "))
                          return (
                            <li key={lidx} className="list-disc ml-4 my-1 text-xs text-muted-foreground leading-relaxed">
                              {line.replace("- ", "")}
                            </li>
                          );
                        if (line.trim() === "") return <div key={lidx} className="h-2" />;
                        return (
                          <p key={lidx} className="my-1.5 leading-relaxed text-xs text-foreground/80">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* D. PODCAST TAB (AI AUDIO OVERVIEW STUDIO) */}
            {activeTab === "podcast" && (
              <div className="h-full flex flex-col justify-start text-left">
                <div className="flex justify-between items-center border-b border-border/60 pb-2 mb-4">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                    Audio Overview Studio
                  </span>
                  {notebook.audioScript && notebook.audioScript.length > 0 && (
                    <button
                      onClick={downloadPodcastScript}
                      className="text-xs font-medium text-primary flex items-center gap-1 hover:text-primary/80 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" /> Export Script
                    </button>
                  )}
                </div>

                <div className="space-y-4 pb-8">
                  {/* Configuration */}
                  <div className="bg-card border border-border/60 rounded-lg p-4 space-y-3.5">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Headphones className="h-4 w-4 text-primary" />
                      <span>Episode Configuration</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono font-medium text-muted-foreground">Format</label>
                        <select
                          value={podcastFormat}
                          onChange={(e) => setPodcastFormat(e.target.value)}
                          className="w-full bg-background border border-border/70 rounded-md px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                        >
                          <option value="two-hosts">Two Hosts (Discussion)</option>
                          <option value="single-host">Single Host (Monologue)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono font-medium text-muted-foreground">Duration</label>
                        <select
                          value={podcastDuration}
                          onChange={(e) => setPodcastDuration(e.target.value)}
                          className="w-full bg-background border border-border/70 rounded-md px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                        >
                          <option value="Short (~3 mins)">Short (~3m)</option>
                          <option value="Medium (~10 mins)">Medium (~10m)</option>
                          <option value="Long (~20 mins)">Long (~20m)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono font-medium text-muted-foreground">Language</label>
                        <select
                          value={podcastLanguage}
                          onChange={(e) => setPodcastLanguage(e.target.value)}
                          className="w-full bg-background border border-border/70 rounded-md px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                        >
                          {Array.from(new Set(edgeVoices.map((v) => v.lang))).map((l) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono font-medium text-muted-foreground">Host 1 Voice</label>
                        <select
                          value={voice1Name}
                          onChange={(e) => setVoice1Name(e.target.value)}
                          className="w-full bg-background border border-border/70 rounded-md px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                        >
                          {edgeVoices.filter((v) => v.lang === podcastLanguage).map((v) => (
                            <option key={`v1-${v.id}`} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                      {podcastFormat === "two-hosts" && (
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] uppercase font-mono font-medium text-muted-foreground">Host 2 Voice</label>
                          <select
                            value={voice2Name}
                            onChange={(e) => setVoice2Name(e.target.value)}
                            className="w-full bg-background border border-border/70 rounded-md px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                          >
                            {edgeVoices.filter((v) => v.lang === podcastLanguage).map((v) => (
                              <option key={`v2-${v.id}`} value={v.id}>{v.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 pt-2 border-t border-border/50">
                      <label className="text-[10px] uppercase font-mono font-medium text-muted-foreground">Custom Instructions</label>
                      <textarea
                        value={podcastInstructions}
                        onChange={(e) => setPodcastInstructions(e.target.value)}
                        placeholder="e.g. Focus on core formulas, clear academic explanations..."
                        className="w-full bg-background border border-border/70 rounded-md p-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 h-14 resize-none"
                      />
                    </div>

                    <button
                      onClick={generatePodcast}
                      disabled={isGeneratingPodcast}
                      className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs rounded-md transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{isGeneratingPodcast ? "Compiling script..." : "Generate Audio Overview"}</span>
                    </button>
                  </div>

                  {/* Playback scripts */}
                  {notebook.audioScript && notebook.audioScript.length > 0 && (
                    <div className="bg-secondary/30 border border-border/60 rounded-lg p-3.5 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-semibold text-foreground">Audio Overview</span>
                        <div className="flex gap-1.5 text-xs">
                          {playingAudioIdx >= 0 ? (
                            <button onClick={stopPodcast} className="bg-destructive text-destructive-foreground px-3 py-1 rounded-md font-medium flex items-center gap-1"><Pause className="h-3 w-3 fill-current" /> Stop</button>
                          ) : (
                            <button onClick={playPodcast} className="bg-primary text-primary-foreground px-3 py-1 rounded-md font-medium flex items-center gap-1 hover:bg-primary/90"><Play className="h-3 w-3 fill-current" /> Play</button>
                          )}
                          <a
                            href={`${FASTAPI_BASE_URL}/tts-full/${notebook.id}?voice1=${voice1Name}&voice2=${voice2Name}`}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-card text-foreground px-2.5 py-1 border border-border/70 rounded-md font-medium hover:bg-secondary text-xs transition-colors"
                          >
                            MP3
                          </a>
                        </div>
                      </div>

                      {playingAudioIdx >= 0 && (
                        <div className="flex items-center justify-center gap-1 py-2.5 bg-background/80 rounded-md border border-border/50">
                          {Array.from({ length: 16 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-1 rounded-full bg-primary"
                              style={{
                                height: `${Math.floor(Math.random() * 16) + 4}px`,
                                animation: "pulse 1s ease-in-out infinite",
                                animationDelay: `${i * 0.06}s`,
                              }}
                            />
                          ))}
                        </div>
                      )}

                      <div className="bg-background p-3 rounded-md border border-border/60 max-h-52 overflow-y-auto scrollbar-thin space-y-2">
                        {notebook.audioScript.map((line, idx) => {
                          let displaySpeaker = line.speaker;
                          if (line.speaker === "Alex") {
                            displaySpeaker = edgeVoices.find((v) => v.id === voice1Name)?.name?.split(" ")[0] || "Host 1";
                          } else if (line.speaker === "Sam") {
                            displaySpeaker = edgeVoices.find((v) => v.id === voice2Name)?.name?.split(" ")[0] || "Host 2";
                          }
                          return (
                            <p key={idx} className="text-foreground/80 text-xs leading-relaxed">
                              <strong className="text-primary mr-1.5 font-mono">{displaySpeaker}:</strong>
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

            {/* E. FLASHCARDS TAB (Recall Cards) */}
            {activeTab === "flashcards" && (
              <div className="h-full flex flex-col justify-start text-center">
                <div className="flex justify-between items-center border-b border-border/60 pb-2 mb-4 text-left">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                    Recall Flashcards
                  </span>
                  <span className="text-[11px] font-mono font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                    {activeFlashcards.length} Cards
                  </span>
                </div>

                {activeFlashcards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-40 px-4">
                    <Sparkles className="h-8 w-8 mb-2 text-muted-foreground" />
                    <p className="text-xs font-medium text-foreground">No active flashcards</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Check at least one active source on the left to review cards.</p>
                  </div>
                ) : (
                  <div className="flex flex-col justify-between">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
                      Card {flashcardIdx + 1} of {activeFlashcards.length}
                    </div>

                    {/* 3D Flippable card */}
                    <div
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="w-full max-w-[280px] mx-auto h-56 perspective-1000 cursor-pointer"
                    >
                      <div className={`relative w-full h-full duration-500 transform-style-3d ${isFlipped ? "rotate-y-180" : ""}`}>
                        
                        {/* FRONT */}
                        <div className="absolute inset-0 backface-hidden rounded-xl border border-border/70 bg-card p-5 flex flex-col justify-between shadow-xs">
                          <span className="text-[10px] font-mono text-primary font-semibold uppercase tracking-wider bg-primary/10 border border-primary/20 px-2 py-0.5 rounded self-start">Prompt</span>
                          <div className="my-auto py-1 text-center text-xs md:text-sm font-medium leading-relaxed text-card-foreground">
                            {currentFlashcard.question}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground border-t border-border/50 pt-2">Click to flip card</div>
                        </div>

                        {/* BACK */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-xl border border-primary/30 bg-card p-5 flex flex-col justify-between shadow-xs">
                          <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded self-start">Answer</span>
                          <div className="my-auto py-1 text-center text-xs font-medium leading-relaxed text-foreground overflow-y-auto max-h-24 scrollbar-none select-text">
                            {currentFlashcard.answer}
                          </div>
                          {currentFlashcard.hint && currentFlashcard.hint !== "N/A" && (
                            <div className="text-[10px] text-muted-foreground italic text-left bg-secondary/40 p-1.5 rounded border border-border/40 mt-1 select-text">
                              💡 Hint: {currentFlashcard.hint}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>

                    {/* Flashcard Response controls */}
                    <div className="mt-5 flex gap-2.5 max-w-[280px] mx-auto w-full">
                      <button
                        onClick={() => {
                          setFlashcardLog(prev => ({ ...prev, [flashcardIdx]: "review" }));
                          if (flashcardIdx < activeFlashcards.length - 1) {
                            setIsFlipped(false);
                            setTimeout(() => setFlashcardIdx(flashcardIdx + 1), 200);
                          } else {
                            toast.info("Completed recall deck cram session!");
                          }
                        }}
                        className={`flex-1 rounded-md border py-2 text-xs font-medium transition-colors outline-none ${flashcardLog[flashcardIdx] === "review" ? "bg-destructive/15 border-destructive/30 text-destructive" : "border-border/70 text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                      >
                        Review Later
                      </button>
                      <button
                        onClick={() => {
                          setFlashcardLog(prev => ({ ...prev, [flashcardIdx]: "got" }));
                          if (flashcardIdx < activeFlashcards.length - 1) {
                            setIsFlipped(false);
                            setTimeout(() => setFlashcardIdx(flashcardIdx + 1), 200);
                          } else {
                            toast.success("Mastered entire active recall deck!");
                          }
                        }}
                        className={`flex-1 rounded-md border py-2 text-xs font-medium transition-colors outline-none ${flashcardLog[flashcardIdx] === "got" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-semibold" : "border-border/70 text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                      >
                        Mastered
                      </button>
                    </div>

                    {/* Steppers */}
                    <div className="mt-4 flex items-center justify-between max-w-[200px] mx-auto w-full select-none">
                      <button
                        disabled={flashcardIdx === 0}
                        onClick={() => {
                          setIsFlipped(false);
                          setTimeout(() => setFlashcardIdx(flashcardIdx - 1), 150);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-secondary/50 disabled:opacity-30 hover:bg-secondary transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setIsFlipped(false);
                          setFlashcardIdx(0);
                          setFlashcardLog({});
                          toast.info("Deck reset");
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        disabled={flashcardIdx === activeFlashcards.length - 1}
                        onClick={() => {
                          setIsFlipped(false);
                          setTimeout(() => setFlashcardIdx(flashcardIdx + 1), 150);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-secondary/50 disabled:opacity-30 hover:bg-secondary transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* F. RAG QUIZ GENERATOR TAB */}
            {activeTab === "quiz" && (
              <div className="h-full flex flex-col justify-start text-left">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-border/60 pb-2 mb-4 select-none">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                      {quizStep === "config" && "RAG Quiz Generator"}
                      {quizStep === "taking" && `Quiz in Progress • ${currentQuestionIdx + 1}/${ragQuizQuestions.length}`}
                      {quizStep === "results" && "Evaluation Results"}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                    {quizStep === "config" && "Grounded in Chunks"}
                    {quizStep === "taking" && `${quizDifficulty.toUpperCase()}`}
                    {quizStep === "results" && `${quizEvaluation?.score}/${quizEvaluation?.total_questions} (${quizEvaluation?.percentage}%)`}
                  </span>
                </div>

                {/* 1. CONFIGURATION VIEW */}
                {quizStep === "config" && (
                  <div className="space-y-4 pb-8">
                    <div className="rounded-lg border border-border/70 bg-secondary/30 p-3.5 space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary shrink-0" />
                        <h4 className="text-xs font-semibold text-foreground">Grounded Quiz Synthesis</h4>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Synthesizes exam-calibrated multiple choice questions from verified vector chunks of your study materials. Answers are securely verified on the server.
                      </p>
                    </div>

                    {/* Source Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-foreground flex items-center justify-between">
                        <span>Document Source Scope</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {selectedSourceIds.length > 0 ? `${selectedSourceIds.length} active` : "All"}
                        </span>
                      </label>
                      <select
                        value={quizTargetSourceId}
                        onChange={(e) => setQuizTargetSourceId(e.target.value)}
                        className="w-full rounded-md border border-border/70 bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="all">
                          All Checked Sources ({selectedSourceIds.length > 0 ? selectedSourceIds.length : sources.length} materials)
                        </option>
                        {sources.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title} ({s.kind.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Topic Focus */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-foreground flex items-center justify-between">
                        <span>Topic / Focus Area (Optional)</span>
                        <span className="text-[10px] font-mono text-muted-foreground">Vector retrieval</span>
                      </label>
                      <input
                        type="text"
                        value={quizTopic}
                        onChange={(e) => setQuizTopic(e.target.value)}
                        placeholder="e.g. Memory Hierarchy, PID Tuning, Socratic Method..."
                        className="w-full rounded-md border border-border/70 bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    {/* Difficulty Calibration */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-foreground">Difficulty Level</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "easy", label: "Easy", desc: "Core recall & definitions" },
                          { id: "medium", label: "Medium", desc: "Application & mechanisms" },
                          { id: "hard", label: "Hard", desc: "Synthesis & edge cases" },
                        ].map((diff) => (
                          <button
                            key={diff.id}
                            type="button"
                            onClick={() => setQuizDifficulty(diff.id as any)}
                            className={`flex flex-col p-2.5 rounded-lg border text-left transition-all ${
                              quizDifficulty === diff.id
                                ? "border-primary bg-primary/10 shadow-xs"
                                : "border-border/70 bg-card hover:bg-secondary/40 text-muted-foreground"
                            }`}
                          >
                            <span className={`text-xs font-semibold ${quizDifficulty === diff.id ? "text-primary" : "text-foreground"}`}>
                              {diff.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{diff.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question Count */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-foreground">Question Count</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { count: 3, label: "3 Questions", tag: "Quick" },
                          { count: 5, label: "5 Questions", tag: "Standard" },
                          { count: 10, label: "10 Questions", tag: "Drill" },
                        ].map((item) => (
                          <button
                            key={item.count}
                            type="button"
                            onClick={() => setQuizNumQuestions(item.count)}
                            className={`flex flex-col p-2.5 rounded-lg border text-left transition-all ${
                              quizNumQuestions === item.count
                                ? "border-primary bg-primary/10 shadow-xs"
                                : "border-border/70 bg-card hover:bg-secondary/40 text-muted-foreground"
                            }`}
                          >
                            <span className={`text-xs font-semibold ${quizNumQuestions === item.count ? "text-primary" : "text-foreground"}`}>
                              {item.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">{item.tag}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      disabled={isGeneratingQuiz || sources.length === 0}
                      onClick={handleGenerateRagQuiz}
                      className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50"
                    >
                      {isGeneratingQuiz ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Synthesizing grounded quiz...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Generate Grounded RAG Quiz</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* 2. TAKING QUIZ VIEW */}
                {quizStep === "taking" && (
                  <div className="space-y-4 pb-8">
                    {/* Stepper Progress */}
                    <div className="flex items-center justify-between text-xs border-b border-border/50 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-foreground text-xs">
                          Question {currentQuestionIdx + 1} of {ragQuizQuestions.length}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-medium bg-primary/10 border border-primary/20 text-primary">
                          {quizDifficulty}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {Object.keys(userSelectedAnswers).length}/{ragQuizQuestions.length} answered
                        </span>
                        <button
                          onClick={handleResetRagQuiz}
                          className="text-[11px] text-muted-foreground hover:text-foreground underline transition-colors"
                        >
                          Exit
                        </button>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{
                          width: `${((currentQuestionIdx + 1) / ragQuizQuestions.length) * 100}%`,
                        }}
                      />
                    </div>

                    {/* Active Question Prompt */}
                    {ragQuizQuestions[currentQuestionIdx] && (
                      <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3.5">
                        {ragQuizQuestions[currentQuestionIdx].source_reference?.page_number && (
                          <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded border border-border/50">
                            <BookOpen className="h-3 w-3 text-primary" />
                            <span>Grounded from Page {ragQuizQuestions[currentQuestionIdx].source_reference?.page_number}</span>
                          </div>
                        )}

                        <p className="text-sm font-semibold leading-relaxed text-foreground">
                          {ragQuizQuestions[currentQuestionIdx].question}
                        </p>

                        {/* Options */}
                        <div className="space-y-2 pt-1">
                          {ragQuizQuestions[currentQuestionIdx].options.map((opt, optIdx) => {
                            const qId = ragQuizQuestions[currentQuestionIdx].id;
                            const isSelected = userSelectedAnswers[qId] === optIdx;
                            const letter = String.fromCharCode(65 + optIdx);
                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => {
                                  setUserSelectedAnswers((prev) => ({
                                    ...prev,
                                    [qId]: optIdx,
                                  }));
                                }}
                                className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                                    : "border-border/70 bg-secondary/20 hover:bg-secondary/50 text-foreground/90"
                                }`}
                              >
                                <span
                                  className={`grid h-5 w-5 shrink-0 place-items-center rounded text-[11px] font-mono font-bold transition-colors ${
                                    isSelected
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-secondary text-muted-foreground"
                                  }`}
                                >
                                  {letter}
                                </span>
                                <span className="text-xs font-normal leading-relaxed pt-0.5">{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Stepper Navigation */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        disabled={currentQuestionIdx === 0}
                        onClick={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
                        className="flex items-center gap-1 rounded-md border border-border/70 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Previous</span>
                      </button>

                      {/* Quick-jump Dots */}
                      <div className="flex items-center gap-1.5">
                        {ragQuizQuestions.map((q, qIdx) => {
                          const isCurrent = qIdx === currentQuestionIdx;
                          const isAnswered = userSelectedAnswers[q.id] !== undefined;
                          return (
                            <button
                              key={q.id}
                              onClick={() => setCurrentQuestionIdx(qIdx)}
                              className={`h-2.5 rounded-full transition-all ${
                                isCurrent
                                  ? "w-6 bg-primary"
                                  : isAnswered
                                  ? "w-2.5 bg-primary/60"
                                  : "w-2.5 bg-border hover:bg-muted-foreground"
                              }`}
                              title={`Question ${qIdx + 1}`}
                            />
                          );
                        })}
                      </div>

                      {currentQuestionIdx < ragQuizQuestions.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setCurrentQuestionIdx((p) => Math.min(ragQuizQuestions.length - 1, p + 1))}
                          className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                        >
                          <span>Next</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isSubmittingQuiz}
                          onClick={handleSubmitRagQuiz}
                          className="flex items-center gap-1 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                        >
                          {isSubmittingQuiz ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Evaluating...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Submit Quiz</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Always accessible Submit helper */}
                    {currentQuestionIdx < ragQuizQuestions.length - 1 && (
                      <div className="pt-2 text-center border-t border-border/40">
                        <button
                          type="button"
                          disabled={isSubmittingQuiz}
                          onClick={handleSubmitRagQuiz}
                          className="text-[11px] text-muted-foreground hover:text-foreground underline transition-colors"
                        >
                          Finished early? Submit all answered questions for evaluation
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. EVALUATION RESULTS VIEW */}
                {quizStep === "results" && (
                  <div className="space-y-4 pb-8">
                    {quizEvaluation && (
                      <div className="rounded-lg border border-border/70 bg-secondary/30 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Mastery Score</span>
                            <div className="text-2xl font-bold font-display text-foreground mt-0.5">
                              {quizEvaluation.score} / {quizEvaluation.total_questions}{" "}
                              <span className="text-sm font-normal text-muted-foreground">
                                ({quizEvaluation.percentage}%)
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${
                                quizEvaluation.percentage >= 80
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : quizEvaluation.percentage >= 50
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  : "bg-destructive/10 text-destructive border-destructive/30"
                              }`}
                            >
                              {quizEvaluation.percentage >= 80
                                ? "🌟 High Mastery"
                                : quizEvaluation.percentage >= 50
                                ? "⚡ Solid Recall"
                                : "📖 Needs Review"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                          <p className="text-[11px] text-muted-foreground">
                            {quizEvaluation.percentage >= 80
                              ? "Excellent retention grounded in primary course materials."
                              : "Review grounded explanations and document citations below."}
                          </p>

                          <button
                            type="button"
                            onClick={handleResetRagQuiz}
                            className="flex items-center gap-1.5 rounded-md border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>New Quiz</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Question Review Cards */}
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                          Grounded Explanations & Citations
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {quizEvaluation?.results.filter((r) => r.is_correct).length} correct •{" "}
                          {quizEvaluation?.results.filter((r) => !r.is_correct).length} incorrect
                        </span>
                      </div>

                      {quizEvaluation?.results.map((res, rIdx) => {
                        const isCorrect = res.is_correct;
                        return (
                          <div
                            key={res.id || rIdx}
                            className={`rounded-lg border p-4 space-y-3 text-left transition-colors ${
                              isCorrect
                                ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                                : "border-destructive/30 bg-destructive/[0.03]"
                            }`}
                          >
                            {/* Card Header */}
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                                Question {rIdx + 1}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${
                                  isCorrect
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-destructive/10 text-destructive border-destructive/20"
                                }`}
                              >
                                {isCorrect ? (
                                  <>
                                    <Check className="h-3 w-3" />
                                    <span>Correct</span>
                                  </>
                                ) : (
                                  <>
                                    <X className="h-3 w-3" />
                                    <span>Incorrect</span>
                                  </>
                                )}
                              </span>
                            </div>

                            {/* Question */}
                            <p className="text-xs font-semibold leading-relaxed text-foreground">
                              {res.question}
                            </p>

                            {/* Options with Status */}
                            <div className="space-y-1.5 pt-1">
                              {res.options.map((opt, optIdx) => {
                                const isSelected = res.user_answer === optIdx;
                                const isActualCorrect = res.correct_answer === optIdx;
                                const letter = String.fromCharCode(65 + optIdx);

                                let optionStyle = "border-border/50 bg-card/60 text-muted-foreground/70";
                                if (isActualCorrect) {
                                  optionStyle = "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-medium";
                                } else if (isSelected && !isCorrect) {
                                  optionStyle = "border-destructive/50 bg-destructive/10 text-destructive font-medium";
                                }

                                return (
                                  <div
                                    key={optIdx}
                                    className={`flex items-start gap-2.5 rounded-md border p-2 text-xs ${optionStyle}`}
                                  >
                                    <span className="font-mono font-bold text-[10px] pt-0.5">{letter}.</span>
                                    <span className="flex-1 leading-relaxed">{opt}</span>
                                    {isActualCorrect && (
                                      <span className="text-[10px] font-mono text-emerald-400 shrink-0 font-medium">
                                        ✓ Correct
                                      </span>
                                    )}
                                    {isSelected && !isActualCorrect && (
                                      <span className="text-[10px] font-mono text-destructive shrink-0 font-medium">
                                        ✗ Your Choice
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Grounded Explanation */}
                            <div className="rounded-md border border-border/60 bg-secondary/40 p-3 space-y-1 text-left">
                              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-foreground/80 font-medium">
                                <Sparkles className="h-3 w-3 text-primary" />
                                <span>Grounded Explanation</span>
                              </div>
                              <p className="text-xs text-foreground/90 leading-relaxed font-normal">
                                {res.explanation}
                              </p>
                            </div>

                            {/* Primary Source Citation */}
                            {res.source_reference && (
                              <div className="flex items-center justify-between text-[11px] bg-card/80 border border-border/60 rounded px-2.5 py-1.5">
                                <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                                  <BookOpen className="h-3 w-3 text-primary shrink-0" />
                                  <span className="font-mono text-[10px] shrink-0">
                                    {res.source_reference.page_number
                                      ? `Page ${res.source_reference.page_number}`
                                      : "Source Chunk"}
                                  </span>
                                  {res.source_reference.quote_snippet && (
                                    <span className="italic text-[10px] text-muted-foreground/80 truncate">
                                      "{res.source_reference.quote_snippet}"
                                    </span>
                                  )}
                                </div>

                                {res.source_reference.page_number && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (res.source_reference?.page_number) {
                                        setPdfPageNum(res.source_reference.page_number);
                                        toast.info(`Navigated document preview to page ${res.source_reference.page_number}`);
                                      }
                                    }}
                                    className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1 shrink-0 ml-2"
                                  >
                                    <span>Jump to Page {res.source_reference.page_number}</span>
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            </>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
