import { useEffect, useMemo, useState } from "react";
import { Search, FileText, Link2, Quote, User, Inbox, Calendar, RefreshCw, Sparkles } from "lucide-react";

type Entry = {
  path: string;
  type: string;
  created: string;
  tags: string[];
  people: string[];
  intent: string;
  title: string;
};

type OpenState = {
  path: string;
  content: string;
  mediaType?: string;
  mediaBase64?: string;
  intent?: string;
} | null;

type Summary = {
  total: number;
  byType: Record<string, number>;
  topTags: { tag: string; count: number }[];
  recent: Entry[];
  vault: string;
};

const TYPE_ICON: Record<string, any> = {
  note: FileText,
  link: Link2,
  quote: Quote,
  person: User,
  inbox: Inbox,
  journal: Calendar,
  media: FileText,
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Sensemaking() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Entry[]>([]);
  const [open, setOpen] = useState<OpenState>(null);
  const [loading, setLoading] = useState(false);

  async function loadSummary() {
    setLoading(true);
    try {
      const r = await fetch("/api/sensemaking?action=summary", { headers: { Accept: "application/json" } });
      const data = await r.json();
      setSummary(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSummary(); }, []);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/sensemaking?action=search&q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } });
      const j = await r.json();
      setResults(j.results ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  async function openNote(path: string) {
    setLoading(true);
    try {
      const r = await fetch(`/api/sensemaking?action=read&path=${encodeURIComponent(path)}`, { headers: { Accept: "application/json" } });
      const data = await r.json();
      setOpen({ path, content: data.content ?? "", mediaType: data.mediaType, mediaBase64: data.mediaBase64, intent: data.intent });
    } finally { setLoading(false); }
  }

  async function deleteNote(path: string) {
    if (!confirm("Delete this capture?")) return;
    await fetch(`/api/sensemaking?action=delete&path=${encodeURIComponent(path)}`, { method: "POST" });
    setOpen(null);
    loadSummary();
  }

  const recent = useMemo(() => (summary?.recent ?? []).filter(e => e.type !== "journal").slice(0, 12), [summary]);
  const list = q.trim() ? results : recent;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <header className="flex items-baseline justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-600" />
              Sense-making
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              {summary ? `${summary.total} captures` : "loading…"} ·{" "}
              <span className="font-mono text-xs">{summary?.vault}</span>
            </p>
          </div>
          <button
            onClick={loadSummary}
            className="text-stone-500 hover:text-stone-900 transition flex items-center gap-1 text-sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            refresh
          </button>
        </header>

        <div className="relative mb-8">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search notes, tags, people, intent…"
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <aside className="md:col-span-1 space-y-6">
            {summary && (
              <div className="bg-white rounded-lg border border-stone-200 p-4">
                <h2 className="text-xs uppercase tracking-wide text-stone-500 mb-3">By type</h2>
                <ul className="space-y-1.5">
                  {Object.entries(summary.byType)
                    .filter(([t]) => t !== "journal")
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, n]) => {
                      const I = TYPE_ICON[type] ?? FileText;
                      return (
                        <li key={type} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-stone-700">
                            <I className="w-3.5 h-3.5 text-stone-400" />
                            {type}
                          </span>
                          <span className="font-mono text-stone-500">{n}</span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}

            {summary && summary.topTags.length > 0 && (
              <div className="bg-white rounded-lg border border-stone-200 p-4">
                <h2 className="text-xs uppercase tracking-wide text-stone-500 mb-3">Top tags</h2>
                <div className="flex flex-wrap gap-1.5">
                  {summary.topTags.map(({ tag, count }) => (
                    <button
                      key={tag}
                      onClick={() => setQ(tag)}
                      className="text-xs px-2 py-1 rounded-full bg-stone-100 hover:bg-amber-100 text-stone-700 transition"
                    >
                      {tag} <span className="text-stone-400">·{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-stone-500 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="font-medium text-stone-700 mb-1">Capture from your phone</p>
              <p>
                Text or email Zo with content + a one-line intention. The capture rule writes it
                here automatically.
              </p>
            </div>
          </aside>

          <main className="md:col-span-2 space-y-3">
            <h2 className="text-xs uppercase tracking-wide text-stone-500">
              {q.trim() ? `Results for "${q}"` : "Recent captures"}
            </h2>
            {list.length === 0 && (
              <div className="text-stone-500 text-sm py-8 text-center border border-dashed border-stone-300 rounded-lg">
                {q.trim() ? "no matches" : "no captures yet"}
              </div>
            )}
            {list.map(e => {
              const I = TYPE_ICON[e.type] ?? FileText;
              return (
                <button
                  key={e.path}
                  onClick={() => openNote(e.path)}
                  className="w-full text-left bg-white hover:bg-amber-50 border border-stone-200 hover:border-amber-300 rounded-lg p-4 transition"
                >
                  <div className="flex items-start gap-3">
                    <I className="w-4 h-4 mt-1 text-stone-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-medium text-stone-900 truncate">{e.title}</h3>
                        <span className="text-xs text-stone-400 flex-shrink-0">{fmtDate(e.created)}</span>
                      </div>
                      {e.intent && (
                        <p className="text-sm text-stone-600 mt-1 line-clamp-2">{e.intent}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {e.tags.slice(0, 6).map(t => (
                          <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                            {t}
                          </span>
                        ))}
                        {e.people.map(p => (
                          <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            {p.replace(/\[\[|\]\]/g, "")}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-stone-400 font-mono mt-1.5">{e.path}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </main>
        </div>

        {open && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50"
            onClick={() => setOpen(null)}
          >
            <div
              className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-mono text-stone-400">{open.path}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => deleteNote(open.path)}
                    className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                  >Delete</button>
                  <button onClick={() => setOpen(null)} className="text-xs px-2 py-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200">Close</button>
                </div>
              </div>
              {open.mediaBase64 ? (
                open.mediaType?.startsWith("image/") ? (
                  <img src={`data:${open.mediaType};base64,${open.mediaBase64}`} className="max-w-full rounded" alt="" />
                ) : open.mediaType === "application/pdf" ? (
                  <iframe
                    src={`data:application/pdf;base64,${open.mediaBase64}`}
                    className="w-full h-96 rounded"
                    title="PDF"
                  />
                ) : (
                  <a
                    href={`data:${open.mediaType};base64,${open.mediaBase64}`}
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition"
                  >
                    Download {open.mediaType?.split("/")[1] ?? "file"}
                  </a>
                )
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-stone-800 font-mono leading-relaxed">
                  {open.content}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
