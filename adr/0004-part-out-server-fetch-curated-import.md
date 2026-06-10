# ADR-0004: Part-out import via server fetch and curated import view

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-06-10 |
| **Deciders** | David Vezzani |
| **Supersedes** | [ADR-0003](./0003-part-out-import-json-upload-mvp.md) |
| **Related** | [product-spec.md](../feature/part-out-coordinator/product-spec.md), [tech-spec.md](../feature/part-out-coordinator/tech-spec.md) |

---

## Context

The official part-out list for a set lives in Bricklink (`invSetEdit.asp`). [ADR-0003](./0003-part-out-import-json-upload-mvp.md) chose JSON file upload for MVP. Dave reviewed the Design fork and wants **in-app server-side fetch** instead, plus a dedicated **import view** where the session lead reviews all fetched lines and **removes entries out of scope** for the current counting pass.

**Purchase scenarios:**

| Purchase | Expected condition | Sweeps | Import curation |
|----------|-------------------|--------|-----------------|
| Brand-new sealed set | All **new** | **One** — confirm full list | Usually no exclusions |
| Loose bricks | All **used** | **One** — confirm full list | Usually no exclusions |
| Partial-bag set (some bags opened, some sealed) | Mixed **used** + **new** | **Two** — separate sessions | Exclude out-of-scope lines per sweep |

**Two-sweep use case:** Only when the same physical set has both used parts (from opened bags) and new parts (still in sealed bags). First session counts used; second session counts new. Brand-new and loose purchases do **not** need two sweeps.

## Decision

1. On session create, the **coordinator server** fetches the Bricklink part-out for the set using `BRICKLINK_SESSION_COOKIE` and session `part_out_options` (pricing, N/U, overwrite vs consolidate). Port HTML parsing from extension `inv-set-edit-dom.js` / `code-scraper.js` — **AJAX/fetch only**, no iframes ([ADR-0002](./0002-bricklink-ajax-only-no-iframes.md)).
2. Add application view **Part-out import**: shows **all** fetched lines; lead **excludes** lines not in scope for this sweep (remove action; excluded lines hidden or shown in a separate section with restore).
3. **Counting and reconciliation** operate only on **included** (`excluded = 0`) part-out lines. The full fetched list remains stored for audit and for a second sweep in a new session.
4. **JSON file upload is not MVP** — deferred as optional fallback only if server fetch fails and Dave approves a follow-up.

## Options considered

| Option | Summary | Why not chosen |
|--------|---------|----------------|
| JSON upload | Manual export from extension | Superseded — extra step; Dave wants in-app fetch |
| Server fetch only, no curation UI | Full list always in scope | Cannot support partial-bag / two-sweep workflow |
| Curation at reconciliation time | Trim list after counting | Too late — workers would count out-of-scope parts |
| **Server fetch + import view** | Fetch once; lead curates before counting | **Chosen** |

## Consequences

### Positive

- No manual export/upload step for the lead
- Single-sweep confirm for typical brand-new or loose purchases; two-sweep only for partial-bag mixed condition
- Full official list retained; exclusions are reversible until session advances past import

### Negative / trade-offs

- Server must hold valid Bricklink session cookie
- HTML parsing fragility on `invSetEdit.asp` — share parser with extension DOM helpers; fixture tests required
- Units 1–3 tests use seeded part-out fixtures unless integration env has cookie

### Neutral / follow-ups

- Optional JSON upload fallback ADR if fetch breaks in production
- Two-sweep: new session, re-fetch same set, exclude opposite subset — **partial-bag only**

## Compliance & verification

- `POST /sessions` triggers fetch; stores `part_out_lines` with `excluded` flag
- `GET` / `PATCH` part-out lines APIs; import view reachable before counting
- Reconciliation diff uses included lines only
- Sample fixture: `fixtures/part-out-sample.json` (same shape as parsed fetch)

## References

- **Fetch contract:** [docs/bricklink-set-part-out-fetch.md](../docs/bricklink-set-part-out-fetch.md) — POST body, session cookie, HTML response, parse targets
- Raw capture: [dcv/set-part-out-list/request.md](../dcv/set-part-out-list/request.md), sample HTML [dcv/set-part-out-list/response.html](../dcv/set-part-out-list/response.html)
- Extension: `bricklink-chrome-extension/scripts/code-scraper.js`, `src/lib/inv-set-edit-dom.js`
- Bricklink URL: `POST https://www.bricklink.com/invSetEdit.asp`
