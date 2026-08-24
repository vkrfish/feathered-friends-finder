import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../integrations/supabase/client";

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
    } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      setSession(activeSession);
      if (!activeSession) {
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
        const res = await fetchWithAuth("http://localhost:3001/api/items");
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
          const nbDetailRes = await fetchWithAuth(`http://localhost:3001/api/items/${activeNotebookId}`);
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
        const res = await fetchWithAuth("http://localhost:3001/api/notebooks", {
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
        const res = await fetchWithAuth(`http://localhost:3001/api/notebooks/${id}`, {
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

    const uploadPromise = useRealBackend && !backendOffline
      ? fetchWithAuth("http://localhost:3001/api/items/file", {
          method: "POST",
          body: formData,
        })
      : null;

    runSimulatedAnalysis(fileLogs, async () => {
      if (useRealBackend && !backendOffline && uploadPromise) {
        try {
          const res = await uploadPromise;
          if (!res.ok) throw new Error("Fail upload");
          const data = await res.json();
          blobUrlsRef.current.set(data.id, blobUrl);

          setAnalysisLogs((prev) => [...prev, "⚡ Vector processing and index complete!"]);
          setAnalysisProgress(95);

          await fetchItems();
          setSelectedSourceIds((prev) => [...prev, data.id]);
          toast.success(`Indexed successfully: ${file.name}`);
        } catch (e) {
          toast.error("Could not upload. Make sure Node API is running.");
          URL.revokeObjectURL(blobUrl);
          setIsAnalyzing(false);
        }
      } else {
        const today = new Date();
        const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
        const newItem: StudyItem = {
          id: crypto.randomUUID(),
          notebookId: activeNotebookId,
          title: file.name.split(".")[0],
          createdAt: today.toISOString(),
          kind: "pdf",
          fileName: file.name,
          content: docData.content,
          localFileUrl: URL.createObjectURL(file),
          flashcards: docData.flashcards,
          quiz: docData.quiz,
          notes: "",
          chatHistory: [],
        };
        const allItems = localStorage.getItem("ultra_learn_items")
          ? JSON.parse(localStorage.getItem("ultra_learn_items")!)
          : [];
        const updated = [newItem, ...allItems];
        saveLocalItems(updated);
        setSelectedSourceIds((prev) => [...prev, newItem.id]);
        toast.success(`Mock-indexed ${file.name}`);
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
          const res = await fetchWithAuth("http://localhost:3001/api/items/youtube", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, notebook_id: activeNotebookId }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();

          setAnalysisLogs((prev) => [...prev, "⚡ YouTube transcript chapters aligned!"]);
          setAnalysisProgress(95);

          await fetchItems();
          setSelectedSourceIds((prev) => [...prev, data.id]);
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
          const res = await fetchWithAuth("http://localhost:3001/api/items/website", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, notebook_id: activeNotebookId }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();

          setAnalysisLogs((prev) => [...prev, "⚡ Webpage indexing finished!"]);
          setAnalysisProgress(95);

          await fetchItems();
          setSelectedSourceIds((prev) => [...prev, data.id]);
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
          const res = await fetchWithAuth("http://localhost:3001/api/items/text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: inputText, notebook_id: activeNotebookId }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();

          setAnalysisLogs((prev) => [...prev, "⚡ Text session indexed successfully!"]);
          setAnalysisProgress(95);

          await fetchItems();
          setSelectedSourceIds((prev) => [...prev, data.id]);
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
          const res = await fetchWithAuth("http://localhost:3001/api/items/research", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic, notebook_id: activeNotebookId }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();

          setAnalysisLogs((prev) => [...prev, "⚡ Deep research agent finalized report!"]);
          setAnalysisProgress(95);

          await fetchItems();
          setSelectedSourceIds((prev) => [...prev, data.id]);
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
        const res = await fetchWithAuth(`http://localhost:3001/api/items/${id}`, {
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
          <header className="flex items-center justify-between border-b border-white/5 bg-card/45 px-6 py-4.5 backdrop-blur-xl sticky top-0 z-45 gap-4">
            <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-[1.01]">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/20 border border-primary/30">
                <div
                  className="h-3.5 w-3.5 rotate-45 bg-primary"
                  style={{ clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)" }}
                />
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-white glow-text">
                LearnX
              </span>
            </Link>

            <div className="flex items-center gap-4">
              {/* Backend Mode Switch */}
              <button
                onClick={() => {
                  setUseRealBackend(!useRealBackend);
                  toast.info(
                    !useRealBackend
                      ? "Connecting to local PostgreSQL API Gateway..."
                      : "Switched to local simulated memory mode."
                  );
                }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-mono font-bold tracking-wide uppercase border transition-all ${
                  useRealBackend && !backendOffline
                    ? "bg-primary/10 border-primary/20 text-primary"
                    : "bg-orange-500/10 border-orange-500/20 text-orange-400"
                }`}
              >
                <span>{useRealBackend && !backendOffline ? "Postgres Gateway" : "Simulated Local"}</span>
              </button>

              {/* Streak Badge */}
              <div className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/10 select-none">
                <Flame className="h-3.5 w-3.5 text-primary animate-pulse" />
                <span>3 day streak</span>
              </div>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 border border-primary/30 text-xs font-semibold uppercase text-primary hover:brightness-110 active:scale-95 transition-all outline-none"
                >
                  {profileInitial}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#0c0d12] p-1 shadow-2xl z-50 text-left backdrop-blur-xl">
                    <div className="px-3 py-2 border-b border-white/5 text-[10px] text-muted-foreground truncate font-mono">
                      {session?.user?.email}
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-white/5 transition-all text-left font-semibold"
                    >
                      <X className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1140px] w-full px-6 pb-24 pt-10 flex-1 flex flex-col justify-start text-left">
            
            {/* Title heading */}
            <div className="mb-10">
              <h1 className="text-4xl font-extrabold tracking-tight text-white font-display md:text-5xl">
                Let's study, <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">{profileName}</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-2 font-mono">
                "cooked for exams? no cap we got you. select or create a notebook below to cram."
              </p>
            </div>

            {/* Trial Banner */}
            {showTrial && (
              <div className="relative mb-10 rounded-2xl border border-white/5 bg-gradient-to-r from-primary/5 to-transparent p-5.5 shadow-lg backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                <button
                  onClick={() => setShowTrial(false)}
                  className="absolute right-3.5 top-3.5 rounded-full p-1 text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                    <span>Free Cramming Tier Active</span>
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-xl leading-relaxed">
                    You are currently running on the Socratic Free tier. Upgrade to access unlimited deep research dossiers, custom Edge TTS podcast narrations, and 100+ page vector ingestion.
                  </p>
                </div>
                <a
                  href="#"
                  className="rounded-full bg-white px-5 py-2 text-xs font-bold text-black hover:bg-white/95 active:scale-95 transition-all inline-block shadow shrink-0 self-start md:self-auto"
                >
                  View Plans
                </a>
              </div>
            )}

            {/* Lobby List header & search */}
            <div>
              <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold tracking-tight text-white font-display">
                    My Study Notebooks
                  </h3>
                  <span className="rounded-full bg-white/5 border border-white/5 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {filteredNotebooks.length} notebooks
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Search box */}
                  <div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-3.5 py-1.5 w-full md:w-64 focus-within:border-primary/45 focus-within:bg-white/[0.04] transition-all">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search notebooks..."
                      className="w-full bg-transparent text-xs text-white placeholder:text-muted-foreground outline-none"
                    />
                  </div>

                  {/* Sort dropdown */}
                  <button
                    onClick={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
                    className="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.02] px-3.5 py-1.5 text-xs text-muted-foreground hover:text-white transition-all font-semibold"
                  >
                    <span>{sortBy === "newest" ? "Newest" : "Oldest"}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Grid / List render */}
              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                {/* 1. Add Notebook Card */}
                <div
                  onClick={() => setShowCreateDialog(true)}
                  className="group cursor-pointer rounded-2xl border border-dashed border-white/10 hover:border-primary/40 bg-white/[0.01] hover:bg-primary/[0.01] h-48 flex flex-col items-center justify-center transition-all shadow-md hover:scale-[1.01]"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 border border-primary/20 group-hover:scale-105 group-hover:bg-primary/20 transition-all text-primary mb-3">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="font-display font-bold text-sm text-white group-hover:text-primary transition-colors">
                    New Notebook
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    create a study folder
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
                    className="group cursor-pointer rounded-2xl border border-white/5 bg-[#0a0b10]/45 p-6 hover:border-primary/25 transition-all shadow-xl hover:scale-[1.01] flex flex-col justify-between h-48 text-left relative overflow-hidden"
                  >
                    {/* Visual accent glow */}
                    <div className="absolute top-0 right-0 h-16 w-16 bg-primary/5 rounded-bl-full pointer-events-none group-hover:bg-primary/10 transition-colors" />

                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="rounded-lg bg-primary/10 border border-primary/20 p-2 text-primary">
                          <FileStack className="h-4.5 w-4.5" />
                        </div>
                        <button
                          onClick={(e) => onDeleteNotebook(nb.id, e)}
                          className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-red-400 transition-colors"
                          title="Delete Notebook"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <h4 className="font-display font-extrabold text-white text-base mt-4 truncate group-hover:text-primary transition-colors">
                        {nb.title}
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-mono mt-1 line-clamp-2 leading-relaxed">
                        {nb.notes || "No notes in this notebook yet."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-4 text-[10px] font-mono text-muted-foreground">
                      <span>
                        {new Date(nb.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 border border-primary/10 rounded">
                        Active Recall Folder
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. MODAL DIALOG TO CREATE NOTEBOOK */}
          {showCreateDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0f14] p-6 shadow-2xl text-left relative overflow-hidden">
                <h3 className="font-display font-extrabold text-lg text-white mb-2">
                  Create Study Notebook
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Name your notebook. If left blank, we'll auto-generate a funny title for you.
                </p>

                <input
                  value={newNotebookTitle}
                  onChange={(e) => setNewNotebookTitle(e.target.value)}
                  placeholder="e.g. Delulu Cram Session, Midterm Panic Kit"
                  className="w-full rounded-xl border border-white/10 bg-[#08090d] px-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:border-primary focus:outline-none transition-colors mb-5"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCreateNotebook();
                  }}
                  autoFocus
                />

                <div className="flex justify-end gap-2.5">
                  <button
                    onClick={() => {
                      setShowCreateDialog(false);
                      setNewNotebookTitle("");
                    }}
                    className="rounded-full border border-white/10 px-5 py-2 text-xs font-semibold text-muted-foreground hover:bg-white/5 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onCreateNotebook}
                    className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:brightness-110 active:scale-95 transition-all shadow-[0_0_12px_oklch(0.82_0.14_160/0.25)]"
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
  }, [notebook.chatHistory, isBotTyping]);

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
        await fetchWithAuth(`http://localhost:3001/api/items/${notebook.id}/notes`, {
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

  // Pin insights
  const pinMessage = async (content: string) => {
    if (useRealBackend) {
      try {
        const res = await fetchWithAuth(`http://localhost:3001/api/items/${notebook.id}/pins`, {
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
        await fetchWithAuth(`http://localhost:3001/api/items/${notebook.id}/pins/${pinId}`, {
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

    if (useRealBackend) {
      try {
        const res = await fetchWithAuth(`http://localhost:3001/api/items/${notebook.id}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: query, selectedSourceIds }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setIsBotTyping(false);
        onUpdateNotebook({
          ...notebook,
          chatHistory: [...updatedHistory, { role: "assistant" as const, content: data.content }],
        });
      } catch (err) {
        setIsBotTyping(false);
        toast.error("Failed to query RAG service.");
      }
    } else {
      // Local simulated response mapping active sources keywords
      setTimeout(() => {
        const activeItems = sources.filter((s) => selectedSourceIds.includes(s.id));
        let reply = "";

        if (activeItems.length === 0) {
          reply = `Yo, you haven't checked any sources in the left sidebar! Click a checkbox next to a file, video, or website so I can lock in on the context. No cap, I can't read your mind yet! 💀`;
        } else {
          // Look for a smart matched response from our active items
          let matchedReply = "";
          for (const item of activeItems) {
            const agentResponse = getSmartAgentResponse(query, item);
            // If it's not the generic fallback warning, use it!
            if (agentResponse && !agentResponse.includes("The document focuses on explaining related concepts")) {
              matchedReply = agentResponse;
              break;
            }
          }

          if (matchedReply) {
            reply = matchedReply;
          } else {
            // No specific keyword match, let's generate a highly engaging, gen-zy, dynamic fallback grounded in their source titles!
            const sourceTitles = activeItems.map(s => `**${s.title}**`).join(" & ");
            const intros = [
              `No cap, I locked in and scanned ${sourceTitles}. Here is the tea on your question:`,
              `I just deep-dived into your study files (${sourceTitles}) and honestly, you're not cooked. Here is what we know:`,
              `My sensors are screaming that you're cramming. Based on ${sourceTitles}, here's the lowdown:`,
              `Scanning ${sourceTitles}... complete. Let's get this bread. Here is what I found regarding "${query}":`
            ];
            const randomIntro = intros[Math.floor(Math.random() * intros.length)];

            // Let's grab some snippet of content from the active sources to make it look grounded!
            let excerpt = "";
            for (const item of activeItems) {
              if (item.content && item.content.length > 50) {
                // Try to find a sentence or line containing some query word
                const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                const lines = item.content.split("\n");
                let foundLine = "";
                for (const line of lines) {
                  if (queryWords.some(word => line.toLowerCase().includes(word))) {
                    foundLine = line.trim();
                    break;
                  }
                }
                if (foundLine) {
                  excerpt = foundLine;
                  break;
                }
              }
            }

            if (excerpt) {
              reply = `${randomIntro}\n\n> "${excerpt}"\n\nThis is directly from your source. Check out the synthesis tabs on the right side if you want to test your knowledge or listen to the podcast, fr fr! [Page 1]`;
            } else {
              // Try to summarize or show some key content from the first item
              const firstItem = activeItems[0];
              const snippet = firstItem.content ? firstItem.content.split("\n").filter(l => l.trim().length > 30).slice(0, 2).join("\n") : "";

              if (snippet) {
                reply = `${randomIntro}\n\nHere is a key reference from ${firstItem.title}:\n\n${snippet}\n\nIf you want to practice this, check the Flashcards or Quizzes on the right tab. You got this! [Page 1]`;
              } else {
                reply = `${randomIntro}\n\nI couldn't find a direct reference to "${query}" in the text of your active sources, but we can generate flashcards or a briefing doc for ${sourceTitles} on the right side to help you lock in! [Page 1]`;
              }
            }
          }
        }

        setIsBotTyping(false);
        onUpdateNotebook({
          ...notebook,
          chatHistory: [
            ...updatedHistory,
            { role: "assistant" as const, content: reply },
          ],
        });
      }, 900);
    }
  };

  // Generate briefing doc
  const generateBriefing = async () => {
    if (selectedSourceIds.length === 0) return toast.warning("Check at least one active source.");
    setIsGeneratingBriefing(true);
    toast.info("Generating Briefing Doc summarizing selected sources...");
    try {
      if (useRealBackend) {
        const res = await fetchWithAuth(`http://localhost:3001/api/items/${notebook.id}/briefing`, {
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
        const res = await fetchWithAuth(`http://localhost:3001/api/items/${notebook.id}/podcast`, {
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
    const audioUrl = `http://localhost:8000/tts-full/${notebook.id}?voice1=${voice1Name}&voice2=${voice2Name}&h1Name=${encodeURIComponent(h1Name)}&h2Name=${encodeURIComponent(h2Name)}`;

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
      <header className="flex h-16 items-center justify-between px-6 border-b border-white/5 bg-card/65 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-all outline-none"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Notebooks Lobby</span>
          </button>

          <div className="h-4 w-px bg-white/10" />

          <div className="min-w-0 text-left">
            <h1 className="font-display font-extrabold text-sm text-white truncate max-w-xs md:max-w-md">
              {notebook.title}
            </h1>
            <p className="text-[10px] text-muted-foreground truncate font-mono mt-0.5 uppercase tracking-wider">
              {selectedSourceIds.length} of {sources.length} sources active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {useRealBackend && (
            <span className="text-[9px] font-bold uppercase text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 select-none tracking-wide">
              RAG Engine Connected
            </span>
          )}
        </div>
      </header>

      {/* 2. THREE-COLUMN VIEW CONTAINER */}
      <div className="flex flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* COLUMN 1: LEFT SOURCE sidebar checklist (lg:col-span-3) */}
        <div className="lg:col-span-3 flex flex-col border-r border-white/5 bg-[#090a0d] overflow-hidden">
          {activeSourcePreviewId && previewSource ? (
            /* SOURCE PREVIEW MODE (SLIDES OVER THE CHECKLIST) */
            <div className="flex flex-col h-full overflow-hidden">
              {/* Preview controls header */}
              <div className="flex items-center justify-between border-b border-white/5 bg-[#08090d]/60 px-4 py-2.5 text-[11px] text-muted-foreground shrink-0">
                <button
                  onClick={() => {
                    setActiveSourcePreviewId(null);
                    setPdfPageNum(null);
                  }}
                  className="flex items-center gap-1 text-white hover:text-primary transition-colors font-semibold"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Sources List</span>
                </button>
                
                {previewSource.kind === "pdf" && (
                  <div className="flex items-center bg-white/5 rounded-full p-0.5 border border-white/10 shrink-0">
                    <button
                      onClick={() => setPdfViewMode("original")}
                      className={`rounded-full px-2.5 py-0.5 text-[8px] font-bold ${pdfViewMode === "original" ? "bg-white text-black" : "text-white/60"}`}
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => setPdfViewMode("text")}
                      className={`rounded-full px-2.5 py-0.5 text-[8px] font-bold ${pdfViewMode === "text" ? "bg-white text-black" : "text-white/60"}`}
                    >
                      TXT
                    </button>
                  </div>
                )}

                <button
                  onClick={() => toggleTTS(previewSource.content)}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${isSpeaking ? "bg-primary/20 text-primary animate-pulse" : "hover:text-white"}`}
                >
                  <Volume2 className="h-3 w-3" />
                  <span>Read</span>
                </button>
              </div>

              {/* Preview Body */}
              <div className="flex-1 overflow-y-auto p-4 scrollbar-thin text-left">
                {previewSource.kind === "pdf" && (
                  pdfViewMode === "original" ? (
                    (() => {
                      const staticServerUrl = previewSource.fileName
                        ? `http://localhost:3001/api/items/${previewSource.id}/file`
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
              <div className="flex items-center justify-between border-b border-white/5 bg-[#090a0f] px-4 py-3 shrink-0">
                <span className="font-display font-extrabold text-sm text-white">Sources ({sources.length})</span>
                
                {/* Trigger Add Source Panel */}
                <button
                  onClick={() => setActiveInputMode(activeInputMode === "none" ? "files" : "none")}
                  className="rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:scale-105 active:scale-95 text-primary p-1.5 transition-all outline-none"
                  title="Add source to notebook"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Dynamic Add Source Panel Overlay inside Left panel */}
              {activeInputMode !== "none" && (
                <div className="border-b border-white/5 bg-primary/5 p-4 text-left shrink-0">
                  <div className="flex items-center justify-between border-b border-white/[0.03] pb-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-mono">
                      Ingest: {activeInputMode}
                    </span>
                    <button
                      onClick={() => {
                        setActiveInputMode("none");
                        setInputText("");
                      }}
                      className="text-muted-foreground hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {activeInputMode === "files" ? (
                    <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-white/10 rounded-xl p-5 hover:border-primary/30 bg-black/20 hover:bg-black/35 transition-all text-center">
                      <Paperclip className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-[10px] font-semibold text-white/90">Select File</span>
                      <span className="text-[8px] text-muted-foreground mt-0.5 font-mono">PDF, Word, TXT up to 15MB</span>
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
                          placeholder="Paste academic definitions or lecture logs..."
                          rows={4}
                          className="w-full bg-[#08090d] border border-white/10 rounded-lg p-2 text-[10px] text-white outline-none focus:border-primary font-sans resize-none"
                        />
                      ) : (
                        <input
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder={
                            activeInputMode === "youtube"
                              ? "Paste Youtube Link..."
                              : activeInputMode === "websites"
                                ? "Paste Website Link..."
                                : "Research topic..."
                          }
                          className="w-full bg-[#08090d] border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-primary"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (activeInputMode === "youtube") onAddYoutube();
                              else if (activeInputMode === "websites") onAddWebsite();
                              else if (activeInputMode === "research") onAddDeepResearch();
                            }
                          }}
                        />
                      )}
                      
                      <div className="flex justify-end gap-1.5 text-[9px]">
                        <button
                          onClick={() => {
                            setActiveInputMode("none");
                            setInputText("");
                          }}
                          className="px-2.5 py-1 border border-white/5 rounded-full hover:bg-white/5"
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
                          className="px-3 py-1 bg-primary text-primary-foreground font-bold rounded-full hover:brightness-110"
                        >
                          Process
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tab icons to easily switch modes */}
                  <div className="flex justify-between items-center mt-3 border-t border-white/[0.03] pt-2 text-muted-foreground">
                    <button onClick={() => setActiveInputMode("files")} className={`p-1 hover:text-white ${activeInputMode === "files" ? "text-primary" : ""}`} title="Upload PDF"><Paperclip className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setActiveInputMode("youtube")} className={`p-1 hover:text-white ${activeInputMode === "youtube" ? "text-primary" : ""}`} title="YouTube link"><Youtube className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setActiveInputMode("websites")} className={`p-1 hover:text-white ${activeInputMode === "websites" ? "text-primary" : ""}`} title="Web Page"><Link2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setActiveInputMode("text")} className={`p-1 hover:text-white ${activeInputMode === "text" ? "text-primary" : ""}`} title="Text paste"><Type className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setActiveInputMode("research")} className={`p-1 hover:text-white ${activeInputMode === "research" ? "text-primary" : ""}`} title="Deep agent research"><Search className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              )}

              {/* Scrollable list of source cards */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 pr-2 scrollbar-thin">
                {sources.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 opacity-30 text-center my-6">
                    <FileStack className="h-8 w-8 mb-2" />
                    <p className="text-xs">No sources added yet.</p>
                  </div>
                ) : (
                  sources.map((src) => {
                    const isActive = selectedSourceIds.includes(src.id);
                    return (
                      <div
                        key={src.id}
                        onClick={() => setActiveSourcePreviewId(src.id)}
                        className={`group cursor-pointer rounded-xl border p-3 flex items-center justify-between text-left transition-all ${
                          isActive
                            ? "bg-primary/[0.02] border-primary/20"
                            : "bg-[#0b0c10]/30 border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          
                          {/* Checkbox wrapper */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSource(src.id);
                            }}
                            className={`grid h-4.5 w-4.5 place-items-center rounded border transition-colors shrink-0 ${
                              isActive
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-white/20 bg-black/40 hover:border-white/45"
                            }`}
                          >
                            {isActive && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>

                          <div className="min-w-0">
                            <h5 className="font-semibold text-white/90 text-[11px] group-hover:text-primary transition-colors truncate">
                              {src.title}
                            </h5>
                            <span className="text-[9px] text-muted-foreground capitalize font-mono mt-0.5 block flex items-center gap-1">
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
                          className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
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
        <div className="lg:col-span-5 flex flex-col bg-[#07080a] border-r border-white/5 overflow-hidden relative">
          {sources.length === 0 ? (
            /* EMPTY NOTEBOOK STATE OVERLAY */
            <div className="flex-1 flex flex-col justify-center items-center text-center p-6 bg-[#07080a]">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px]" />
              </div>

              <div className="relative mb-6">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/5 border border-primary/25 text-primary shadow-[0_0_20px_oklch(0.82_0.14_160/0.1)]">
                  <FileStack className="h-7 w-7 animate-pulse" />
                </div>
              </div>

              <h2 className="text-xl font-display font-extrabold text-white mb-2">Add sources to get started</h2>
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mb-8">
                This study notebook is empty. Load lecture guides, past exams, website tutorials, or research topics to start querying.
              </p>

              {/* Large styled tiles for ingestion */}
              <div className="grid grid-cols-2 gap-3.5 w-full max-w-sm text-left">
                <div
                  onClick={() => setActiveInputMode("files")}
                  className="rounded-xl border border-white/5 bg-[#0b0c10]/45 p-3.5 hover:border-primary/25 transition-all cursor-pointer hover:scale-[1.01]"
                >
                  <Paperclip className="h-4 w-4 text-primary mb-2" />
                  <span className="font-semibold text-xs text-white block">Upload Files</span>
                  <span className="text-[9px] text-muted-foreground block font-mono mt-0.5">PDF, TXT, Word</span>
                </div>
                <div
                  onClick={() => setActiveInputMode("youtube")}
                  className="rounded-xl border border-white/5 bg-[#0b0c10]/45 p-3.5 hover:border-primary/25 transition-all cursor-pointer hover:scale-[1.01]"
                >
                  <Youtube className="h-4 w-4 text-red-500 mb-2" />
                  <span className="font-semibold text-xs text-white block">YouTube link</span>
                  <span className="text-[9px] text-muted-foreground block font-mono mt-0.5">Video lecture</span>
                </div>
                <div
                  onClick={() => setActiveInputMode("websites")}
                  className="rounded-xl border border-white/5 bg-[#0b0c10]/45 p-3.5 hover:border-primary/25 transition-all cursor-pointer hover:scale-[1.01]"
                >
                  <Globe className="h-4 w-4 text-blue-400 mb-2" />
                  <span className="font-semibold text-xs text-white block">Website URL</span>
                  <span className="text-[9px] text-muted-foreground block font-mono mt-0.5">Wikipedia, Docs</span>
                </div>
                <div
                  onClick={() => setActiveInputMode("research")}
                  className="rounded-xl border border-white/5 bg-[#0b0c10]/45 p-3.5 hover:border-primary/25 transition-all cursor-pointer hover:scale-[1.01]"
                >
                  <Search className="h-4 w-4 text-emerald-400 mb-2" />
                  <span className="font-semibold text-xs text-white block">Deep Research</span>
                  <span className="text-[9px] text-muted-foreground block font-mono mt-0.5">Agent crawler</span>
                </div>
              </div>
            </div>
          ) : (
            /* CONVERSATION THREAD CHAT WORKSPACE */
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              
              {/* Grounded chat header */}
              <div className="border-b border-white/5 bg-[#08090f]/75 px-5 py-3 text-left shrink-0 select-none flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-primary uppercase font-bold tracking-wider">
                    AI Study Assistant
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                    Grounded in {selectedSourceIds.length} checked knowledge source{selectedSourceIds.length !== 1 && "s"}
                  </p>
                </div>

                {selectedSourceIds.length === 0 && (
                  <span className="text-[8px] font-bold uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded animate-pulse">
                    No active source
                  </span>
                )}
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
                {(notebook.chatHistory || []).map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 text-xs leading-relaxed ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center font-bold text-[9px] text-primary shrink-0 select-none font-mono">
                        AI
                      </div>
                    )}
                    
                    <div
                      className={`rounded-2xl border px-3.5 py-3 max-w-[85%] text-left relative group/bubble ${
                        msg.role === "user"
                          ? "bg-white/[0.03] border-white/10 text-white rounded-tr-none"
                          : "bg-[#0b0c11] border-white/5 text-white/95 rounded-tl-none"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <button
                          onClick={() => pinMessage(msg.content)}
                          className="absolute -top-2 -right-2 bg-black border border-white/10 p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-white/10 opacity-0 group-hover/bubble:opacity-100 transition-all z-20 shadow-xl"
                          title="Pin response to Noteboard"
                        >
                          <Pin className="h-3 w-3" />
                        </button>
                      )}

                      {msg.role === "assistant" ? (
                        <div className="space-y-2.5">
                          {msg.content.split("\n").map((line, lidx) => {
                            
                            // Render **bold text**
                            const renderBold = (str: string) => {
                              return str.split(/(\*\*.*?\*\*)/g).map((p, j) => {
                                if (p.startsWith("**") && p.endsWith("**")) {
                                  return (
                                    <strong key={j} className="font-semibold text-white">
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
                                        // Open first PDF source and preview page X
                                        const pdfSrc = sources.find(s => s.kind === "pdf");
                                        if (pdfSrc) {
                                          setActiveSourcePreviewId(pdfSrc.id);
                                          setPdfViewMode("original");
                                          setPdfPageNum(page);
                                          toast.success(`Jumping to original PDF: ${pdfSrc.title} (Page ${page})`);
                                        } else {
                                          toast.info(`Cited content excerpt page ${page}.`);
                                        }
                                      }}
                                      className="mx-1 align-baseline inline-flex items-center gap-0.5 bg-primary/10 hover:bg-primary/20 border border-primary/25 text-primary text-[8.5px] rounded-full px-2 py-0.5 transition-all font-mono font-bold"
                                      title={`Jump to Page ${page}`}
                                    >
                                      <BookOpen className="h-2.5 w-2.5" />
                                      <span>{page}</span>
                                    </button>
                                  );
                                }
                                return <span key={i}>{renderBold(part)}</span>;
                              });
                            };

                            const cleanLine = line;
                            if (cleanLine.startsWith("### ")) {
                              return (
                                <h5 key={lidx} className="font-bold text-white text-xs mt-3 uppercase tracking-wider text-primary font-mono flex items-center gap-1">
                                  <span>{renderCitations(cleanLine.replace("### ", ""))}</span>
                                </h5>
                              );
                            }
                            if (cleanLine.startsWith("- ") || cleanLine.startsWith("* ")) {
                              return (
                                <li key={lidx} className="list-disc pl-4 text-white/70 ml-1 leading-relaxed text-[11.5px]">
                                  {renderCitations(cleanLine.replace(/^[-*]\s+/, ""))}
                                </li>
                              );
                            }
                            return (
                              <p key={lidx} className="mb-2 last:mb-0 leading-relaxed text-[11.5px] text-white/80">
                                {renderCitations(cleanLine)}
                              </p>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="leading-relaxed text-[11.5px] text-white/95">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {isBotTyping && (
                  <div className="flex gap-3 text-xs justify-start items-center">
                    <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center font-bold text-[9px] text-primary shrink-0 select-none animate-pulse font-mono">
                      AI
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-[#0b0c11] px-4 py-2.5 text-muted-foreground/60">
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
              <div className="border-t border-white/5 pt-3.5 bg-[#07080a] p-4.5 shrink-0">
                <div className="flex flex-wrap gap-1.5 mb-3 select-none">
                  <button
                    onClick={() => onSendMessage(undefined, "Generate FAQ with Q&A overview")}
                    className="rounded-full bg-white/5 border border-white/5 px-3 py-1 text-[9px] font-semibold text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
                  >
                    Generate FAQ
                  </button>
                  <button
                    onClick={() => onSendMessage(undefined, "Give me a Socratic practice question")}
                    className="rounded-full bg-white/5 border border-white/5 px-3 py-1 text-[9px] font-semibold text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
                  >
                    Test Me
                  </button>
                  <button
                    onClick={() => onSendMessage(undefined, "Summarize key terms and equations")}
                    className="rounded-full bg-white/5 border border-white/5 px-3 py-1 text-[9px] font-semibold text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
                  >
                    Glossary
                  </button>
                </div>

                <form
                  onSubmit={onSendMessage}
                  className="flex gap-2 rounded-full border border-white/10 bg-[#0c0d12] px-3.5 py-1.5 items-center justify-between"
                >
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask AI tutor anything about checked documents..."
                    className="bg-transparent text-xs text-white outline-none w-full placeholder:text-muted-foreground/60 px-1"
                  />
                  <button
                    type="submit"
                    className="grid h-7.5 w-7.5 place-items-center rounded-full bg-white text-black hover:bg-white/95 active:scale-95 transition-all shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* COLUMN 3: RIGHT PANEL: SYNTHESIS TAB SYSTEM (lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col bg-[#07080a] overflow-hidden">
          
          {/* Navigation Tab selection */}
          <div className="flex items-center justify-between border-b border-white/5 bg-[#090a0f] px-3 py-2.5 shrink-0 select-none">
            <div className="flex rounded-full bg-white/5 p-0.5 text-xs overflow-x-auto max-w-full">
              
              <button
                onClick={() => {
                  setActiveTab("pins");
                  setShowRightWelcome(false);
                }}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 transition-all text-[9.5px] font-bold uppercase ${
                  activeTab === "pins" ? "bg-white text-black font-extrabold shadow" : "text-muted-foreground hover:text-white"
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
                className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 transition-all text-[9.5px] font-bold uppercase ${
                  activeTab === "notes" ? "bg-white text-black font-extrabold shadow" : "text-muted-foreground hover:text-white"
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
                className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 transition-all text-[9.5px] font-bold uppercase ${
                  activeTab === "briefing" ? "bg-white text-black font-extrabold shadow" : "text-muted-foreground hover:text-white"
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
                className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 transition-all text-[9.5px] font-bold uppercase ${
                  activeTab === "podcast" ? "bg-white text-black font-extrabold shadow" : "text-muted-foreground hover:text-white"
                }`}
              >
                <Headphones className="h-3 w-3" />
                <span>Podcast</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("flashcards");
                  setShowRightWelcome(false);
                }}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 transition-all text-[9.5px] font-bold uppercase ${
                  activeTab === "flashcards" ? "bg-white text-black font-extrabold shadow" : "text-muted-foreground hover:text-white"
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
                className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 transition-all text-[9.5px] font-bold uppercase ${
                  activeTab === "quiz" ? "bg-white text-black font-extrabold shadow" : "text-muted-foreground hover:text-white"
                }`}
              >
                <BookOpen className="h-3 w-3" />
                <span>Quiz</span>
              </button>

            </div>
          </div>

          {/* TAB CONTENTS CONTAINER */}
          <div className="flex-1 overflow-y-auto p-4.5 scrollbar-thin">
            
            {/* A. PINS TAB (NOTEBOARD INDEX GRID) */}
            {activeTab === "pins" && (
              <div className="h-full flex flex-col justify-start">
                <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3 select-none">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                    Noteboard Index Cards
                  </span>
                  
                  {/* Custom pin adder */}
                  <button
                    onClick={() => setShowAddCard(!showAddCard)}
                    className="text-[10px] font-bold text-primary flex items-center gap-0.5 hover:brightness-110 outline-none"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Card
                  </button>
                </div>

                {showAddCard && (
                  <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left">
                    <textarea
                      value={customCardContent}
                      onChange={(e) => setCustomCardContent(e.target.value)}
                      placeholder="Write custom facts, quotes, or study logs to pin..."
                      rows={3}
                      className="w-full bg-[#08090d] border border-white/5 rounded-lg p-2.5 text-xs text-white outline-none focus:border-primary resize-none font-medium"
                    />
                    <div className="flex justify-end gap-1.5 mt-2 text-[9px]">
                      <button onClick={() => setShowAddCard(false)} className="px-2.5 py-1 border border-white/5 rounded-full hover:bg-white/5">Cancel</button>
                      <button onClick={addCustomCard} className="px-3 py-1 bg-primary text-primary-foreground font-bold rounded-full hover:brightness-110">Pin</button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-6 text-left">
                  {(!notebook.pinnedNotes || notebook.pinnedNotes.length === 0) && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 opacity-35 text-center px-4">
                      <Pin className="h-8 w-8 mb-2 text-white/10" />
                      <p className="text-xs">Your noteboard is clean.</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5 leading-normal max-w-xs">
                        Pin important AI answers by clicking the pin icon on chat bubbles, or click '+ Add Card' to write your own.
                      </p>
                    </div>
                  )}

                  {notebook.pinnedNotes?.map((pin) => (
                    <div
                      key={pin.id}
                      className="relative group bg-white/[0.01] border border-white/5 rounded-xl p-3.5 hover:border-primary/20 transition-all flex flex-col justify-between h-36 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 h-8 w-8 bg-primary/5 rounded-bl-full pointer-events-none" />
                      <button
                        onClick={() => deletePin(pin.id)}
                        className="absolute top-2 right-2 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-10 p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <div className="text-[10px] sm:text-[10.5px] text-white/85 pr-5 leading-normal overflow-y-auto scrollbar-none font-sans whitespace-pre-wrap flex-1 select-text">
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
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                    Auto-Saved Study Notes
                  </span>
                  <button
                    onClick={handleDownloadNotes}
                    className="text-[10px] font-bold text-primary flex items-center gap-0.5 hover:brightness-110"
                  >
                    <Download className="h-3.5 w-3.5" /> Export TXT
                  </button>
                </div>

                <textarea
                  value={notebook.notes || ""}
                  onChange={(e) => onSaveNotes(e.target.value)}
                  placeholder="Summarize lessons, jot down exam formulations, or write active recall notes here. Auto-saved."
                  className="w-full bg-[#08090d] border border-white/5 rounded-xl p-4 text-xs leading-relaxed text-white/90 placeholder:text-white/20 focus:border-primary/45 focus:outline-none resize-none font-medium min-h-[calc(100vh-14rem)]"
                />
              </div>
            )}

            {/* C. BRIEFING TAB */}
            {activeTab === "briefing" && (
              <div className="h-full flex flex-col justify-start text-left">
                <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-4">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                    Executive Briefing Doc
                  </span>
                  {!notebook.briefingDoc && (
                    <button
                      onClick={generateBriefing}
                      disabled={isGeneratingBriefing}
                      className="flex items-center gap-1 bg-primary hover:brightness-110 text-primary-foreground px-3 py-1.5 text-[9.5px] font-bold rounded-full transition-all shadow-[0_0_12px_oklch(0.82_0.14_160/0.2)]"
                    >
                      <Sparkles className="h-3 w-3" />
                      {isGeneratingBriefing ? "Compiling..." : "Compile Briefing"}
                    </button>
                  )}
                </div>

                <div className="pb-6">
                  {!notebook.briefingDoc ? (
                    <div className="flex flex-col items-center justify-center py-16 opacity-35 text-center px-4">
                      <FileStack className="h-9 w-9 mb-3 text-white/10" />
                      <p className="text-sm font-semibold">No Briefing compiled</p>
                      <p className="text-[10px] text-muted-foreground mt-1 max-w-xs leading-normal">
                        Click compile to auto-generate a beautiful structured study guide, glossaries, and FAQs summarizing all selected sources.
                      </p>
                    </div>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none text-white/80">
                      {notebook.briefingDoc.split("\n").map((line, lidx) => {
                        if (line.startsWith("# "))
                          return (
                            <h2 key={lidx} className="text-base font-extrabold text-white mb-4 mt-6 font-display border-b border-white/5 pb-2 uppercase tracking-wide">
                              {line.replace("# ", "")}
                            </h2>
                          );
                        if (line.startsWith("## "))
                          return (
                            <h3 key={lidx} className="text-xs font-bold text-primary mb-3 mt-5 font-mono uppercase tracking-widest">
                              {line.replace("## ", "")}
                            </h3>
                          );
                        if (line.startsWith("### "))
                          return (
                            <h4 key={lidx} className="text-xs font-bold text-white/95 mb-2 mt-4 leading-normal">
                              {line.replace("### ", "")}
                            </h4>
                          );
                        if (line.startsWith("- "))
                          return (
                            <li key={lidx} className="list-disc ml-4 my-1 text-xs text-white/70 leading-relaxed">
                              {line.replace("- ", "")}
                            </li>
                          );
                        if (line.trim() === "") return <div key={lidx} className="h-3" />;
                        return (
                          <p key={lidx} className="my-1.5 leading-relaxed text-xs text-white/75">
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
                <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-4">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                    Audio Overview Studio
                  </span>
                  {notebook.audioScript && notebook.audioScript.length > 0 && (
                    <button
                      onClick={downloadPodcastScript}
                      className="text-[10px] font-bold text-primary flex items-center gap-0.5 hover:brightness-110"
                    >
                      <Download className="h-3 w-3" /> Get Script
                    </button>
                  )}
                </div>

                <div className="space-y-5 pb-8">
                  {/* Configuration */}
                  <div className="bg-[#0b0d12] border border-white/5 rounded-2xl p-4.5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
                      <Headphones className="h-4 w-4 text-primary" />
                      <span>Episode Configuration</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8.5px] uppercase font-bold text-muted-foreground tracking-wider font-mono">Format</label>
                        <select
                          value={podcastFormat}
                          onChange={(e) => setPodcastFormat(e.target.value)}
                          className="w-full bg-[#08090d] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-primary"
                        >
                          <option value="two-hosts">Two Hosts (Banter)</option>
                          <option value="single-host">Single Host</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8.5px] uppercase font-bold text-muted-foreground tracking-wider font-mono">Duration</label>
                        <select
                          value={podcastDuration}
                          onChange={(e) => setPodcastDuration(e.target.value)}
                          className="w-full bg-[#08090d] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-primary"
                        >
                          <option value="Short (~3 mins)">Short (~3m)</option>
                          <option value="Medium (~10 mins)">Medium (~10m)</option>
                          <option value="Long (~20 mins)">Long (~20m)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8.5px] uppercase font-bold text-muted-foreground tracking-wider font-mono">Language</label>
                        <select
                          value={podcastLanguage}
                          onChange={(e) => setPodcastLanguage(e.target.value)}
                          className="w-full bg-[#08090d] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-primary"
                        >
                          {Array.from(new Set(edgeVoices.map((v) => v.lang))).map((l) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8.5px] uppercase font-bold text-muted-foreground tracking-wider font-mono">Host 1 Voice</label>
                        <select
                          value={voice1Name}
                          onChange={(e) => setVoice1Name(e.target.value)}
                          className="w-full bg-[#08090d] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-primary"
                        >
                          {edgeVoices.filter((v) => v.lang === podcastLanguage).map((v) => (
                            <option key={`v1-${v.id}`} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                      {podcastFormat === "two-hosts" && (
                        <div className="col-span-2 space-y-1">
                          <label className="text-[8.5px] uppercase font-bold text-muted-foreground tracking-wider font-mono">Host 2 Voice</label>
                          <select
                            value={voice2Name}
                            onChange={(e) => setVoice2Name(e.target.value)}
                            className="w-full bg-[#08090d] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-primary"
                          >
                            {edgeVoices.filter((v) => v.lang === podcastLanguage).map((v) => (
                              <option key={`v2-${v.id}`} value={v.id}>{v.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 pt-2 border-t border-white/5">
                      <label className="text-[8.5px] uppercase font-bold text-muted-foreground tracking-wider font-mono">Custom Host Instructions</label>
                      <textarea
                        value={podcastInstructions}
                        onChange={(e) => setPodcastInstructions(e.target.value)}
                        placeholder="e.g. Focus on biology formulas, talk like hyper-caffeinated debate hosts..."
                        className="w-full bg-[#08090d] border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-primary h-14 resize-none"
                      />
                    </div>

                    <button
                      onClick={generatePodcast}
                      disabled={isGeneratingPodcast}
                      className="w-full py-2 bg-primary hover:brightness-110 text-primary-foreground font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-[0_0_12px_oklch(0.82_0.14_160/0.2)]"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {isGeneratingPodcast ? "Compiling script..." : "Generate AI Podcast"}
                    </button>
                  </div>

                  {/* Playback scripts */}
                  {notebook.audioScript && notebook.audioScript.length > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white font-mono">Audio Overviews</span>
                        <div className="flex gap-1.5 text-[9px]">
                          {playingAudioIdx >= 0 ? (
                            <button onClick={stopPodcast} className="bg-white text-black px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><Pause className="h-2.5 w-2.5 fill-current" /> Stop</button>
                          ) : (
                            <button onClick={playPodcast} className="bg-white text-black px-3 py-1.5 rounded-full font-bold flex items-center gap-1"><Play className="h-2.5 w-2.5 fill-current" /> Listen</button>
                          )}
                          <a
                            href={`http://localhost:8000/tts-full/${notebook.id}?voice1=${voice1Name}&voice2=${voice2Name}`}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#0b0d12] text-white/85 px-2.5 py-1 border border-white/10 rounded-full font-semibold hover:border-primary/40"
                          >
                            Get MP3
                          </a>
                        </div>
                      </div>

                      {playingAudioIdx >= 0 && (
                        <div className="flex items-center justify-center gap-0.5 py-3 bg-black/45 rounded-lg border border-white/[0.03]">
                          {Array.from({ length: 12 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-0.5 rounded-full bg-primary"
                              style={{
                                height: `${Math.floor(Math.random() * 18) + 4}px`,
                                animation: "pulse 1s ease-in-out infinite",
                                animationDelay: `${i * 0.08}s`,
                              }}
                            />
                          ))}
                        </div>
                      )}

                      <div className="bg-[#08090c] p-3.5 rounded-xl border border-white/5 max-h-52 overflow-y-auto scrollbar-thin space-y-3">
                        {notebook.audioScript.map((line, idx) => {
                          let displaySpeaker = line.speaker;
                          if (line.speaker === "Alex") {
                            displaySpeaker = edgeVoices.find((v) => v.id === voice1Name)?.name?.split(" ")[0] || "Host 1";
                          } else if (line.speaker === "Sam") {
                            displaySpeaker = edgeVoices.find((v) => v.id === voice2Name)?.name?.split(" ")[0] || "Host 2";
                          }
                          return (
                            <p key={idx} className="text-white/80 text-[11px] leading-relaxed">
                              <strong className="text-primary mr-1">{displaySpeaker}:</strong>
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
                <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-4 text-left">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                    Recall Flashcards
                  </span>
                  <span className="text-[9.5px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    {activeFlashcards.length} Cards
                  </span>
                </div>

                {activeFlashcards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-35 px-4">
                    <Sparkles className="h-9 w-9 mb-2 text-white/10" />
                    <p className="text-xs">No active flashcards.</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Check at least one active source on the Left checklist to generate cards.</p>
                  </div>
                ) : (
                  <div className="flex flex-col justify-between">
                    <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
                      Card {flashcardIdx + 1} of {activeFlashcards.length}
                    </div>

                    {/* 3D Flippable card */}
                    <div
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="w-full max-w-[280px] mx-auto h-56 perspective-1000 cursor-pointer"
                    >
                      <div className={`relative w-full h-full duration-500 transform-style-3d ${isFlipped ? "rotate-y-180" : ""}`}>
                        
                        {/* FRONT */}
                        <div className="absolute inset-0 backface-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0c0d12] to-card p-5 flex flex-col justify-between shadow-xl">
                          <span className="text-[8.5px] font-mono text-primary font-bold uppercase tracking-wider bg-primary/10 border border-primary/10 px-2 py-0.5 rounded self-start">Active Recall</span>
                          <div className="my-auto py-1 text-center text-xs md:text-sm font-semibold leading-relaxed text-white">
                            {currentFlashcard.question}
                          </div>
                          <div className="text-[9px] font-mono text-muted-foreground/60 border-t border-white/5 pt-2">Click to flip card</div>
                        </div>

                        {/* BACK */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl border border-primary/20 bg-gradient-to-br from-[#080d0b] to-[#0c0d12] p-5 flex flex-col justify-between shadow-xl">
                          <span className="text-[8.5px] font-mono text-green-400 font-bold uppercase tracking-wider bg-green-500/10 border border-green-500/10 px-2 py-0.5 rounded self-start">Answer</span>
                          <div className="my-auto py-1 text-center text-[10.5px] md:text-xs font-medium leading-relaxed text-white/90 overflow-y-auto max-h-24 scrollbar-none select-text">
                            {currentFlashcard.answer}
                          </div>
                          {currentFlashcard.hint && currentFlashcard.hint !== "N/A" && (
                            <div className="text-[9px] text-muted-foreground italic text-left bg-white/[0.01] p-1.5 rounded border border-white/[0.03] mt-1 select-text">
                              💡 Hint: {currentFlashcard.hint}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>

                    {/* Flashcard Response controls */}
                    <div className="mt-6 flex gap-2.5 max-w-[280px] mx-auto w-full">
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
                        className={`flex-1 rounded-xl border py-2 text-[10px] font-bold transition-all outline-none ${flashcardLog[flashcardIdx] === "review" ? "bg-red-500/15 border-red-500/30 text-red-300" : "border-white/10 text-white/80 hover:bg-white/5"}`}
                      >
                        Review later
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
                        className={`flex-1 rounded-xl border py-2 text-[10px] font-bold transition-all outline-none ${flashcardLog[flashcardIdx] === "got" ? "bg-green-500/15 border-green-500/30 text-green-300" : "border-white/10 text-white/80 hover:bg-white/5"}`}
                      >
                        Got it!
                      </button>
                    </div>

                    {/* Steppers */}
                    <div className="mt-4 flex items-center justify-between max-w-[220px] mx-auto w-full select-none">
                      <button
                        disabled={flashcardIdx === 0}
                        onClick={() => {
                          setIsFlipped(false);
                          setTimeout(() => setFlashcardIdx(flashcardIdx - 1), 150);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-colors"
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
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                      <button
                        disabled={flashcardIdx === activeFlashcards.length - 1}
                        onClick={() => {
                          setIsFlipped(false);
                          setTimeout(() => setFlashcardIdx(flashcardIdx + 1), 150);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-colors"
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
                <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-4 select-none">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                    Socratic Quizzes
                  </span>
                  <span className="text-[9.5px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    {activeQuiz.length} Questions
                  </span>
                </div>

                {activeQuiz.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-35 text-center px-4">
                    <BookOpen className="h-9 w-9 mb-2 text-white/10" />
                    <p className="text-xs">No quizzes available.</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Check active sources on the Left checklist to load quizzes.</p>
                  </div>
                ) : (
                  <div className="space-y-5 pb-8">
                    {activeQuiz.map((q, qIdx) => {
                      const isAnswered = quizAnswers[qIdx] !== undefined;
                      const selectedAnswer = quizAnswers[qIdx];
                      return (
                        <div key={qIdx} className="rounded-xl border border-white/5 bg-white/[0.01] p-4 text-left">
                          <span className="text-[8.5px] font-bold text-primary uppercase font-mono tracking-wider">
                            Question {qIdx + 1}
                          </span>
                          <p className="mt-1 text-xs font-semibold leading-relaxed text-white">
                            {q.question}
                          </p>

                          <div className="mt-3.5 space-y-1.5">
                            {q.options.map((opt, optIdx) => {
                              let btnClass = "border-white/5 bg-white/[0.01] hover:bg-white/5 text-white/80";
                              if (isAnswered) {
                                if (optIdx === q.answer) {
                                  btnClass = "bg-green-500/15 border-green-500/30 text-green-300 font-semibold";
                                } else if (selectedAnswer === optIdx) {
                                  btnClass = "bg-red-500/15 border-red-500/30 text-red-300 font-semibold";
                                } else {
                                  btnClass = "border-white/5 bg-white/[0.005] text-white/25 cursor-default";
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
                                  className={`w-full rounded-xl border px-3 py-2 text-left text-[11px] transition-all ${btnClass}`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    <div className="text-center pt-2 border-t border-white/5">
                      <button
                        onClick={() => {
                          setQuizAnswers({});
                          toast.info("Quiz reset!");
                        }}
                        className="rounded-full border border-white/10 px-4 py-1.5 text-[9px] font-bold text-white hover:bg-white/5"
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
