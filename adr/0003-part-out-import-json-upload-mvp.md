# ADR-0003: Part-out import via JSON file upload (MVP)

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-06-10 |
| **Deciders** | David Vezzani |
| **Related** | [dcv/qa-001.md](../dcv/qa-001.md), [tech-spec.md](../feature/part-out-coordinator/tech-spec.md) |

---

## Context

The official part-out list for a set lives in Bricklink (`invSetEdit.asp`). Dave's extension can **scrape** that page to JSON (`code-scraper.js`) or a **server could fetch** with a session cookie. Unit 4 needs imported lines including **Remarks** (storage locations).

## Decision

For **MVP**, the session lead **uploads a JSON file** exported from the extension scrape (or equivalent) when creating or reconciling a session. The server validates schema and stores `part_out_lines`. **Server-side live fetch** of the part-out page is **deferred** to a follow-up (new ADR if prioritized).

## Options considered

| Option | Summary | Why not chosen |
|--------|---------|----------------|
| JSON upload | Manual step; uses existing extension | **Chosen for MVP** — unblocks Units 1–3 without cookie scrape complexity |
| Server fetch with cookie | Fully in-app | Valuable later; HTML parsing fragility |
| Manual CSV | Simple | Loses Remarks metadata Bricklink provides |

## Consequences

### Positive

- Reuses extension investment; clear test fixtures
- Units 1–3 can use seeded JSON in tests without Bricklink

### Negative / trade-offs

- Extra step for lead (export → upload)
- Schema must stay in sync with extension output

### Neutral / follow-ups

- Add server-side fetch when Dave wants to eliminate upload step

## Compliance & verification

- `POST /sessions/:id/part-out` accepts JSON only in MVP
- Document sample file in repo `fixtures/part-out-sample.json`

## References

- Extension: `bricklink-chrome-extension/scripts/code-scraper.js`
