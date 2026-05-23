import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({ component: Index });

const CDN = "https://c.animaapp.com/mph5rn45Kmor9l/assets";
const LOGO = `${CDN}/logo-icon.svg`;

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
    <header className="sticky top-4 z-50 mx-auto w-[min(960px,92vw)]">
      <nav className="flex items-center justify-between rounded-full border border-border bg-card/80 px-3 py-2 backdrop-blur-xl shadow-[0_8px_30px_-12px_oklch(0_0_0/0.2)]">
        <a href="#" className="flex items-center gap-2 pl-2">
          <img src={LOGO} alt="" className="h-6 w-6" />
          <span className="font-display text-xl">Ultra Learn</span>
        </a>
        <a href="#pricing" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">pricing</a>
        <a href="/signin" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.03]">
          Get started
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto max-w-[1200px] px-6 pt-16 pb-24">
      {/* floating scrapbook images */}
      <img src={`${CDN}/63.jpg`} alt="coffee" style={{ ["--r" as never]: "-8deg" }} className="float absolute left-0 top-8 hidden h-40 w-32 rotate-[-8deg] rounded-md object-cover paper md:block" />
      <img src={`${CDN}/61.jpg`} alt="" style={{ ["--r" as never]: "12deg" }} className="float absolute left-[18%] top-48 hidden h-28 w-28 rotate-[12deg] rounded-md object-cover paper md:block" />
      <img src={`${CDN}/64.jpg`} alt="" style={{ ["--r" as never]: "-4deg" }} className="float absolute left-[42%] top-4 hidden h-32 w-44 rotate-[-4deg] rounded-md object-cover paper md:block" />
      <img src={`${CDN}/66.jpg`} alt="" style={{ ["--r" as never]: "8deg" }} className="float absolute right-2 top-16 hidden h-36 w-36 rotate-[8deg] rounded-md object-cover paper md:block" />
      <img src={`${CDN}/68.jpg`} alt="" style={{ ["--r" as never]: "-12deg" }} className="float absolute right-[20%] top-56 hidden h-28 w-32 rotate-[-12deg] rounded-md object-cover paper md:block" />

      <div className="relative mx-auto max-w-3xl pt-24 text-center">
        <p className="font-hand text-3xl text-muted-foreground">Grab Your coffee and get started for <span className="marker-yellow font-semibold text-foreground">FREE!!</span></p>
        <div className="mx-auto mt-10 flex items-center justify-center gap-4">
          <img src={LOGO} alt="" className="h-16 w-16" />
          <div className="text-left">
            <h1 className="font-display text-7xl leading-none tracking-tight md:text-8xl">UltraLearn</h1>
            <p className="font-hand text-2xl text-muted-foreground">By Novify</p>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-2xl font-display text-3xl leading-tight md:text-4xl">
          The AI study assistant that turns <span className="marker-yellow">chaos</span> into <span className="marker-mint">preparation</span>.
        </p>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
          Teaches <b>YOU!</b>, Asks <b>YOU!</b> &amp; Prepares <b>YOU!</b> instantly from your files.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <a href="#demo" className="rounded-full border border-border bg-card px-5 py-3 text-sm font-medium transition-colors hover:bg-muted">
            ▶ Watch demo
          </a>
          <a href="/signin" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]">
            Get started →
          </a>
        </div>
      </div>

      {/* Sticky note */}
      <div className="relative mx-auto mt-20 max-w-md">
        <div className="rotate-[3deg] bg-sticky p-8 paper">
          <p className="font-hand text-3xl leading-snug">
            <b>Help's</b> you get <i>prepared</i> for your <b>EXAMS</b> @ <span className="text-5xl">2</span><span className="text-xl">A.M.</span>
          </p>
          <p className="mt-4 font-hand text-lg text-muted-foreground">Source: Trust me bro!</p>
          <div className="mt-3 inline-block rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">FR, FR 😆 !!!</div>
        </div>
      </div>
    </section>
  );
}

