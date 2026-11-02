import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "../integrations/supabase/client";
import {
  FileText,
  Youtube,
  BookOpen,
  ArrowRight,
  Check,
  Search,
  Headphones,
  Sparkles,
  Layers,
  HelpCircle,
  FileStack,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

const CDN = "https://c.animaapp.com/mph5rn45Kmor9l/assets";

const unis = [
  "5zVEY4Masnnk7YzRbn5Er5jXnU",
  "JdaS9359rQz6HpbrWPePU5hzL8",
  "Rraz1Yy0un7nhSWeQDLU74PqIF0",
  "YxQlBJ3ahQZ0hwvSXmBDWTOSVrg",
  "bS6ruQgrhGqTghZYdi7FA0sHaek",
  "coPc0ruPZ3afBNJlGpANIL6eHcU",
  "slaJu5FCk8ml6iolHYMjG24FWQ",
  "xrq9fC8QrjGBT8F80CRFNBqOC4",
  "zLq574nPR9gWsWyZdbGpp63KPqw",
];

function Nav() {
  return (
    <header className="sticky top-4 z-50 mx-auto w-[min(1180px,94vw)]">
      <nav className="flex items-center justify-between rounded-xl border border-border bg-card/85 px-4 py-2.5 backdrop-blur-md shadow-sm">
        <a href="#" className="flex items-center gap-2.5 pl-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 border border-primary/25">
            <div
              className="h-3.5 w-3.5 rotate-45 bg-primary"
              style={{ clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)" }}
            />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            LearnX
          </span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          <a
            href="#features"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </a>
          <a
            href="#pricing"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Access
          </a>
          <a
            href="#faq"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            FAQ
          </a>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/signin"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            Sign in
          </a>
          <a
            href="/signin"
            className="rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 shadow-sm"
          >
            Open Workspace →
          </a>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto max-w-[1200px] px-6 pt-16 pb-16 text-center">
      <div className="relative mx-auto max-w-3xl pt-8">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3.5 py-1 text-xs font-medium text-muted-foreground">
          <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />
          <span>Grounded Study Sessions & Spaced Repetition</span>
        </div>

        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-[1.08]">
          Master complex materials with intelligent active recall.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground leading-relaxed sm:text-lg">
          Ingest textbooks, lecture recordings, and research papers. LearnX extracts core concepts,
          builds adaptive spaced-repetition decks, and tests your understanding with grounded,
          citation-backed retrieval.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <a
            href="/signin"
            className="rounded-md bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 shadow-sm"
          >
            Get Started Free
          </a>
          <a
            href="#demo"
            className="rounded-md border border-border bg-secondary/40 px-5 py-2.5 text-xs font-medium text-foreground transition-all hover:bg-secondary"
          >
            Explore Interactive Demo
          </a>
        </div>

        {/* Quality Guarantee Box */}
        <div className="mx-auto mt-8 flex max-w-xl items-center justify-between rounded-lg border border-border bg-card/60 px-4 py-2.5 text-xs text-muted-foreground shadow-xs">
          <span className="font-medium text-foreground">Verified Grounding</span>
          <span className="text-[11px]">Direct source citations on every answer • Zero hallucinated claims</span>
        </div>
      </div>

      {/* Interactive Workspace Widget Preview */}
      <div
        id="demo"
        className="mt-14 mx-auto max-w-[1020px] rounded-xl border border-border bg-card shadow-xl overflow-hidden text-left"
      >
        {/* Workspace Header Toolbar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-secondary/40">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span className="font-semibold text-foreground">Workspaces</span>
            <span>/</span>
            <span>Cellular_Biology_Review</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>3 Sources Active</span>
            </div>
          </div>
        </div>

        {/* Workspace 3-Panel Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[380px] bg-background">
          {/* Sources List Sidebar */}
          <div className="md:col-span-3 border-r border-border p-3.5 bg-secondary/15">
            <div className="flex items-center justify-between mb-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Source Materials</span>
              <span className="font-mono text-[10px] text-primary">3 Loaded</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 rounded-md bg-secondary/80 border border-border p-2 text-xs text-foreground font-medium">
                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">Cellular_Respiration.pdf</span>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-transparent p-2 text-xs text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-colors cursor-pointer">
                <Youtube className="h-3.5 w-3.5 text-red-400 shrink-0" />
                <span className="truncate">Krebs Cycle Lecture</span>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-transparent p-2 text-xs text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-colors cursor-pointer">
                <BookOpen className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Bioenergetics Notes</span>
              </div>
            </div>

            <div className="mt-6 rounded-md border border-border/80 bg-secondary/30 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
              Sources are automatically chunked and indexed into vector embeddings for rapid semantic lookup.
            </div>
          </div>

          {/* Central Chat Workspace */}
          <div className="md:col-span-5 border-r border-border p-4 flex flex-col justify-between">
            <div className="space-y-3 overflow-y-auto pr-1">
              <div className="rounded-lg bg-secondary/40 border border-border p-3 text-xs text-foreground">
                <span className="font-mono text-muted-foreground block text-[10px] mb-1">Question</span>
                Explain the role of ATP synthase in the electron transport chain.
              </div>
              <div className="rounded-lg bg-card border border-border p-3 text-xs text-foreground/90 space-y-1.5">
                <span className="font-mono text-primary block text-[10px] font-semibold">LearnX Tutor</span>
                <p className="leading-relaxed">
                  ATP synthase utilizes the electrochemical proton gradient across the inner mitochondrial membrane. As protons flow through its rotor subunit, rotational kinetic energy catalyzes the phosphorylation of ADP into ATP.
                </p>
                <div className="pt-1.5 border-t border-border/60 flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                  <span>Citation:</span>
                  <span className="text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                    Page 14 • Section 3.2
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-border">
              <div className="flex gap-1.5 flex-wrap mb-2">
                <span className="text-[10px] px-2 py-0.5 rounded border border-border bg-secondary/40 text-muted-foreground">
                  Active Recall Q&A
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded border border-border bg-secondary/40 text-muted-foreground">
                  Formula Glossary
                </span>
              </div>
              <div className="flex gap-2 rounded-md border border-border bg-secondary/20 px-3 py-1.5 items-center justify-between">
                <input
                  disabled
                  placeholder="Ask a question grounded in Cellular_Respiration.pdf..."
                  className="bg-transparent text-xs text-foreground outline-none w-full placeholder:text-muted-foreground/60"
                />
                <button className="h-5 w-5 rounded bg-primary/20 text-primary grid place-items-center shrink-0">
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Active Recall Deck Preview */}
          <div className="md:col-span-4 p-3.5 bg-secondary/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Active Recall Deck</span>
                <span className="font-mono text-[10px] text-primary">Card 3 / 18</span>
              </div>

              <div className="rounded-lg border border-border bg-card p-4 text-left space-y-3">
                <span className="text-[9px] font-mono font-semibold uppercase text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded inline-block">
                  Mechanisms of Respiration
                </span>
                <p className="text-xs font-medium text-foreground leading-snug">
                  What drives the conformational change in the catalytic head of ATP synthase?
                </p>
                <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Target Retention: 94%</span>
                  <span className="font-mono text-primary font-semibold">Review Set</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 text-center">
              <div className="rounded border border-border bg-card/60 p-2">
                <span className="text-base font-bold text-foreground">92%</span>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  Retention Rate
                </p>
              </div>
              <div className="rounded border border-border bg-card/60 p-2">
                <span className="text-base font-bold text-primary">18 Cards</span>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  Active Set
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Upload() {
  return (
    <section className="mx-auto max-w-[1180px] px-6 py-20 border-t border-border">
      <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
        <div className="relative">
          <img
            src={`${CDN}/69.jpg`}
            alt="Source documents ingestion"
            className="rounded-xl border border-border object-cover shadow-md"
          />
        </div>
        <div className="text-left">
          <div className="inline-flex items-center rounded-md border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-foreground mb-4">
            Multi-Modal Ingestion
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl leading-tight">
            Consolidate your study sources into structured knowledge.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed sm:text-base">
            Replace scattered slide decks and fragmented notes. LearnX parses textbooks, research
            papers, recorded video lectures, and online documentation into a unified semantic index.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-foreground/90">
              <div className="grid h-4.5 w-4.5 place-items-center rounded bg-primary/15 text-primary border border-primary/25">
                <Check className="h-3 w-3" />
              </div>
              <span>Supports PDF, Word, PowerPoint, and plain text files</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-foreground/90">
              <div className="grid h-4.5 w-4.5 place-items-center rounded bg-primary/15 text-primary border border-primary/25">
                <Check className="h-3 w-3" />
              </div>
              <span>YouTube video transcript and chapter timestamp alignment</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-foreground/90">
              <div className="grid h-4.5 w-4.5 place-items-center rounded bg-primary/15 text-primary border border-primary/25">
                <Check className="h-3 w-3" />
              </div>
              <span>PostgreSQL pgvector storage with direct source page citations</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PowerPrep() {
  const cards = [
    {
      title: "Grounded Socratic Tutor",
      desc: "An interactive dialogue interface that challenges your understanding and pinpoints conceptual gaps, grounded entirely in your uploaded files.",
      badge: "Grounded RAG",
    },
    {
      title: "Active Recall Flashcards",
      desc: "Systematic flashcard decks built around question retrieval rather than passive reading, helping lock definitions into long-term memory.",
      badge: "Spaced Repetition",
    },
    {
      title: "Executive Study Dossiers",
      desc: "Generates clear, hierarchical briefing documents with verified citations, formulas, and structured glossaries for fast review.",
      badge: "Synthesis",
    },
    {
      title: "Audio Overviews",
      desc: "Creates structured, two-speaker audio discussions summarizing key concepts and practical takeaways for on-the-go review.",
      badge: "Multi-Voice TTS",
    },
    {
      title: "Deep Topic Scouring",
      desc: "When lecture slides omit essential background, an integrated search agent gathers corroborating sources and clear definitions.",
      badge: "Verified Web",
    },
    {
      title: "Diagnostic Quizzes",
      desc: "Generates multiple-choice practice questions with contextual answer rationales to evaluate your exam readiness.",
      badge: "Assessment",
    },
  ];

  return (
    <section id="features" className="mx-auto max-w-[1180px] px-6 py-20 border-t border-border">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Engineered for conceptual retention.
        </h2>
        <p className="mt-3 text-muted-foreground text-xs sm:text-sm leading-relaxed">
          Built on proven cognitive learning science. Replace passive rereading with deliberate,
          adaptive practice.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-border bg-card p-5 text-left flex flex-col justify-between hover:border-border/80 transition-colors shadow-xs"
          >
            <div>
              <span className="text-[10px] font-mono font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                {c.badge}
              </span>
              <h3 className="font-display text-lg font-bold text-foreground mt-3">{c.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
            </div>
            <a
              href="/signin"
              className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>Explore tool</span>
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

function Trusted() {
  return (
    <section className="border-y border-border bg-secondary/20 py-10 overflow-hidden">
      <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground mb-6">
        Designed for students, researchers, and professional learners
      </p>
      <div className="relative overflow-hidden w-full">
        <div className="ticker flex w-max items-center gap-16 px-8">
          {[...unis, ...unis].map((u, i) => (
            <img
              key={i}
              src={`${CDN}/${u}.svg`}
              alt="Institution logo"
              className="h-7 w-auto opacity-40 grayscale invert hover:opacity-75 transition-opacity"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Import Course Materials",
      text: "Upload your slide decks, textbooks, research papers, or video lecture links into a dedicated study notebook.",
    },
    {
      num: "02",
      title: "Index & Synthesize",
      text: "Vector embeddings analyze document structure, extract key definitions, and formulate grounded study dossiers.",
    },
    {
      num: "03",
      title: "Practice Active Retrieval",
      text: "Test your retention through adaptive flashcards, diagnostic quizzes, and Socratic Q&A sessions with verified citations.",
    },
  ];

  return (
    <section id="how-it-works" className="mx-auto max-w-[1180px] px-6 py-20 border-t border-border">
      <div className="text-left md:flex justify-between items-end mb-12">
        <div>
          <span className="text-xs font-mono font-semibold text-primary uppercase tracking-wider">
            Workflow
          </span>
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl mt-1.5">
            From raw sources to deliberate practice.
          </h2>
        </div>
        <p className="mt-3 md:mt-0 text-muted-foreground max-w-sm text-xs sm:text-sm">
          A systematic pipeline that moves you from information gathering to verifiable mastery.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.num}
            className="rounded-lg border border-border bg-card p-6 text-left shadow-xs space-y-3"
          >
            <div className="h-8 w-8 rounded-md bg-primary/15 border border-primary/25 text-primary font-mono font-bold text-xs flex items-center justify-center">
              {s.num}
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">{s.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PowerTools() {
  const tools = [
    {
      img: "106.jpg",
      h: "Deep Research Scouring",
      t: "When course notes lack detail, the integrated research agent searches verified academic sources, pulls direct citations, and compiles structured background briefs.",
    },
    {
      img: "91.jpg",
      h: "Multi-Hundred-Page Document Parsing",
      t: "Upload comprehensive academic textbooks and dissertations. The engine extracts key formulas, builds chapter glossaries, and links citations to original page numbers.",
    },
    {
      img: "89.jpg",
      h: "Video Lecture Transcription",
      t: "Paste a lecture video link to parse spoken channels, align chapter timestamps, and distill complex technical explanations into clear study summaries.",
    },
    {
      img: "88.jpg",
      h: "Export & Study Sharing",
      t: "Export your synthesized notes, flashcard decks, and briefing scripts as clean plain text or Markdown to share with study groups.",
    },
  ];

  return (
    <section className="mx-auto max-w-[1180px] px-6 py-20 border-t border-border">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="text-xs font-mono font-semibold text-primary uppercase tracking-wider">
          Capabilities
        </span>
        <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl mt-1.5">
          Tools built for demanding coursework.
        </h2>
      </div>

      <div className="space-y-8">
        {tools.map((tool, i) => (
          <div
            key={i}
            className={`grid grid-cols-1 items-center gap-8 rounded-xl border border-border bg-card p-5 md:grid-cols-2 ${i % 2 ? "md:[&>img]:order-2" : ""}`}
          >
            <img
              src={`${CDN}/${tool.img}`}
              alt={tool.h}
              className="aspect-[4/3] w-full rounded-lg object-cover border border-border"
            />
            <div className="text-left px-2 sm:px-4">
              <h3 className="font-display text-2xl font-bold text-foreground">{tool.h}</h3>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {tool.t}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-[1080px] px-6 py-20 border-t border-border">
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm md:p-12 text-left">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <div>
            <span className="text-xs font-mono font-semibold text-primary uppercase tracking-wider">
              Access
            </span>
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl mt-1.5">
              Available to everyone for free.
            </h2>
            <p className="mt-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Create your account, organize your course materials in dedicated notebooks, and start
              testing your knowledge with active recall flashcards, diagnostic quizzes, and
              grounded tutoring.
            </p>

            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              <span className="rounded-md border border-border bg-secondary/50 px-3 py-1 text-foreground">
                Unlimited Study Notebooks
              </span>
              <span className="rounded-md border border-border bg-secondary/50 px-3 py-1 text-foreground">
                Full Vector Retrieval
              </span>
              <span className="rounded-md border border-border bg-secondary/50 px-3 py-1 text-foreground">
                Audio Overview Studio
              </span>
            </div>

            <a
              href="/signin"
              className="mt-7 inline-block rounded-md bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 shadow-sm"
            >
              Start Studying Free
            </a>
          </div>
          <div>
            <img
              src={`${CDN}/100.jpg`}
              alt="Focused study desk"
              className="rounded-lg border border-border object-cover shadow-sm"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-20 border-t border-border bg-secondary/15">
      <div className="mx-auto max-w-[900px] px-6 text-center">
        <h2 className="font-display text-3xl font-bold text-foreground sm:text-5xl leading-tight">
          Build durable conceptual mastery today.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Join students, researchers, and engineers using deliberate active recall to prepare for
          demanding exams.
        </p>
        <div className="mt-8 flex justify-center">
          <a
            href="/signin"
            className="rounded-md bg-primary px-6 py-3 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 shadow-sm"
          >
            Open Your Workspace →
          </a>
        </div>
      </div>
    </section>
  );
}

const faqs = [
  {
    q: "How does LearnX differ from standard AI chat interfaces?",
    a: "Standard AI chat models generate plausible-sounding prose based on general web data, which frequently introduces hallucinations when discussing specialized coursework. LearnX uses Retrieval-Augmented Generation (RAG) strictly grounded in your uploaded documents, providing direct page-level citations for every claim.",
  },
  {
    q: "What makes active recall more effective than passive reading?",
    a: "Cognitive learning research consistently demonstrates that passive rereading and highlighting produce an 'illusion of competence.' Active recall forces the brain to retrieve information from memory, strengthening neural retrieval pathways and significantly extending retention intervals.",
  },
  {
    q: "How does the Spaced Repetition flashcard system work?",
    a: "Cards are tracked based on your self-reported mastery. Concepts you mark as needing review appear more frequently in subsequent practice sessions, aligning study intervals with the human forgetting curve.",
  },
  {
    q: "How are my uploaded course materials handled?",
    a: "Your files and study data are stored securely and encrypted in transit and at rest. We do not sell your personal data or use private student materials to train public AI models.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-[800px] px-6 py-20 border-t border-border text-left">
      <div className="text-center mb-10">
        <span className="text-xs font-mono font-semibold text-primary uppercase tracking-wider">FAQ</span>
        <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl mt-1.5">
          Frequently Asked Questions
        </h2>
        <p className="mt-2 text-muted-foreground text-xs sm:text-sm">
          Details on how LearnX works and how active recall accelerates mastery.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((f, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card overflow-hidden transition-colors"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left outline-none"
            >
              <span className="flex items-center gap-3">
                <span className="font-mono text-xs text-primary font-bold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm font-semibold text-foreground">{f.q}</span>
              </span>
              <span
                className={`text-lg text-muted-foreground transition-transform duration-200 ${open === i ? "rotate-45 text-primary" : ""}`}
              >
                +
              </span>
            </button>
            {open === i && (
              <div className="px-5 pb-5 pl-11 text-xs text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                {f.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card/60 px-6 py-10 text-center text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-primary/15 border border-primary/25">
            <div
              className="h-3 w-3 rotate-45 bg-primary"
              style={{ clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)" }}
            />
          </div>
          <span className="font-display text-base font-bold tracking-tight text-foreground">
            LearnX
          </span>
        </div>
        <p>© {new Date().getFullYear()} LearnX. Active recall study workspace.</p>
      </div>
    </footer>
  );
}

function Index() {
  const navigate = useNavigate();
  const [isAuthenticating, setIsAuthenticating] = useState(() => {
    if (typeof window !== "undefined") {
      return window.location.hash.includes("access_token");
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, []);

  // If user lands on / with an active session or OAuth #access_token in URL, redirect directly to /dashboard
  useEffect(() => {
    let isMounted = true;

    // Check existing session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session && isMounted) {
          navigate({ to: "/dashboard" });
        } else if (isMounted && !window.location.hash.includes("access_token")) {
          setIsAuthenticating(false);
        }
      })
      .catch((err) => {
        console.warn("Session check error on landing page:", err);
        if (isMounted) setIsAuthenticating(false);
      });

    // Listen for auth state change (especially when Supabase finishes parsing #access_token from URL)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && isMounted) {
        navigate({ to: "/dashboard" });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (isAuthenticating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-foreground">Signing you in...</p>
          <p className="text-xs text-muted-foreground">Redirecting to your study workspace</p>
        </div>
      </div>
    );
  }

  return (
    <main className="overflow-hidden pt-4 bg-background min-h-screen text-foreground selection:bg-primary/20 selection:text-foreground">
      <Nav />
      <Hero />
      <Upload />
      <PowerPrep />
      <Trusted />
      <HowItWorks />
      <PowerTools />
      <Pricing />
      <CTA />
      <FAQ />
      <Footer />
    </main>
  );
}
