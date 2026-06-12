# Part-out reconciliation

**Status:** Draft — for Dave review  
**Last updated:** 2026-06-12 (Dave product decisions — full reconciliation open-question pass)

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

## Diagrams

| Diagram | Role |
|---------|------|
| [reconciliation-workflow.mmd](../diagrams/reconciliation-workflow.mmd) | Reconciling phase: tabs, Edit, Resolve, Declare ready to organize |
| [store-inventory-update.mmd](../diagrams/store-inventory-update.mmd) | Updating_inventory phase: export XML, dialog, manual Bricklink handoff |
| [session-phases-state.mmd](../diagrams/session-phases-state.mmd) | Full session lifecycle and post-join routes |
| [view-navigation.mmd](../diagrams/view-navigation.mmd) | SessionNav **Reconcile**, Edit → Lot form |
| [workflow-storyboard.mmd](../diagrams/workflow-storyboard.mmd) | End-to-end storyboard including export after organizer complete |

## Purpose

Compare session counted totals against **included** part-out lines (post-import curation). Workers fix counts via **Lot form** and **Resolve** rows when agreed. After organizer lists complete, workers export Bricklink bulk-update XML in the **`updating_inventory`** phase. Live upload to Bricklink is out of scope — export + manual paste/upload.

## Locked decisions

