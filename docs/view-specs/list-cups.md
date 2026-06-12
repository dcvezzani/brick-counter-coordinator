# List cups

**Status:** Draft — for Dave review  
**Last updated:** 2026-06-12 (spec–diagram review)

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
| **Phase access** | `counting`, `reconciling`, `organizing` only — SessionNav **Cups** hidden in `importing`, `updating_inventory`, and `closed` |

## Related docs

- [Product Spec — Application views](../../feature/part-out-coordinator/product-spec.md#application-views)
- [Product Spec — Scenario 6: Browse cups](../../feature/part-out-coordinator/product-spec.md#key-scenarios)
- [Tech Spec — Lots & cups](../../feature/part-out-coordinator/tech-spec.md#lots--cups-unit-2)
- [Planned views & services — List cups](../support/planned-views-services.md#5-list-cups)
- [Storyboard walkthrough § 5. List cups](../support/storyboard.md#5-list-cups)
- [Lot form — Cup association](./lot-form.md#cup-association)
- [Shared chrome](./README.md#shared-chrome)

## Diagrams

| Diagram | Role |
|---------|------|
| [cup-tap-routing.mmd](../diagrams/cup-tap-routing.mmd) | **Primary** — cup card tap and Add new lot routing |
| [view-navigation.mmd](../diagrams/view-navigation.mmd) | SessionNav **Cups**, empty-cups redirect, cup → lot/lots edges |
| [session-phases-state.mmd](../diagrams/session-phases-state.mmd) | Phase visibility for SessionNav **Cups** |
| [workflow-storyboard.mmd](../diagrams/workflow-storyboard.mmd) | Storyboard walkthrough § 5 |

## Purpose

Workers browse physical cups in the session and open the correct lot entry flow. Cup card tap branches on how many lots are in that cup. Cup-to-lot assignment on save is defined on [Lot form](./lot-form.md#cup-association) (part-number auto-select with override).

## Locked decisions

| Topic | Decision |
|-------|----------|
| Phase access | Available in **`counting`**, **`reconciling`**, and **`organizing`** only. SessionNav **Cups** hidden in `importing`, `updating_inventory`, and `closed`. |
| Counting phase landing | **Lot form** (`/session/:id/lot`) after Part-out import **Confirm** and after Home join when `phase === 'counting'`. List cups is **not** the default counting entry — reach it via SessionNav **Cups**. |
| Cup tap — 0 lots | Navigate to Lot form with `?cupId=` so that cup is **pinned** for the next save (overrides part-number auto-select). |
| Cup tap — 1 lot | Navigate to Lot form for that lot (`/lot/:lotId`) using `soleLotId` from the cups payload. |
| Cup tap — 2+ lots | Navigate to cup-filtered List lots (`?mode=cup&cupId=`). |
| **Add new lot** | Button lives on List cups; navigates to Lot form **without** `cupId`; part-number cup auto-select applies on save (see Lot form). |
| Cup labels | Auto-generated when a cup is created (`Cup A`, `Cup B`, … — letter sequence only for MVP). User-editable labels deferred post-MVP. |
| Card metadata | Label + lot count only (no worker name / last-updated on cards for MVP). |
| No cups in session | On mount, when `GET …/cups` returns an empty array, **redirect immediately** to `/session/:sessionId/lot` (new lot entry). No List cups UI shown. |

## Cup lifecycle

1. **Create** — Cups are created when the first lot for a new physical cup is saved (server creates cup with next label via `POST …/lots`), when the worker chooses **Create new cup** on Lot form (which may `POST …/cups` to register a label-only cup before first save), or when all lots in a cup are deleted (cup record remains with `lotCount === 0`). No separate create-cup screen on List cups.
2. **Group by part** — One physical cup holds one **part number**; multiple **colors** of that part may share the same cup (see Lot form auto-select).
3. **Browse** — List cups shows all cups with live lot counts during `counting`, `reconciling`, and `organizing`.
4. **Tap** — Routing uses `lotCount` and `soleLotId` from the cups payload (see [Data requirements](#data-requirements)).
5. **Empty cup** — A cup with `lotCount === 0` is valid (physical cup registered, no lots yet). Tap → Lot form with cup pinned.

## Entry & exit

### How users arrive

| From | Path / action |
|------|---------------|
| SessionNav **Cups** | `/session/:sessionId/cups` (when phase is `counting`, `reconciling`, or `organizing`) |
| List lots (cup mode) → back / SessionNav **Cups** | `/session/:sessionId/cups` |

**Not** a landing view for counting: Part-out import **Confirm** and Home join (`counting`) go to **Lot form** per [home.md — Post-join routing](./home.md#post-join-routing) and [part-out-import.md](./part-out-import.md#entry--exit).

If the worker navigates to `/cups` when the session has no cups yet, the view redirects to Lot form (new lot) on mount — see [Empty states](#empty-states).

### Where actions navigate

| Action | Destination |
|--------|-------------|
| Tap cup — **0 lots** | `/session/:sessionId/lot?cupId={cupId}` (new lot; cup pinned) |
| Tap cup — **1 lot** | `/session/:sessionId/lot/{soleLotId}` (edit that lot) |
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
| **No cups in session** | On mount, redirect immediately to `/session/:sessionId/lot` (new lot entry). First save may create the first cup. |
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
| 1 | Lot form for that lot (edit) — navigate using `soleLotId` from cups payload |
| 2+ | List lots filtered to cup; worker picks lot → Lot form |

## Data requirements

### Read

| Field / entity | Source (live) | Notes |
|----------------|---------------|-------|
| Session | `GET /api/v1/sessions/:id` | Name |
| Cups | `GET /api/v1/sessions/:id/cups` | `id`, `label`, `lotCount`, `soleLotId` — **authoritative** for card display and tap routing |

**Cups response shape (per cup):**

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Cup id |
| `label` | string | Auto label (`Cup A`, `Cup B`, …) |
| `lotCount` | number | Lots in this cup — drives branch choice (0 / 1 / 2+) |
| `soleLotId` | string \| null | Present when `lotCount === 1`; the lot id for edit navigation. Null or omitted when `lotCount !== 1`. |

Routing uses `lotCount` for branch choice and `soleLotId` for the 1-lot navigation target. Client does **not** re-fetch lots per cup for tap routing. Refresh the cups list when counts may be stale (e.g. after `lot.updated` WebSocket event — updates `lotCount` and `soleLotId` together).

### Write

| Operation | Endpoint (live) | Notes |
|-----------|-----------------|-------|
| Create cup | `POST /api/v1/sessions/:id/cups` | On lot save when auto-select creates a new cup, or when worker chooses **Create new cup** on Lot form; not exposed as List cups UI |

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

- [ ] `GET …/cups` drives labels, `lotCount`, and `soleLotId`
- [ ] `lot.updated` WebSocket refreshes cup lot counts and `soleLotId` while view is open
- [ ] Cup pinned via `?cupId=` on Lot form is honored on save
- [ ] SessionNav **Cups** hidden or disabled in `importing`, `updating_inventory`, and `closed`
- [ ] `GET …/cups` returns `soleLotId` when `lotCount === 1`; tap navigates without extra lots fetch
- [ ] Empty cups list redirects to `/session/:sessionId/lot` on mount
- [ ] Cup-mode List lots: back / SessionNav **Cups** returns to List cups

## Storyboard status

### Implemented (Unit 0)

- Cup cards with lot count and routing logic (0 / 1 / 2+ lots)
- Add new lot button
- Fixture cups from demo session (fixture resolves 1-lot `lotId` via local lots cache — live API uses `soleLotId`)

### Gaps (Units 1–4)

- Part-number cup auto-select and **Create new cup** override on Lot form (save path)
- Lot form reads `?cupId=` for pinned cup on save
- No-cups redirect to Lot form on mount
- No real-time lot count / `soleLotId` updates from other workers
- SessionNav **Cups** phase gating

### `data-testid` inventory

| Test id | Element |
|---------|---------|
| `list-cups-view` | Page container |
| `cup-{cupId}` | Cup card (dynamic) |
| `add-lot` | Add new lot button |

## Spec–diagram review (2026-06-12)

| Spec section | Diagram | Finding | Severity |
|--------------|---------|---------|----------|
| [Cup routing rules](#cup-routing-rules-product) | `cup-tap-routing.mmd` | 0 / 1 / 2+ branches and Add new lot → `/lot` without `cupId` match locked decisions and [Entry & exit](#entry--exit). | Pass |
| [Empty states](#empty-states) — no cups in session | `view-navigation.mmd` CUPS node | Label notes "empty cups redirects to /lot"; edge not drawn separately from tap routing. Spec behavior is clear; diagram is abbreviated. | Advisory |
| [Phase access](#overview) | `view-navigation.mmd` NAV_CUPS, `session-phases-state.mmd` | **Cups** limited to `counting`, `reconciling`, `organizing`; hidden in `updating_inventory` per session-phases note. Aligns with spec. | Pass |
| [Phase access](#overview) | `workflow-storyboard.mmd` counting_phase subgraph | CUPS node label says "also reconciling and organizing" though subgraph title is `counting`. Intentional compression — not a product conflict. | Advisory |
| [Cup tap — 1 lot](#locked-decisions) `soleLotId` | `cup-tap-routing.mmd` | Diagram uses `soleLotId` label on 1-lot branch; matches [Data requirements](#data-requirements). | Pass |
| [Entry & exit](#entry--exit) back from cup-mode List lots | `view-navigation.mmd` | `LOTS_CUP → CUPS` via "Back or SessionNav Cups" matches spec table. | Pass |

## Open questions

- User-editable cup labels post-MVP.
- **Dave:** Should `view-navigation.mmd` add an explicit mount-time edge for empty `GET …/cups` → `/lot` redirect (distinct from tapping a 0-lot cup)?
