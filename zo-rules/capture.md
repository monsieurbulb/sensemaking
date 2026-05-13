# Rule: Sense-making Capture

**Condition:** When the user sends a message via SMS, email, or chat that looks like a capture for the sense-making vault — i.e. it contains a URL, a quote, a contact card, a photo, a person reference, OR the user prefixes the message with "+capture", "capture:", "save this:", or similar.

**Instruction:**

Run the sense-making capture pipeline. Read /home/workspace/core/vault/AGENTS.md for the full spec before doing anything.

Pipeline:
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

Never auto-capture if the user's message is clearly a question about the vault — that path goes through the recall rule.

If the source channel is email and the subject line is non-empty, treat the subject as the intent.

Do not write outside /home/workspace/core/vault/. Do not call external services beyond what the capture script does.
