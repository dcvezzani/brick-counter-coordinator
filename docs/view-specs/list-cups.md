# List cups

**Status:** Draft — for Dave review  
**Last updated:** 2026-06-11

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
- [Planned views & services — List cups](../support/planned-views-services.md)
- [Storyboard walkthrough § 5. List cups](../support/storyboard.md#5-list-cups)
- [Shared chrome](./README.md#shared-chrome)

## Purpose

Workers browse physical cups in the session and open the correct lot entry flow. Cup selection branches based on how many lots are assigned to that cup.

## Entry & exit

### How users arrive

| From | Path / action |
|------|---------------|
| Part-out import → Confirm | `/session/:sessionId/cups` |
| Home → join session | `/session/:sessionId/cups` |
| SessionNav **Cups** | `/session/:sessionId/cups` |

### Where actions navigate

| Action | Destination |
|--------|-------------|
| Tap cup — **0 lots** | `/session/:sessionId/lot` (new lot for cup) |
| Tap cup — **1 lot** | `/session/:sessionId/lot/:lotId` (edit that lot) |
| Tap cup — **2+ lots** | `/session/:sessionId/lots?mode=cup&cupId={cupId}` |
| **Add new lot** | `/session/:sessionId/lot` |

## Layout & controls

| Element | Copy / behavior |
|---------|-----------------|
| Page heading | List cups |
| Subtitle | {session.name} |
| Cup card title | {cup.label} |
| Cup card subtitle | {lotCount} lot / {lotCount} lots |
| Outline button | Add new lot |

Each cup is a clickable card showing label and lot count.

## Messages & feedback

| Message | Type | Trigger |
|---------|------|---------|
| {session.name} | Subtitle | Always |
| {n} lot(s) | Card subtitle | Per cup |

No empty-state message when there are zero cups (fixture always has cups).

## User actions

| Action | Preconditions | Outcome |
|--------|---------------|---------|
| Tap cup card | — | Routes per lot-count rules (see Entry & exit) |
| Add new lot | — | Opens Lot form for new lot (no cup pre-selected in route today) |

### Cup routing rules (product)

| Lots in cup | Behavior |
|-------------|----------|
| 0 | Open Lot form (new lot) |
| 1 | Open Lot form for that lot (edit) |
| 2+ | Open List lots filtered to that cup; worker picks lot, then Lot form |

## Data requirements

### Read

| Field / entity | Source (live) | Notes |
|----------------|---------------|-------|
| Session | `GET /api/v1/sessions/:id` | Name |
| Cups | `GET /api/v1/sessions/:id/cups` | id, label, lotCount |
| Lots (for routing) | `GET /api/v1/sessions/:id/lots?cupId=` | Count per cup |

### Write

| Operation | Endpoint (live) | Notes |
|-----------|-----------------|-------|
| Create cup (optional MVP) | `POST /api/v1/sessions/:id/cups` | May auto-create cup per lot save |

## Acceptance criteria

- [ ] All session cups listed with label and lot count
- [ ] Tapping cup with one lot opens Lot form for that lot
- [ ] Tapping cup with multiple lots opens cup-filtered List lots
- [ ] Tapping cup with zero lots opens new Lot form
- [ ] **Add new lot** opens new Lot form
- [ ] SessionNav **Cups** returns to this view
- [ ] Cards are tappable with clear lot count (mobile-friendly target size)

## Storyboard status

### Implemented (Unit 0)

- Cup cards with lot count and routing logic matching product rules
- Add new lot button
- Fixture cups from demo session

### Gaps (Units 1–4)

- **Add new lot** does not pass `cupId` in route — cup association is implicit in fixture
- No create-cup UI
- No empty cups state copy
- No real-time lot count updates from other workers

### `data-testid` inventory

| Test id | Element |
|---------|---------|
| `list-cups-view` | Page container |
| `cup-{cupId}` | Cup card (dynamic) |
| `add-lot` | Add new lot button |

## Open questions

- Should **Add new lot** require selecting a cup first?
- Cup labels: user-editable or auto-generated (Cup A, B, …)?
- Show worker name or last-updated on cup cards?
