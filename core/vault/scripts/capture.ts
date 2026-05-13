#!/usr/bin/env bun
// Capture pipeline. Mechanical for v0.1 — no model calls.

import { writeFileSync, existsSync, appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const VAULT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const stdin = await new Response(Bun.stdin.stream()).text();
const input = stdin.trim() ? JSON.parse(stdin) : {};

const text = (input.text ?? "").trim();
const intent = (input.intent ?? "").trim();
const source = input.source ?? "manual";

// 1. Detect URL if not given
let url = input.url;
if (!url && text) {
  const m = text.match(/https?:\/\/\S+/);
  if (m) url = m[0];
}

// 2. Decide type
let type: string = input.type ?? "note";
if (!input.type) {
  if (input.media_path) type = "media";
  else if (url && text.replace(url, "").trim().length < 80) type = "link";
  else if (/^[\s>"'].*["']\s*[—–-]\s*\w/m.test(text)) type = "quote";
  else type = "note";
}

// 3. Slug + id
const now = new Date();
const isoDate = now.toISOString().slice(0, 10);
const isoTime = now.toISOString();
function slugify(s: string) {
  return s.toLowerCase().replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().split(/\s+/).slice(0, 6).join("-").slice(0, 60) || "untitled";
}
const slug = slugify(intent || text || url || "untitled");
const id = `${isoDate}-${now.toISOString().slice(11, 16).replace(":", "")}-${slug}`;

// 4. Folder
const folder = type === "person" ? "people" : type === "link" ? "links" : type === "quote" ? "quotes" : type === "media" ? "media" : "notes";
const filename = type === "person" ? `${(input.people?.[0] ?? slug).replace(/[\/\\]/g, "")}.md` : `${isoDate}-${slug}.md`;
const path = join(VAULT, folder, filename);

// 5. People + tags
const peopleLinks = (input.people ?? []).map(n => `"[[${n}]]"`);
const tags = (input.tags ?? []).map(t => t.toLowerCase().replace(/\s+/g, "-"));

// 6. Detect task cues → queue to pending-automations.jsonl for same-turn AI to process
const fullText = `${text} ${intent}`;
const timeMatch = fullText.match(/(?:at|on|by)?\s*(\d{1,2})(?:[:\.](\d{2}))?\s*(am|pm)?/i);
const dateMatch = fullText.match(/(?:tomorrow|next\s+\w+|(\d{4}-\d{2}-\d{2}))/i);
const rruleMatch = fullText.match(/every\s+(day|week|month)/i);

let pendingAutomation: { rrule: string; instruction: string; triggerDesc: string } | null = null;
if (
  fullText.toLowerCase().includes("remind") ||
  fullText.toLowerCase().includes("send me a message") ||
  fullText.toLowerCase().includes("notify") ||
  fullText.toLowerCase().includes("don't forget") ||
  /at\s*\d/.test(fullText)
) {
  const hour = timeMatch ? parseInt(timeMatch[1]) : 9;
  const minute = timeMatch && timeMatch[2] ? parseInt(timeMatch[2]) : 0;
  let h12 = hour;
  if (timeMatch?.[3]) {
    const ampm = timeMatch[3].toLowerCase();
    if (ampm === "pm" && h12 < 12) h12 += 12;
    if (ampm === "am" && h12 === 12) h12 = 0;
  }
  // Zo-compatible format: FREQ=DAILY;BYHOUR=h;BYMINUTE=m;COUNT=1 for one-shot at next matching time
  const rrule = `FREQ=DAILY;BYHOUR=${h12};BYMINUTE=${minute};COUNT=1`;
  let triggerDesc: string;
  if (dateMatch?.[1] && dateMatch[1] !== "tomorrow") {
    const dt = new Date(dateMatch[1]);
    dt.setHours(h12, minute, 0, 0);
    triggerDesc = dt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } else {
    const next = new Date();
    next.setHours(h12, minute, 0, 0);
    if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
    const isToday = next.getDate() === new Date().getDate();
    triggerDesc = next.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
    if (!isToday) triggerDesc = "tomorrow " + triggerDesc.replace(/^today\s+/i, "");
    else triggerDesc = "today " + triggerDesc;
  }
  pendingAutomation = { rrule, instruction: intent || text.slice(0, 80) || id, triggerDesc };
  const pendingPath = join(VAULT, ".pending-automations.jsonl");
  appendFileSync(pendingPath, JSON.stringify({
    rrule: pendingAutomation.rrule,
    instruction: pendingAutomation.instruction,
    delivery_method: "sms",
    triggerDesc: pendingAutomation.triggerDesc,
    sourceNote: path.replace(VAULT + "/", ""),
  }) + "\n");
}

// 7. Build frontmatter
function frontmatter(): string {
  const lines = [
    "---",
    `id: ${id}`,
    `type: ${type}`,
    `created: ${isoTime}`,
    `source: ${source}`,
    `intent: ${JSON.stringify(intent)}`,
    `tags: [${tags.map(t => JSON.stringify(t)).join(", ")}]`,
    `people: [${peopleLinks.join(", ")}]`,
    `links: []`,
  ];
  if (url) lines.push(`url: ${url}`);
  lines.push("---", "");
  return lines.join("\n");
}

// 8. Compose body
let body = "";
if (type === "link") {
  body = `${intent || "Captured link."}\n\n${url}\n`;
} else if (type === "quote") {
  body = `> ${text.replace(/\n/g, "\n> ")}\n`;
} else if (type === "person") {
  body = `## Contexts\n\n- ${isoDate} — ${intent || text || "captured"}\n`;
} else if (type === "media") {
  body = `${intent || "Captured media."}\n\nSource file: \`${input.media_path}\`\n`;
} else {
  body = `${text}\n${intent ? `\n*Intent:* ${intent}\n` : ""}`;
}

// 9. Upsert people
function upsertPerson(name: string, contextLine: string) {
  const p = join(VAULT, "people", `${name.replace(/[\/\\]/g, "")}.md`);
  const fm = ["---", `id: ${slugify(name)}`, `type: person`, `created: ${isoTime}`, `source: ${source}`, `intent: ""`, `tags: []`, `people: []`, `links: []`, "---", "", "## Contexts", "", `- ${isoDate} — ${contextLine}`, ""].join("\n");
  if (!existsSync(p)) writeFileSync(p, fm);
  else appendFileSync(p, `- ${isoDate} — ${contextLine}\n`);
}
if (type !== "person") {
  for (const name of input.people ?? []) upsertPerson(name, intent || text.slice(0, 80) || "mentioned");
}

// 10. Write note
mkdirSync(join(VAULT, folder), { recursive: true });
if (type === "person" && existsSync(path)) {
  appendFileSync(path, `- ${isoDate} — ${intent || text || "captured"}\n`);
} else {
  writeFileSync(path, frontmatter() + body);
}

// 11. Journal bullet
const journalPath = join(VAULT, "journal", `${isoDate}.md`);
if (!existsSync(journalPath)) writeFileSync(journalPath, `# ${isoDate}\n\n`);
const hhmm = now.toISOString().slice(11, 16);
const titleForJournal = type === "person" ? (input.people?.[0] ?? slug) : `${isoDate}-${slug}`;
appendFileSync(journalPath, `- ${hhmm} [[${titleForJournal}]] — ${intent || (text || url || "").slice(0, 80)}\n`);

// 12. Reindex
spawnSync("bun", ["run", join(VAULT, "scripts", "reindex.ts")], { stdio: "ignore" });

const out: Record<string, unknown> = {
  path: path.replace(VAULT + "/", ""),
  type,
  id,
  summary: intent || (text || url || "").slice(0, 120),
};
if (pendingAutomation) {
  out.pendingAutomation = {
    rrule: pendingAutomation.rrule,
    instruction: pendingAutomation.instruction,
    triggerDesc: pendingAutomation.triggerDesc,
  };
}
console.log(JSON.stringify(out));
