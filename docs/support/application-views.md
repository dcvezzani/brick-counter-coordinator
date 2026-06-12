## Application views

**Canonical product reference:** [feature/part-out-coordinator/product-spec.md](../../feature/part-out-coordinator/product-spec.md#application-views). **Per-view requirements:** [docs/view-specs/](../view-specs/). **Unit 0 (storyboard):** all routes + fixture UI — see [Fixture vs target](../view-specs/README.md#fixture-vs-target-unit-0). **Units 1–4:** live behavior on the same routes. Walkthrough: [storyboard.md](./storyboard.md).


### home page
- worker provides their name for the session
- chooses from the following options
  - create a new session
  - enter an existing session

### new session
- create a new session (display name entered on Home first)
  - search/select set number (SetSearchCombobox) and condition (New or Used)
  - submit — server fetches official Bricklink part-out list (fixed pricing/merge defaults)

### part out import
- shows all fetched part-out list entries (part, color, condition, qty, remarks)
- any joined worker curates scope via checkboxes and footer **Exclude**; **Restore** from Excluded tab
- confirm to begin counting
  - brand-new sealed set or loose bricks: usually confirm full list (single sweep)
  - partial-bag set (mixed opened/sealed bags): exclude out-of-scope lines; two sessions for used then new

### lot form
- a "lot" represents a given part id/color/condition
- add Lego parts to a cup
  - enter or find part number
  - select color
  - session condition shown read-only (not selected on this form)
  - enter count (minimum 1 — cannot save qty 0)
  - optional **New cup** when auto cup assignment is wrong
  - press button: "Save" or "Save and Add Another"
  - duplicate lot: confirm dialog; merge adds qty to existing lot

### list cups
- browse session cups (counting default landing is lot form, not list cups)
- add new lot → lot form (part-number cup auto-select on save)
- select a cup: zero lots → lot form with cup pinned; one lot → lot form edit; multiple lots → cup-filtered list lots

### list lots
- **cup mode:** pick a lot from a multi-lot cup (see list cups)
- **organizer mode:** pick list after **Split list** (once per session)
- lists lots assigned to the current worker; ordered by part id
- storage location (from part-out Remarks) shown per line in organizer mode
- mark a lot as moved to storage or needs new location
- delete: own assigned lots only (organizer); any lot in cup (cup mode)
- open lot for editing; open associated cup (organizer)
- print pick list; mark entire list complete when all lines resolved
- declare ready to import when all workers' lists complete

### part out reconciliation
- session counts compared with **included** part-out lines (after import curation)
- **Discrepancies** and **All lines** tabs; explicit **Resolve** on every row
- in **counting**: preview diff; **Compare with Part-Out List** advances to reconciling
- in **reconciling**: edit lots, resolve rows, **Declare ready to organize**
- in **updating_inventory**: **Reconciled — export XML** (phase unchanged); **Mark session complete** → closed after manual Bricklink handoff
- any joined worker may act; no role-based permissions
