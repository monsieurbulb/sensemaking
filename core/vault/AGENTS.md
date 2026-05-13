# AGENTS.md — Sense‑Making Vault

This file is the spec future Zo sessions follow when reading from or writing to this vault. The vault is the personal knowledge graph, intended to be portable to Matt's Zo Computer as v0.1 of the sense‑making assistant.

## Frontmatter schema (minimal)

Every note has YAML frontmatter at the top:

```yaml
---
id: 2026-04-28-1345-met-matt
type: note            # note | link | quote | person | media
created: 2026-04-28T13:45:00Z
source: sms           # sms | email | chat | manual
intent: "free-text intention from the user, if any"
tags: [topic, area]
people: ["[[Matt Black]]"]
links: ["[[Other Note]]"]
url: https://...      # only for type=link
---
```

- `id`, `type`, `created`, `source` are required. Everything else is optional.
- `tags` is a flat list. No hierarchical tags. Lowercase, hyphen‑separated.
- `people` and `links` use Obsidian `[[wikilink]]` syntax inside quotes.

## Folder rules

- `notes/` — free text. Filename `YYYY-MM-DD-slug.md`.
- `links/` — URL captures. Filename `YYYY-MM-DD-slug.md`. Body: 1–3 sentence summary, then the URL on its own line.
- `quotes/` — `YYYY-MM-DD-slug.md`. Body: the quote (blockquoted), then a one‑line attribution.
- `people/` — `Person Name.md` (display name). Body: rolling list of contexts (`- 2026-04-28 — met at Liminal, interested in cosmology + AI`).
- `media/` — binary file (`.jpg`, `.pdf`, etc.) plus a `.md` sidecar with the same stem holding frontmatter + caption.
- `inbox/` — anything Zo can't classify with confidence. Triage later.
- `journal/` — `journal/YYYY-MM-DD.md`. Append a bullet per capture: `- HH:MM [[note-title]] — one‑line summary`.

## Capture pipeline

When a capture (SMS / email / chat) and the capture rule fires:

**Step 0 — Shortcut check.** If the message starts with `!`, `?`, or `+t`, handle it as a shortcut command per `docs/SHORTCUTS.md` before proceeding. Write commands (`!n`, `!na`, `!rem`, `!t`, `!link`) produce notes/tags. Query commands (`?ln`, `?nn`, `?shorts`, `?t`) display vault state. Tag commands (`+t <tag>`) add existing tags. After handling, reply on the same channel with a one-line confirmation.

**If no shortcut matches:**

1. **Parse** the message. Detect: URL? attached image? long quote? contact card? plain text?
2. **Classify** into a `type`. Default to `note` if unclear; if very unclear, drop into `inbox/`.
3. **Extract intent.** If there's an explicit context line (e.g. "met at Liminal, interesting because cosmology + AI"), that becomes `intent`. Otherwise leave `intent` blank.
4. **Detect task/automation.** If the intent or text contains a scheduled action cue (e.g. "remind me at", "send me a message at", "notify me at", "task: ... by ..."), parse the time and create a corresponding automation via the Zo API. Store the automation ID in the note's frontmatter as `automation_id: <id>`.
5. **Extract entities.** People mentioned → ensure each has a `people/Person Name.md` (create if missing, append the dated context line).
6. **Tag.** 1–5 lowercase tags drawn from the intent + content. Reuse existing tags where possible — check `tags-index.json` (see below).
7. **Link.** Search the vault for existing notes with strong overlap (shared tags, shared people, shared URL). Add `[[wikilinks]]` in the new note's `links:` frontmatter and inline where natural.
8. **Write** the note to the right folder. Append the journal bullet for today.
9. **Update index.** Refresh `index.json` and `tags-index.json` at the vault root.
10. **Confirm** to the user with the file path, one-line summary, and any automation created.

## Recall pipeline

When a question that grounds in the vault (the recall rule fires):

**Step 0 — Query shortcut check.** If the message starts with `?`, handle it atomically: `?ln` (last note), `?nn` (new session notes), `?shorts` (list shortcuts), `?t` (all tags). Reply on the same channel.

**If no query shortcut matches:**

1. Read `index.json` for an overview.
2. For tag/topic/people queries, scan matching notes by frontmatter first.
3. For semantic queries, grep the vault contents — open format means ripgrep is fine for v0.1.
4. **Always cite filenames** (e.g. `notes/2026-04-28-met-matt.md`) so the vault can open them in Obsidian.
5. If the answer requires synthesis (drafting a paragraph, finding gaps, suggesting connections), pull the source notes first and quote from them.
6. Never invent notes. If nothing matches, say so.

## Shortcut Commands

Full spec: `docs/SHORTCUTS.md`. 

**Write:** `!n <text>` / `!n` · `!na <text>` / `!na` · `!rem <text>` · `!t <tag>` · `!link <note>`

**Query:** `?ln` · `?nn` · `?shorts` · `?t`

**Tag:** `+t <tag>`

**Global rules:** Never embellish verbatim text. Never invent tags — ask first. Auto-tag: `#contacts` on contacts, `#people` on names, `#networks` on "network". Noise-free links. Include source images with visual notes.

## Indexes (kept at vault root)

- `index.json` — flat list of `{path, type, created, tags, people, intent}` for every note. Rebuilt by `scripts/reindex.ts` after each capture (or by hand: `bun run scripts/reindex.ts`).
- `tags-index.json` — `{tag: [paths]}` map. Built by the same script.

These are derived data — safe to delete and regenerate.

## Conservative defaults (chosen on behalf, override any time)

- Filename slug: lowercase, hyphenated, max 6 words taken from intent or first line.
- If a person is mentioned by first name only and there's exactly one match in `people/`, link to that. If there are multiple matches, drop into `inbox/` and ask.
- Photos go to `media/` with a `.md` sidecar; the sidecar is the indexable record.
- Tag vocabulary is open. Don't try to enforce a controlled list yet.

## Out of scope (v0.1)

- Auto‑generated emergent connections beyond simple tag/people/URL overlap.
- Multiplayer / cross‑vault links.
- Visual canvas.
- Anything that writes outside this directory.
