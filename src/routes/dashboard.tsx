import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Flame,
  Paperclip,
  Youtube,
  Link2,
  Type,
  Search,
  ArrowUp,
  X,
  LayoutGrid,
  List,
  ChevronDown,
  MoreVertical,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — UltraLearn" }],
  }),
  component: DashboardPage,
});

type Item = {
  id: string;
  title: string;
  createdAt: Date;
  kind: "bundle" | "pdf";
};

function DashboardPage() {
  const [showTrial, setShowTrial] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");

  const onFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    const newItems: Item[] = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      title: `Learning Session - ${dateStr}`,
      createdAt: today,
      kind: f.type.includes("pdf") ? "pdf" : "bundle",
    }));
    setItems((prev) => [...newItems, ...prev]);
  };

  const filtered = items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-white/10">
            <div className="h-4 w-4 rotate-45 bg-white/80" style={{ clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)" }} />
          </div>
          <span className="font-display text-2xl">Ultra Learn</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-sm">
            <Flame className="h-4 w-4 text-orange-400" />
            <span className="font-semibold">2 day</span>
            <span className="text-white/40">/ 30</span>
          </div>
          <button
            className="grid h-9 w-9 place-items-center rounded-full bg-[#4a2a1f] text-sm font-semibold uppercase"
            title="User"
          >
            U
          </button>
        </div>
      </header>

      {items.length === 0 ? (
        // Empty state
        <main className="mx-auto flex max-w-4xl flex-col items-center px-6 pt-20 text-center">
          <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
            Let's learn, USER
          </h1>

          <Dropzone onFiles={onFiles} />
        </main>
      ) : (
        // Recents view
        <main className="mx-auto max-w-6xl px-6 pb-20">
          {showTrial && (
            <div className="relative mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <button
                onClick={() => setShowTrial(false)}
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/5 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-xs uppercase tracking-wider text-white/50">Trial Upgrade</p>
              <h2 className="mt-1 text-xl font-semibold">7 days left on your trial</h2>
              <p className="mt-2 text-sm text-white/60">
                Unlock uninterrupted study sessions, smarter review tools, and your full recents workspace with a monthly plan.
              </p>
              <div className="mt-4 flex gap-3">
                <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
                  Buy monthly to keep going ↗
                </button>
                <button className="rounded-full border border-white/15 px-4 py-2 text-sm">Compare plans</button>
              </div>
            </div>
          )}

          <div className="mt-8">
            <Dropzone onFiles={onFiles} compact />
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <h3 className="text-3xl font-semibold">Recents</h3>
            <span className="text-sm text-white/40">{filtered.length} items</span>
            <div className="ml-auto flex flex-1 items-center gap-3 md:flex-none">
              <div className="flex flex-1 items-center gap-2 rounded-full bg-white/5 px-4 py-2 md:w-96">
                <Search className="h-4 w-4 text-white/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search titles, tags, or uploaded resources"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
                />
              </div>
              <button className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm">
                ↕ Newest first <ChevronDown className="h-3 w-3" />
              </button>
              <div className="flex rounded-full bg-white/5 p-1">
                <button
                  onClick={() => setView("grid")}
                  className={`grid h-8 w-8 place-items-center rounded-full ${view === "grid" ? "bg-white text-black" : ""}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`grid h-8 w-8 place-items-center rounded-full ${view === "list" ? "bg-white text-black" : ""}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div
            className={
              view === "grid"
                ? "mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                : "mt-6 flex flex-col gap-2"
            }
          >
            {filtered.map((it) => (
              <Card key={it.id} item={it} view={view} />
            ))}
          </div>
        </main>
      )}
    </div>
  );
}

function Dropzone({ onFiles, compact = false }: { onFiles: (f: FileList | null) => void; compact?: boolean }) {
  const [drag, setDrag] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        onFiles(e.dataTransfer.files);
      }}
      className={`mt-${compact ? 0 : 12} w-full rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-colors ${
        drag ? "border-white/40 bg-white/[0.05]" : ""
      }`}
    >
      <p className="text-center text-white/80">Add files, drag & drop to learn</p>
      <p className="mt-1 text-center text-xs text-white/40">PDF, Word, and PowerPoint files up to 15 MB each</p>

      <div className="mx-auto mt-6 flex max-w-3xl items-center justify-between gap-2 rounded-full bg-transparent">
        <div className="flex flex-1 items-center justify-around gap-1 text-sm text-white/70">
          <FileButton icon={<Paperclip className="h-4 w-4" />} label="Files" onFiles={onFiles} />
          <Chip icon={<Youtube className="h-4 w-4" />} label="Youtube" />
          <Chip icon={<Link2 className="h-4 w-4" />} label="Websites" />
          <Chip icon={<Type className="h-4 w-4" />} label="Add Text" />
          <Chip icon={<Search className="h-4 w-4" />} label="Deep Research" />
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/5">
      {icon}
      <span>{label}</span>
    </button>
  );
}

function FileButton({
  icon,
  label,
  onFiles,
}: {
  icon: React.ReactNode;
  label: string;
  onFiles: (f: FileList | null) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 hover:bg-white/5">
      {icon}
      <span>{label}</span>
      <input
        type="file"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
    </label>
  );
}

function Card({ item, view }: { item: Item; view: "grid" | "list" }) {
  const dateLabel = item.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (view === "list") {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04]">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-red-500/20 text-red-300">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-medium">{item.title}</p>
          <p className="text-xs text-white/40">1 source • {dateLabel}</p>
        </div>
        <button className="p-2 text-white/40 hover:text-white">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05]">
      <div className="relative grid h-44 place-items-center bg-gradient-to-br from-red-500 to-red-700">
        <div className="rounded-lg bg-white px-4 py-6 text-center shadow-xl">
          <div className="mx-auto mb-1 inline-block rounded bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
            PDF
          </div>
          <FileText className="mx-auto h-10 w-10 text-red-400" />
          <p className="mt-1 text-xs text-black">Document</p>
        </div>
        <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[10px]">Bundle</span>
      </div>
      <div className="flex items-start justify-between gap-2 p-4">
        <div>
          <p className="font-medium">{item.title}</p>
          <p className="mt-1 text-xs text-white/40">1 source • {dateLabel}</p>
        </div>
        <button className="p-1 text-white/40 hover:text-white">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
