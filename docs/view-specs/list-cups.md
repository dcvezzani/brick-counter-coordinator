# List cups

**Status:** Draft — for Dave review  
**Last updated:** 2026-06-12

---

## Overview

| Field | Value |
|-------|-------|
| **View name** | List cups |
| **Route** | `/session/:sessionId/cups` |
| **Route params** | `sessionId` |
| **Query params** | — |
| **Primary actor(s)** | Counter / any worker |
| **Delivery unit** | 0 (fixture) → 2 (live cups + lots) |
| **Source file** | [`src/views/ListCupsView.vue`](../../src/views/ListCupsView.vue) |

## Related docs

- [Product Spec — Application views](../../feature/part-out-coordinator/product-spec.md#application-views)
- [Product Spec — Scenario 6: Browse cups](../../feature/part-out-coordinator/product-spec.md#key-scenarios)
- [Tech Spec — Lots & cups](../../feature/part-out-coordinator/tech-spec.md#lots--cups-unit-2)
- [Planned views & services — List cups](../support/planned-views-services.md#5-list-cups)
- [Storyboard walkthrough § 5. List cups](../support/storyboard.md#5-list-cups)
- [Lot form — Cup association](./lot-form.md#cup-association)
- [Shared chrome](./README.md#shared-chrome)

## Purpose

Workers browse physical cups in the session and open the correct lot entry flow. Cup card tap branches on how many lots are in that cup. Cup-to-lot assignment on save is defined on [Lot form](./lot-form.md#cup-association) (part-number auto-select with override).

## Locked decisions

| Topic | Decision |
|-------|----------|
| Counting phase landing | **Lot form** (`/session/:id/lot`) after Part-out import **Confirm** and after Home join when `phase === 'counting'`. List cups is **not** the default counting entry — reach it via SessionNav **Cups**. |
| Cup tap — 0 lots | Navigate to Lot form with `?cupId=` so that cup is **pinned** for the next save (overrides part-number auto-select). |
| Cup tap — 1 lot | Navigate to Lot form for that lot (`/lot/:lotId`). |
| Cup tap — 2+ lots | Navigate to cup-filtered List lots (`?mode=cup&cupId=`). |
| **Add new lot** | Stays on List cups. Opens Lot form **without** `cupId`; part-number cup auto-select applies on save (see Lot form). |
| Cup labels | Auto-generated when a cup is created (`Cup A`, `Cup B`, …). User-editable labels deferred post-MVP. |
| Card metadata | Label + lot count only (no worker name / last-updated on cards for MVP). |

## Cup lifecycle

1. **Create** — Cups are created when the first lot for a new physical cup is saved (server/client creates cup with next label), or when the worker chooses **Create new cup** on Lot form. No separate create-cup screen on List cups.
2. **Group by part** — One physical cup holds one **part number**; multiple **colors** of that part may share the same cup (see Lot form auto-select).
3. **Browse** — List cups shows all cups with live lot counts during counting.
4. **Tap** — Routing uses `lotCount` from the cups payload (see [Data requirements](#data-requirements)).
5. **Empty cup** — A cup with `lotCount === 0` is valid (physical cup registered, no lots yet). Tap → Lot form with cup pinned.

## Entry & exit

### How users arrive

| From | Path / action |
|------|---------------|
| SessionNav **Cups** | `/session/:sessionId/cups` |
| List lots (cup mode) → back / SessionNav **Cups** | `/session/:sessionId/cups` |

**Not** a landing view for counting: Part-out import **Confirm** and Home join (`counting`) go to **Lot form** per [home.md — Post-join routing](./home.md#post-join-routing) and [part-out-import.md](./part-out-import.md#entry--exit).

### Where actions navigate

| Action | Destination |
|--------|-------------|
| Tap cup — **0 lots** | `/session/:sessionId/lot?cupId={cupId}` (new lot; cup pinned) |
| Tap cup — **1 lot** | `/session/:sessionId/lot/:lotId` (edit that lot) |
| Tap cup — **2+ lots** | `/session/:sessionId/lots?mode=cup&cupId={cupId}` |
| **Add new lot** | `/session/:sessionId/lot` (no `cupId`; auto-select on save) |

## Layout & controls

| Element | Copy / behavior |
|---------|-----------------|
| Page heading | List cups |
| Subtitle | {session.name} |
| Cup card title | {cup.label} |
| Cup card subtitle | `1 lot` when {lotCount} is 1; otherwise `{lotCount} lots` (including `0 lots`) |
| Outline button | Add new lot |

Each cup is a clickable card showing label and lot count.

## Messages & feedback

| Message | Type | Trigger |
|---------|------|---------|
| {session.name} | Subtitle | Always |
| `0 lots` / `1 lot` / `{n} lots` | Card subtitle | Per cup |

### Empty states

| Case | Copy / behavior |
|------|-----------------|
| **No cups in session** | Empty list + primary action to SessionNav **Lot** (start entry; first save may create a cup). Copy TBD in Unit 2 — MVP may show only the **Add new lot** button until first cup exists. |
| **Cup with zero lots** | Card shows `0 lots`; no extra empty-state panel on the card. |

## User actions

| Action | Preconditions | Outcome |
|--------|---------------|---------|
| Tap cup card | — | Routes per lot-count rules (see Entry & exit) |
| Add new lot | — | Opens Lot form without pinned cup; save uses part-number auto-select |

### Cup routing rules (product)

| Lots in cup | Behavior |
|-------------|----------|
| 0 | Lot form (new lot), `?cupId=` pins cup |
| 1 | Lot form for that lot (edit) |
| 2+ | List lots filtered to cup; worker picks lot → Lot form |

## Data requirements

### Read

| Field / entity | Source (live) | Notes |
|----------------|---------------|-------|
| Session | `GET /api/v1/sessions/:id` | Name |
| Cups | `GET /api/v1/sessions/:id/cups` | `id`, `label`, `lotCount` — **authoritative** for card display and tap routing |

Routing uses `lotCount` from the cups response. Client does not re-fetch lots per cup for branch decisions unless counts may be stale (e.g. after `lot.updated` WebSocket event — refresh cups list).

### Write

| Operation | Endpoint (live) | Notes |
|-----------|-----------------|-------|
| Create cup | `POST /api/v1/sessions/:id/cups` | On lot save when auto-select creates a new cup; not exposed as List cups UI |

## Acceptance criteria

### Unit 0 (storyboard)

- [ ] All session cups listed with label and lot count (including at least one cup with `0 lots` in fixture)
- [ ] Tapping cup with zero lots opens Lot form with `cupId` query
- [ ] Tapping cup with one lot opens Lot form for that lot
- [ ] Tapping cup with multiple lots opens cup-filtered List lots
- [ ] **Add new lot** opens Lot form without `cupId`
- [ ] SessionNav **Cups** opens this view
- [ ] Cards are tappable with clear lot count (mobile-friendly target size)

### Unit 2 (live)

- [ ] `GET …/cups` drives labels and `lotCount`
- [ ] `lot.updated` WebSocket refreshes cup lot counts while view is open
- [ ] Cup pinned via `?cupId=` on Lot form is honored on save

## Storyboard status

### Implemented (Unit 0)

- Cup cards with lot count and routing logic (0 / 1 / 2+ lots)
- Add new lot button
- Fixture cups from demo session

### Gaps (Units 1–4)

- Part-number cup auto-select and **Create new cup** override on Lot form (save path)
- Lot form reads `?cupId=` for pinned cup on save
- No cups in session empty-state copy
- No real-time lot count updates from other workers

### `data-testid` inventory

| Test id | Element |
|---------|---------|
| `list-cups-view` | Page container |
| `cup-{cupId}` | Cup card (dynamic) |
| `add-lot` | Add new lot button |

## Open questions

- Copy for **no cups in session** empty state (Unit 2).
- User-editable cup labels post-MVP.
