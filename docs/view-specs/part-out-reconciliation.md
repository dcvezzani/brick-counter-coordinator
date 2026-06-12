# Part-out reconciliation

**Status:** Draft — for Dave review  
**Last updated:** 2026-06-12 (Dave MVP gap promotion + nav/toast/column decisions)

---

## Overview

| Field | Value |
|-------|-------|
| **View name** | Part-out reconciliation |
| **Route** | `/session/:sessionId/reconciliation` |
| **Route params** | `sessionId` |
| **Query params** | — |
| **Primary actor(s)** | Any joined worker (session lead typically orchestrates on the floor — [process-roles.md](../process-roles.md)) |
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
| **Return to reconciling from organizing** | If a count error surfaces during organizing, any joined worker may advance phase **`organizing` → `reconciling`** via `POST …/sessions/:id/phase` (session lead typically) — **no rollback** of organizer pick-list progress; **Moved** / **New loc** checks remain when session returns to `organizing` |
| **Lot fixes** | Workers correct counts via **Edit** → **Lot form** separately from Resolve |
| **Table scope** | **Tabs:** **Discrepancies** (rows with `!resolved`, default) and **All lines** (full comparison: included part-out lines **plus** unexpected-count rows). When every row is resolved, Discrepancies tab shows success/empty state; **All lines** tab always available |
| **Table row UX** | Match [part-out-import.md](./part-out-import.md): **Thumbnail**, **Part** (id + description), Color, Expected, Counted, **Delta**, Actions — thumbnails **100×100 px**, 1:1, `object-fit: contain`. **No Cond column** — session is New **or** Used (condition is session-scoped, not per row) |
| **Delta column** | On both tabs; **Delta = 0** styled muted/neutral |
| **Edit (unexpected count)** | Row with no session lot yet: **Edit** opens **new Lot form** pre-filled with part, color, and session condition |
| **Resolve after lot edit** | If `lot.updated` changes `qtyCounted`/`delta` on a row that was `resolved === true`, server clears `resolved` (row reopens) |
| **SessionNav Reconcile** | Visible from `counting` through `updating_inventory` — hidden only in `importing` and `closed` (see [Shared chrome](./README.md#sessionnav-bottom-bar)) |
| **Phase change toasts** | `session.phase` WebSocket event shows a toast on **every session view** (AppShell-level host); see [README — Toast notifications](./README.md#toast-notifications) |
| **Who can act** | **Any joined worker** may **Edit**, **Resolve**, **Reconciled — export XML**, and **Mark session complete** — no role check ([process-roles.md](../process-roles.md)) |
| **Dedicated route** | Reconciliation is **not** a `mode` on [List lots](./list-lots.md). Unit 4 `/build`: remove legacy `mode=reconciliation` from List lots and refactor `LotListTable` so reconciliation runs only on this route |
| **Validation URL** | MVP fixed: `https://www.bricklink.com/invXML.asp#update` |
| **Page heading** | **Part-out reconciliation** only — no duplicate inner table `<h2>` (tab label carries context) |
| **`resolved` (reconciliation row)** | Explicit worker sign-off. Open row = `!resolved`. Matching included lines (`delta === 0`) still require **Resolve** before **Declare ready to organize**. No separate `qtyAgreed` for MVP |
| **Export warnings** | When `export-xml` returns `warnings` (e.g. rows skipped without `bricklink_lot_id`), show an **inline alert** on this view (persists until dismissed or next export) |
| **`closed` phase routing** | Session routes (including `/reconciliation`) **redirect to Home** — no read-only reconciliation audit view for MVP |

## Session phase & navigation

| Phase | Intended use of this view |
|-------|---------------------------|
| `counting` | Live diff preview via SessionNav **Reconcile**; **Edit**/**Resolve**/**Declare ready to organize** disabled until `reconciling` |
| `reconciling` | Full reconcile workflow: **Edit**, **Resolve**, celebratory alert when included lines match; **Declare ready to organize** when every row resolved |
| `organizing` | Return via SessionNav **Reconcile**; **Return to reconciling** advances phase without organizer rollback; primary work remains [List lots](./list-lots.md) organizer mode |
| `updating_inventory` | **Reconciled — export XML** then **Mark session complete** |
| `closed` | Session routes redirect to [Home](./home.md) |

**Phase transitions (live):**

| Transition | Trigger |
|------------|---------|
| `counting` → `reconciling` | Any joined worker `POST /api/v1/sessions/:id/phase` when counting is done (session lead typically; no role check — [process-roles.md](../process-roles.md)) |
| `organizing` → `reconciling` | Count error discovered during organizing — any joined worker `POST …/sessions/:id/phase`; organizer pick-list progress **preserved** (see [list-lots.md](./list-lots.md)) |
| `reconciling` → `organizing` | **Declare ready to organize** when every row `resolved === true` |
| `organizing` → `updating_inventory` | **Declare ready to import** on [List lots](./list-lots.md) when all organizer lists complete |
| `updating_inventory` → `closed` | **Mark session complete** (`POST …/sessions/:id/phase`) — only after worker has exported XML and finished manual Bricklink verify/submit outside the app |

Post-join routing: [home.md](./home.md#post-join-routing) (`reconciling` and `updating_inventory` → this view).

SessionNav **Reconcile** is visible from `counting` through `updating_inventory` (hidden in `importing` and `closed`). Phase-specific buttons on this view remain gated as in [Layout & controls](#layout--controls). **`session.phase` changes** toast all joined workers on every session view (AppShell).

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
| **Edit** (row) | `/session/:sessionId/lot/:lotId` when lot exists; **new Lot form** (`/session/:sessionId/lot`) pre-filled with part, color, session condition when unexpected-count row has no lot |
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
| Match celebratory alert | e.g. Your counts match the official part-out list! — **`reconciling` phase only**; every **included** part-out line has `delta === 0` (lot totals match official list); shown on **Discrepancies** tab while any row still `!resolved` |
| Discrepancies empty state | e.g. All lines resolved — when every row `resolved === true` |
| Export warnings alert | Inline alert listing `warnings` from last export (e.g. skipped rows without `bricklink_lot_id`) |
| Table columns | Thumbnail, Part (id + description), Color, Expected, Counted, Delta, Actions |
| Row actions | **Edit**, **Resolve** (when `!resolved`; disabled outside `reconciling` except **Return to reconciling** path during `organizing`) |
| Primary button (`reconciling`) | **Declare ready to organize** — disabled while any row `!resolved` |
| Primary button (`organizing`) | **Return to reconciling** — `POST …/sessions/:id/phase` → `reconciling`; organizer pick-list progress preserved |
| Primary button (`updating_inventory`) | **Reconciled — export XML** · **Mark session complete** (disabled until at least one export this session) |
| Primary button (`counting`, `closed`) | **None** — no phase-advance or export buttons outside their phases |
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
| Your counts match the official part-out list! | Success/celebratory alert | `phase === 'reconciling'`; all included part-out lines `delta === 0`; at least one row still `!resolved` — **Discrepancies** tab |
| Session phase changed | Toast | `session.phase` WebSocket on any session view — e.g. “Session moved to reconciling” |
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
| Edit row | `phase === 'reconciling'` | Lot form — existing lot or new pre-filled (unexpected count) |
| Resolve row | `phase === 'reconciling'`; `!resolved` | Sets `resolved: true`; mismatch without Edit = accept counted as-is |
| Declare ready to organize | `phase === 'reconciling'`; every row `resolved === true` | `POST …/sessions/:id/phase` → `organizing` |
| Return to reconciling | `phase === 'organizing'` | `POST …/sessions/:id/phase` → `reconciling`; organizer progress preserved |
| Reconciled — export XML | `phase === 'updating_inventory'` | `POST …/reconciliation/export-xml` — XML + `validationUrl`; opens export dialog; **phase unchanged** |
| Mark session complete | `phase === 'updating_inventory'`; export succeeded at least once this session | `POST …/sessions/:id/phase` → `closed` |
| Download XML | Export dialog open | Downloads `{setNumber}-bulk-update.xml` |
| Open Bricklink validation page | Export dialog open | Opens validation URL in new tab |

### Reconciliation rules (product)

- Compare **included** part-out lines to session lot totals (part + color + condition)
- **Unexpected counts:** session lots whose part/color/condition are **not** on the included list appear as rows with `qtyExpected = 0`; worker **Resolve**s each
- Row key: `partId` + `colorId` + `condition`
- `qtyExpected` from part-out line (or `0` for unexpected-count rows); `qtyCounted` = sum of matching session lots; `delta` = counted − expected
- Open row = `!resolved` — explicit **Resolve** on every line before **Declare ready to organize**; Resolve without Edit on mismatch = accept `qtyCounted`
- If `lot.updated` changes `delta` on a resolved row, server clears `resolved` (row reopens)
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

WebSocket: `lot.updated` refreshes `qtyCounted`/`delta` on open rows (clears `resolved` when delta changes); `session.phase` updates nav and triggers AppShell toast.

## Acceptance criteria

### MVP requirements (Unit 4)

- [ ] **Discrepancies** and **All lines** tabs (not single-table hybrid)
- [ ] **Discrepancies** tab: `!resolved` rows; **All lines**: included lines + unexpected counts (`qtyExpected = 0`)
- [ ] Rows: **thumbnail** + part id + description, Color, Expected, Counted, **Delta** (no Cond column); Delta = 0 muted
- [ ] **Edit** → Lot form (existing lot or new pre-filled for unexpected count)
- [ ] **Resolve** when `!resolved` in `reconciling`; explicit sign-off on every line before **Declare ready to organize**
- [ ] Celebratory alert in `reconciling` when all included lines match (`delta === 0`) but rows still need Resolve
- [ ] **`lot.updated`** refreshes counts; clears `resolved` when `delta` changes
- [ ] Live APIs: `GET …/reconciliation`, `POST …/resolve`, `POST …/export-xml`
- [ ] **Mark session complete** separate from export; disabled until export succeeded
- [ ] Export **warnings** inline alert; **`closed`** routes redirect Home
- [ ] SessionNav **Reconcile** visible `counting` → `updating_inventory` (hidden `importing`, `closed`)
- [ ] **Return to reconciling** from `organizing` without organizer rollback
- [ ] **`session.phase`** WebSocket → toast on every session view (AppShell)
- [ ] No inner table `<h2>Discrepancies`; page heading + tabs only
- [ ] List lots route rejects/refactors legacy `mode=reconciliation`; reconciliation only on dedicated route
- [ ] Any joined worker may Edit, Resolve, export, Mark complete
- [ ] Upload to Bricklink manual (no in-app submit)

## Storyboard status (Unit 0 fixture)

Fixture implements a subset for stakeholder walkthrough. **Target behavior is acceptance criteria above.**

### Implemented in fixture today

- Single-table hybrid (filter + matched toggle) — **replace with tabs in Unit 4**
- Per-row Resolve (fixture mutates counts — **not live sign-off semantics**)
- Fixture XML download; validation URL
- **Declare ready to organize** (fixture gate uses `delta === 0 || resolved` — **must align to all rows resolved**)

### Fixture divergences (Unit 4 `/build` must fix)

- Auto-`resolved` when `delta === 0`; no explicit Resolve on matching rows
- No thumbnails / part description columns; no Delta column styling
- No **Mark session complete**; export may advance phase
- No unexpected-count rows; Edit hidden in reconciliation mode
- No live reconciliation API; no `lot.updated` refresh; no phase-change toasts
- SessionNav phase gating not enforced
- Legacy `LotListTable` reconciliation wiring; inner table `<h2>` duplicate

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
| `return-to-reconciling` | Return to reconciling button (planned) |

## Spec–diagram review (2026-06-12)

| Spec section | Diagram | Finding | Severity |
|--------------|---------|---------|----------|
| [Phase transitions](#session-phase--navigation) `updating_inventory` → `closed` | `session-phases-state.mmd`, `store-inventory-update.mmd` | **Dave 2026-06-12:** Close on **Mark session complete**, not on export-xml; export + Bricklink remain manual outside app. Diagrams updated. | **Resolved** |
| [SessionNav Reconcile](#locked-decisions) | `view-navigation.mmd`, `reconciliation-workflow.mmd` | **Dave 2026-06-12:** Visible `counting` → `updating_inventory`; hidden `importing`, `closed`. | **Resolved** |
| [Session phase table](#session-phase--navigation) `organizing` | `workflow-storyboard.mmd`, `view-navigation.mmd` | Reconcile nav available; **Return to reconciling** on view; organizer progress preserved. | **Resolved** — Dave 2026-06-12 |
| [Session phase table](#session-phase--navigation) `counting` | `reconciliation-workflow.mmd` | Preview via Reconcile nav; Edit/Resolve gated until `reconciling`. | **Resolved** — Dave 2026-06-12 |
| [Locked decisions](#locked-decisions) Resolve = sign-off | `reconciliation-workflow.mmd` | **Dave 2026-06-12:** Resolve when `!resolved` (explicit sign-off on every line, including `delta === 0`); open row = `!resolved`. Diagram updated. | **Resolved** |
| [Layout](#layout--controls) Discrepancies / All lines tabs | `reconciliation-workflow.mmd` | Tabs, Edit → Lot form, Resolve → POST resolve, **Declare ready to organize** when cleared — align. | Pass |
| [Entry & exit](#entry--exit) Edit row | `view-navigation.mmd`, `workflow-storyboard.mmd` | `RECON → LOT_EDIT` and storyboard `RECON → Edit row → LOT` match. | Pass |
| Post-join routing | `view-navigation.mmd`, `session-phases-state.mmd` | Home join `reconciling` / `updating_inventory` → `/reconciliation` matches [home.md](./home.md#post-join-routing). | Pass |
| End-to-end flow | `workflow-storyboard.mmd` | `RECON → Declare ready to organize → LOTS_ORG`, `LOTS_ORG → Declare ready to import → STORE_UPDATE`, and **Mark session complete** → `closed` (export does not close) match Model C lifecycle. | Pass |
| SessionNav **Cups** in `updating_inventory` | `session-phases-state.mmd` | Note "SessionNav Cups hidden" aligns with [list-cups.md](./list-cups.md); reconciliation spec now cross-links. | Pass |
| Export dialog handoff | `store-inventory-update.mmd` | Was modeled as in-app mass-update confirmation; spec is download + open validation URL, then manual Bricklink steps. **Diagram updated.** | **Blocking** (resolved in diagram) |
| Tech spec `qtyAgreed` field | — | **Dave 2026-06-12:** Drop `qtyAgreed` for MVP; `resolved` is the sole sign-off flag (counts match or accept-as-is). Tech spec updated. | **Resolved** |
| Table columns Part / Thumbnail | [part-out-import.md](./part-out-import.md) | **Match import UX** — thumbnail + part id + description. | **Resolved** — Dave 2026-06-12 |

## Open questions

**All resolved (Dave 2026-06-12).** See [Locked decisions](#locked-decisions) for the full decision log, including:

- Manual **Mark session complete** (not auto-close on export)
- SessionNav **Reconcile** visible `counting` → `updating_inventory`; phase-change **toasts** on all session views
- MVP gap items promoted to [Acceptance criteria](#acceptance-criteria) (tabs, Edit, live API, Mark complete, etc.)
- Table UX matches import; any joined worker; **`resolved` only** (no `qtyAgreed`)
- **Unexpected counts** shown as discrepancy rows (`qtyExpected = 0`); worker **Resolve**s each
- **Explicit Resolve** on every line before **Declare ready to organize**; celebratory alert when included lines all match
- **Late organizing discrepancy:** return to `reconciling` without organizer rollback; pick-list progress preserved
- Export **warnings** as inline alert
- **`closed`** session routes redirect to Home
