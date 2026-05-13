# Setup Prompt — Sense-Making Assistant

Paste this into a Zo chat window (one person at a time), on their own Zo Computer. It will set up everything.

---

Clone this repo into your workspace: https://github.com/monsieurbulb/sensemaking

From the cloned files, do these five things:

1. **Update the vault** — run: `cp -rn core/ /home/workspace/core/`
   This copies only **new or changed** files. The `-n` flag means it will never overwrite existing files — any captures they've already made are safe. It brings in updated scripts, docs, and structure.

2. **Create the dashboard page** — use the code from `file zo-routes/page-sensemaking.tsx` to create a zo.space page route at `/sensemaking` (keep it private for now).

3. **Create the API** — use the code from `file zo-routes/api-sensemaking.ts` to create a zo.space API route at `/api/sensemaking` (must be public — it's the backend for the dashboard and shortcuts).

4. **Create two Zo Rules** — the text in:

   - `file zo-rules/capture.md` — creates the capture rule (handles !n, !na, !rem, !t, !link, +t shortcuts from SMS/email/chat)
   - `file zo-rules/recall.md` — creates the recall rule (handles ?ln, ?nn, ?t, ?shorts and vault queries)

5. **Open the dashboard** — tell me the URL. I should be able to type `?t` in the search bar and see my tags, or `!n hello world` and open a capture form.

When done, summarise what's live and what to test.