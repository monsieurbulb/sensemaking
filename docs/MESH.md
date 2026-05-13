# Mesh Protocol — Shared Sense-Making v0.1

Multiple people running their own sense-making vaults, with the ability to query each other's "emerging intelligence." Each vault is sovereign; the mesh is opt-in, query-based, and privacy-first.

## Architecture

```
┌─────────────┐     query     ┌─────────────┐
│  Matt's Zo  │◄────────────► │  Rich's Zo  │
│  /api/mesh  │               │  /api/mesh  │
└──────┬──────┘               └──────┬──────┘
       │                             │
       │  ┌─────────────┐            │
       └─►│  Federico's  │◄───────────┘
          │  /api/mesh   │
          └─────────────┘
```

Each participant runs their own vault and exposes a single API endpoint. There is no central server — peers are listed in a local registry file.

## What Gets Shared

By default, nothing. Each peer configures what's queryable:

- **`#shared` tag** — notes explicitly marked for the mesh. Simplest option.
- **Tag-level allowlists** — e.g., expose `#networks` and `#pkm` but not `#personal`.
- **People overlap** — who do we both know? (cross-reference `people/` directories).
- **Tag cloud** — high-level topic map without note content.

## Query Types

### 1. Topic Query
> "What does the mesh know about X?"

Fan-out to all peers, return relevant note titles + tags. No content by default — peer must explicitly allow content sharing.

### 2. Person Query
> "Who in the mesh has notes about Y person?"

Cross-reference people directories across peers.

### 3. Overlap Query
> "What topics are emerging across the mesh right now?"

Aggregate tag frequencies across all peers, surface trending clusters.

### 4. Direct Query
> "Ask Matt's vault: what's my last note about decentralised identity?"

Route a specific question to a specific peer's recall pipeline.

## Transport

### /api/sensemaking/mesh (to be built)

```
POST /api/sensemaking/mesh
Authorization: Bearer <mesh-token>

{
  "action": "query",
  "query": "decentralised identity",
  "scope": ["tags", "titles"],    // what to return
  "maxResults": 5
}
```

Response:
```json
{
  "peer": "matt",
  "results": [
    {
      "path": "notes/2026-04-15-did.md",
      "title": "Decentralised Identity",
      "tags": ["identity", "web3"],
      "snippet": "First 100 chars..."
    }
  ]
}
```

### Mesh Registry

Each peer maintains a local file: `vault/mesh/peers.json`

```json
{
  "peers": [
    {
      "name": "matt",
      "endpoint": "https://matt.zo.space/api/sensemaking/mesh",
      "token": "mesh-token-from-matt",
      "topics": ["film", "pkm", "networks", "ai"],
      "allowContent": false
    }
  ]
}
```

## Privacy Model

- **Opt-in sharing**: nothing leaves the vault unless explicitly tagged or allowed.
- **Peer-specific tokens**: each mesh connection uses a unique bearer token, revocable per-peer.
- **Scope negotiation**: when adding a peer, both sides agree on what tag families are shared.
- **No central registry**: peers discover each other by direct invitation (share your endpoint + token).
- **Content gating**: the `allowContent` flag controls whether note bodies or just metadata (titles, tags, people) are returned.

## Implementation Path

### Phase 1 — now
- Document the protocol (this file).
- Matt & Rich manually test "what do you have on X?" by asking their respective Zos.

### Phase 2 — build
- Add `/api/sensemaking/mesh` endpoint to this repo.
- Add `vault/mesh/peers.json` + peer management.
- Wire into the recall rule so mesh results appear alongside local results.

### Phase 3 — standardise
- Mesh handshake protocol (peer discovery).
- Shared tag ontologies (so `#networks` means the same thing across vaults).
- Emerging intelligence dashboard: aggregate tag clouds, topic overlap heatmaps.

## Open Questions

1. **Push vs pull?** Currently pull-only (query). Should peers also push discoveries? ("I just found this and thought of you.")
2. **Shared tags ontology?** Do we need a canonical tag set across the mesh, or is loose overlap fine?
3. **Graph federation?** The PKM brief mentions Solid pods and Memgraph. Is the mesh protocol a stepping stone to that, or an alternative?
4. **Mobile queries?** Can Matt SMS `?mesh networks` and get results from the whole mesh?
