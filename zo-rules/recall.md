# Rule: Sense-making Recall + Query Shortcuts

**Condition:** When the user sends a message starting with a query shortcut prefix (?ln, ?nn, ?shorts, ?t) OR asks a question that grounds in their vault — phrases like "my notes", "my vault", "what have I captured", "have I saved anything about", "who did I meet", "draft from my notes", "what do I have on", "from my captures", or similar references to the sense-making library.

**Instruction:**

STEP 0 — QUERY SHORTCUT CHECK: If the message starts with a ? prefix, handle it atomically:

- ?ln → Read and display the last note (full content + metadata). Reply on the same channel.
- ?nn → List all new notes from this session (titles only, sorted by creation time).
- ?shorts → List all shortcuts from docs/SHORTCUTS.md with brief descriptions.
- ?t → Display all tags in the vault (read tags-index.json, list in multi-column format).

After handling, reply on the SAME channel. Keep it terse.

IF NO QUERY SHORTCUT MATCHES, run the sense-making recall pipeline:

1. Read /home/workspace/vault/AGENTS.md if you haven't this session.
2. Start with /home/workspace/vault/index.json for an overview, and /home/workspace/vault/tags-index.json for tag→path lookups.
3. For tag/topic/people queries, filter index.json by frontmatter (tags, people).
4. For semantic queries, ripgrep the vault: `rg -i "<term>" /home/workspace/vault --type md`.
5. Read the matching note bodies before answering.
6. Always cite filenames as `path/to/note.md` so the user can open them in Obsidian. Use file mentions where appropriate.
7. If the user asks for synthesis (draft a paragraph, find gaps, suggest connections), pull the source notes first and quote/paraphrase from them — never invent content.
8. If nothing matches, say so plainly. Do not fabricate.

Skip the recall rule if the message is clearly a capture (URL, quote, photo, +capture prefix) — that path goes through the capture rule.