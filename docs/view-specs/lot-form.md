# Lot form

**Status:** Draft — for Dave review  
**Last updated:** 2026-06-11

---

## Overview

| Field | Value |
|-------|-------|
| **View name** | Lot form |
| **Route** | `/session/:sessionId/lot/:lotId?` |
| **Route params** | `sessionId`; optional `lotId` (omit for new lot) |
| **Query params** | — |
| **Primary actor(s)** | Counter / any worker |
| **Delivery unit** | 0 (fixture) → 2 (live lots + real-time) |
| **Source file** | [`src/views/LotFormView.vue`](../../src/views/LotFormView.vue) |
| **Form component** | [`LotForm.vue`](../../src/components/LotForm.vue) |

## Related docs

- [Product Spec — Application views](../../feature/part-out-coordinator/product-spec.md#application-views)
- [Product Spec — Scenarios 4–5: Record / discover lot](../../feature/part-out-coordinator/product-spec.md#key-scenarios)
- [Planned views & services — Lot form](../support/planned-views-services.md#4-lot-form)
- [Storyboard walkthrough § 4. Lot form](../support/storyboard.md#4-lot-form)
- [Tech Spec — Lots & Bricklink helpers](../../feature/part-out-coordinator/tech-spec.md)
- [Shared chrome](./README.md#shared-chrome)

## Purpose

Workers record one lot at a time: part id, color, and quantity. **Condition** is defined by the session (not entered on this form) and is part of the unique lot key `(partId, colorId, condition)`. The form must fit on one mobile viewport without scrolling primary controls (see [Viewport](#viewport)).

## Locked decisions

| Topic | Decision |
|-------|----------|
| Session condition | Each session is **New** or **Used** only (`partOutOptions.condition` is `new` or `used`). Partial-bag two-sweep work uses **two separate sessions**, not a Mixed option on New session. |
| Condition on form | **Read-only** inline label from session; not in tab order (`tabindex="-1"`). |
| Required fields | **Part and color** are required before Save; show inline validation and block submit when either is missing. |
| Duplicate awareness (MVP) | Dialog on submit when `duplicate: true`; proactive inline hint deferred to Unit 2+ (see [Planned](#planned-not-implemented)). |

## Entry & exit

### How users arrive

| From | Path / action |
|------|---------------|
| SessionNav **Lot** | `/session/:sessionId/lot` (new lot) |
| List cups → cup with **0 lots** | `/session/:sessionId/lot` (new lot; cup association TBD — see [list-cups.md](./list-cups.md#open-questions)) |
| List cups → cup with **1 lot** | `/session/:sessionId/lot/:lotId` (edit that lot) |
| List cups → cup with **2+ lots** | `/session/:sessionId/lots?mode=cup&cupId={cupId}` → pick lot → edit |
| List lots → **Edit** | `/session/:sessionId/lot/:lotId` |
| List cups → **Add new lot** | `/session/:sessionId/lot` (new lot; no cup in route today) |

### New lot vs edit lot

| Aspect | New lot (`lotId` absent) | Edit lot (`lotId` present) |
|--------|--------------------------|----------------------------|
| Pre-fill | Empty part, color; qty defaults to 1 | Part, color, qty from existing lot |
| Initial focus | Part search filter focused on mount | No auto-focus (worker taps field) |
| Condition label | Session `new` → `Condition: New`; session `used` → `Condition: Used` | Same — must match lot's stored condition in new/used-only sessions |
| Duplicate dialog | Shown when key conflicts with a **different** `lotId` | **Not** shown when key unchanged for same `lotId` |
| **Save** success | Stay on `/lot`; clear form; focus part search filter | `replace` to `/lot`; clear form; focus part search filter |
| **Save and Add Another** success | Stay on `/lot`; keep part id; clear color; qty → 1; open color picker and focus filter | `replace` to `/lot` first (exit edit), then same reset as new lot |

### Where actions navigate

| Action | Destination |
|--------|-------------|
| **Save** (new lot) | Stays on `/session/:sessionId/lot`; form cleared |
| **Save** (edit existing lot) | `replace` to `/session/:sessionId/lot`; form cleared |
| **Save and Add Another** (new lot) | Stays on `/session/:sessionId/lot`; form reset with part id kept |
| **Save and Add Another** (edit) | `replace` to `/session/:sessionId/lot`; form reset with part id kept |
| Duplicate save (cancel confirm) | Stays on form; dialog dismissed |
| Duplicate save (confirm) | Merges qty into existing lot; same post-save flow as the pending **Save** or **Save and Add Another** |
| Successful save (any path) | No success toast — cleared form / focus change is the confirmation |

## Layout & controls

| Element | Copy / behavior |
|---------|-----------------|
| Page heading | Lot entry (in [`LotFormView.vue`](../../src/views/LotFormView.vue)) |
| Part field label | Part number (+ resolved part name when valid) |
| Color label | Color |
| Condition | Inline read-only on one line: `Condition: New` or `Condition: Used` (not focusable) |
| Count label | Count — stepped swipe number input (`min` 0) |
| Primary button | Save |
| Secondary button | Save and Add Another |

### Viewport

Primary controls (part search, color, condition label, count, Save buttons) must be visible at **390px** width without scrolling the main form. See [Tech Spec — Mobile](../../feature/part-out-coordinator/tech-spec.md).

### Condition display (session-scoped)

Condition is **not** editable on this form. Display and save value derive from session `partOutOptions.condition` via [`lot-entry-defaults.js`](../../src/lib/lot-entry-defaults.js):

| Session `partOutOptions.condition` | Display | Saved value |
|------------------------------------|---------|-------------|
| `new` | `Condition: New` | `N` |
| `used` | `Condition: Used` | `U` |

Workers do not choose New vs Used per lot on this screen. On edit, the lot's stored condition must match the session (invariant for new/used-only sessions).

### Part search (`PartSearchCombobox`)

| State | Trigger label / placeholder |
|-------|----------------------------|
| No part selected | Search parts… |
| Part selected | {partId} (trigger); part name beside label |
| Filter input placeholder | Filter parts |
| Min chars not met | Type at least 2 characters to search |
| No filter matches | No parts match "{query}" |

### Color picker (`ColorPicker` / `FilterablePicker`)

| State | Trigger label |
|-------|---------------|
| No part selected (disabled) | Select a part first |
| Part selected, no color | Select color |
| Color selected | {Color name} ({id}) |
| Filter placeholder | Filter colors |
| No filter matches | No colors match "{query}" |
| None option | None (clears color) — remove when required-color validation ships |

### Required-field validation (planned Unit 1+)

| Message | Type | Trigger |
|---------|------|---------|
| Select a part | Inline field error | Save with empty part |
| Select a color | Inline field error | Save with empty color |

## Keyboard & focus

| Requirement | Behavior |
|-------------|----------|
| New lot initial focus | On mount (`lotId` absent), part search filter is focused so the worker can type immediately |
| Edit lot initial focus | No auto-focus on mount |
| Tab order (fields) | Part → Color → Count (condition skipped) |
| Shift+Tab | Reverses the same field order |
| Picker panel open | **Tab** from filter closes panel and moves focus to the **next** field; **Shift+Tab** from filter closes panel and moves focus to the **previous** field |
| Save buttons | Follow count in natural tab order |

## Messages & feedback

### Duplicate lot confirmation (`LotForm`)

| Message | Type | Trigger |
|---------|------|---------|
| Duplicate lot | Dialog title | Save returns `duplicate: true` |
| Already counted by {name} (qty {n}). Add {entered} more? | Dialog body | Same — conflicting `(partId, colorId, condition)` with different `lotId` |
| Cancel | Dialog button (outline, first) | Dismisses dialog; form unchanged |
| Confirm | Dialog button (primary, second) | Re-saves with merge; **existing lot qty += entered qty**; normal success flow |
| {name} = Unknown | Body fallback | Original worker record missing |

Dialog opens on first save attempt when duplicate is detected. Save is **not** blocked permanently — worker may confirm and proceed.

**Does not trigger duplicate when:** editing the same lot (`lotId` matches existing record) even if key unchanged.

### Hints (pickers — not alerts)

See Layout & controls above for part search and color picker hint copy.

### Planned (not implemented)

| Message | Trigger |
|---------|---------|
| Bricklink store inventory duplicate hint | Part/color selected and matching store lot exists (Unit 2+) |
| Real-time duplicate from other clients | WebSocket `lot.updated` while form open |
| Proactive duplicate hint before submit | Part/color selected and session lot key already exists (Product #2 stretch) |

## User actions

| Action | Preconditions | Outcome |
|--------|---------------|---------|
| Search / select part | — | Sets partId; enables color list for part |
| Select color | Part selected | Sets colorId |
| Adjust count | — | Sets qty (integer, min 0) |
| Save | Part and color selected | Calls `saveLot`; on duplicate shows confirm dialog; on success clears form (or exits edit route), focuses part search |
| Save | Part or color missing | Blocked with inline validation (planned Unit 1+) |
| Save and Add Another | Part and color selected | On success: keeps partId, clears color, resets qty to 1, opens color picker and focuses filter; on edit, `replace` to new-lot route first |
| Confirm duplicate save | Duplicate dialog open | Merges qty into existing lot; completes pending Save or Save and Add Another flow |
| Cancel duplicate save | Duplicate dialog open | Closes dialog; form unchanged |

## Data requirements

Canonical API paths are under `/api/v1` per [tech-spec.md](../../feature/part-out-coordinator/tech-spec.md).

### Read

| Field / entity | Source (Unit 0 fixture) | Source (live) | Notes |
|----------------|-------------------------|---------------|-------|
| Existing lot (edit) | Client `getLot(sessionId, lotId)` | `GET /api/v1/sessions/:id/lots` (filter by id from list cache) or dedicated `GET …/lots/:lotId` if added | Pre-fill part, color, qty |
| Part catalog search | Fixture `searchParts` | `GET /api/v1/bricklink/inventory-search?q=` | [`PartSearchCombobox`](../../src/components/PartSearchCombobox.vue) |
| Colors for part | Fixture `getColorsForPart` | `GET /api/v1/bricklink/parts/:partId/colors` | [`ColorPicker`](../../src/components/ColorPicker.vue) options |
| Session partOutOptions | Session record | `GET /api/v1/sessions/:id` | Condition display and save value |

### Write

| Operation | Endpoint (live) | Notes |
|-----------|-----------------|-------|
| Create/update lot | `POST /api/v1/sessions/:id/lots` | Body: `partId`, `colorId`, `condition`, `qty`, optional `id` (edit), optional `cupId` |
| Duplicate key (first attempt) | Same endpoint | Response: `duplicate: true`, `existing: { createdBy, qty }` |
| Duplicate merge | Same endpoint + `mergeDuplicate: true` | **Fixture only (Unit 0)** — adds entered qty to existing lot; live contract TBD in Tech Spec |

Unique key: `(sessionId, partId, colorId, condition)`.

## Acceptance criteria

- [ ] Part lookup, color, condition label, count, and Save buttons fit at **390px** width without scrolling the main form
- [ ] Worker can search parts (min 2 chars) and select from filtered list
- [ ] Color picker disabled until part selected; shows part-specific colors
- [ ] Condition shown as read-only inline label from session (`Condition: New` / `Condition: Used` only — no Mixed session)
- [ ] Tab and Shift+Tab cycle part → color → count (condition not in tab order)
- [ ] New lot: part search filter focused on load for immediate entry
- [ ] Edit lot: part, color, and qty pre-filled from existing lot
- [ ] Save blocked with clear inline message when part or color is missing
- [ ] **Save** (new lot) persists lot, clears form, focuses part search filter
- [ ] **Save** (edit) updates lot, `replace` to `/lot`, clears form, focuses part search filter
- [ ] **Save and Add Another** keeps part id, clears color, resets qty to 1, opens color picker and focuses filter
- [ ] **Save and Add Another** on edit exits edit route (`replace` to `/lot`) before reset
- [ ] **Save** on edit route updates lot without duplicate dialog for same key
- [ ] Duplicate lot shows confirm dialog with creator and existing qty on submit
- [ ] Confirm adds entered qty to existing lot and completes save
- [ ] Cancel duplicate leaves form data intact
- [ ] One lot per form — no multi-line entry on same screen

## Storyboard status

### Implemented (Unit 0)

- Full form with part search, color picker, read-only session condition, stepped count input
- Tab / Shift+Tab field chain (part → color → count)
- Save / Save and Add Another with focus management (new lot)
- Duplicate confirm dialog with qty merge on confirm (`mergeDuplicate` in fixture)
- Edit mode via optional `lotId` route param; Save exits edit route

### Gaps (Units 1–4)

- Client-side required-field validation before save
- **Save and Add Another** on edit route should `replace` to `/lot` before reset (currently stays on edit `lotId`)
- No live part search / color API
- No Bricklink inventory duplicate hint during entry
- No WebSocket updates when another worker saves same lot
- No explicit cup assignment UI on this view (fixture defaults to first cup on save)
- Live API `mergeDuplicate` contract (fixture only in Unit 0)
- Remove color **None** option once required-color validation ships

### `data-testid` inventory

| Test id | Element |
|---------|---------|
| `lot-form-view` | Page container ([`LotFormView`](../../src/views/LotFormView.vue)) |
| `lot-form` | Form root |
| `part-search-*` | Part picker (trigger, panel, filter, options) |
| `part-search-resolved` | Resolved part name |
| `color-picker-*` | Color picker |
| `lot-condition` | Read-only condition line |
| `lot-qty`, `lot-qty-handle`, etc. | Count input |
| `duplicate-confirm-dialog` | Duplicate confirmation dialog content |
| `duplicate-confirm` | Confirm merge button |
| `duplicate-cancel` | Cancel duplicate button |
| `save-lot` | Save button |
| `save-and-add-another` | Save and Add Another button |

## Open questions

- Should qty 0 be allowed on save?
- Cup selection: auto-assign tapped cup vs explicit picker on save? (shared with [list-cups.md](./list-cups.md#open-questions))
- Show existing lot qty inline before save (proactive duplicate hint)?
- Live edit pre-fill: list cache vs dedicated `GET /api/v1/sessions/:id/lots/:lotId`?
- Remove color picker **None** option when required-color validation ships?
