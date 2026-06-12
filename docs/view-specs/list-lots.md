# List lots

**Status:** Draft — for Dave review  
**Last updated:** 2026-06-12 (spec–diagram review)

---

## Overview

| Field | Value |
|-------|-------|
| **View name** | List lots |
| **Route** | `/session/:sessionId/lots` |
| **Route params** | `sessionId` |
| **Query params** | `mode` (`cup` \| `organizer`; required for correct behavior); `cupId` (required when `mode=cup`) |
| **Primary actor(s)** | Counter (cup mode) / Organizer (organizer mode) |
| **Delivery unit** | 0 (fixture) → 2 (cup) → 3 (organizer) |
| **Source file** | [`src/views/ListLotsView.vue`](../../src/views/ListLotsView.vue) |
| **Table component** | [`LotListTable.vue`](../../src/components/LotListTable.vue) |

## Related docs

- [Product Spec — Application views](../../feature/part-out-coordinator/product-spec.md#application-views)
- [Product Spec — Scenario 10–11: Organize](../../feature/part-out-coordinator/product-spec.md#key-scenarios)
- [Tech Spec — Routes & pick lists](../../feature/part-out-coordinator/tech-spec.md)
- [Planned views & services — List lots](../support/planned-views-services.md#6-list-lots)
- [Storyboard walkthrough § 6. List lots](../support/storyboard.md#6-list-lots)
- [List cups](./list-cups.md) — cup-mode entry
- [Part-out reconciliation](./part-out-reconciliation.md) — discrepancy list (shared `LotListTable` component; not a mode on this route)
- [Shared chrome](./README.md#shared-chrome)

## Diagrams

| Diagram | Role |
|---------|------|
| [view-navigation.mmd](../diagrams/view-navigation.mmd) | Cup vs organizer mode routing, back-nav to List cups, **Open cup** |
| [cup-tap-routing.mmd](../diagrams/cup-tap-routing.mmd) | Entry when List cups `lotCount ≥ 2` |
| [workflow-storyboard.mmd](../diagrams/workflow-storyboard.mmd) | Storyboard § 6; organizer → **Declare ready to import** |
| [reconciliation-workflow.mmd](../diagrams/reconciliation-workflow.mmd) | Confirms discrepancy list is **not** a `mode` on this route |

## Purpose

One list UI serves **two** product contexts via the `mode` query parameter. Counters pick a lot from a multi-lot cup; organizers work their assigned pick list after split.

Discrepancy reconciliation lives on [**Part-out reconciliation**](./part-out-reconciliation.md) only — not as a `mode` on this route.

## Locked decisions

| Topic | Decision |
|-------|----------|
| Product modes on this route | **cup** and **organizer** only; reconciliation removed from this route |
| **Add another lot** | **Not on this view** — use SessionNav **Lot** or **List cups** |
| **Open associated cup** | **Required** row action in organizer mode (Unit 3) |
| **Split list** | Any worker in organizer mode may run it after phase is `organizing` and every reconciliation row is resolved; session lead will typically click it |
| **Return to reconciling** | If a count error surfaces during organizing, lead may advance phase **`organizing` → `reconciling`** — pick-list **Moved** / **New loc** checks and split assignments **preserved** (no rollback) |
| **Mark entire list complete** | **Disabled** until every assigned line is **Moved to storage** or **Needs new location** (no `pending` lines) |
| **Declare ready to import** | Visible in `organizing`; **disabled** until every joined worker has marked their list complete; advances session to `updating_inventory` via `POST …/sessions/:id/phase` |
| Storage location column | **Required** in organizer mode — show part-out **Remarks** / storage location per line (Product Spec scenario 10; Unit 3) |
| Page heading | Mode-specific: **Lots in cup** (cup) or **Organizer pick list** (organizer); no duplicate inner table title |
| Cup mode without `cupId` | Invalid — redirect to **List cups** or show empty state with guidance (do not list all session lots) |

## Modes

| Mode | Query | Page heading | Primary actor | Reached from |
|------|-------|--------------|---------------|--------------|
| **cup** | `?mode=cup&cupId={id}` | Lots in cup | Counter | [List cups](./list-cups.md) (multi-lot cup) |
| **organizer** | `?mode=organizer` | Organizer pick list | Organizer | SessionNav **Lots** |

## Entry & exit

### How users arrive

| From | Path / action |
|------|---------------|
| List cups → multi-lot cup | `?mode=cup&cupId={cupId}` |
| SessionNav **Lots** | `?mode=organizer` |
| Organizer mode → **Open cup** | `?mode=cup&cupId={cupId}` |

SessionNav **Lots** is visible whenever the route includes `sessionId` (see [Shared chrome](./README.md#sessionnav-bottom-bar)). Organizer workflow runs in the `organizing` phase **after** [Part-out reconciliation](./part-out-reconciliation.md) discrepancies are resolved and the lead advances phase.

### Where actions navigate

| Action | Destination |
|--------|-------------|
| Cup mode → browser back / SessionNav **Cups** | `/session/:sessionId/cups` |
| **Edit** (table) | `/session/:sessionId/lot/:lotId` |
| **Open cup** (organizer) | `/session/:sessionId/lots?mode=cup&cupId={cupId}` for that lot's cup |
| Delete confirm | Stays on list (lot removed) |
| Print | Browser print dialog (organizer) |

## Layout & controls

### View shell

| Element | Copy / behavior |
|---------|-----------------|
| Page heading | **Lots in cup** (cup mode) or **Organizer pick list** (organizer mode) |
| Organizer: **Split list** | Visible when `mode=organizer` and pick list not yet split; any worker may click |
| Organizer: **Print** | Triggers `window.print()` |
| Organizer: **Mark entire list complete** | Disabled while any assigned line has status `pending`; marks current worker's pick list complete when enabled |
| Organizer: **Declare ready to import** | Disabled until all workers' organizer lists are complete; advances phase to `updating_inventory` |

### Lot list table (shared)

No separate table `<h2>` — page heading is the only title.

| Mode | Columns |
|------|---------|
| cup | Part, Color, Qty, Actions |
| organizer | Part, Color, Qty, Location, Status, Actions |

**Location** (organizer): storage hint from part-out **Remarks** for that part/color line.

### Row actions

| Mode | Actions |
|------|---------|
| cup | **Edit**, **Delete** |
| organizer | **Edit**, **Delete**, **Moved**, **New loc**, **Open cup** |

### Copy map (organizer status buttons)

| Button label | Sets status | Badge label |
|--------------|-------------|-------------|
| Moved | `moved_to_storage` | Moved to storage |
| New loc | `needs_new_location` | Needs new location |

### Status labels (organizer)

| Internal value | Display |
|----------------|---------|
| pending | Pending |
| moved_to_storage | Moved to storage |
| needs_new_location | Needs new location |

### Delete lot dialog

| Element | Copy |
|---------|------|
| Title | Delete lot? |
| Description | Remove lot {partId} / {color} from this session? This cannot be undone. |
| Cancel | Cancel |
| Confirm | Delete |

### Empty states

| Situation | Behavior |
|-----------|----------|
| Organizer mode, pick list not split | **Split list** button visible; table empty or shows all lots unassigned until split runs |
| Organizer mode, worker has zero assigned lines after split | Empty table with copy such as "No lots assigned to you" |
| Cup mode, invalid or missing `cupId` | Redirect to **List cups** or empty state — do not show all session lots |

## Messages & feedback

| Message | Type | Trigger |
|---------|------|---------|
| Delete lot? / description | Dialog | Delete → confirm |
| Status badge | Badge per row | Organizer mode |
| No lots assigned to you | Empty hint | Organizer mode; worker has zero lines after split |

No toast on status change or list complete.

**Fixture-only (Unit 0):** `Mode: {mode}` subtitle and `data-testid="lots-mode"` — remove before production; not listed as product copy.

## User actions

| Action | Preconditions | Outcome |
|--------|---------------|---------|
| Split list | Organizer mode; `phase === 'organizing'`; all reconciliation discrepancies resolved; pick list not yet split | Evenly divides lots across joined workers (round-robin by part id sorted); creates pick-list items; sets `pickListSplit` |
| Edit | cup or organizer row | Navigate to Lot form |
| Delete → confirm | cup or organizer row on worker's assigned lot (organizer) | Removes lot and associated pick-list items |
| Moved / New loc | Organizer mode; assigned line | Updates pick-list item status; refreshes badge |
| Open cup | Organizer mode; lot has `cupId` | Navigate to cup-filtered List lots for that cup |
| Print | Organizer mode | Opens print dialog; hides nav/actions via print CSS |
| Mark entire list complete | Organizer mode; every assigned line non-`pending` | Marks current worker's pick list complete |
| Declare ready to import | Organizer mode; `phase === 'organizing'`; all workers' lists complete | `POST …/sessions/:id/phase` → `updating_inventory`; workers proceed to [Part-out reconciliation](./part-out-reconciliation.md) for XML export |

### Organizer requirements (product)

- Lots split evenly across joined workers; ordered by part id
- Each worker sees only their assigned lots
- Each line shows storage **Location** from part-out Remarks
- **Mark entire list complete** enabled only when every assigned line is moved or needs new location

## Data requirements

### Read

| Field / entity | Source (live) | Notes |
|----------------|---------------|-------|
| Lots (cup mode) | `GET /api/v1/sessions/:id/lots?cupId=` | Filtered to cup; `cupId` required |
| Pick list (organizer) | `GET /api/v1/sessions/:id/lots?mode=organizer&workerId=` | Worker's assigned lots + status + location |
| Session | `GET /api/v1/sessions/:id` | `pickListSplit` flag, phase |

### Write

| Operation | Endpoint (live) | Notes |
|-----------|-----------------|-------|
| Split pick list | `POST /api/v1/sessions/:id/pick-lists/split` | Even distribution among current workers |
| Update pick status | `PATCH /api/v1/sessions/:id/pick-lists/:itemId` | `{ status: "moved_to_storage" \| "needs_new_location" }` |
| Complete list | `POST /api/v1/sessions/:id/pick-lists/complete` | Per worker |
| Delete lot | `DELETE /api/v1/sessions/:id/lots/:lotId` | Also removes associated pick-list items |

WebSocket: `pick_list.updated` refreshes organizer rows ([tech spec](../../feature/part-out-coordinator/tech-spec.md)).

## Acceptance criteria

### Cup mode

- [ ] Shows only lots in the selected cup (`cupId` required)
- [ ] Invalid/missing `cupId` does not list all session lots
- [ ] Page heading reads **Lots in cup**
- [ ] Edit opens Lot form for that lot
- [ ] Delete removes lot after confirmation

### Organizer mode

- [ ] Page heading reads **Organizer pick list**
- [ ] **Split list** divides lots evenly across workers (once per session); any worker may trigger
- [ ] Worker's list ordered by part id; only assigned lots visible
- [ ] **Location** column shows storage hint from part-out Remarks
- [ ] **Moved** and **New loc** update status badges
- [ ] **Edit**, **Delete**, and **Open cup** work on assigned lots
- [ ] **Open cup** navigates to cup-filtered List lots for the lot's cup
- [ ] **Print** produces a printable pick list (includes Location column)
- [ ] **Mark entire list complete** disabled while any line is `pending`; enabled when all lines resolved
- [ ] **Declare ready to import** disabled until every worker's organizer list is complete; advances to `updating_inventory`

### General

- [ ] SessionNav **Lots** opens organizer mode
- [ ] Multi-lot cup navigation from List cups lands in cup mode with correct filter
- [ ] Reconciliation is **not** reachable via `mode` on this route (use Part-out reconciliation)

## Storyboard status

### Implemented (Unit 0)

- Cup and organizer modes in one view + shared `LotListTable`
- Split list, status buttons, print, mark complete (mark complete not yet gated)
- Delete confirmation dialog
- Fixture in-memory pick-list and lot mutations
- Cup mode entry from List cups (see [list-cups.md](./list-cups.md))

### Gaps (Units 1–4)

- **Open cup** row action not implemented
- **Location** column not shown in organizer table
- **Mark entire list complete** not disabled when pending lines remain
- Cup mode without `cupId` may show all lots (should redirect or empty)
- Page heading still generic "List lots"; inner table title duplicates heading
- `Mode: {mode}` debug subtitle still visible (fixture artifact — remove for production)
- No live pick-list persistence or WebSocket updates
- Print layout not styled for production (Location column TBD until column ships)
- ~~Legacy `mode=reconciliation` code path~~ — removed; use [Part-out reconciliation](./part-out-reconciliation.md)

### `data-testid` inventory

| Test id | Element |
|---------|---------|
| `list-lots-view` | Page container |
| `lots-mode` | Mode indicator (fixture-only — remove for production) |
| `split-pick-list` | Split list button |
| `print-pick-list` | Print button (planned) |
| `mark-complete` | Mark entire list complete |
| `delete-lot-dialog` | Delete dialog |
| `delete-lot-cancel` | Cancel delete |
| `delete-lot-confirm` | Confirm delete |
| `lot-list-table` | Table root |
| `lot-edit` | Edit row action |
| `lot-delete` | Delete row action |
| `lot-moved` | Moved row action (planned) |
| `lot-new-loc` | New loc row action (planned) |
| `lot-open-cup` | Open cup row action (planned) |

## Spec–diagram review (2026-06-12)

| Spec section | Diagram | Finding | Severity |
|--------------|---------|---------|----------|
| [Modes](#modes) cup entry | `cup-tap-routing.mmd` → `view-navigation.mmd` | `lotCount ≥ 2` → `?mode=cup&cupId=` and Edit → Lot form match [Entry & exit](#entry--exit). | Pass |
| [Purpose](#purpose) — no reconciliation mode | `reconciliation-workflow.mmd` | Reconciliation is a separate route; no `mode=reconciliation` on List lots. Aligns. | Pass |
| Cup mode back navigation | `view-navigation.mmd` | `LOTS_CUP → CUPS` matches spec back / SessionNav **Cups** row. | Pass |
| Organizer **Open cup** | `view-navigation.mmd`, `workflow-storyboard.mmd` | `LOTS_ORG → LOTS_CUP` edge present; matches [Where actions navigate](#where-actions-navigate). | Pass |
| **Declare ready to import** | `workflow-storyboard.mmd` | `LOTS_ORG → STORE_UPDATE` in `updating_inventory` phase matches spec outcome (XML export on reconciliation view). | Pass |
| [Cup mode without cupId](#locked-decisions) | All diagrams | Invalid/missing `cupId` redirect to List cups is **not** diagrammed. Spec requires redirect or empty state — gap in diagrams only. | Advisory |
| SessionNav **Lots** phase gating | `view-navigation.mmd` NAV_LOTS, [Shared chrome](./README.md#sessionnav-bottom-bar) | Diagram and README show **Lots** whenever SessionNav is visible (`counting` onward). Spec organizer workflow is `organizing` phase only ([Entry & exit](#entry--exit)). Tapping **Lots** during `counting` or `reconciling` is undefined in this spec. | **Blocking** |

## Open questions

- Can workers re-run **Split list** after workers have started (or after partial progress)?
- May an organizer **Delete** lots that are on another worker's pick list, or only their own assigned lines?
- **Dave (blocking):** Should SessionNav **Lots** be hidden or disabled outside `organizing` (and optionally `updating_inventory`), or may workers open organizer mode early with an empty/guarded state?
- **Dave:** When `mode=cup` is missing `cupId`, prefer hard redirect to List cups vs inline empty state with guidance?
