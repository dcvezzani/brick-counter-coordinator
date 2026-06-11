# Part-out import

**Status:** Draft — for Dave review  
**Last updated:** 2026-06-11

---

## Overview

| Field | Value |
|-------|-------|
| **View name** | Part-out import |
| **Route** | `/session/:sessionId/import` |
| **Route params** | `sessionId` |
| **Query params** | — |
| **Primary actor(s)** | Session lead |
| **Delivery unit** | 0 (fixture table) → 1 (live curation) |
| **Source file** | [`src/views/PartOutImportView.vue`](../../src/views/PartOutImportView.vue) |
| **Child component** | [`PartOutImportTable.vue`](../../src/components/PartOutImportTable.vue) |

## Related docs

- [Product Spec — Application views](../../feature/part-out-coordinator/product-spec.md#application-views)
- [Product Spec — Scenario 3: Curate import](../../feature/part-out-coordinator/product-spec.md#key-scenarios)
- [Planned views & services — Part-out import](../support/planned-views-services.md#3-part-out-import)
- [Storyboard walkthrough § 3. Part-out import](../support/storyboard.md#3-part-out-import)
- [Shared chrome](./README.md#shared-chrome)

## Purpose

Session lead reviews the server-fetched Bricklink part-out list and curates counting scope before workers begin. Most sessions confirm the full list unchanged; partial-bag sets may exclude out-of-scope lines per sweep.

## Entry & exit

### How users arrive

| From | Path / action |
|------|---------------|
| New session → submit | `/session/:sessionId/import` |
| Return to curate before counting (planned) | Same route while phase is `importing` |

### Where actions navigate

| Action | Destination |
|--------|-------------|
| **Confirm & begin counting** | `/session/:sessionId/cups` |
| SessionNav | Other session views (Cups, Lot, etc.) |

## Layout & controls

### View shell

| Element | Copy / behavior |
|---------|-----------------|
| Page heading | {session.name} |
| Helper text | Curate the fetched part-out list before counting begins. |
| Primary button | Confirm & begin counting |

### Part-out import table

| Element | Copy / behavior |
|---------|-----------------|
| Section heading | Part-out import |
| Tab | Included ({count}) |
| Tab | Excluded ({count}) |
| Bulk action | Exclude selected ({count}) — visible when rows checked |
| **Included table columns** | (checkbox), Part, Color, Cond, Qty, Remarks, Exclude |
| **Excluded table columns** | Part, Color, Qty, Remarks, Restore |
| Row action (included) | Exclude |
| Row action (excluded) | Restore |

## Messages & feedback

| Message | Type | Trigger |
|---------|------|---------|
| Curate the fetched part-out list before counting begins. | Helper text | Always |
| Tab counts Included (N) / Excluded (N) | Tab labels | Reflects current curation state |
| Fetch error / refetch (planned) | Alert + action | Live: part-out fetch failed or stale |

No confirmation dialog before **Confirm & begin counting**.

## User actions

| Action | Preconditions | Outcome |
|--------|---------------|---------|
| Exclude line | Line in Included tab | Line moves to Excluded; excluded from reconciliation scope |
| Restore line | Line in Excluded tab | Line returns to Included |
| Select rows + Exclude selected | One or more checkboxes in Included tab | Bulk exclude selected lines |
| Confirm & begin counting | At least zero included lines (no minimum enforced today) | Session phase → `counting`; navigate to List cups |

### Curation scenarios (product)

| Scenario | Lead behavior |
|----------|---------------|
| Brand-new sealed set | Confirm full list — all lines included |
| Loose brick purchase | Confirm full list — all lines included |
| Partial-bag / two-sweep | Exclude lines out of scope for this sweep; second session excludes the opposite subset |

## Data requirements

### Read

| Field / entity | Source (live) | Notes |
|----------------|---------------|-------|
| Session | `GET /api/v1/sessions/:id` | Phase, fetch status |
| Part-out lines | `GET /api/v1/sessions/:id/part-out/lines` | partId, colorId, condition, qtyExpected, remarks, excluded flag |

### Write

| Operation | Endpoint (live) | Notes |
|-----------|-----------------|-------|
| Exclude line | `PATCH …/part-out/lines/:lineId` `{ excluded: true }` | |
| Bulk exclude | `POST …/part-out/lines/bulk-exclude` | |
| Confirm import | `POST …/part-out/confirm` | Phase → `counting`; WebSocket `session.phase` |
| Refetch (planned) | `POST …/part-out/refetch` | On fetch failure |

## Acceptance criteria

- [ ] All fetched part-out lines visible with part, color, condition, qty, and Remarks
- [ ] Lead can exclude individual lines from the Included tab
- [ ] Lead can restore excluded lines from the Excluded tab
- [ ] Lead can bulk-exclude multiple selected lines
- [ ] Tab counts update when lines move between Included and Excluded
- [ ] **Confirm & begin counting** advances session to counting phase and opens List cups
- [ ] Excluded lines are omitted from reconciliation comparison (included lines only)
- [ ] Single-sweep workflow: confirm without exclusions works for new/loose sessions
- [ ] Two-sweep workflow: lead can exclude out-of-scope lines before confirm

## Storyboard status

### Implemented (Unit 0)

- Full included/excluded tabs with counts
- Per-row exclude/restore and bulk exclude
- Confirm advances phase and navigates to List cups
- Fixture in-memory line mutations

### Gaps (Units 1–4)

- No live part-out fetch or refetch-on-error
- No fetch status indicator on mount
- No guard preventing confirm with zero included lines (if product requires)
- No Remarks-driven filtering or search

### `data-testid` inventory

| Test id | Element |
|---------|---------|
| `part-out-import-view` | Page container |
| `confirm-import` | Confirm button |
| `part-out-import-table` | Table component root |
| `bulk-exclude` | Bulk exclude button |
| `tab-included` | Included tab |
| `tab-excluded` | Excluded tab |

## Open questions

- Minimum included lines required before confirm?
- Should excluded lines show condition column in Excluded tab (currently omitted)?
- Refetch UX when Bricklink fetch fails on create?
