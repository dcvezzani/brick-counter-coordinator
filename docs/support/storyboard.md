# Storyboard — interactive UI prototype

**Purpose:** Walk through all [application views](./application-views.md) with realistic layout and **fixture data** before coordinator server, WebSockets, or BrickLink integration. Use this to validate the Product Spec with counters, leads, and organizers.

**Tech:** shadcn-vue + Vue Router — see [tech-stack.md](../tech-stack.md).

## Goals

- Navigate every view in order and out of order (same routes as production).
- Talk through scenarios aloud; capture gaps in the Product Spec or `qa-*.md`.
- Show stakeholders what the app **will look like** — not a slide deck.
- Defer backend until feedback from at least one walkthrough is incorporated.

## Fixture session (suggested)

Use one demo session so all views have context:

| Field | Example value |
|-------|----------------|
| Session name | `Castle 70404 — June part-out` |
| Set | `70404-1` |
| Workers | `Alex`, `Jordan`, `Sam` (current user: pick at Home) |
| Cups | 3–5 cups with mix of single- and multi-lot |
| Lots | Enough rows to demo duplicate-lot message, List cups branching, organizer split |
| Reconciliation | 2–3 intentional mismatches |

Label the UI **“Storyboard — sample data”** so reviewers know nothing is persisted.

## Walkthrough script

Check off during a review session; note feedback inline or in a new `qa-NNN.md`.

### 1. Home

- [ ] Enter display name
- [ ] Choose **create new session** → New session
- [ ] Return to Home → **enter existing session** → lands in session hub / List cups

### 2. New session

- [ ] Enter set number and options (pricing, new/used, overwrite vs consolidate)
- [ ] Submit → server fetch (fixture in storyboard) → Part-out import

### 3. Part-out import

- [ ] Full fetched list visible (part, color, condition, qty, Remarks)
- [ ] Exclude lines not in scope for this sweep; restore excluded lines
- [ ] Walk single-sweep path: brand-new or loose — confirm all lines, no exclusions
- [ ] Optional: demo two-sweep partial-bag story — first pass excludes sealed-bag parts
- [ ] Confirm → counting phase (List cups / Lot form)

### 4. Lot form

- [ ] Part lookup field, color, session condition label, count fit on one mobile viewport
- [ ] Tab / Shift+Tab through part → color → count
- [ ] **Save** and **Save and Add Another** (part id pre-filled)
- [ ] Submit duplicate lot → confirm dialog; can proceed and entered qty merges into existing lot

### 5. List cups

- [ ] Tap cup with one lot → Lot form
- [ ] Tap cup with multiple lots → cup-filtered List lots → pick lot → Lot form

### 6. List lots (organizer)

- [ ] Even split across workers; ordered by part id
- [ ] Mark **moved to storage** / **needs new storage location**
- [ ] Open lot, open associated cup, print, **mark entire list complete**

### 7. Part-out reconciliation

- [ ] Compare fixture official list vs session counts
- [ ] Discrepancy list; resolve at least one row
- [ ] **Reconciled** → explain XML + Bricklink bulk update validation (mock or link)

## Exit criteria (before Unit 1 backend)

- [ ] All seven views visited without broken navigation
- [ ] Product owner + at least one counter/organizer have walked through
- [ ] Open feedback logged; Product Spec updated if needed
- [ ] Storyboard PR merged or tagged so `/design` can reference the same routes

## Related

- [feature/part-out-coordinator/product-spec.md](../../feature/part-out-coordinator/product-spec.md#delivery-units-mvp-slices) — Unit 0
- [application-views.md](./application-views.md)
