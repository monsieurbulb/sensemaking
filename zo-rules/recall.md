# Rule: Sense-making Recall

**Condition:** When the user asks a question that grounds in their vault — phrases like "my notes", "my vault", "what have I captured", "have I saved anything about", "who did I meet", "draft from my notes", "what do I have on", "from my captures", or similar references to the sense-making library.

**Instruction:**

Run the sense-making recall pipeline.

1. Read /home/workspace/core/vault/AGENTS.md if you haven't this session.
2. Start with /home/workspace/core/vault/index.json for an overview, and /home/workspace/core/vault/tags-index.json for tag→path lookups.
3. For tag/topic/people queries, filter index.json by frontmatter (tags, people).
4. For semantic queries, ripgrep the vault: `rg -i "<term>" /home/workspace/core/vault --type md`.
5. Read the matching note bodies before answering.
6. Always cite filenames as `path/to/note.md` so the user can open them in Obsidian.
7. If the user asks for synthesis (draft a paragraph, find gaps, suggest connections), pull the source notes first and quote/paraphrase from them — never invent content.
8. If nothing matches, say so plainly. Do not fabricate.

Skip the recall rule if the message is clearly a capture (URL, quote, photo, +capture prefix) — that path goes through the capture rule.
