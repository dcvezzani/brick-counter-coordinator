# List lots

**Status:** Draft — for Dave review  
**Last updated:** 2026-06-11

---

## Overview

| Field | Value |
|-------|-------|
| **View name** | List lots |
| **Route** | `/session/:sessionId/lots` |
| **Route params** | `sessionId` |
| **Query params** | `mode` (default `cup`); `cupId` (cup mode) |
| **Primary actor(s)** | Counter (cup mode) / Organizer (organizer mode) |
| **Delivery unit** | 0 (fixture) → 2 (cup) / 3 (organizer) |
| **Source file** | [`src/views/ListLotsView.vue`](../../src/views/ListLotsView.vue) |
| **Table component** | [`LotListTable.vue`](../../src/components/LotListTable.vue) |

## Related docs

- [Product Spec — Application views](../../feature/part-out-coordinator/product-spec.md#application-views)
- [Product Spec — View naming note (three contexts)](../../feature/part-out-coordinator/product-spec.md#view-naming-note)
- [Product Spec — Scenario 8: Organize](../../feature/part-out-coordinator/product-spec.md#key-scenarios)
- [Planned views & services — List lots](../support/planned-views-services.md)
- [Storyboard walkthrough § 6. List lots](../support/storyboard.md#6-list-lots)
- [Shared chrome](./README.md#shared-chrome)

## Purpose

One list UI serves three product contexts via `mode` query parameter. Workers and organizers see lots filtered to their task: pick a lot from a multi-lot cup, work an organizer pick list, or (via query) reconciliation discrepancies.

> **Note:** Dedicated **Part-out reconciliation** view also hosts discrepancy UI. Reconciliation `mode` on this route exists in code but primary product path is the reconciliation view.

## Modes

| Mode | Query | Title | Primary actor | Reached from |
|------|-------|-------|---------------|--------------|
| **cup** | `?mode=cup&cupId={id}` | Lots in cup | Counter | List cups (multi-lot cup) |
| **organizer** | `?mode=organizer` | Organizer pick list | Organizer | SessionNav **Lots** |
| **reconciliation** | `?mode=reconciliation` | Discrepancies | Lead | Code path; prefer Reconciliation view |

## Entry & exit

### How users arrive

| From | Path / action |
|------|---------------|
| List cups → multi-lot cup | `?mode=cup&cupId={cupId}` |
| SessionNav **Lots** | `?mode=organizer` |
| Direct / legacy | `?mode=reconciliation` |

### Where actions navigate

| Action | Destination |
|--------|-------------|
| **Edit** (table) | `/session/:sessionId/lot/:lotId` |
| Delete confirm | Stays on list (lot removed) |
| Print | Browser print dialog (organizer) |

## Layout & controls

### View shell

| Element | Copy / behavior |
|---------|-----------------|
| Page heading | List lots |
| Mode indicator | Mode: {mode} |
| Organizer: **Split list** | Visible when `mode=organizer` and pick list not yet split |
| Organizer: **Print** | Triggers `window.print()` |
| Organizer: **Mark entire list complete** | Marks current worker's pick list complete |

### Lot list table (shared)

| Mode | Table title | Columns |
|------|-------------|---------|
| cup | Lots in cup | Part, Color, Qty, Actions |
| organizer | Organizer pick list | Part, Color, Qty, Status, Actions |
| reconciliation | Discrepancies | Part, Color, Expected, Counted, Actions |

### Row actions

| Mode | Actions |
|------|---------|
| cup / organizer | **Edit**, **Delete** |
| organizer | **Moved**, **New loc** (status updates) |
| reconciliation | **Resolve** (when unresolved) |

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

## Messages & feedback

| Message | Type | Trigger |
|---------|------|---------|
| Mode: {mode} | Subtitle | Always |
| Delete lot? / description | Dialog | Delete → confirm |
| Status badge | Badge per row | Organizer mode |

No toast on status change or list complete.

## User actions

| Action | Preconditions | Outcome |
|--------|---------------|---------|
| Split list | Organizer mode; not yet split | Evenly divides lots across workers; creates pick-list items |
| Edit | Any non-reconciliation row | Navigate to Lot form |
| Delete → confirm | cup or organizer | Removes lot and associated pick-list items |
| Moved / New loc | Organizer mode | Updates pick-list item status |
| Print | Organizer mode | Opens print dialog; hides nav/actions via print CSS |
| Mark entire list complete | Organizer mode | Marks worker's pick list complete |

### Organizer requirements (product)

- Lots split evenly across workers
- Ordered by part id
- Each worker sees only their assigned lots
- **Mark entire list complete** when every line is moved or needs new location

## Data requirements

### Read

| Field / entity | Source (live) | Notes |
|----------------|---------------|-------|
| Lots (cup mode) | `GET …/lots?cupId=` | Filtered to cup |
| Pick list (organizer) | `GET …/pick-list?workerId=` | Worker's assigned lots + status |
| Session | `GET …/sessions/:id` | `pickListSplit` flag |

### Write

| Operation | Endpoint (live) | Notes |
|-----------|-----------------|-------|
| Split pick list | `POST …/pick-list/split` | Even distribution |
| Update pick status | `PATCH …/pick-list/items/:id` | moved / needs location |
| Complete list | `POST …/pick-list/complete` | Per worker |
| Delete lot | `DELETE …/lots/:lotId` | |

## Acceptance criteria

### Cup mode

- [ ] Shows only lots in the selected cup
- [ ] Edit opens Lot form for that lot
- [ ] Delete removes lot after confirmation

### Organizer mode

- [ ] **Split list** divides lots evenly across workers (once per session)
- [ ] Worker's list ordered by part id
- [ ] **Moved** and **New loc** update status badges
- [ ] **Edit** and **Delete** work on assigned lots
- [ ] **Print** produces a printable pick list
- [ ] **Mark entire list complete** available for current worker

### General

- [ ] SessionNav **Lots** opens organizer mode
- [ ] Multi-lot cup navigation from List cups lands in cup mode with correct filter

## Storyboard status

### Implemented (Unit 0)

- All three modes in one view + shared `LotListTable`
- Split list, status buttons, print, mark complete
- Delete confirmation dialog
- Fixture in-memory pick-list and lot mutations

### Gaps (Units 1–4)

- No **Add another lot** button on this view (product spec mentions it — use SessionNav Lot or List cups)
- No **open associated cup** action (navigate to cup-filtered list from organizer row)
- Reconciliation mode duplicated by dedicated Reconciliation view
- No live pick-list persistence or WebSocket updates
- Print layout not styled for production

### `data-testid` inventory

| Test id | Element |
|---------|---------|
| `list-lots-view` | Page container |
| `lots-mode` | Mode indicator |
| `split-pick-list` | Split list button |
| `mark-complete` | Mark entire list complete |
| `delete-lot-dialog` | Delete dialog |
| `delete-lot-cancel` | Cancel delete |
| `delete-lot-confirm` | Confirm delete |
| `lot-list-table` | Table root |
| `lot-edit` | Edit row action |
| `lot-delete` | Delete row action |

## Open questions

- Add explicit **Add lot** and **Open cup** actions per product spec?
- Can lead re-split after workers start?
- List complete: require all lines non-pending, or honor partial complete?
- Remove reconciliation `mode` from this route in favor of Reconciliation view only?