| Topic | Decision |
|-------|----------|
| **Declare ready to organize** | Visible in `reconciling`; enabled when **every reconciliation row** has `resolved === true` (explicit **Resolve** on each line — including matching rows); advances to `organizing` via `POST …/sessions/:id/phase` |
| **Reconciled — export XML** | Visible in `updating_inventory` only; generates bulk-update XML and opens export dialog — **does not** advance phase |
| **Mark session complete** | Visible in `updating_inventory` after at least one successful export this session; `POST …/sessions/:id/phase` → `closed` — separate from export so workers finish manual Bricklink steps first |
| **Resolve** | **Sign-off** — worker explicitly acknowledges the row (counts match or accept difference and move on). Required on **every** line before **Declare ready to organize**; does **not** silently overwrite session lot quantities |
| **Unexpected counts** | Session lots for part/color **not** on the included part-out list appear as reconciliation rows with `qtyExpected = 0`; worker must **Resolve** each (same as any open row) |
| **Return to reconciling from organizing** | If a count error surfaces during organizing, lead may advance phase **`organizing` → `reconciling`** via `POST …/sessions/:id/phase` — **no rollback** of organizer pick-list progress; **Moved** / **New loc** checks remain when session returns to `organizing` |
| **Lot fixes** | Workers correct counts via **Edit** → **Lot form** separately from Resolve |
| **Table scope** | **Tabs:** **Discrepancies** (rows with `!resolved`, default) and **All lines** (full comparison: included part-out lines **plus** unexpected-count rows). When every row is resolved, Discrepancies tab shows success/empty state; **All lines** tab always available |
| **Table row UX** | Match [part-out-import.md](./part-out-import.md): **Thumbnail**, **Part** (id + description), Color, Cond, Expected, Counted, Delta, Actions — thumbnails **100×100 px**, 1:1, `object-fit: contain` |
| **Who can act** | **Any joined worker** may **Edit**, **Resolve**, **Reconciled — export XML**, and **Mark session complete** (session lead typically orchestrates) |
| **SessionNav Reconcile** | **Hidden** during `counting`, `importing`, and `organizing`; visible only in `reconciling` and `updating_inventory` (see [Shared chrome](./README.md#sessionnav-bottom-bar)) |
| **Dedicated route** | Reconciliation is **not** a `mode` on [List lots](./list-lots.md) — shared `LotListTable` component only |
| **Validation URL** | MVP fixed: `https://www.bricklink.com/invXML.asp#update` |
| **Page heading** | **Part-out reconciliation** only — no duplicate inner table `<h2>` (tab label carries context) |
| **`resolved` (reconciliation row)** | Explicit worker sign-off. Open row = `!resolved`. Matching included lines (`delta === 0`) still require **Resolve** before **Declare ready to organize**. No separate `qtyAgreed` for MVP |
| **Export warnings** | When `export-xml` returns `warnings` (e.g. rows skipped without `bricklink_lot_id`), show an **inline alert** on this view (persists until dismissed or next export) |
| **`closed` phase routing** | Session routes (including `/reconciliation`) **redirect to Home** — no read-only reconciliation audit view for MVP |

## Session phase & navigation

| Phase | Intended use of this view |
|-------|---------------------------|
| `counting` | SessionNav **Reconcile** **hidden** — reconcile work starts after lead advances to `reconciling` |
| `reconciling` | Resolve discrepancies (Edit + Resolve); **Declare ready to organize** when all cleared |
| `organizing` | SessionNav **Reconcile** **hidden** — reconciliation completed via **Declare ready to organize** gate; primary work on [List lots](./list-lots.md) organizer mode |
| `updating_inventory` | **Reconciled — export XML** then **Mark session complete** — download + Bricklink validation handoff; phase stays `updating_inventory` until **Mark session complete** |
| `closed` | Session routes redirect to [Home](./home.md) |

**Phase transitions (live):**

| Transition | Trigger |
|------------|---------|
| `counting` → `reconciling` | Lead `POST /api/v1/sessions/:id/phase` when counting is done |
| `organizing` → `reconciling` | Count error discovered during organizing — `POST …/sessions/:id/phase`; organizer pick-list progress **preserved** (see [list-lots.md](./list-lots.md)) |
| `reconciling` → `organizing` | **Declare ready to organize** when every row `resolved === true` |
| `organizing` → `updating_inventory` | **Declare ready to import** on [List lots](./list-lots.md) when all organizer lists complete |
| `updating_inventory` → `closed` | **Mark session complete** (`POST …/sessions/:id/phase`) — only after worker has exported XML and finished manual Bricklink verify/submit outside the app |

Post-join routing: [home.md](./home.md#post-join-routing) (`reconciling` and `updating_inventory` → this view).

SessionNav **Reconcile** is phase-gated: hidden during `importing`, `counting`, and `organizing`; visible only in `reconciling` and `updating_inventory` (see [Shared chrome](./README.md#sessionnav-bottom-bar)). Unit 0 fixture may show nav regardless — target behavior is phase-gated.

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
| Tab | **Discrepancies** — default; rows where `!resolved` |
| Tab | **All lines** — every included part-out line plus unexpected-count rows |
| Discrepancy alert | {n} discrepancy / {n} discrepancies found — when Discrepancies tab has open (`!resolved`) rows |
| Match celebratory alert | e.g. Your counts match the official part-out list! — when every **included** part-out line has `delta === 0` but one or more rows still need **Resolve** |
| Discrepancies empty state | e.g. All lines resolved — when every row `resolved === true` |
| Export warnings alert | Inline alert listing `warnings` from last export (e.g. skipped rows without `bricklink_lot_id`) |
| Table columns | Thumbnail, Part (id + description), Color, Cond, Expected, Counted, Delta, Actions |
| Row actions | **Edit**, **Resolve** (when `!resolved`) |
| Primary button (`reconciling`) | **Declare ready to organize** — disabled while any row `!resolved` |
| Primary button (`updating_inventory`) | **Reconciled — export XML** · **Mark session complete** (secondary until export succeeded this session; then primary closeout) |
| Primary button (`counting`, `closed`) | **None** — no **Declare ready to organize**, **Reconciled — export XML**, or **Mark session complete** outside their phases |
| SessionNav **Cups** | Hidden in `updating_inventory` and `closed` (see [list-cups.md](./list-cups.md#overview)); visible in `counting`, `reconciling`, `organizing` |

No separate table `<h2>` — tab labels and page heading provide context.

#### Part column

| Aspect | Spec |
|--------|------|
| Content | **Part id** primary (e.g. `3001`) + **description** secondary (BrickLink label) — same pattern as [part-out-import.md — Part column](./part-out-import.md#part-column) |
| Layout | Stacked or two-line cell; truncate description on narrow viewports |

#### Thumbnail

| Aspect | Spec |
|--------|------|
| Content | Small LEGO part image for the row's part + color |
| Size | **100×100 px** cell, **1:1** ratio; image `object-fit: contain` (aligned with [part-out-import.md — Thumbnail](./part-out-import.md#thumbnail)) |
| Placement | Leading data column after tab chrome |
| Data source | `thumbnailUrl` on reconciliation row payload when available |

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
| {n} discrepancy found | Alert (singular) | One open (`!resolved`) row on Discrepancies tab |
| {n} discrepancies found | Alert (plural) | Multiple open rows |
| Your counts match the official part-out list! | Success/celebratory alert | All included part-out lines have `delta === 0`; at least one row still `!resolved` |
| All lines resolved | Empty/success | Discrepancies tab; every row `resolved === true` |
| Export warning(s) | Inline alert | After export when response includes `warnings` |
| Bulk update XML ready | Dialog title | After **Reconciled — export XML** |
| Download the XML and paste it into Bricklink bulk update validation. | Dialog description | Export dialog open |

**Resolve** does not show a confirmation toast — row updates per tab rules.

## User actions

| Action | Preconditions | Outcome |
|--------|---------------|---------|
| Review Discrepancies tab | — | Rows where `!resolved` |
| Review All lines tab | — | Included part-out lines plus unexpected-count rows |
| Edit row | Row has associated session lot (or worker adds lot via Lot form) | Navigate to Lot form to adjust counts |
| Resolve row | `!resolved` | Sets `resolved: true`; row leaves Discrepancies tab |
| Declare ready to organize | `phase === 'reconciling'`; every row `resolved === true` | `POST …/sessions/:id/phase` → `organizing` |
| Return to reconciling | `phase === 'organizing'`; count error discovered | `POST …/sessions/:id/phase` → `reconciling`; organizer progress preserved |
| Reconciled — export XML | `phase === 'updating_inventory'` | `POST …/reconciliation/export-xml` — XML + `validationUrl`; opens export dialog; **phase unchanged** |
| Mark session complete | `phase === 'updating_inventory'`; export succeeded at least once this session | `POST …/sessions/:id/phase` → `closed` |
| Download XML | Export dialog open | Downloads `{setNumber}-bulk-update.xml` |
| Open Bricklink validation page | Export dialog open | Opens validation URL in new tab |

### Reconciliation rules (product)

- Compare **included** part-out lines to session lot totals (part + color + condition)
- **Unexpected counts:** session lots whose part/color/condition are **not** on the included list appear as rows with `qtyExpected = 0`; worker **Resolve**s each
- Row key: `partId` + `colorId` + `condition`
- `qtyExpected` from part-out line (or `0` for unexpected-count rows); `qtyCounted` = sum of matching session lots; `delta` = counted − expected
- Open row = `!resolved` — explicit **Resolve** required on every line (including `delta === 0`) before **Declare ready to organize**
- Workers fix physical counts on **Lot form**; **Resolve** = sign-off that the row is agreed
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
| Phase after export | Unchanged (`updating_inventory`) |
| Session close | **Mark session complete** → `POST …/sessions/:id/phase` → `closed` |

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
| Export XML | `POST /api/v1/sessions/:id/reconciliation/export-xml` | Returns XML + validation URL only — **does not** change phase |
| Mark session complete | `POST /api/v1/sessions/:id/phase` | `updating_inventory` → `closed` (requires prior export this session — server-enforced) |
| Advance phase | `POST /api/v1/sessions/:id/phase` | `counting` → `reconciling`; `reconciling` → `organizing`; `organizing` → `updating_inventory`; `organizing` → `reconciling` (return without organizer rollback) |

WebSocket: `lot.updated` refreshes `qtyCounted` on open rows; `session.phase` updates nav.

## Acceptance criteria

- [ ] Included part-out lines compared to session lot totals (part + color + condition)
- [ ] **Discrepancies** tab shows `!resolved` rows; **All lines** includes unexpected-count rows (`qtyExpected = 0`)
- [ ] Celebratory alert when all included lines match (`delta === 0`) but rows still need **Resolve**
- [ ] **Resolve** available when `!resolved` (including matching rows); **Declare ready to organize** disabled until every row resolved
- [ ] Unexpected-count rows (lots not on included list) shown and require **Resolve**
- [ ] Export `warnings` shown as inline alert on view
- [ ] **`closed`** session routes redirect to Home
- [ ] **`organizing` → `reconciling`** preserves organizer pick-list progress (Moved / New loc checks)
- [ ] **Edit** opens Lot form for count corrections
- [ ] Alert shows open row count when Discrepancies tab has `!resolved` rows
- [ ] SessionNav **Reconcile** hidden during `counting`, `importing`, and `organizing`; visible only in `reconciling` and `updating_inventory`
- [ ] Rows show **thumbnail** + part id + description (parity with part-out import)
- [ ] Thumbnails **100×100 px**, 1:1, `object-fit: contain`
- [ ] **Reconciled — export XML** available only in `updating_inventory`; does **not** change phase
- [ ] Export generates downloadable XML with `bricklink_lot_id` as `<LOTID>` where present
- [ ] Export dialog links to Bricklink bulk update validation page
- [ ] **Mark session complete** advances session to `closed` after export (manual Bricklink steps outside app)
- [ ] Any joined worker can **Resolve** any open row (sign-off)
- [ ] Excluded part-out import lines omitted; unexpected session lots (not on included list) included with `qtyExpected = 0`
- [ ] Upload to Bricklink remains manual (no in-app submit)
- [ ] Reconciliation not reachable via `mode` on List lots route

## Storyboard status

### Implemented (Unit 0)

- Discrepancy table via shared `LotListTable` (single-table hybrid filter — no tabs yet)
- Per-row Resolve
- Fixture XML generation and download
- Validation URL: `https://www.bricklink.com/invXML.asp#update`
- **Declare ready to organize** when all discrepancies resolved (fixture)
- **Reconciled — export XML** in `updating_inventory` only; fixture may advance phase on export — target separates **Mark session complete**

### Gaps (Units 1–4)

- Part thumbnails and part id + description on rows
- **Mark session complete** button separate from export
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
| `mark-session-complete` | Mark session complete button (planned) |
| `lot-edit` | Edit row action (planned) |
| `lot-resolve` | Resolve row action (planned) |
| `export-dialog` | Export dialog content (planned) |
| `export-download` | Download XML button (planned) |
| `export-validation-link` | Open Bricklink validation page (planned) |
| `export-warnings-alert` | Export warnings inline alert (planned) |
| `reconciliation-match-celebration` | Celebratory alert when included lines all match (planned) |

## Spec–diagram review (2026-06-12)

| Spec section | Diagram | Finding | Severity |
|--------------|---------|---------|----------|
| [Phase transitions](#session-phase--navigation) `updating_inventory` → `closed` | `session-phases-state.mmd`, `store-inventory-update.mmd` | **Dave 2026-06-12:** Close on **Mark session complete**, not on export-xml; export + Bricklink remain manual outside app. Diagrams updated. | **Resolved** |
| [SessionNav Reconcile during `counting`](#locked-decisions) | `view-navigation.mmd`, `reconciliation-workflow.mmd` | **Hidden** until `reconciling`. | **Resolved** — Dave 2026-06-12 |
| [Locked decisions](#locked-decisions) Resolve = sign-off | `reconciliation-workflow.mmd` | **Dave 2026-06-12:** Resolve when `!resolved` (explicit sign-off on every line, including `delta === 0`); open row = `!resolved`. Diagram updated. | **Resolved** |
| [Layout](#layout--controls) Discrepancies / All lines tabs | `reconciliation-workflow.mmd` | Tabs, Edit → Lot form, Resolve → POST resolve, **Declare ready to organize** when cleared — align. | Pass |
| [Entry & exit](#entry--exit) Edit row | `view-navigation.mmd`, `workflow-storyboard.mmd` | `RECON → LOT_EDIT` and storyboard `RECON → Edit row → LOT` match. | Pass |
| Post-join routing | `view-navigation.mmd`, `session-phases-state.mmd` | Home join `reconciling` / `updating_inventory` → `/reconciliation` matches [home.md](./home.md#post-join-routing). | Pass |
| [Session phase table](#session-phase--navigation) `organizing` | `workflow-storyboard.mmd`, `view-navigation.mmd` | SessionNav **Reconcile** hidden during `organizing`; reconciliation completes before organizing via **Declare ready to organize**. Storyboard subgraph and nav diagram align. | **Resolved** — Dave 2026-06-12 |
| [Session phase table](#session-phase--navigation) `counting` preview | `reconciliation-workflow.mmd` | Reconcile nav hidden during `counting`. | **Resolved** — Dave 2026-06-12 |
| End-to-end flow | `workflow-storyboard.mmd` | `RECON → Declare ready to organize → LOTS_ORG`, `LOTS_ORG → Declare ready to import → STORE_UPDATE`, and **Mark session complete** → `closed` (export does not close) match Model C lifecycle. | Pass |
| SessionNav **Cups** in `updating_inventory` | `session-phases-state.mmd` | Note "SessionNav Cups hidden" aligns with [list-cups.md](./list-cups.md); reconciliation spec now cross-links. | Pass |
| Export dialog handoff | `store-inventory-update.mmd` | Was modeled as in-app mass-update confirmation; spec is download + open validation URL, then manual Bricklink steps. **Diagram updated.** | **Blocking** (resolved in diagram) |
| Tech spec `qtyAgreed` field | — | **Dave 2026-06-12:** Drop `qtyAgreed` for MVP; `resolved` is the sole sign-off flag (counts match or accept-as-is). Tech spec updated. | **Resolved** |
| Table columns Part / Thumbnail | [part-out-import.md](./part-out-import.md) | **Match import UX** — thumbnail + part id + description. | **Resolved** — Dave 2026-06-12 |

## Open questions

**All resolved (Dave 2026-06-12).** See [Locked decisions](#locked-decisions) for the full decision log, including:

- Manual **Mark session complete** (not auto-close on export)
- SessionNav **Reconcile** hidden in `counting`, `importing`, and `organizing`
- Table UX matches import; any joined worker; **`resolved` only** (no `qtyAgreed`)
- **Unexpected counts** shown as discrepancy rows (`qtyExpected = 0`); worker **Resolve**s each
- **Explicit Resolve** on every line before **Declare ready to organize**; celebratory alert when included lines all match
- **Late organizing discrepancy:** return to `reconciling` without organizer rollback; pick-list progress preserved
- Export **warnings** as inline alert
- **`closed`** session routes redirect to Home
