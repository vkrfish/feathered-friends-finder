import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../integrations/supabase/client";

const API_BASE_URL = (import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:3001").replace(/\/+$/, "");
const FASTAPI_BASE_URL = (import.meta.env.VITE_FASTAPI_URL || "http://localhost:8000").replace(/\/+$/, "");

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
  Download,
  Trash2,
  Pause,
  Plus,
  ArrowUp,
  Globe,
  Pin,
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
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();
      if (!activeSession) {
        if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
          return;
        }
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
}: StudySessionPanelProps) {
  
  const [activeTab, setActiveTab] = useState<
    "pins" | "notes" | "briefing" | "podcast" | "flashcards" | "quiz"
  >("pins");
  
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

  // Quiz states
  const [quizAnswers, setQuizAnswers] = useState<{ [qIdx: number]: number }>({});
  
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

  // Aggregated quizzes from active checked sources
  const activeQuiz = sources
    .filter((s) => selectedSourceIds.includes(s.id))
    .flatMap((s) => s.quiz || []);

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
                      const staticServerUrl = previewSource.fileName
                        ? `${API_BASE_URL}/api/items/${previewSource.id}/file`
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
          
          {/* Navigation Tab selection */}
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-3 py-2 shrink-0 select-none">
            <div className="flex rounded-lg bg-secondary/60 p-0.5 text-xs overflow-x-auto max-w-full border border-border/50 gap-0.5">
              
              <button
                onClick={() => {
                  setActiveTab("pins");
                  setShowRightWelcome(false);
                }}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors text-xs font-medium ${
                  activeTab === "pins" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                <Pin className="h-3 w-3" />
                <span>Noteboard</span>
              </button>

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
                <BookOpen className="h-3 w-3" />
                <span>Quiz</span>
              </button>

            </div>
          </div>

          {/* TAB CONTENTS CONTAINER */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            
            {/* A. PINS TAB (NOTEBOARD INDEX GRID) */}
            {activeTab === "pins" && (
              <div className="h-full flex flex-col justify-start">
                <div className="flex justify-between items-center border-b border-border/60 pb-2 mb-3 select-none">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                    Noteboard Index Cards
                  </span>
                  
                  {/* Custom pin adder */}
                  <button
                    onClick={() => setShowAddCard(!showAddCard)}
                    className="text-xs font-medium text-primary flex items-center gap-1 hover:text-primary/80 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Card
                  </button>
                </div>

                {showAddCard && (
                  <div className="mb-4 rounded-lg border border-border/70 bg-card p-3 text-left">
                    <textarea
                      value={customCardContent}
                      onChange={(e) => setCustomCardContent(e.target.value)}
                      placeholder="Write custom facts, key points, or formula definitions..."
                      rows={3}
                      className="w-full bg-background border border-border/70 rounded-md p-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none"
                    />
                    <div className="flex justify-end gap-1.5 mt-2 text-xs">
                      <button onClick={() => setShowAddCard(false)} className="px-2.5 py-1 border border-border/60 rounded-md hover:bg-secondary text-muted-foreground transition-colors">Cancel</button>
                      <button onClick={addCustomCard} className="px-3 py-1 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors">Pin Card</button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pb-6 text-left">
                  {(!notebook.pinnedNotes || notebook.pinnedNotes.length === 0) && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 opacity-40 text-center px-4">
                      <Pin className="h-7 w-7 mb-2 text-muted-foreground" />
                      <p className="text-xs text-foreground font-medium">Your noteboard is empty</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal max-w-xs">
                        Pin important responses by clicking the pin icon on chat messages, or click '+ Add Card'.
                      </p>
                    </div>
                  )}

                  {notebook.pinnedNotes?.map((pin) => (
                    <div
                      key={pin.id}
                      className="group bg-card border border-border/60 rounded-lg p-3 hover:border-border transition-colors flex flex-col justify-between h-36 relative"
                    >
                      <button
                        onClick={() => deletePin(pin.id)}
                        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity z-10 p-1 rounded hover:bg-secondary"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <div className="text-xs text-foreground/85 pr-5 leading-relaxed overflow-y-auto scrollbar-none font-sans whitespace-pre-wrap flex-1 select-text">
                        {pin.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                  {!notebook.briefingDoc && (
                    <button
                      onClick={generateBriefing}
                      disabled={isGeneratingBriefing}
                      className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{isGeneratingBriefing ? "Compiling..." : "Compile Briefing"}</span>
                    </button>
                  )}
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

            {/* F. QUIZ TAB (Practice Quiz) */}
            {activeTab === "quiz" && (
              <div className="h-full flex flex-col justify-start text-left">
                <div className="flex justify-between items-center border-b border-border/60 pb-2 mb-4 select-none">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                    Socratic Quizzes
                  </span>
                  <span className="text-[11px] font-mono font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                    {activeQuiz.length} Questions
                  </span>
                </div>

                {activeQuiz.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-40 text-center px-4">
                    <BookOpen className="h-8 w-8 mb-2 text-muted-foreground" />
                    <p className="text-xs font-medium text-foreground">No quizzes available</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Check active sources on the left checklist to load practice quizzes.</p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-8">
                    {activeQuiz.map((q, qIdx) => {
                      const isAnswered = quizAnswers[qIdx] !== undefined;
                      const selectedAnswer = quizAnswers[qIdx];
                      return (
                        <div key={qIdx} className="rounded-lg border border-border/60 bg-card p-3.5 text-left">
                          <span className="text-[10px] font-mono font-semibold text-primary uppercase tracking-wider">
                            Question {qIdx + 1}
                          </span>
                          <p className="mt-1 text-xs font-medium leading-relaxed text-foreground">
                            {q.question}
                          </p>

                          <div className="mt-3 space-y-1.5">
                            {q.options.map((opt, optIdx) => {
                              let btnClass = "border-border/60 bg-background hover:bg-secondary/70 text-foreground/90";
                              if (isAnswered) {
                                if (optIdx === q.answer) {
                                  btnClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium";
                                } else if (selectedAnswer === optIdx) {
                                  btnClass = "bg-destructive/10 border-destructive/30 text-destructive font-medium";
                                } else {
                                  btnClass = "border-border/40 bg-background/50 text-muted-foreground/40 cursor-default";
                                }
                              }
                              return (
                                <button
                                  key={optIdx}
                                  disabled={isAnswered}
                                  onClick={() => {
                                    setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
                                    if (optIdx === q.answer) {
                                      toast.success(`Correct! Question ${qIdx + 1}`);
                                    } else {
                                      toast.error(`Incorrect! Question ${qIdx + 1}`);
                                    }
                                  }}
                                  className={`w-full rounded-md border px-3 py-2 text-left text-xs transition-colors ${btnClass}`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    <div className="text-center pt-2 border-t border-border/50">
                      <button
                        onClick={() => {
                          setQuizAnswers({});
                          toast.info("Quiz reset");
                        }}
                        className="rounded-md border border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      >
                        Reset quiz answers
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
