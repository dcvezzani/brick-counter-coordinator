# New session

**Status:** Draft — for Dave review  
**Last updated:** 2026-06-11

---

## Overview

| Field | Value |
|-------|-------|
| **View name** | New session |
| **Route** | `/session/new` |
| **Route params** | — |
| **Query params** | — |
| **Primary actor(s)** | Session lead |
| **Delivery unit** | 0 (fixture) → 1 (live create + Bricklink fetch) |
| **Source file** | [`src/views/NewSessionView.vue`](../../src/views/NewSessionView.vue) |

## Related docs

- [Product Spec — Application views](../../feature/part-out-coordinator/product-spec.md#application-views)
- [Product Spec — Scenario 2: New session](../../feature/part-out-coordinator/product-spec.md#key-scenarios)
- [Planned views & services — New session](../support/planned-views-services.md#2-new-session)
- [Storyboard walkthrough § 2. New session](../support/storyboard.md#2-new-session)
- [ADR-0004 — Part-out server fetch](../../adr/0004-part-out-server-fetch-curated-import.md)

## Purpose

Session lead specifies the LEGO set to part-out and Bricklink part-out options, then submits so the coordinator fetches the official part-out list and creates a session in the **importing** phase.

## Entry & exit

### How users arrive

| From | Path / action |
|------|---------------|
| Home → **Create new session** | `/session/new` |
| Direct navigation | `/session/new` (requires display name in `sessionStorage` from Home) |

### Where actions navigate

| Action | Destination |
|--------|-------------|
| **Create session & fetch part-out** (success) | `/session/:sessionId/import` |
| Fetch failure (live, planned) | Stay on view or redirect to import with error — see Tech Spec |

## Layout & controls

| Element | Copy / behavior |
|---------|-----------------|
| Page heading | New session |
| Helper text (storyboard) | Set number and Bricklink part-out options. Server fetch is simulated in storyboard. |
| Label | Set number |
| Input placeholder | 70404-1 |
| Default set number | `70404-1` |
| **Pricing basis** (radio) | Stock guide · Last 6 months sales |
| **Condition mix** (radio) | New · Used · Mixed |
| **Existing lots** (radio) | Consolidate with existing · Overwrite existing |
| Submit button | Create session & fetch part-out |

### Part-out options (product mapping)

| UI field | Values | Purpose |
|----------|--------|---------|
| Pricing basis | `stock`, `last6` | Bricklink part-out price source |
| Condition mix | `new`, `used`, `mixed` | Expected condition for the session; drives lot form defaults |
| Existing lots | consolidate / overwrite | Bricklink inventory merge behavior on export |

## Messages & feedback

| Message | Type | Trigger |
|---------|------|---------|
| Server fetch is simulated in storyboard. | Helper text | Always visible in Unit 0 |
| Fetch error message (planned) | Alert | Live: Bricklink fetch fails on create |
| Loading state (planned) | Inline / disabled submit | Live: fetch in progress |

No validation errors are shown today for empty or invalid set numbers.

## User actions

| Action | Preconditions | Outcome |
|--------|---------------|---------|
| Configure set number | — | Updates form state |
| Select pricing / condition / overwrite options | — | Stored in `partOutOptions` on create |
| Create session & fetch part-out | Display name from Home (fallback: "Session Lead") | Creates session (phase `importing`), sets current worker as lead, navigates to Part-out import |

## Data requirements

### Read

| Field / entity | Source (live) | Notes |
|----------------|---------------|-------|
| Worker display name | Client `sessionStorage` | From Home |

### Write

| Operation | Endpoint (live) | Notes |
|-----------|-----------------|-------|
| Create session + fetch part-out | `POST /api/v1/sessions` | Body: set number, `partOutOptions`, lead display name. Server fetches Bricklink part-out, persists `part_out_lines`. Returns `sessionId`, `part_out_fetch_status`. |

Session name is derived from set number (e.g. `{setNumber} part-out`).

## Acceptance criteria

- [ ] Lead can enter a Bricklink set number (e.g. `70404-1`)
- [ ] Lead can choose pricing basis, condition mix, and existing-lot behavior
- [ ] Submit creates a session and navigates to Part-out import
- [ ] Fetched part-out lines are available on the import view (fixture or live)
- [ ] Condition mix is persisted on the session and affects lot form defaults (New / Used / Mixed)
- [ ] Live: fetch failure shows actionable error without losing the session record
- [ ] SessionNav is **not** shown (no `sessionId` until after create)

## Storyboard status

### Implemented (Unit 0)

- Full form with all three option groups
- Simulated create → fixture demo part-out lines cloned into new session
- Phase set to `importing`; confirm on import advances to `counting`
- Default set `70404-1`

### Gaps (Units 1–4)

- No live `POST /api/v1/sessions` or Bricklink fetch
- No set-number validation or fetch error UI
- No refetch path from this view
- Helper text about simulation should be removed or replaced in live mode

### `data-testid` inventory

| Test id | Element |
|---------|---------|
| `new-session-view` | Page container |
| `set-number` | Set number input |
| `submit-new-session` | Submit button |

## Open questions

- Required set number format validation (e.g. must include `-1` suffix)?
- Should lead display name be editable here if they skipped Home?
- Show fetch progress / line count after create?
