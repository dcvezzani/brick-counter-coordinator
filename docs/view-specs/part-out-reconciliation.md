# Part-out reconciliation

**Status:** Draft — for Dave review  
**Last updated:** 2026-06-12

---

## Overview

| Field | Value |
|-------|-------|
| **View name** | Part-out reconciliation |
| **Route** | `/session/:sessionId/reconciliation` |
| **Route params** | `sessionId` |
| **Query params** | — |
| **Primary actor(s)** | Session lead (orchestrates); any joined worker (Resolve, Edit, Reconciled) |
| **Delivery unit** | 0 (fixture) → 4 (reconciliation + XML export) |
| **Source file** | [`src/views/ReconciliationView.vue`](../../src/views/ReconciliationView.vue) |
| **Table component** | [`LotListTable.vue`](../../src/components/LotListTable.vue) (`mode=reconciliation`) |

## Related docs

- [Product Spec — Application views](../../feature/part-out-coordinator/product-spec.md#application-views)
- [Product Spec — Scenarios 7–9: Reconcile / export](../../feature/part-out-coordinator/product-spec.md#key-scenarios)
- [Tech Spec — Reconciliation APIs](../../feature/part-out-coordinator/tech-spec.md)
- [Planned views & services — Reconciliation](../support/planned-views-services.md#7-part-out-reconciliation)
- [Storyboard walkthrough § 7. Part-out reconciliation](../support/storyboard.md#7-part-out-reconciliation)
- [Part-out import](./part-out-import.md) — source of **included** part-out lines
- [List lots](./list-lots.md) — shared `LotListTable`; reconciliation is **not** a mode on that route
- [Home — Post-join routing](./home.md#post-join-routing)
- [bricklink-mass-update-export.md](../bricklink-mass-update-export.md)
- [Shared chrome](./README.md#shared-chrome)

## Purpose

Compare session counted totals against **included** part-out lines (post-import curation). Workers fix counts via **Lot form** and **Resolve** rows when agreed. After organizer lists complete, workers export Bricklink bulk-update XML in the **`updating_inventory`** phase. Live upload to Bricklink is out of scope — export + manual paste/upload.

## Locked decisions

| Topic | Decision |
|-------|----------|
| **Declare ready to organize** | Visible in `reconciling`; enabled when every discrepancy is resolved; advances to `organizing` via `POST …/sessions/:id/phase` |
| **Reconciled — export XML** | Visible in `updating_inventory` only; generates bulk-update XML and advances to `closed` |
| **Resolve** | **Sign-off** — acknowledges the row is agreed; does **not** silently overwrite session lot quantities in live behavior |
| **Lot fixes** | Workers correct counts via **Edit** → **Lot form** separately from Resolve |
| **Table scope** | **Tabs:** **Discrepancies** (mismatches only, default) and **All lines** (full included-line comparison). When no mismatches remain, Discrepancies tab shows success/empty state; All lines tab always available |
| **Who can act** | **Any joined worker** may **Edit**, **Resolve**, and run **Reconciled** (session lead typically orchestrates) |
| **Dedicated route** | Reconciliation is **not** a `mode` on [List lots](./list-lots.md) — shared `LotListTable` component only |
| **Validation URL** | MVP fixed: `https://www.bricklink.com/invXML.asp#update` |
| **Page heading** | **Part-out reconciliation** only — no duplicate inner table `<h2>` (tab label carries context) |

## Session phase & navigation

| Phase | Intended use of this view |
|-------|---------------------------|
| `counting` | SessionNav **Reconcile** visible — preview/diff optional Unit 4+; primary reconcile work not expected until `reconciling` |
| `reconciling` | Resolve discrepancies (Edit + Resolve); **Declare ready to organize** when all cleared |
| `organizing` | View reachable via nav; primary work on [List lots](./list-lots.md) organizer mode |
| `updating_inventory` | **Reconciled — export XML** — download + Bricklink validation handoff |
| `closed` | Read-only or redirect Home (Unit 4+) |

**Phase transitions (live):**

| Transition | Trigger |
|------------|---------|
| `counting` → `reconciling` | Lead `POST /api/v1/sessions/:id/phase` when counting is done |
| `reconciling` → `organizing` | **Declare ready to organize** (`POST /api/v1/sessions/:id/phase`) when all discrepancies resolved |
| `organizing` → `updating_inventory` | **Declare ready to import** on [List lots](./list-lots.md) when all organizer lists complete |
| `updating_inventory` → `closed` | Successful **Reconciled — export XML** (`POST …/reconciliation/export-xml`) after Bricklink mass update |

Post-join routing: [home.md](./home.md#post-join-routing) (`reconciling` and `updating_inventory` → this view).

SessionNav **Reconcile** is visible whenever the route includes `sessionId` (see [Shared chrome](./README.md#sessionnav-bottom-bar)) — not phase-gated in Unit 0.

## Entry & exit

### How users arrive

| From | Path / action |
|------|---------------|
| SessionNav **Reconcile** | `/session/:sessionId/reconciliation` |
| Home join (`phase === 'reconciling'` or `updating_inventory`) | Same |
| Direct navigation | Same |

### Where actions navigate

| Action | Destination |
|--------|-------------|
| **Edit** (row) | `/session/:sessionId/lot/:lotId` for matching session lot (or Lot form to add/adjust count) |
| **Reconciled — export XML** | Stays on view; opens export dialog |
| Download / validation link | File download or new tab to Bricklink |

## Layout & controls

| Element | Copy / behavior |
|---------|-----------------|
| Page heading | Part-out reconciliation |
| Helper text | Compare session counts to included part-out lines. |
| Tab | **Discrepancies** — default; rows where `delta !== 0` and not resolved |
| Tab | **All lines** — every included part-out line with expected vs counted |
| Discrepancy alert | {n} discrepancy / {n} discrepancies found — when Discrepancies tab has open rows |
| Discrepancies empty state | e.g. All discrepancies resolved — when Discrepancies tab has no open rows |
| Table columns | Part, Color, Cond, Expected, Counted, Delta, Actions |
| Row actions | **Edit**, **Resolve** (when `delta !== 0 && !resolved`) |
| Primary button (`reconciling`) | **Declare ready to organize** — disabled while any open discrepancy remains |
| Primary button (`updating_inventory`) | **Reconciled — export XML** |

No separate table `<h2>` — tab labels and page heading provide context.

### Export dialog

| Element | Copy / behavior |
|---------|-----------------|
| Title | Bulk update XML ready |
| Description | Download the XML and paste it into Bricklink bulk update validation. |
| Button | Download XML — file `{setNumber}-bulk-update.xml` |
| Button | Open Bricklink validation page — new tab |

## Messages & feedback

| Message | Type | Trigger |
|---------|------|---------|
| Compare session counts to included part-out lines. | Helper text | Always |
| {n} discrepancy found | Alert (singular) | One open discrepancy on Discrepancies tab |
| {n} discrepancies found | Alert (plural) | Multiple open discrepancies |
| All discrepancies resolved | Empty/success | Discrepancies tab; no open rows |
| Bulk update XML ready | Dialog title | After **Reconciled — export XML** |
| Download the XML and paste it into Bricklink bulk update validation. | Dialog description | Export dialog open |

**Resolve** does not show a confirmation toast — row updates per tab rules.

## User actions

| Action | Preconditions | Outcome |
|--------|---------------|---------|
| Review Discrepancies tab | — | Rows where counted ≠ expected and not resolved |
| Review All lines tab | — | Full included-line comparison |
| Edit row | Row has associated session lot (or worker adds lot via Lot form) | Navigate to Lot form to adjust counts |
| Resolve row | `delta !== 0 && !resolved` | Marks line resolved (sign-off); row leaves Discrepancies tab when counts align or resolved flag set |
| Declare ready to organize | `phase === 'reconciling'`; no open discrepancies | `POST …/sessions/:id/phase` → `organizing` |
| Reconciled — export XML | `phase === 'updating_inventory'` | `POST …/reconciliation/export-xml` — XML + `validationUrl`; phase → `closed`; opens export dialog |
| Download XML | Export dialog open | Downloads `{setNumber}-bulk-update.xml` |
| Open Bricklink validation page | Export dialog open | Opens validation URL in new tab |

### Reconciliation rules (product)

- Compare against **included** part-out lines only ([part-out-import.md](./part-out-import.md))
- Row key: `partId` + `colorId` + `condition`
- `qtyExpected` from part-out line; `qtyCounted` = sum of matching session lots; `delta` = counted − expected
- Workers fix physical counts on **Lot form**; **Resolve** = lead/worker sign-off that the row is agreed
- Export produces bulk-update XML compatible with Bricklink validation tool

## Export contract

See [bricklink-mass-update-export.md](../bricklink-mass-update-export.md).

| Field | Value |
|-------|-------|
| Endpoint | `POST /api/v1/sessions/:id/reconciliation/export-xml` |
| Response | `{ xml, validationUrl, byteSize?, warnings? }` |
| `validationUrl` | `https://www.bricklink.com/invXML.asp#update` |
| `<LOTID>` | `bricklink_lot_id` from part-out fetch — **skip** rows without it (surface in `warnings`) |
| MVP tags | `<REMARKS>` per row from part-out Remarks |
| Phase after export | `closed` |

## Data requirements

### Read

| Field / entity | Source (live) | Notes |
|----------------|---------------|-------|
| Reconciliation rows | `GET /api/v1/sessions/:id/reconciliation` | `lineId`, `partId`, `colorId`, `condition`, `qtyExpected`, `qtyCounted`, `delta`, `resolved`, `bricklinkLotId`, `remarks` |
| Session | `GET /api/v1/sessions/:id` | `setNumber`, `phase` |

### Write

| Operation | Endpoint (live) | Notes |
|-----------|-----------------|-------|
| Resolve line | `POST /api/v1/sessions/:id/reconciliation/resolve` | Body: `{ lineId }` — sign-off; does not mutate lots |
| Export XML | `POST /api/v1/sessions/:id/reconciliation/export-xml` | Phase → `closed` (only in `updating_inventory`) |
| Advance phase | `POST /api/v1/sessions/:id/phase` | `counting` → `reconciling`; `reconciling` → `organizing`; `organizing` → `updating_inventory` |

WebSocket: `lot.updated` refreshes `qtyCounted` on open rows; `session.phase` updates nav.

## Acceptance criteria

- [ ] Included part-out lines compared to session lot totals (part + color + condition)
- [ ] **Discrepancies** tab shows mismatch rows only; **All lines** tab shows full comparison
- [ ] Discrepancies tab success/empty state when no open mismatches
- [ ] Alert shows open discrepancy count when Discrepancies tab has open rows
- [ ] **Edit** opens Lot form for count corrections
- [ ] Any joined worker can **Resolve** a discrepancy row (sign-off)
- [ ] **Declare ready to organize** disabled until all discrepancies resolved; advances to `organizing`
- [ ] **Reconciled — export XML** available only in `updating_inventory` phase
- [ ] Export generates downloadable XML with `bricklink_lot_id` as `<LOTID>` where present
- [ ] Export dialog links to Bricklink bulk update validation page
- [ ] Export advances session to `closed`
- [ ] Excluded import lines omitted from reconciliation
- [ ] Upload to Bricklink remains manual (no in-app submit)
- [ ] Reconciliation not reachable via `mode` on List lots route

## Storyboard status

### Implemented (Unit 0)

- Discrepancy table via shared `LotListTable` (single-table hybrid filter — no tabs yet)
- Per-row Resolve
- Fixture XML generation and download
- Validation URL: `https://www.bricklink.com/invXML.asp#update`
- **Declare ready to organize** when all discrepancies resolved (fixture)
- **Reconciled — export XML** in `updating_inventory` only; phase → `closed` on export (fixture)

### Gaps (Units 1–4)

- No **Edit** row action in reconciliation mode
- No **Discrepancies** / **All lines** tabs
- Fixture **Resolve** overwrites `qtyCounted` / `delta` without lot edits — not live behavior
- No live reconciliation API or XML shape validation against Bricklink
- No diff refresh when lots change (`lot.updated`)
- No lead **advance phase** UI (`counting` → `reconciling`)
- **Cond** / **Delta** columns not shown
- Inner table title **Discrepancies** duplicates page heading pattern
- Legacy `mode=reconciliation` on [ListLotsView.vue](../../src/views/ListLotsView.vue) — remove

### `data-testid` inventory

| Test id | Element |
|---------|---------|
| `reconciliation-view` | Page container |
| `reconciliation-tab-discrepancies` | Discrepancies tab (planned) |
| `reconciliation-tab-all-lines` | All lines tab (planned) |
| `reconciled` | Reconciled — export XML button |
| `lot-edit` | Edit row action (planned) |
| `lot-resolve` | Resolve row action (planned) |
| `export-dialog` | Export dialog content (planned) |
| `export-download` | Download XML button (planned) |
| `export-validation-link` | Open Bricklink validation page (planned) |
| `lot-list-table` | Table root |

## Open questions

- **Unexpected counts:** Session lots for part/color **not** on the included part-out list — show as discrepancy rows (expected 0) or omit for MVP?
- **SessionNav Reconcile during `counting`:** Allow navigate for preview, or hide/disable until lead advances to `reconciling`?
