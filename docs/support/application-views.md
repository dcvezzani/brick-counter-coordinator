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
- select a cup
- if there are multiple lots in a cup, show "list lots" filtering for only those lots in the same cup
- else opens in "lot form"

### list lots
- lists a selection of lots assigned to a given worker; lists are evenly divided between workers, ordered by part id
- mark a lot as having been moved out of cup and into storage location
- mark a lot as needing to be assigned a new storage location
- add another lot
- open a lot for editing
- open associated cup (filtered "list lots")
- send list to printer
- mark entire list as complete; all parts on the list have been moved to storage or marked as needing a new storage location assignment

### part out reconciliation
- session counts are compared with **included** part-out lines (after import curation)
- a list of parts that have discrepancies is generated ("list lots")
- press "Reconciled" to generate XML and send to Bricklink's bulk update validation page
