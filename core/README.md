# Core — Intelligence Layer

This is the `core/` directory of the Decent world model. It follows the Block-inspired "company as intelligence" pattern.

## Structure

| Folder | Purpose |
|--------|---------|
| `vault/` | Personal knowledge graph — capture, label, recall. Plain Markdown, Obsidian‑compatible. |
| `state/` | Current state and architecture definitions. |

## World-Model Conventions

- Plain Markdown with YAML frontmatter.
- `[[wikilinks]]` between notes.
- Flat tags: lowercase, hyphen-separated.
- All AI interactions governed by `vault/AGENTS.md`.

## Adding More

Want to add projects? Create subdirectories under `core/`:

```
core/
├── vault/     ← sense-making memory
├── state/     ← architecture + current
├── projects/  ← project notes
└── calls/     ← meeting transcripts
```

See `vault/AGENTS.md` for the full spec.

---

Part of the Decent sense‑making protocol. Built for Zo Computer.
