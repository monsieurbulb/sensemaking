# PKM System Brief — Matt Black's Vision + Decent SenseMaking Integration

**Date:** 2026-05-09
**Status:** Draft — for review before building
**Source:** Matt Black's PKM zips (imported 2026-05-09) + existing Decent SenseMaking vault

---

## 1. What is this?

Matt Black has been developing a personal knowledge management (PKM) / knowledge graph system with a small team (Rich, Federico, Wolfgang). He wants to integrate or extend this work into the existing Decent SenseMaking vault that Zo manages.

This brief summarises what Matt's team has designed so far, maps it against what already exists in the SenseMaking vault, and proposes how to proceed.

---

## 2. Core Vision — "The PKM System"

Matt describes it as a **mobile-first personal knowledge graph** with an AI agent that processes all inputs and converts them into structured notes. The key differentiating idea is a command-driven shorthand (`!n`, `+t`, `!link`, etc.) that works across AI chat interfaces to create and manage notes.

### 2.1 Design Principles

| Principle | Source |
| --- | --- |
| Never embellish wording — use exact verbatim text | Matt's Global Rules |
| Never invent tags — ask before creating new ones | Global Rules |
| Noise-free linking — only link to core hubs (Butn, PKM, Macroscope, core theories, core creative entities, people) | Global Rules |
| Auto-add `#contacts` tag to any contact note | Global Rules |
| Auto-add `#networks` tag when text contains "network" | Global Rules |
| Always include source image for visual notes | Global Rules |

### 2.2 Key Differentiators

1. **Mobile-first** — easy-to-use phone interface for capturing anything: text, contacts, links, pictures
2. **AI agent does the structuring** — on capture, AI generates title, extracts body text from images, adds tags
3. **Tag negotiation** — AI suggests a numbered tag list; user confirms/checks with shortcuts like `!t -1, -3`
4. **Link negotiation** — AI parses references to other notes or keywords, asks user to confirm before adding links
5. **Note shortcuts** — human-readable shorthand commands that work in any AI chat context
6. **Federated / privacy-first** — a personal OS (chaOS) where your graph lives on your machine, optionally plugged into other people's graphs via Solid pods

---

## 3. System Components

### 3.1 Capture Interface (Mobile)

Any input type:

- Free text or pasted text
- Contacts (with auto-tagging `#contacts`)
- Links
- Pictures (AI extracts text, stores image)
- AI query responses (appended as new note)

AI agent workflow:

1. Receives raw input
2. Generates title
3. Extracts body (text from images embedded verbatim)
4. Suggests tags (numbered list)
5. Suggests links (parsed from text + existing note references)
6. User confirms/edits via shortcuts

### 3.2 Note Commands (Core Interface)

These are the primary interaction pattern — designed to work in any AI chat.

| Command | Meaning |
| --- | --- |
| `!n <text>` | Create a permanent note from the text that follows |
| `!n` (alone) | Add the previous Q&A as a note |
| `!na <text>` | Append text to the last note |
| `!na` (alone) | Confirm appending the last agreed text |
| `!rem <text>` | "Remember that…" — persist text verbatim |
| `+t <tag>` | Add existing tag to current note (never creates new) |
| `!t <newtag>` | Create a new tag (must confirm) |
| `!t -1, -3` | Reject tags #1 and #3 from the suggestion list |
| `!link <note>` | Add a link to the last note, then confirm |
| `?ln` | Display last note (full + metadata) |
| `?nn` | List all new tagged notes from this session |
| `?shorts` | List all shortcuts |
| `?t` | Display all tags (multi-column, Butn first) |

### 3.3 Graph Visualisation

The second major component — helping users see connections and build meaning.

**Vision:** An infinite 3D canvas (à la System.com detective wall) where nodes are sized by connection count, clicking a node centres and highlights it, and a card panel shows details.

**Tech options identified:**

- **Build:** WebGL front-end (`3d-force-graph` / Three.js) + graph DB (Neo4j or Memgraph) + Python NetworkX for metrics
- **Buy:** Neo4j Bloom, GraphXR, or Linkurious Enterprise (faster to deploy)
- **Open source libs:** `3d-force-graph`, Three.js, Babylon.js, Sigma.js (2D only)

**Key risks noted:**

