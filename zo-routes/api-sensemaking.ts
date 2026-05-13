import type { Context } from "hono";
import { readFileSync, existsSync, unlinkSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

const VAULT = "/home/workspace/vault";

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

function getMediaFile(notePath: string): string | null {
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
    const topTags: [string, number][] = [];
    for (const e of entries) {
      byType[e.type] = (byType[e.type] ?? 0) + 1;
      for (const t of e.tags ?? []) {
        const existing = topTags.find(([name]) => name === t);
        if (existing) existing[1]++;
        else topTags.push([t, 1]);
      }
    }
    topTags.sort((a, b) => b[1] - a[1]);
    return c.json({
      total: entries.length,
      byType,
      topTags: topTags.slice(0, 20).map(([tag, count]) => ({ tag, count })),
      recent: entries.slice(-10).reverse().map(e => ({ path: e.path, type: e.type, created: e.created, tags: e.tags, people: e.people, intent: e.intent, title: basename(e.path, ".md").replace(/^\d{4}-\d{2}-\d{2}(-\d{1,2}-\d{1,2}-)?/, "").replace(/-/g, " ") })),
      vault: VAULT,
    });
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
    const matches: [Entry, number][] = [];
    for (const e of entries) {
      let score = 0;
      const title = basename(e.path, ".md").replace(/^\d{4}-\d{2}-\d{2}(-\d{1,2}-\d{1,2}-)?/, "").replace(/-/g, " ");
      if (title.toLowerCase().includes(needle)) score += 5;
      if (e.intent.toLowerCase().includes(needle)) score += 4;
      if (e.tags.some(t => t.toLowerCase().includes(needle))) score += 3;
      if (e.people.some(p => p.toLowerCase().includes(needle))) score += 3;
      try {
        const body = readFileSync(join(VAULT, e.path), "utf8").toLowerCase();
        if (body.includes(needle)) score += 1;
      } catch {}
      if (score > 0) matches.push([e, score]);
    }
    matches.sort((a, b) => b[1] - a[1]);
    return c.json({ results: matches.map(([e]) => ({ path: e.path, type: e.type, created: e.created, tags: e.tags, people: e.people, intent: e.intent, title: basename(e.path, ".md").replace(/^\d{4}-\d{2}-\d{2}(-\d{1,2}-\d{1,2}-)?/, "").replace(/-/g, " ") })) });
  }

  return c.json({ error: "unknown action" }, 400);
};
