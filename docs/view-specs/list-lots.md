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
| **SessionNav Lots** | **Always visible** whenever SessionNav is shown (after session create/join through `updating_inventory`). Tapping **Lots** navigates to `?mode=organizer`. Before `organizing`, show a simple empty/helper state — no split/status actions. See [session-nav-by-view.md](../session-nav-by-view.md). |
| **Split list** | Any joined worker may run **once per session** when `phase === 'organizing'` and `pickListSplit === false`. After first successful split, **Split list** is **not shown** — no re-split for MVP. |
| **Organizer Delete** | **Delete** only on lots **assigned to the current worker** in organizer mode. Cup mode: **Delete** any lot in that cup. |
| **Return to reconciling** | If a count error surfaces during organizing, any joined worker may advance phase **`organizing` → `reconciling`** (session lead typically; [process-roles.md](../process-roles.md)) — pick-list **Moved** / **New loc** checks and split assignments **preserved** (no rollback) |
| **Mark entire list complete** | **Disabled** until every assigned line is **Moved to storage** or **Needs new location** (no `pending` lines) |
| **Declare ready to import** | Visible in `organizing`; **disabled** until every joined worker has marked their list complete; advances session to `updating_inventory` via `POST …/sessions/:id/phase` |
| Storage location column | **Required** in organizer mode — show part-out **Remarks** / storage location per line (Product Spec scenario 10; Unit 3) |
| Page heading | Mode-specific: **Lots in cup** (cup) or **Organizer pick list** (organizer); no duplicate inner table title |
| **Organizer empty state (before / after organizing)** | Phase-specific helper only — no split/status actions. See [Empty states — organizer guard](#empty-states). |
| Cup mode without `cupId` | **Missing `cupId`:** immediate redirect to `/session/:sessionId/cups`. **Invalid `cupId`:** after `GET …/cups`, if id not in response, redirect to `/cups` (avoids flash on typos while loading). Never list all session lots. |

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

SessionNav **Lots** is **always visible** whenever SessionNav is shown ([session-nav-by-view.md](../session-nav-by-view.md)). Full organizer workflow (split, status buttons, **Declare ready to import**) runs in `organizing` only — earlier phases show a guarded empty state on this route.

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
| Organizer: **Split list** | Visible when `mode=organizer`, `phase === 'organizing'`, and `pickListSplit === false`; hidden permanently after first split |
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
| cup | **Edit**, **Delete** (any lot in cup) |
| organizer | **Edit**, **Delete** (assigned lots only), **Moved**, **New loc**, **Open cup** |

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

#### Organizer guard (`mode=organizer`, `phase` ≠ `organizing`)

Page heading stays **Organizer pick list**. Show helper only — **no** table, **no** Split / status / Declare buttons. Worker uses SessionNav **Reconcile** (or **Export** flow) per phase.

| `phase` | Helper copy (`data-testid="organizer-phase-guard"`) |
|---------|-----------------------------------------------------|
| `counting` | Organizer pick lists start after you compare counts with the part-out list. Open **Reconcile** when counting is done. |
| `reconciling` | Pick lists open after reconciliation is complete. Finish on **Reconcile**, then declare ready to organize. |
| `updating_inventory` | Organizing is complete. Open **Reconcile** to **export** your Bricklink update. |

#### Organizer workflow (`phase === 'organizing'`)

| Situation | Behavior |
|-----------|----------|
| Pick list not split | **Split list** button visible; table empty until split runs |
| Worker has zero assigned lines after split | Empty table — **No lots assigned to you** (`data-testid="organizer-empty-assigned"`) |

#### Cup mode

| Situation | Behavior |
|-----------|----------|
| `cupId` query **absent** | Immediate `replace` to `/session/:sessionId/cups` |
| `cupId` present but **not** in `GET …/cups` | After cups load, `replace` to `/session/:sessionId/cups` |
| Valid `cupId` | Cup-filtered lot table |

## Messages & feedback

| Message | Type | Trigger |
|---------|------|---------|
| Delete lot? / description | Dialog | Delete → confirm |
| Status badge | Badge per row | Organizer mode |
| Organizer pick lists start after… / Pick lists open after… / Organizing is complete… | Helper text | Organizer guard by phase — see [Empty states](#empty-states) |
| No lots assigned to you | Empty hint | Organizer mode; worker has zero lines after split |

No toast on status change or list complete.

**Fixture-only (Unit 0):** `Mode: {mode}` subtitle and `data-testid="lots-mode"` — remove before production; not listed as product copy.

## User actions

| Action | Preconditions | Outcome |
|--------|---------------|---------|
| Split list | Organizer mode; `phase === 'organizing'`; `pickListSplit === false` | Evenly divides lots across **current** joined workers (round-robin by part id sorted); sets `pickListSplit`; button never shown again this session |
| Edit | cup or organizer row (organizer: assigned to current worker) | Navigate to Lot form |
| Delete → confirm | Cup mode: any lot in cup. Organizer mode: **current worker's assigned lot only** | Removes lot and associated pick-list items |
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
| Cups (cup mode validation) | `GET /api/v1/sessions/:id/cups` | Confirm `cupId` exists before listing lots; redirect `/cups` if missing or absent |
| Lots (cup mode) | `GET /api/v1/sessions/:id/lots?cupId=` | Filtered to cup; `cupId` required |
| Pick list (organizer) | `GET /api/v1/sessions/:id/lots?mode=organizer&workerId=` | Worker's assigned lots + status + location |
| Session | `GET /api/v1/sessions/:id` | `pickListSplit` flag, phase |

### Write

| Operation | Endpoint (live) | Notes |
|-----------|-----------------|-------|
| Split pick list | `POST /api/v1/sessions/:id/pick-lists/split` | Even distribution among current workers — **once per session** (`pickListSplit` must be false) |
| Update pick status | `PATCH /api/v1/sessions/:id/pick-lists/:itemId` | `{ status: "moved_to_storage" \| "needs_new_location" }` |
| Complete list | `POST /api/v1/sessions/:id/pick-lists/complete` | Per worker |
| Delete lot | `DELETE /api/v1/sessions/:id/lots/:lotId` | Cup mode: any lot in cup. Organizer: **403** if not on current worker's pick list |

WebSocket: `pick_list.updated` refreshes organizer rows ([tech spec](../../feature/part-out-coordinator/tech-spec.md)).

## Acceptance criteria

### Cup mode

- [ ] Shows only lots in the selected cup (`cupId` required)
- [ ] Invalid/missing `cupId` redirects to **List cups** (missing: immediate; invalid: after `GET …/cups`); does not list all session lots
- [ ] Organizer guard copy shown in `counting`, `reconciling`, and `updating_inventory` with phase-specific **Reconcile** / **export** guidance
- [ ] **Split list** runs once per session; button hidden after `pickListSplit`
- [ ] Organizer **Delete** only on current worker's assigned lines; cup mode **Delete** any lot in cup
- [ ] Page heading reads **Lots in cup**
- [ ] Edit opens Lot form for that lot
- [ ] Delete removes lot after confirmation

### Organizer mode

- [ ] Page heading reads **Organizer pick list**
- [ ] **Split list** runs **at most once** per session; button hidden after `pickListSplit`
- [ ] Worker's list ordered by part id; only assigned lots visible
- [ ] **Delete** in organizer mode only on **current worker's** assigned lots; cup mode delete any lot in cup
- [ ] Invalid/missing `cupId` in cup mode redirects to **List cups**
- [ ] **Location** column shows storage hint from part-out Remarks
- [ ] **Moved** and **New loc** update status badges
- [ ] **Edit**, **Delete**, and **Open cup** work on assigned lots (Delete: own assignments only)
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
| `organizer-phase-guard` | Phase guard helper (organizer mode, not yet `organizing`) |
| `organizer-empty-assigned` | No lots assigned empty state |

## Spec–diagram review (2026-06-12)

| Spec section | Diagram | Finding | Severity |
|--------------|---------|---------|----------|
| [Modes](#modes) cup entry | `cup-tap-routing.mmd` → `view-navigation.mmd` | `lotCount ≥ 2` → `?mode=cup&cupId=` and Edit → Lot form match [Entry & exit](#entry--exit). | Pass |
| [Purpose](#purpose) — no reconciliation mode | `reconciliation-workflow.mmd` | Reconciliation is a separate route; no `mode=reconciliation` on List lots. Aligns. | Pass |
| Cup mode back navigation | `view-navigation.mmd` | `LOTS_CUP → CUPS` matches spec back / SessionNav **Cups** row. | Pass |
| Organizer **Open cup** | `view-navigation.mmd`, `workflow-storyboard.mmd` | `LOTS_ORG → LOTS_CUP` edge present; matches [Where actions navigate](#where-actions-navigate). | Pass |
| **Declare ready to import** | `workflow-storyboard.mmd` | `LOTS_ORG → STORE_UPDATE` in `updating_inventory` phase matches spec outcome (XML export on reconciliation view). | Pass |
| [Cup mode without cupId](#locked-decisions) | All diagrams | Invalid/missing `cupId` redirect to List cups is **not** diagrammed. Spec requires redirect or empty state — gap in diagrams only. | Advisory |
| SessionNav **Lots** phase gating | [session-nav-by-view.md](../session-nav-by-view.md), `view-navigation.mmd` | **Lots** always when nav shown; guarded empty state before `organizing`. | **Resolved** — Dave 2026-06-12 |

## Open questions

- None at this time.

**Resolved (Dave 2026-06-12):**

| Topic | Decision |
|-------|----------|
| Organizer guard copy | Phase-specific (B): **Reconcile** in `counting` / `reconciling`; **export** in `updating_inventory` — [Empty states](#empty-states) |
| **Split list** | Once per session (A); no re-run |
| Organizer **Delete** | Own assigned lines only; cup mode any lot in cup (A) |
| Missing / invalid `cupId` | Redirect `/cups` (A); validate invalid id after `GET …/cups` |
| **SessionNav Lots** | Always visible when nav shown |