function Upload() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-20">
      <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
        <div className="relative">
          <img src={`${CDN}/69.jpg`} alt="AI folder" className="rotate-[-3deg] rounded-2xl paper" />
          <div className="absolute -bottom-6 -right-4 rotate-[8deg] rounded-full bg-card px-4 py-2 paper font-hand text-xl">AI teacher inside ....</div>
        </div>
        <div>
          <h2 className="font-display text-5xl leading-tight md:text-6xl">
            <span className="marker-yellow">UPLOAD</span> your files.<br />
            Let AI handle the <i>teaching</i> &amp; <i>preparation</i>
          </h2>
        </div>
      </div>
    </section>
  );
}

function PowerPrep() {
  const cards = [
    { img: "90.jpg", title: "AI Tutor", desc: "Turns you into that genius Student!!" },
    { img: "75.jpg", title: "Best AI for Exams", desc: "Built on learning science. Ace every test." },
    { img: "81.jpg", title: "Active Recall", desc: "Flashcards & quizzes that actually stick." },
    { img: "72.jpg", title: "Socratic Mode", desc: "AI that teaches, not just answers." },
    { img: "77.jpg", title: "There are no LIMITS!", desc: "Upload, ask, learn. Unlimited curiosity." },
  ];
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-20">
      <h2 className="font-display text-6xl md:text-7xl">Power <span className="marker-mint">Prep</span></h2>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.img} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card paper transition-transform hover:-translate-y-1">
            <img src={`${CDN}/${c.img}`} alt={c.title} className="aspect-[4/5] w-full object-cover" />
            <div className="p-4">
              <h3 className="font-display text-2xl leading-tight">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
              <a href="#" className="mt-3 inline-block text-sm font-semibold text-primary">Know more →</a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Trusted() {
  return (
    <section className="border-y border-border bg-card/40 py-10">
      <p className="text-center font-hand text-2xl text-muted-foreground">Trusted by top students worldwide</p>
      <div className="mt-6 overflow-hidden">
        <div className="ticker flex w-max items-center gap-16 px-8">
          {[...unis, ...unis].map((u, i) => (
            <img key={i} src={`${CDN}/${u}.svg`} alt="" className="h-10 w-auto opacity-70 grayscale" />
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24">
      <h2 className="font-display text-6xl md:text-7xl">How it works?</h2>
      <p className="mt-2 font-hand text-3xl text-muted-foreground">in 3 simple steps</p>

      <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2">
        <div className="relative">
          <span className="font-hand text-4xl">Step 1 &amp; 2</span>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <img src={`${CDN}/73.jpg`} alt="" className="rotate-[-3deg] rounded-xl paper" />
            <img src={`${CDN}/76.jpg`} alt="" className="rotate-[4deg] rounded-xl paper" />
          </div>
          <h3 className="mt-8 font-display text-6xl">
            <span className="marker-yellow">Drag</span> &amp; <span className="marker-mint">DROP</span><br />your files
          </h3>
          <img src={`${CDN}/78.jpg`} alt="" className="mt-6 rounded-2xl paper" />
        </div>
        <div>
          <span className="font-hand text-4xl">Step 3</span>
          <h3 className="mt-4 font-display text-5xl leading-tight">
            <span className="marker-yellow">SMMAAASH!!</span><br />that enter button
          </h3>
          <img src={`${CDN}/80.png`} alt="" className="mx-auto mt-8 w-full max-w-md rotate-[-2deg]" />
          <img src={`${CDN}/108.jpg`} alt="" className="mt-6 rounded-2xl paper" />
        </div>
      </div>
    </section>
  );
}

function MakeItClick() {
  const items = [
    { img: "79.jpg", title: "See the whole board", desc: "Watch 50 pages of dense text snap into a clean, connected map in your mind." },
    { img: "82.jpg", title: "Just listen", desc: "Pop in your AirPods and let your hardest chapters play out like a podcast." },
    { img: "83.jpg", title: "Trim the fat", desc: "Zero academic rambling. Just the raw, razor-sharp facts pinned to the wall." },
    { img: "84.jpg", title: "Make it click", desc: "Stop fighting your brain. We turn messy notes into the exact format that makes the lightbulb snap on." },
    { img: "85.jpg", title: "Do it", desc: "Stop staring, start tapping. Swipe through rapid-fire reps until it becomes a reflex." },
  ];
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24">
      <h2 className="font-display text-6xl md:text-7xl">Make it <i>click</i>.</h2>
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => (
          <article key={it.img} className={`rounded-2xl border border-border bg-card p-5 paper ${i === 3 ? "lg:col-span-2" : ""}`}>
            <img src={`${CDN}/${it.img}`} alt={it.title} className="aspect-[4/3] w-full rounded-xl object-cover" />
            <h3 className="mt-4 font-display text-3xl">{it.title}</h3>
            <p className="mt-2 text-muted-foreground">{it.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function NewNormal() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24">
      <h2 className="font-display text-6xl md:text-7xl">The new normal</h2>
      <div className="mt-10 grid grid-cols-1 items-end gap-10 md:grid-cols-2">
        <div>
          <p className="font-display text-4xl leading-snug md:text-5xl">
            How <span className="marker-yellow">128 countries</span> study today.
          </p>
          <p className="mt-6 text-xl text-muted-foreground">
            Join <b className="text-foreground">20,000 students</b> across <b className="text-foreground">500 universities</b> swapping <span className="marker-mint">2 A.M. panic</span> for a <i>full night's sleep</i>.
          </p>
        </div>
        <div className="relative grid grid-cols-2 gap-4">
          <img src={`${CDN}/86.jpg`} alt="" className="rotate-[-3deg] rounded-2xl paper" />
          <img src={`${CDN}/87.jpg`} alt="" className="mt-8 rotate-[4deg] rounded-2xl paper" />
        </div>
      </div>
    </section>
  );
}

function PowerTools() {
  const tools = [
    { img: "106.jpg", h: "Deep Research.", t: "Stop falling down Google rabbit holes at 2 A.M. When your syllabus isn't enough, the AI scours the entire web to pull the exact, verified facts you need." },
    { img: "91.jpg", h: "Feed the machine.", t: "Drop your heaviest, 800-page PDF textbooks straight into the engine. Ultra Learn instantly digests the academic fluff and hands you back a clean, actionable study guide." },
    { img: "89.jpg", h: "Skip the lecture.", t: "Paste any YouTube URL and walk away. Ultra Learn watches the grueling two-hour video for you and distills it into a sharp, five-minute read." },
    { img: "88.jpg", h: "Save the group chat.", t: "Don't gatekeep the A+. With exactly one click, beam your AI-generated master study guides directly to your friends." },
    { img: "97.jpg", h: "Your server, smarter.", t: "Add the Ultra Learn bot to your Discord server. Ask it questions mid-conversation and generate study materials for the entire squad." },
  ];
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24">
      <h2 className="font-display text-6xl md:text-7xl">Power <span className="marker-yellow">Tools</span></h2>
      <div className="mt-12 space-y-8">
        {tools.map((tool, i) => (
          <div key={tool.img} className={`grid grid-cols-1 items-center gap-8 rounded-3xl border border-border bg-card p-6 paper md:grid-cols-2 ${i % 2 ? "md:[&>img]:order-2" : ""}`}>
            <img src={`${CDN}/${tool.img}`} alt={tool.h} className="aspect-[4/3] w-full rounded-2xl object-cover" />
            <div>
              <h3 className="font-display text-4xl"><span className="marker-mint">{tool.h}</span></h3>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{tool.t}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BestAI() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24">
      <div className="relative rounded-3xl border border-border bg-card p-8 paper md:p-14">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <div>
            <p className="font-hand text-2xl text-muted-foreground">Best AI tool for</p>
            <h2 className="font-display text-6xl leading-tight md:text-7xl">Exam Preparation</h2>
            <p className="mt-2 font-display text-3xl italic">Active Recall <span className="marker-yellow">Powered</span></p>
            <p className="mt-6 max-w-md text-muted-foreground">
              Built on learning science. AI that teaches, not just answers. Adaptive AI tutor with spaced repetition flashcards, quizzes, and Socratic teaching.
            </p>
            <a href="#" className="mt-6 inline-block rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Know more →</a>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img src={`${CDN}/95.jpg`} alt="" className="rotate-[-4deg] rounded-2xl paper" />
            <img src={`${CDN}/92.jpg`} alt="" className="mt-6 rotate-[5deg] rounded-2xl paper" />
            <img src={`${CDN}/93.jpg`} alt="" className="rotate-[3deg] rounded-2xl paper" />
            <img src={`${CDN}/94.jpg`} alt="" className="mt-6 rotate-[-3deg] rounded-2xl paper" />
          </div>
        </div>
      </div>
      <div className="mt-12 text-center">
        <p className="font-hand text-4xl text-muted-foreground">study smarter</p>
        <p className="font-display text-6xl italic">not harder....</p>
      </div>
    </section>
  );
}

function Anywhere() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24">
      <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
        <img src={`${CDN}/102.jpg`} alt="" className="rounded-3xl paper" />
        <div>
          <h2 className="font-display text-6xl leading-tight md:text-7xl">
            Anywhere.<br /><i>Everywhere.</i><br />&amp; on the <span className="marker-yellow">GO!</span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">On your Phone, your tab and even your iMac.</p>
          <div className="mt-6 flex gap-4">
            <img src={`${CDN}/96.jpg`} alt="" className="h-24 w-24 rotate-[-4deg] rounded-xl object-cover paper" />
            <img src={`${CDN}/98.jpg`} alt="" className="h-24 w-32 rotate-[4deg] rounded-xl object-cover paper" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Chaos() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24">
      <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
        <div>
          <h2 className="font-display text-6xl leading-tight md:text-7xl">Chaos to<br /><i className="marker-mint">Clarity....</i></h2>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Turn the panic of 'too much to study' into the power of knowing <b className="text-foreground">exactly what to answer</b>.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <img src={`${CDN}/99.jpg`} alt="" className="rotate-[-3deg] rounded-2xl paper" />
          <img src={`${CDN}/103.jpg`} alt="" className="mt-8 rotate-[3deg] rounded-2xl paper" />
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-[1200px] px-6 py-24">
      <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
        <div className="relative">
          <img src={`${CDN}/100.jpg`} alt="" className="rotate-[-4deg] rounded-2xl paper" />
          <img src={`${CDN}/101.jpg`} alt="" className="absolute -bottom-6 -right-6 h-40 w-40 rotate-[6deg] rounded-2xl object-cover paper" />
        </div>
        <div>
          <p className="font-hand text-3xl text-muted-foreground">Grab a Coffee</p>
          <h2 className="font-display text-6xl leading-tight md:text-7xl">YES It's <span className="marker-yellow">FREE!</span></h2>
          <p className="mt-2 font-hand text-xl text-muted-foreground">(We know, we can hardly believe it either.)</p>
          <p className="mt-6 max-w-md text-lg">
            Start small. Study on your terms. Choose a <b>7-day pass</b> for a quick sprint, or go monthly, semester, or yearly when you want longer coverage.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full border border-border bg-card px-4 py-2 text-sm">7-day pass</span>
            <span className="rounded-full border border-border bg-card px-4 py-2 text-sm">Monthly</span>
            <span className="rounded-full border border-border bg-card px-4 py-2 text-sm">Semester</span>
            <span className="rounded-full border border-border bg-card px-4 py-2 text-sm">Yearly</span>
          </div>
          <a href="#" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Know more →</a>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const tag = "7-day pass, monthly, semester, or yearly — pick the study plan that fits ★";
  return (
    <section id="get-started" className="py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <h2 className="font-display text-6xl leading-tight md:text-8xl">
          Don't just take your next test.<br /><span className="marker-yellow">Crush it.</span>
        </h2>
        <img src={`${CDN}/104.jpg`} alt="" className="mt-10 w-full rounded-3xl paper" />
        <div className="mt-10 flex justify-center">
          <a href="/signin" className="rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground">Get started →</a>
        </div>
      </div>
      <div className="mt-16 overflow-hidden border-y border-border bg-card py-5">
        <div className="ticker flex w-max items-center gap-12 whitespace-nowrap px-6 font-display text-2xl">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="text-muted-foreground">{tag}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Founder() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24">
      <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
        <img src={`${CDN}/107.jpg`} alt="Founder with dog" className="rotate-[-3deg] rounded-2xl paper" />
        <div>
          <p className="font-hand text-3xl text-muted-foreground">Notes from builder</p>
          <img src={`${CDN}/105.jpg`} alt="Handwritten notes from the builder" className="mt-6 rounded-2xl paper" />
        </div>
      </div>
    </section>
  );
}

const faqs = [
  { q: "Why is Ultra Learn better than ChatGPT or Perplexity?", a: "ChatGPT is a Chatbot. Ultra Learn is a Teacher. ChatGPT gives you answers, which feels good but creates 'Knowledge Illusions.' Ultra Learn forces you to retrieve information via Spaced Repetition and Quizzes. We also ground every answer in your specific PDFs, so you never get hallucinated facts about biology when you're studying history." },
  { q: "How does it beat NotebookLM?", a: "NotebookLM is amazing for 'talking to docs'. But it stops there. Ultra Learn takes the next step: Active Recall. We don't just summarize; we build a full study system (Flashcards, Quizzes, and Mind Maps) to ensure you actually memorize the content for the exam, not just read it." },
  { q: "Why is it better than YouLearn & MindGrasp?", a: "We focus on mastery, not just consumption. Other apps let you watch videos or read notes. Ultra Learn works backward from the exam: 'What do I need to know?' It breaks concepts down, tests you relentlessly, and adapts to your weak spots." },
  { q: "How does Ultra Learn AI work?", a: "Simply upload your study materials (PDFs, slides, or paste text), and our AI will instantly generate summaries, flashcards, and quizzes. You can also chat with your documents to get answers to specific questions." },
  { q: "Is my data secure?", a: "Yes. Your uploads are encrypted in transit and at rest. We never train public models on your private files." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mx-auto max-w-[900px] px-6 py-24">
      <p className="font-hand text-3xl text-muted-foreground">Got questions?</p>
      <h2 className="font-display text-7xl">FAQ</h2>
      <p className="mt-3 text-lg text-muted-foreground">Everything you need to know before you start studying smarter.</p>
      <div className="mt-10 space-y-3">
        {faqs.map((f, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card paper">
            <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left">
              <span className="flex items-center gap-4">
                <span className="font-mono text-sm text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-display text-2xl">{f.q}</span>
              </span>
              <span className={`text-2xl transition-transform ${open === i ? "rotate-45" : ""}`}>+</span>
            </button>
            {open === i && <div className="px-6 pb-6 pl-16 text-muted-foreground">{f.a}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card/60 px-6 py-12">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-2">
          <img src={LOGO} alt="" className="h-6 w-6" />
          <span className="font-display text-xl">Ultra Learn</span>
          <span className="font-hand text-lg text-muted-foreground">by Novify</span>
        </div>
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Novify. Made with too much coffee ☕</p>
      </div>
    </footer>
  );
}

function Index() {
  return (
    <main className="overflow-hidden pt-4">
      <Nav />
      <Hero />
      <Upload />
      <PowerPrep />
      <Trusted />
      <HowItWorks />
      <MakeItClick />
      <NewNormal />
      <PowerTools />
      <BestAI />
      <Anywhere />
      <Chaos />
      <Pricing />
      <CTA />
      <Founder />
      <FAQ />
      <Footer />
    </main>
  );
}
