# Rule: Sense-making Capture + Shortcuts

**Condition:** When the user sends a message via SMS, email, or chat that starts with a shortcut prefix (!n, !na, !rem, !t, !link, ?ln, ?nn, ?shorts, ?t, +t) OR looks like a capture for the sense-making vault — i.e. it contains a URL, a quote, a contact card, a photo, a person reference, OR the user prefixes the message with "+capture", "capture:", "save this:", or similar.

**Instruction:**

STEP 0 — SHORTCUT CHECK: Before anything else, check if the message starts with a shortcut prefix:

WRITE COMMANDS (!):
- !n <text> → Create a note with the exact text. Generate title from content, auto-tag per global rules.
- !n (no text) → Persist the previous Q&A exchange as a note. Ask: "Persist the last exchange?"
- !na <text> → Append text to the last note created this session. If no session note exists, treat as !n.
- !na (no text) → Confirm appending the last agreed text to the last note.
- !rem <text> → "Remember that…" — persist verbatim, no processing. Exact words, no summary.
- !t <tag> → Create and add a new tag. MUST ask confirmation: "Create tag '<tag>'?" before creating.
- !t -1, -3 → Reject AI-suggested tags #1 and #3. Remove them and re-confirm the remaining tags.
- !link <note-name> → Add a wikilink from the last note to the named note. Search people/ + notes/ for matches. Ask: "Link to [[<match>]]?"

QUERY COMMANDS (?):
- ?ln → Read and display the last note (full content + metadata). Reply on the same channel.
- ?nn → List all new notes from this session (titles only, sorted by creation time).
- ?shorts → List all shortcuts from docs/SHORTCUTS.md with brief descriptions.
- ?t → Display all tags in the vault (read tags-index.json, list in multi-column format).

TAG COMMANDS (+):
- +t <tag> → Add existing tag(s) to the current/last note. MUST check tags-index.json first — only use existing tags. Never create new tags. Reply: "Added tag(s): <tags> to <note-path>."

GLOBAL RULES (always apply when processing any shortcut):
1. Never embellish the user's wording — use exact verbatim text.
2. Never invent tags — ask before creating any new one.
3. Automatically add #contacts tag to any contact note.
4. Automatically add #people tag if a recognisable name appears.
5. Automatically add #networks tag when text contains the word "network".
6. Use noise-free links: only link to core hubs and people.
7. Always include the source image for visual notes.

After handling the shortcut, reply on the SAME channel with a one-line confirmation. Keep it terse.

IF NO SHORTCUT MATCHES, run the standard capture pipeline:

1. Parse the message. Pull out: the main content (text/url/quote/photo path), any short "intention" line the user added (often a comma-separated context like "met at X, interesting because Y"), any people mentioned by name.
2. Decide a type: note | link | quote | person | media. Default to note. Drop into inbox/ only if genuinely ambiguous.
3. Pick 1–5 lowercase-hyphenated tags from the intent + content. Reuse tags already in /home/workspace/core/vault/tags-index.json where they fit.
4. Call the capture script:
   `echo '<json>' | bun run /home/workspace/core/vault/scripts/capture.ts`
   where <json> has keys: text, intent, source ("sms"|"email"|"chat"), url (optional), people (array of display names), tags (array), type (optional override).
5. Check the capture output for a `pendingAutomation` field. If present:
   a. Call create_automation with the rrule, instruction, and delivery_method="sms".
   b. Remove the corresponding line from /home/workspace/core/vault/.pending-automations.jsonl.
6. Reply to the user on the SAME channel with a one-line confirmation: "Captured to <path> · <type> · tags: <tags>". If a pendingAutomation was created, add: "Also set a reminder: <instruction> at <triggerDesc>." Keep it terse — no preamble, no markdown headers.

Never auto-capture if the user's message is clearly a question — that path goes through the recall rule.

If the source channel is email and the subject line is non-empty, treat the subject as the intent.

Do not write outside /home/workspace/core/vault/. Do not call external services beyond what the capture script does.