## Application views

**Canonical product reference:** [feature/part-out-coordinator/product-spec.md](../../feature/part-out-coordinator/product-spec.md#application-views). **Unit 0 (storyboard):** all routes + fixture UI. **Units 1–4:** live behavior on the same routes. Walkthrough: [storyboard.md](./storyboard.md).


### home page
- worker provides their name for the session
- chooses from the following options
  - create a new session
  - enter an existing session

### new session
- create a new session (display name entered on Home first)
  - specify set number and condition (New or Used)
  - submit — server fetches official Bricklink part-out list (fixed pricing/merge defaults)

### part out import
- shows all fetched part-out list entries (part, color, condition, qty, remarks)
- session lead removes (excludes) specific entries not in scope for this counting sweep
- excluded entries can be restored before confirming
- confirm to begin counting
  - brand-new sealed set or loose bricks: usually confirm full list (single sweep)
  - partial-bag set (mixed opened/sealed bags): exclude out-of-scope lines; two sessions for used then new

### lot form
- a "lot" represents a given part id/color/condition
- add Lego parts to a cup
  - enter or find part number
  - select color
  - session condition shown read-only (not selected on this form)
  - enter count
  - press button: "Save" or "Save and Add Another"

### list cups
- browse session cups (counting default landing is lot form, not list cups)
- add new lot → lot form (part-number cup auto-select on save)
- select a cup: zero lots → lot form with cup pinned; one lot → lot form edit; multiple lots → cup-filtered list lots

### list lots
- lists a selection of lots assigned to a given worker; lists are evenly divided between workers, ordered by part id
- storage location (from part-out Remarks) shown per line in organizer mode
- mark a lot as having been moved out of cup and into storage location
- mark a lot as needing to be assigned a new storage location
- open a lot for editing
- open associated cup (filtered "list lots" in cup mode)
- send list to printer
- mark entire list as complete when all parts on the list have been moved to storage or marked as needing a new storage location assignment (disabled while any line is pending)
- cup mode: pick a lot from a multi-lot cup (see list cups); new lots via SessionNav Lot or list cups — not on this view

### part out reconciliation
- session counts are compared with **included** part-out lines (after import curation)
- discrepancy table shows open mismatches only; optional **View matched lines**
- **Resolve** accept-as-is (acknowledge counted qty); any joined worker
- **Reconciled — export XML** on this view after organize complete — disabled until all discrepancies resolved and every organizer list is complete; generates XML, opens Bricklink bulk update validation, session → `closed`
