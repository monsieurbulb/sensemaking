# Sensemaking

A personal sense-making assistant for Zo Computer. Capture ideas, links, quotes, and people from your phone — recall them from anywhere. Plain Markdown, Obsidian-compatible, runs on your own server.

**Built by Decent for Matt Black.**

## What it does

- Capture ideas from your phone with `!n <text>` — files straight into your vault
- Full

## Setup on your Zo Computer

### 1. Copy the vault

```bash
cp -r vault/ /home/workspace/core/vault/
```

### 2. Install the scripts

```bash
cd /home/workspace/core/vault
bun install  # if capture.ts needs dependencies
bun run scripts/reindex.ts   # build initial indexes
```

### 3. Create the zo.space routes

Go to [Hosting > Sites & Services](/?t=sites) and add two routes:

- `POST /api/sensemaking` (API route) — paste from `zo-routes/api-sensemaking.ts`
- `GET /sensemaking` (Page route, private) — paste from `zo-routes/page-sensemaking.tsx`

### 4. Add the Zo Rules

Go to [Settings > Rules](/?t=settings&s=ai&d=rules) and add two rules:

- **Capture rule** — paste from `zo-rules/capture.md`
- **Recall rule** — paste from `zo-rules/recall.md`

### 5. Test from your phone

Text your Zo: `!n https://example.com — interesting because XYZ`

Then open `https://<your-zo>.zo.space/sensemaking` — you should see the card.

---

## Folder structure

```
core/vault/
├── inbox/        # uncategorized captures
├── notes/        # free-text thoughts
├── links/        # URL captures
├── quotes/       # snippets
├── people/       # one note per person
├── media/        # photos & files + .md sidecar
├── journal/      # daily log (YYYY-MM-DD.md)
├── scripts/
│   ├── capture.ts   # capture pipeline
│   └── reindex.ts   # rebuild indexes
├── index.json
├── tags-index.json
└── AGENTS.md     # full spec for future AI sessions
```

## Conventions

- All notes have YAML frontmatter (see `vault/AGENTS.md`)
- Links use Obsidian `[[wikilinks]]`
- Tags: lowercase, hyphen-separated, flat list
- Filenames: `YYYY-MM-DD-slug.md` for dated items; `Display Name.md` for people

---

Built as v0.1 of the Decent sensemaking assistant. Designed to be portable, open-format, and model-agnostic.

## Zo Rules

Copy each file in `zo-rules/` into your Zo Computer [Settings → AI → Rules](/?t=settings&s=ai&d=rules):

1. **`capture.md`** — Auto-captures SMS, email, and chat messages that look like notes/links/quotes/people/media.
2. **`recall.md`** — Answers "what have I captured about X?" queries by searching the vault and citing filenames.

### Shortcuts (WIP)

The system recognises Matt's phone-friendly command shorthand — `!n` to capture, `?ln` to recall the last note, `+t` to add tags, and more. Full spec in `docs/SHORTCUTS.md`.

### Mesh Protocol (WIP)

Multiple people running their own sense-making vaults can query each other's "emerging intelligence." Each vault exposes a mesh endpoint; peers register in a local registry. Design doc in `docs/MESH.md`.