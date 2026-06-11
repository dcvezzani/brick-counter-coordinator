# Part-out reconciliation

**Status:** Draft — for Dave review  
**Last updated:** 2026-06-11

---

## Overview

| Field | Value |
|-------|-------|
| **View name** | Part-out reconciliation |
| **Route** | `/session/:sessionId/reconciliation` |
| **Route params** | `sessionId` |
| **Query params** | — |
| **Primary actor(s)** | Session lead |
| **Delivery unit** | 0 (fixture) → 4 (reconciliation + XML export) |
| **Source file** | [`src/views/ReconciliationView.vue`](../../src/views/ReconciliationView.vue) |
| **Table component** | [`LotListTable.vue`](../../src/components/LotListTable.vue) (mode=`reconciliation`) |

## Related docs

- [Product Spec — Application views](../../feature/part-out-coordinator/product-spec.md#application-views)
- [Product Spec — Scenarios 7 & 9: Reconcile / export](../../feature/part-out-coordinator/product-spec.md#key-scenarios)
- [Planned views & services — Reconciliation](../support/planned-views-services.md)
- [Storyboard walkthrough § 7. Part-out reconciliation](../support/storyboard.md#7-part-out-reconciliation)
- [bricklink-mass-update-export.md](../bricklink-mass-update-export.md)
- [Shared chrome](./README.md#shared-chrome)

## Purpose

Compare session counted totals against **included** part-out lines (post-import curation). Lead resolves discrepancies, then exports Bricklink bulk-update XML and opens the validation page. Live upload to Bricklink is out of scope — export + manual paste/upload.

## Entry & exit

### How users arrive

| From | Path / action |
|------|---------------|
| SessionNav **Reconcile** | `/session/:sessionId/reconciliation` |
| Direct navigation | Same |

### Where actions navigate

| Action | Destination |
|--------|-------------|
| **Edit** (via Resolve + lot fixes, planned) | Lot form (indirect — worker adjusts counts) |
| **Reconciled — export XML** | Stays on view; opens export dialog |
| Download / validation link | External download or new tab to Bricklink |

## Layout & controls

| Element | Copy / behavior |
|---------|-----------------|
| Page heading | Part-out reconciliation |
| Helper text | Compare session counts to included part-out lines. |
| Discrepancy alert | {n} discrepancy / {n} discrepancies found |
| Table title | Discrepancies |
| Table columns | Part, Color, Expected, Counted, Actions |
| Row action | Resolve (when row not resolved) |
| Primary button | Reconciled — export XML |

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
| {n} discrepancy found | Alert (singular) | One unmatched row (`delta !== 0`) |
| {n} discrepancies found | Alert (plural) | Multiple unmatched rows |
| Bulk update XML ready | Dialog title | After **Reconciled — export XML** |
| Download the XML and paste it into Bricklink bulk update validation. | Dialog description | Export dialog open |

When no mismatches remain, table shows all reconciliation rows (including matches); alert is hidden.

**Resolve** marks a discrepancy row resolved in fixture state — does not show a separate confirmation message.

## User actions

| Action | Preconditions | Outcome |
|--------|---------------|---------|
| Review discrepancy table | — | Shows rows where counted ≠ expected (included lines only) |
| Resolve row | Row has `delta !== 0` and not resolved | Marks line resolved in session state |
| Reconciled — export XML | — | Generates XML from resolved reconciliation data; session phase → `organizing`; opens export dialog |
| Download XML | Export dialog open | Downloads `{setNumber}-bulk-update.xml` |
| Open Bricklink validation page | Export dialog open | Opens Bricklink bulk update validation URL in new tab |

### Reconciliation rules (product)

- Compare against **included** part-out lines only (excluded import lines omitted)
- Discrepancies: session count ≠ expected qty for same part/color/condition
- Workers resolve by adjusting lots or marking rows resolved until aligned
- Export produces XML compatible with Bricklink bulk update validation tool

## Data requirements

### Read

| Field / entity | Source (live) | Notes |
|----------------|---------------|-------|
| Reconciliation rows | `GET …/reconciliation` | partId, colorId, qtyExpected, qtyCounted, delta, resolved |
| Session | `GET …/sessions/:id` | setNumber for filename |

### Write

| Operation | Endpoint (live) | Notes |
|-----------|-----------------|-------|
| Resolve line | `POST …/reconciliation/:lineId/resolve` | |
| Export XML | `POST …/reconciliation/export` | Returns XML + validationUrl; phase → organizing |

## Acceptance criteria

- [ ] Included part-out lines compared to session lot totals
- [ ] Discrepancies listed with expected vs counted quantities
- [ ] Alert shows discrepancy count when mismatches exist
- [ ] Lead can resolve individual discrepancy rows
- [ ] **Reconciled — export XML** generates downloadable XML
- [ ] Export dialog links to Bricklink bulk update validation page
- [ ] Excluded import lines do not appear in reconciliation
- [ ] Upload to Bricklink remains manual (no in-app submit)

## Storyboard status

### Implemented (Unit 0)

- Discrepancy alert and table via shared `LotListTable`
- Per-row Resolve
- Fixture XML generation and download
- Hardcoded validation URL: `https://www.bricklink.com/invXML.asp#update`
- Phase set to `organizing` on export

### Gaps (Units 1–4)

- Resolve does not navigate worker to Lot form to fix counts
- No guard blocking export while unresolved discrepancies remain
- No live reconciliation API or XML shape validation against Bricklink
- No diff refresh when lots change in real time

### `data-testid` inventory

| Test id | Element |
|---------|---------|
| `reconciliation-view` | Page container |
| `reconciled` | Reconciled — export XML button |
| `lot-list-table` | Discrepancy table |

## Open questions

- Block **Reconciled** until all discrepancies resolved, or allow export with warnings?
- Should **Resolve** mean "accepted as-is" vs "counts fixed elsewhere"?
- Show matched rows in a separate tab, or only discrepancies?
- Validation URL: always `invXML.asp#update` or environment-specific?
