import type { Context } from "hono";
import { readFileSync, existsSync, unlinkSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const VAULT = "/home/workspace/core/vault";

type Entry = { path: string; type: string; created: string; tags: string[]; people: string[]; intent: string; title: string };

function loadIndex(): Entry[] {
  const p = join(VAULT, "index.json");
  if (!existsSync(p)) return [];
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return []; }
}

function loadTagIndex(): Record<string, string[]> {
  const p = join(VAULT, "tags-index.json");
  if (!existsSync(p)) return {};
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return {}; }
}

function saveIndex(entries: Entry[]) {
  writeFileSync(join(VAULT, "index.json"), JSON.stringify(entries, null, 2));
}

function buildTagIndex(entries: Entry[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const e of entries) {
    for (const t of e.tags ?? []) {
      if (!map[t]) map[t] = [];
      map[t].push(e.path);
    }
  }
  writeFileSync(join(VAULT, "tags-index.json"), JSON.stringify(map, null, 2));
  return map;
}

function parseNote(content: string): Partial<Entry> {
  const fm: Record<string, unknown> = {};
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    for (const line of fmMatch[1].split("\n")) {
      const [k, ...v] = line.split(": ");
      if (k && v.length) fm[k.trim()] = v.join(": ").trim();
    }
  }
  return {
    type: String(fm.type ?? "note"),
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    people: Array.isArray(fm.people) ? fm.people : [],
    intent: String(fm.intent ?? ""),
    created: String(fm.created ?? new Date().toISOString()),
  };
}

function titleFromPath(path: string): string {
  return basename(path, ".md").replace(/^\d{4}-\d{2}-\d{2}-\d{4}-/, "").replace(/-/g, " ");
}

function getMediaFile(notePath: string): string | null {
  const mediaDir = join(VAULT, "media");
  const base = notePath.replace(/^notes\//, "media/").replace(/\.md$/, "");
  const exts = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".mp4", ".mov", ".mp3"];
  for (const ext of exts) {
    const f = join(VAULT, base + ext);
    if (existsSync(f)) return f;
  }
  return null;
}