- Over-linking / density — mitigated by semantic zoom (progressive disclosure, don't show everything at once)
- Performance at scale — WebGL required, Canvas/SVG stutters before 5k nodes
- "Flying-off" camera — clamp zoom, add home button
- Wolfgang's concern: MCP standard can pollute LLM context if used directly (Anthropic now recommends different usage)

**Implementation timeline:** \~2 developer-months if building from scratch

### 3.4 Federated Layer (chaOS)

Rich's concept — a personal operating system where:

- Everyone runs their own knowledge graph on their own machine
- Full control + custom interfaces
- Optionally plug into others' graphs via Memgraph MCP + Solid pods
- Trusted social media integration for discussion/sharing

**Technical stack:** Memgraph (fast graph DB + MCP tools) + MCP Client (coordinator for multi-server connections) + Solid (decentralised pods)

---

## 4. Comparison with Existing SenseMaking Vault

The existing Decent SenseMaking vault (built for Matt in May 2025) already has:

| Feature | Status in Vault |
| --- | --- |
| Capture pipeline (SMS/email/chat) | ✅ Implemented — `file capture.ts` |
| Note / link / quote / person / media types | ✅ Implemented |
| Tag index (`file tags-index.json`) | ✅ Implemented |
| `!n` shortcut equivalent | ❌ Not implemented — notes come from capture, not direct commands |
| Tag suggestion + negotiation | ❌ Not implemented |
| `?ln`, `?nn`, `?shorts`, `?t` query commands | ❌ Not implemented |
| `+t`, `!t` tag commands | ❌ Not implemented |
| `!link` link negotiation | ❌ Not implemented |
| 3D graph visualisation | ❌ Not implemented |
| chaOS / Memgraph / Solid integration | ❌ Not implemented |
| Mobile-first capture UI | ❌ Not implemented (SMS works but no dedicated mobile UI) |
| Noise-free link rules (core hubs only) | ⚠️ Partially — the vault has link types but no enforced hub restriction |

---

## 5. What's New vs What's Duplicative

**Matt's system adds over existing vault:**

- Structured command interface (`!n`, `+t`, `!link`, etc.)
- AI-driven tag suggestion + link suggestion with user confirmation
- Federated graph concept (chaOS + Solid)
- 3D graph visualisation research and architecture
- A contributor map (Matt, Rich, Federico, Wolfgang)

**Potentially duplicative:**

- `file 2025-11-24-matts-note-system-shortcuts.md` and `file 2025-11-25-matts-note-shortcuts.md` are near-identical — same content from two dates/sources
- `PKM Global Rules.md` and `Matt's Global_Rules for AI help.md` have significant overlap in content

---

## 6. Open Questions for Review

1. **Build vs buy on graph visualisation** — commercial tools (Neo4j Bloom, GraphXR) cut dev time to weeks; custom WebGL is \~2 months. What's the tolerance for cost/time?
2. **MCP architecture risk** — Wolfgang flagged that MCP can pollute LLM context. Should we avoid direct MCP-to-LLM and use an indirect architecture instead? Does Matt want to address this now or defer?
3. **Mobile UI** — Matt explicitly wants mobile-first. The current vault has SMS capture which is mobile-friendly but lacks the structured command interface. What's the priority: existing SMS capture works, but do we need a dedicated app/interface?
4. **Integration vs extension** — Should this be folded into the existing vault as additional layers, or should it run as a separate system that links to the vault?
5. **Tag culture** — The existing vault allows free-form tag creation. Matt's rule (never invent tags, ask first) is stricter. Does Rich want to adopt Matt's stricter model or keep the existing open approach?
6. **Link rules** — Matt wants noise-free linking (only core hubs). Should we add a link-type classification to the vault so notes can distinguish "deep link to hub" vs "casual reference"?
7. **Federation** — chaOS is ambitious. Memgraph + Solid is the proposed stack. Is this in scope for v1 or a v2 aspiration?

---

## 7. Proposed Approach

For discussion — not yet decided:

**Phase 1 (Near term):**

- Add the command shortcut layer to the existing SenseMaking vault (implement `!n`, `+t`, `!t`, `!link`, query commands)
- Integrate Matt's global rules as vault rules alongside existing capture rules
- Start with Obsidian-compatible markdown so Matt can use Obsidian alongside Zo

**Phase 2 (Medium term):**

- Add tag suggestion + negotiation workflow in the capture pipeline
- Explore Memgraph as an optional backend for richer graph queries (defer Solid/federation)
- Run a prototype of 3D graph view (build vs buy decision at that point)

**Phase 3 (Later):**

- chaOS federation layer
- Dedicated mobile capture UI

---

*Brief compiled by Zo from Matt Black's imported PKM files and existing vault state.*