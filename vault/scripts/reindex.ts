#!/usr/bin/env bun
// Rebuild index.json and tags-index.json from the vault.
// Usage: bun run scripts/reindex.ts

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const VAULT = new URL("..", import.meta.url).pathname;

type Entry = {
  path: string;
  type: string;
  created: string;
  tags: string[];
  people: string[];
  intent: string;
  title: string;
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    if (name === "scripts" || name === "node_modules") continue;
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, out);
    else if (name.endsWith(".md") && name !== "AGENTS.md" && name !== "README.md") out.push(full);
  }
  return out;
}

function parseFrontmatter(src: string): Record<string, any> {
  if (!src.startsWith("---")) return {};
  const end = src.indexOf("\n---", 3);
  if (end < 0) return {};
  const block = src.slice(3, end).trim();
  const out: Record<string, any> = {};
  let key = "";
  for (const line of block.split("\n")) {
    const m = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (m) {
      key = m[1];
      const v = m[2].trim();
      if (v.startsWith("[") && v.endsWith("]")) {
        out[key] = v.slice(1, -1).split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      } else if (v) {
        out[key] = v.replace(/^["']|["']$/g, "");
      } else {
        out[key] = "";
      }
    }
  }
  return out;
}

function titleFromPath(p: string): string {
  const base = p.split("/").pop()!.replace(/\.md$/, "");
  return base.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ");
}

const entries: Entry[] = [];
const tagIndex: Record<string, string[]> = {};

for (const file of walk(VAULT)) {
  const rel = relative(VAULT, file);
  const src = readFileSync(file, "utf8");
  const fm = parseFrontmatter(src);
  const e: Entry = {
    path: rel,
    type: fm.type ?? (rel.split("/")[0]?.replace(/s$/, "") || "note"),
    created: fm.created ?? statSync(file).mtime.toISOString(),
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    people: Array.isArray(fm.people) ? fm.people : [],
    intent: fm.intent ?? "",
    title: titleFromPath(rel),
  };
  entries.push(e);
  for (const t of e.tags) {
    (tagIndex[t] ??= []).push(rel);
  }
}

entries.sort((a, b) => b.created.localeCompare(a.created));

writeFileSync(join(VAULT, "index.json"), JSON.stringify(entries, null, 2));
writeFileSync(join(VAULT, "tags-index.json"), JSON.stringify(tagIndex, null, 2));

console.log(`indexed ${entries.length} notes, ${Object.keys(tagIndex).length} tags`);