export default async (c: Context) => {
  const url = new URL(c.req.url);
  const action = url.searchParams.get("action") ?? "summary";
  const method = c.req.method;

  if (method === "POST" && action === "delete") {
    const path = url.searchParams.get("path") ?? "";
    if (!path) return c.json({ error: "missing path" }, 400);
    const fullPath = join(VAULT, path);
    if (!fullPath.startsWith(VAULT)) return c.json({ error: "invalid path" }, 400);
    try { unlinkSync(fullPath); } catch {}
    const mediaFile = getMediaFile(path);
    if (mediaFile) { try { unlinkSync(mediaFile); } catch {} }
    const entries = loadIndex().filter(e => e.path !== path);
    saveIndex(entries);
    buildTagIndex(entries);
    return c.json({ ok: true, path });
  }

  if (method === "POST" && action === "capture") {
    let body: { text?: string; intent?: string; tags?: string[]; type?: string; url?: string; people?: string[] };
    try { body = await c.req.json(); } catch { return c.json({ error: "bad body" }, 400); }
    const type = body.type ?? "note";
    const tags = body.tags ?? [];
    const now = new Date().toISOString();
    const id = now.replace(/[:.]/g, "-").slice(0, 16);
    const slug = (body.text ?? "capture").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
    const filename = `${now.slice(0, 10)}-${id}-${slug}.md`;
    const folder = type === "link" ? "links" : type === "quote" ? "quotes" : type === "person" ? "people" : "notes";
    const fpath = join(VAULT, folder, filename);
    const frontmatter = [
      "---",
      `id: ${id}`,
      `type: ${type}`,
      `created: ${now}`,
      `source: manual`,
      body.intent ? `intent: "${body.intent}"` : "",
      `tags: [${tags.map(t => `"${t}"`).join(", ")}]`,
      body.people?.length ? `people: [${body.people.map(p => `"[[${p}]]"`).join(", ")}]` : "",
      body.url ? `url: ${body.url}` : "",
      "---",
      "",
      body.text ?? "",
    ].filter(Boolean).join("\n");
    writeFileSync(fpath, frontmatter);
    const entry: Entry = { path: `${folder}/${filename}`, type, created: now, tags, people: body.people ?? [], intent: body.intent ?? "", title: slug };
    const entries = loadIndex();
    entries.push(entry);
    saveIndex(entries);
    buildTagIndex(entries);
    return c.json({ ok: true, path: `${folder}/${filename}`, id });
  }

  if (action === "summary") {
    const entries = loadIndex();
    const tagIndex = loadTagIndex();
    const byType: Record<string, number> = {};
    const topTags: { tag: string; count: number }[] = [];
    for (const e of entries) {
      byType[e.type] = (byType[e.type] ?? 0) + 1;
      for (const t of e.tags ?? []) {
        const existing = topTags.find(({ tag }) => tag === t);
        if (existing) existing.count++;
        else topTags.push({ tag: t, count: 1 });
      }
    }
    topTags.sort((a, b) => b.count - a.count);
    return c.json({ total: entries.length, byType, topTags: topTags.slice(0, 20), recent: entries.slice(-10).reverse(), vault: VAULT });
  }

  if (action === "read") {
    const p = url.searchParams.get("path") ?? "";
    if (!p) return c.json({ error: "missing path" }, 400);
    const fullPath = join(VAULT, p);
    if (!fullPath.startsWith(VAULT)) return c.json({ error: "invalid path" }, 400);
    if (!existsSync(fullPath)) return c.json({ error: "not found" }, 404);
    const content = readFileSync(fullPath, "utf8");
    const parsed = parseNote(content);
    const mediaFile = getMediaFile(p);
    let mediaType: string | null = null;
    let mediaBase64: string | null = null;
    if (mediaFile) {
      const ext = mediaFile.split(".").pop() ?? "";
      const mimeMap: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", mp4: "video/mp4", mov: "video/quicktime", mp3: "audio/mpeg" };
      mediaType = mimeMap[ext] ?? "application/octet-stream";
      try { mediaBase64 = readFileSync(mediaFile).toString("base64"); } catch {}
    }
    return c.json({ content, intent: parsed.intent ?? "", tags: parsed.tags ?? [], people: parsed.people ?? [], type: parsed.type ?? "note", created: parsed.created ?? "", mediaType, mediaBase64 });
  }

  if (action === "search") {
    const needle = (url.searchParams.get("q") ?? "").toLowerCase();
    if (!needle) return c.json({ results: [] });
    const entries = loadIndex();
    const matches: { entry: Entry; score: number }[] = [];
    for (const e of entries) {
      let score = 0;
      if (e.title.toLowerCase().includes(needle)) score += 5;
      if (e.intent.toLowerCase().includes(needle)) score += 4;
      if (e.tags.some(t => t.toLowerCase().includes(needle))) score += 3;
      if (e.people.some(p => p.toLowerCase().includes(needle))) score += 3;
      try {
        const body = readFileSync(join(VAULT, e.path), "utf8").toLowerCase();
        if (body.includes(needle)) score += 1;
      } catch {}
      if (score > 0) matches.push({ entry: e, score });
    }
    matches.sort((a, b) => b.score - a.score);
    return c.json({ results: matches.map(m => m.entry) });
  }

  if (action === "shortcut") {
    const cmd = url.searchParams.get("cmd") ?? "";

    if (cmd === "ln") {
      const entries = loadIndex();
      if (entries.length === 0) return c.json({ error: "no notes yet" }, 404);
      const last = entries[entries.length - 1];
      try {
        const content = readFileSync(join(VAULT, last.path), "utf8");
        return c.json({ path: last.path, content, intent: last.intent, tags: last.tags, people: last.people, created: last.created, type: last.type });
      } catch {
        return c.json({ error: "file not found" }, 404);
      }
    }

    if (cmd === "nn") {
      const entries = loadIndex();
      const today = new Date().toISOString().slice(0, 10);
      const todayNotes = entries.filter(e => e.created.slice(0, 10) === today).reverse();
      return c.json({ notes: todayNotes.map(e => ({ path: e.path, type: e.type, title: basename(e.path, ".md").replace(/^\d{4}-\d{2}-\d{2}(-\d{1,2}-\d{1,2}-)?/, "").replace(/-/g, " "), tags: e.tags ?? [], created: e.created })) });
    }

    if (cmd === "t") {
      const tagIndex = loadTagIndex();
      const tags = Object.keys(tagIndex).sort();
      return c.json({ tags });
    }

    if (cmd === "shorts") {
      const p = "/home/workspace/sensemaking/docs/SHORTCUTS.md";
      if (!existsSync(p)) return c.json({ error: "shortcuts doc not found" }, 404);
      return c.json({ content: readFileSync(p, "utf8") });
    }

    return c.json({ error: "unknown shortcut", hint: "try ln, nn, t, or shorts" }, 400);
  }

  return c.json({ error: "unknown action" }, 400);
};
