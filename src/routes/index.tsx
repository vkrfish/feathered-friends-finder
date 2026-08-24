import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Sparkles,
  FileText,
  Youtube,
  Search,
  Check,
  ArrowRight,
  BookOpen,
  Flame,
  HelpCircle,
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
    <header className="sticky top-4 z-50 mx-auto w-[min(1140px,94vw)]">
      <nav className="flex items-center justify-between rounded-full border border-white/10 bg-card/60 px-4 py-2.5 backdrop-blur-xl shadow-2xl">
        <a href="#" className="flex items-center gap-2 pl-3">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/20 border border-primary/30">
            <div
              className="h-3.5 w-3.5 rotate-45 bg-primary"
              style={{ clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)" }}
            />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-white glow-text">
            LearnX
          </span>
        </a>
        <div className="flex items-center gap-6">
          <a
            href="#features"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-white sm:block"
          >
            features
          </a>
          <a
            href="#pricing"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-white sm:block"
          >
            pricing
          </a>
          <a
            href="#faq"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-white sm:block"
          >
            faq
          </a>
        </div>
        <a
          href="/signin"
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-95 shadow-[0_0_15px_oklch(0.82_0.14_160/0.25)]"
        >
          Cram now →
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto max-w-[1200px] px-6 pt-16 pb-20 text-center">
      {/* Background ambient light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="relative mx-auto max-w-4xl pt-12">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary shadow-inner">
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span>Clutch exam prep for 2 A.M. panic attacks</span>
        </div>

        <h1 className="font-display text-5xl font-bold leading-none tracking-tight text-white sm:text-7xl lg:text-8xl">
          The AI study assistant for when you're{" "}
          <span className="highlight-gradient">completely cooked</span>.
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground leading-relaxed">
          We know you haven’t opened the lecture slides since Week 1. Don't worry. LearnX digests
          800-page textbooks, long YouTube lectures, and messy PDFs into active recall cards,
          Socratic tutor chats, and podcasts in seconds. <b>No cap, actually works.</b>
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="/signin"
            className="rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-95 shadow-[0_0_20px_oklch(0.82_0.14_160/0.3)]"
          >
            Start Cramming for Free
          </a>
          <a
            href="#demo"
            className="rounded-full border border-white/10 bg-white/5 px-7 py-3.5 text-base font-medium text-white transition-all hover:bg-white/10"
          >
            ▶ Watch demo
          </a>
        </div>

        {/* Humorous Student Quote Box */}
        <div className="mx-auto mt-8 max-w-lg rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs italic text-muted-foreground shadow-md backdrop-blur-sm">
          "I had a 200-page biology exam in 6 hours. Fed the slides to LearnX, completed 50 active
          recall reps, and passed with an A-. <b>Source: Trust me bro, it works.</b>" — Vasanth, CS
          Student (99% caffeine, 1% hope)
        </div>
      </div>

      {/* PREMIUM INTERACTIVE WORKSPACE WIDGET PREVIEW (NotebookLM style) */}
      <div
        id="demo"
        className="mt-20 mx-auto max-w-[1000px] rounded-2xl border border-white/10 bg-[#0c0d12] p-2 shadow-2xl relative"
      >
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/10 to-transparent -z-10" />

        {/* Header toolbar */}
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 bg-[#0d0f15]/80 rounded-t-xl">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <span className="h-3 w-3 rounded-full bg-green-500/80" />
            <span className="ml-2 text-xs font-mono text-muted-foreground">
              workspace_biology_midterm_v2.json
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[11px] text-orange-400 bg-orange-400/5 border border-orange-400/10 px-2 py-0.5 rounded-full">
              <Flame className="h-3 w-3" />
              <span>2 day streak</span>
            </div>
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-primary font-medium">AI Connected</span>
          </div>
        </div>

        {/* Workspace Panels */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[420px] bg-[#090a0f] rounded-b-xl overflow-hidden">
          {/* Sources List Sidebar */}
          <div className="md:col-span-3 border-r border-white/5 p-4 text-left bg-[#0c0d13]/55">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
              <span>Sources</span>
              <span className="text-primary font-mono lowercase">3 loaded</span>
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 p-2 text-xs text-primary font-medium">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">biology_lecture_12.pdf</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/5 p-2 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-all cursor-pointer">
                <Youtube className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <span className="truncate">Photosynthesis in 5 Mins</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/5 p-2 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-all cursor-pointer">
                <BookOpen className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Web: Krebs Cycle wiki</span>
              </div>
            </div>

            <div className="mt-8 rounded-xl bg-primary/5 border border-primary/10 p-3 text-[11px] text-muted-foreground leading-relaxed">
              💡 <b>Pro Tip:</b> Generate a study guide or deep briefing document using the action
              chips in the chat!
            </div>
          </div>

          {/* Central Chat Workspace */}
          <div className="md:col-span-5 border-r border-white/5 p-4 flex flex-col justify-between text-left">
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 text-xs text-white/80">
                <span className="font-mono text-muted-foreground block text-[10px] mb-1">User</span>
                Explain the electron transport chain like I am 5 years old.
              </div>
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-xs text-white/80">
                <span className="font-mono text-primary block text-[10px] mb-1">LearnX Tutor</span>
                Imagine a water slide. Electrons are kids sliding down, passing a basketball
                (energy) to their friends on each deck. This energy pumps water (hydrogen) upstairs,
                which spins a giant waterwheel (ATP synthase) to make power! ⚡
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="flex gap-1.5 flex-wrap mb-2">
                <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/5 text-white/60 hover:text-white hover:border-white/20 transition-all cursor-pointer">
                  📝 Study Guide
                </span>
                <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/5 text-white/60 hover:text-white hover:border-white/20 transition-all cursor-pointer">
                  🎙️ Podcast
                </span>
                <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/5 text-white/60 hover:text-white hover:border-white/20 transition-all cursor-pointer">
                  🔥 Quiz Me
                </span>
              </div>
              <div className="flex gap-2 rounded-full border border-white/10 bg-[#0d0f15] px-3.5 py-1.5 items-center justify-between shadow-inner">
                <input
                  disabled
                  placeholder="Ask about biology_lecture_12..."
                  className="bg-transparent text-xs text-white outline-none w-full placeholder:text-white/20"
                />
                <button className="h-6 w-6 rounded-full bg-primary/20 text-primary border border-primary/20 grid place-items-center cursor-default shrink-0">
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Notes & Active Recall Panel */}
          <div className="md:col-span-4 p-4 text-left bg-[#08090d]/30">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
              <span>Active Recall Deck</span>
              <span className="text-primary font-mono">Card 3/12</span>
            </h4>

            {/* 3D-styled Flashcard mock */}
            <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.05] to-transparent p-5 min-h-[160px] flex flex-col justify-between shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-16 w-16 bg-primary/5 rounded-bl-full pointer-events-none" />
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
                  Biology exam core
                </span>
                <p className="mt-4 text-sm font-medium text-white leading-snug">
                  What is the primary function of ATP synthase during cellular respiration?
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-[10px] text-muted-foreground font-mono">
                  Click to reveal answer
                </span>
                <span className="h-5 w-5 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-bold font-mono">
                  A
                </span>
              </div>
            </div>

            {/* Quick stats */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2.5">
                <span className="text-lg font-bold text-white">92%</span>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  Recall accuracy
                </p>
              </div>
              <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2.5">
                <span className="text-lg font-bold text-primary">1.2 hours</span>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  Study time saved
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
    <section className="mx-auto max-w-[1200px] px-6 py-20 border-t border-white/5">
      <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
        <div className="relative group">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/30 to-indigo-500/10 opacity-30 blur-lg transition-all group-hover:opacity-50" />
          <img
            src={`${CDN}/69.jpg`}
            alt="AI folder"
            className="relative rounded-2xl border border-white/10 object-cover shadow-2xl brightness-95"
          />
          <div className="absolute -bottom-4 -right-4 rounded-full bg-card border border-white/10 px-4 py-2 text-xs font-semibold tracking-wider text-primary shadow-lg">
            ⚡ AI Vector Indexing Active
          </div>
        </div>
        <div className="text-left">
          <div className="inline-flex h-8 items-center rounded-full bg-white/5 px-3.5 text-xs font-medium text-white border border-white/5 mb-4">
            📂 Drag. Drop. Learn.
          </div>
          <h2 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl leading-tight">
            Dump your <span className="highlight-gradient">syllabus files</span>.<br />
            Let AI extract the raw facts.
          </h2>
          <p className="mt-6 text-base text-muted-foreground leading-relaxed">
            Stop highlighting random lines in your textbook hoping they’ll stick. LearnX builds a
            personalized knowledge graph using semantic vector embeddings on Postgres (via
            pgvector). It strip-mines PDFs, lectures, and web nodes of their academic fluff and
            hands you back a clean, actionable study workspace.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <div className="flex items-center gap-2.5 text-sm text-white/80">
              <div className="grid h-5 w-5 place-items-center rounded-full bg-primary/20 text-primary border border-primary/20">
                <Check className="h-3 w-3" />
              </div>
              <span>Upload PDFs, DOCX, PowerPoint up to 15 MB</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-white/80">
              <div className="grid h-5 w-5 place-items-center rounded-full bg-primary/20 text-primary border border-primary/20">
                <Check className="h-3 w-3" />
              </div>
              <span>Instant text analysis & Spaced Repetition flashcards</span>
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
      title: "Socratic AI Tutor",
      desc: "No copy-pasting code answers. Our AI tutor actually forces you to retrieve the concepts, calling you out when you are yapping on a guess.",
      badge: "No Cap",
    },
    {
      title: "Smart Active Recall",
      desc: "Adaptive flashcard decks that adjust to your memory decay curve. Rapid-fire reps that lock definitions straight into your memory.",
      badge: "Scientific",
    },
    {
      title: "Briefing Dossiers",
      desc: "Digests dense textbooks and transforms them into beautifully summarized, highly organized briefing documents with reference pins.",
      badge: "Saves Hours",
    },
    {
      title: "Custom Audio Podcasts",
      desc: "Generate a natural two-host podcast episode discussing your notes. Listen on your AirPods on the way to class, no boring lectures.",
      badge: "Podcast Mode",
    },
    {
      title: "Deep Research Scour",
      desc: "When your lecture slides are lacking, the research agent searches verified web directories to compile deep dossiers on the fly.",
      badge: "Agentic",
    },
  ];
  return (
    <section id="features" className="mx-auto max-w-[1200px] px-6 py-20 border-t border-white/5">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
          Everything you need to <span className="highlight-gradient">pass the midterm</span>.
        </h2>
        <p className="mt-4 text-muted-foreground text-sm sm:text-base">
          Built on learning science, designed for short attention spans. We swap midnight panic
          sessions for maximum efficiency.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, idx) => (
          <div
            key={idx}
            className="notebook-card rounded-2xl p-6 flex flex-col justify-between text-left relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 h-16 w-16 bg-primary/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
            <div>
              <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {c.badge}
              </span>
              <h3 className="font-display text-2xl font-bold text-white mt-4">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
            </div>
            <a
              href="/signin"
              className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-white transition-colors"
            >
              <span>Start cramming</span>
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
    <section className="border-y border-white/5 bg-card/10 py-12 backdrop-blur-sm overflow-hidden">
      <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground/80 mb-8">
        Trusted by top students globally (even the ones who cram the night before)
      </p>
      <div className="relative overflow-hidden w-full">
        <div className="ticker flex w-max items-center gap-20 px-8">
          {[...unis, ...unis].map((u, i) => (
            <img
              key={i}
              src={`${CDN}/${u}.svg`}
              alt=""
              className="h-8 w-auto opacity-40 grayscale invert hover:opacity-80 transition-opacity"
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
      title: "Feed the machine",
      text: "Drag-and-drop your PDFs, lecture recordings, YouTube playlists, or raw text files. We encrypt your files and parse them immediately.",
    },
    {
      num: "02",
      title: "Synthesize dossier",
      text: "PostgreSQL pgvector embeds the data. Our RAG engine extracts key questions, builds memory-decay flashcard loops, and generates host scripts.",
    },
    {
      num: "03",
      title: "Clutch the Grade",
      text: "Swipe through active recall tests, quiz your knowledge, or generate a two-host audio conversation to listen on the go. Zero fluff.",
    },
  ];
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24 border-t border-white/5">
      <div className="text-left md:flex justify-between items-end mb-16">
        <div>
          <span className="text-xs font-bold text-primary tracking-widest uppercase">
            The Playbook
          </span>
          <h2 className="font-display text-4xl font-bold text-white sm:text-5xl md:text-6xl mt-2">
            Cooked to prepared in <span className="highlight-gradient">3 steps</span>
          </h2>
        </div>
        <p className="mt-4 md:mt-0 text-muted-foreground max-w-sm text-sm sm:text-base">
          Stop staring blankly at documents. Let the AI build a complete training workspace tailored
          to your weak points.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.num}
            className="rounded-2xl border border-white/5 bg-card/25 p-8 text-left transition-all hover:border-white/10 hover:bg-card/45 relative group"
          >
            <span className="absolute top-6 right-6 font-mono text-5xl font-extrabold text-white/[0.03] group-hover:text-primary/10 transition-colors">
              {s.num}
            </span>
            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold text-base flex items-center justify-center mb-6">
              {s.num}
            </div>
            <h3 className="font-display text-2xl font-bold text-white mb-3">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
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
      t: "Stop falling down Wikipedia rabbit holes at 2 A.M. When your syllabus notes are vague, our deep research agent crawls the web, extracts reference citations, and drafts structured study dossiers automatically.",
    },
    {
      img: "91.jpg",
      h: "Gigantic PDF Digests",
      t: "Drop your massive, 800-page academic textbooks straight into the engine. LearnX digests the fluff, parses index formulas, and maps the chapters into a clean, connected study guide.",
    },
    {
      img: "89.jpg",
      h: "Skip YouTube Lectures",
      t: "Paste any grueling two-hour video lecture link. LearnX watches the video, transcribes the spoken channels, aligns timestamps, and distills the concepts into a 5-minute read.",
    },
    {
      img: "88.jpg",
      h: "Group Chat Save",
      t: "Don't gatekeep the A+ grade. With one clean click, beam your AI-generated active recall master study guides and briefing scripts directly to your classmates.",
    },
  ];
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-20 border-t border-white/5">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs font-bold text-primary tracking-widest uppercase">Pro Mode</span>
        <h2 className="font-display text-4xl font-bold text-white sm:text-5xl md:text-6xl mt-2">
          Power utilities for <span className="highlight-gradient">serious study</span>
        </h2>
      </div>

      <div className="space-y-12">
        {tools.map((tool, i) => (
          <div
            key={i}
            className={`grid grid-cols-1 items-center gap-8 rounded-3xl border border-white/5 bg-card/20 p-6 md:grid-cols-2 ${i % 2 ? "md:[&>img]:order-2" : ""}`}
          >
            <img
              src={`${CDN}/${tool.img}`}
              alt={tool.h}
              className="aspect-[4/3] w-full rounded-2xl object-cover border border-white/10 brightness-90"
            />
            <div className="text-left px-4">
              <h3 className="font-display text-3xl font-bold text-white">
                <span className="highlight-gradient">{tool.h}</span>
              </h3>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">{tool.t}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-[1100px] px-6 py-24 border-t border-white/5">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-card/30 to-card/10 p-8 shadow-2xl backdrop-blur-md relative overflow-hidden md:p-14 text-left">
        <div className="absolute top-0 right-0 h-40 w-40 bg-primary/5 rounded-bl-full pointer-events-none" />

        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <div>
            <span className="text-xs font-bold text-primary tracking-widest uppercase">
              Pricing
            </span>
            <h2 className="font-display text-4xl font-bold text-white sm:text-5xl md:text-6xl mt-2">
              Yes, it is <span className="highlight-gradient">FREE!</span>
            </h2>
            <p className="mt-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              (Because we know your bank account is looking dry.)
            </p>
            <p className="mt-6 text-base text-muted-foreground leading-relaxed">
              We know what it’s like to live off instant ramen and energy drinks. Start cramming
              immediately for free. Set up your workspace, index your midterms, and unlock the
              Socratic tutor without needing a credit card.
            </p>

            <div className="mt-8 flex flex-wrap gap-2.5">
              <span className="rounded-full border border-white/5 bg-white/5 px-4.5 py-2 text-xs font-medium text-white/80">
                7-day trial pass
              </span>
              <span className="rounded-full border border-white/5 bg-white/5 px-4.5 py-2 text-xs font-medium text-white/80">
                Monthly Plan
              </span>
              <span className="rounded-full border border-white/5 bg-white/5 px-4.5 py-2 text-xs font-medium text-white/80">
                Semester Cram
              </span>
            </div>

            <a
              href="/signin"
              className="mt-8 inline-block rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 shadow-lg"
            >
              Unlock Workspace Free
            </a>
          </div>
          <div className="relative group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/30 to-indigo-500/10 opacity-30 blur-lg transition-all" />
            <img
              src={`${CDN}/100.jpg`}
              alt="Study desk"
              className="relative rounded-2xl border border-white/10 object-cover shadow-2xl brightness-90 rotate-[-2deg]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24 border-t border-white/5 bg-[#07080c] relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/[0.02] pointer-events-none blur-3xl rounded-full translate-y-1/2" />
      <div className="mx-auto max-w-[1200px] px-6 text-center">
        <h2 className="font-display text-5xl font-bold leading-tight text-white sm:text-7xl">
          Don't just take your next exam.
          <br />
          <span className="highlight-gradient">Absolutely dominate it.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground leading-relaxed">
          Stop staring at slides hoping they will absorb into your brain by osmosis. Join thousands
          of students cramming smarter, memorizing faster, and getting sleep.
        </p>
        <div className="mt-10 flex justify-center">
          <a
            href="/signin"
            className="rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition-all hover:brightness-110 shadow-[0_0_20px_oklch(0.82_0.14_160/0.3)]"
          >
            Start Cramming Now →
          </a>
        </div>
      </div>

      {/* Ticker bar detailing humorous triggers */}
      <div className="mt-20 overflow-hidden border-y border-white/5 bg-card/30 py-4.5 backdrop-blur-sm">
        <div className="ticker flex w-max items-center gap-16 whitespace-nowrap px-6 text-xs uppercase font-mono tracking-widest text-muted-foreground/60">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="flex items-center gap-2">
              <Check className="h-4.5 w-4.5 text-primary" />
              <span>No Cap Cramming</span>
              <span className="mx-3">•</span>
              <span>2 A.M. Approved</span>
              <span className="mx-3">•</span>
              <span>Zero boring yapping</span>
              <span className="mx-3">•</span>
              <span>100% Student Tested</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const faqs = [
  {
    q: "Why is LearnX better than ChatGPT?",
    a: "ChatGPT is a generic chatbot. It is a professional yapper. LearnX is a personalized teacher. ChatGPT gives you essays that feel good but create 'Knowledge Illusions' where you think you understand but fail the test. LearnX forces you to retrieve information via Spaced Repetition flashcards and Quizzes, grounding every response in your specific uploads so you never get hallucinated facts.",
  },
  {
    q: "Is this going to beat NotebookLM?",
    a: "NotebookLM is amazing for summarizing documents. But it stops there. LearnX takes the next step: Active Recall. We don't just dump summaries; we build a full interactive testing system (3D Flashcards, quizzes, and custom host TTS scripts) to ensure you actually memorize the material for the exam, not just read it once.",
  },
  {
    q: "Why is it better than YouLearn or MindGrasp?",
    a: "We focus on exam mastery, not just consumption. Other apps let you watch videos. LearnX works backward from the midterm test questions: 'What will they ask, and how can I memorize it?' We test you relentlessly and adapt to your weakest memory spots.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. Your uploads are fully encrypted in transit and at rest. We never sell your data or train public models on your private lecture slides. Your cram sessions are strictly confidential.",
  },
  {
    q: "Is it actually free?",
    a: "Yes, it is completely free to start. We are students ourselves, so we know the budget is strictly ramen noodles. You can upload documents and use the Socratic chat without spending a single cent.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section
      id="faq"
      className="mx-auto max-w-[850px] px-6 py-24 border-t border-white/5 text-left"
    >
      <div className="text-center mb-12">
        <span className="text-xs font-bold text-primary tracking-widest uppercase">FAQ</span>
        <h2 className="font-display text-4xl font-bold text-white sm:text-5xl">Got questions?</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          Everything you need to know before you start studying smarter.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((f, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/5 bg-card/25 overflow-hidden transition-colors hover:bg-card/45"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left outline-none"
            >
              <span className="flex items-center gap-4">
                <span className="font-mono text-xs text-primary font-bold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-base font-semibold text-white/95">{f.q}</span>
              </span>
              <span
                className={`text-xl text-primary transition-transform duration-300 ${open === i ? "rotate-45" : ""}`}
              >
                +
              </span>
            </button>
            {open === i && (
              <div className="px-6 pb-6 pl-14 text-sm text-muted-foreground leading-relaxed border-t border-white/[0.03] pt-4 bg-[#0a0c10]/20">
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
    <footer className="border-t border-white/5 bg-[#090a0e] px-6 py-12 text-center text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-lg bg-primary/25 border border-primary/30">
            <div
              className="h-3 w-3 rotate-45 bg-primary"
              style={{ clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)" }}
            />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-white">LearnX</span>
        </div>
        <p>© {new Date().getFullYear()} LearnX. Made with way too much coffee ☕</p>
      </div>
    </footer>
  );
}

function Index() {
  useEffect(() => {
    // Smooth scrolling support
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, []);

  return (
    <main className="overflow-hidden pt-4 bg-background min-h-screen text-foreground selection:bg-primary/20 selection:text-white">
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
