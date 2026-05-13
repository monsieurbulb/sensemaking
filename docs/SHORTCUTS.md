# Shortcuts — Phone-First Commands

Matt Black's WIP command shorthand. These work in any AI chat (SMS, Telegram, or in-Zo). The AI recognises the prefix (`!` for write, `?` for query, `+` for modify) and acts accordingly.

## Write Commands

| Command | Action |
| --- | --- |
| `!n <text>` | Create a permanent note from the text. AI generates title, auto-tags. |
| `!n` (alone) | Persist the previous Q&A exchange as a note. |
| `!na <text>` | Append text to the last note created this session. |
| `!na` (alone) | Confirm appending the last agreed text to the last note. |
| `!rem <text>` | "Remember that…" — persist to memory verbatim, no processing. |
| `!t <tag>` | Create and add a new tag (must ask confirmation before creating). |
| `!t -1, -3` | Reject suggested tags #1 and #3 from the AI's tag proposal. |
| `!link <note>` | Add a link from the last note to the named note, then ask for confirmation. |

## Query Commands

| Command | Action |
| --- | --- |
| `?ln` | Display the last note (full content + metadata). |
| `?nn` | List all new tagged notes from this session (titles only). |
| `?shorts` | List all shortcuts. |
| `?t` | Display all tags in the vault (multi-column format). |

## Tag Commands

| Command | Action |
| --- | --- |
| `+t <tag>` | Add existing tag(s) to the current note. Never creates new tags. |

## Global Rules (always active)

1. Never embellish the user's wording — use exact verbatim text.
2. Never invent tags — ask before creating any new one.
3. Automatically add `#contacts` tag to any contact note.
4. Automatically add `#people` tag if a recognisable name appears.
5. Automatically add `#networks` tag when text contains the word "network".
6. Use noise-free links: only link to core hubs and people.
7. Always include the source image for visual notes.

## Implementation Note

These shortcuts are not currently wired into the capture pipeline. They are documented here as the **spec** for what the AI agent should recognise and handle. The shortcut layer sits on top of the SMS/email/chat capture rule — the AI checks each incoming message for a `!` or `?` prefix before falling back to the standard capture logic.
