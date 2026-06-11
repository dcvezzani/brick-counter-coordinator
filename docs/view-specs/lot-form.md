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
- [Shared chrome](./README.md#shared-chrome)

## Purpose

Workers record one lot at a time: part id, color, and quantity. **Condition** is defined by the session (not entered on this form) and is part of the unique lot key `(partId, colorId, condition)`. The form must fit on one mobile viewport without scrolling primary controls.

## Entry & exit

### How users arrive

| From | Path / action |
|------|---------------|
| SessionNav **Lot** | `/session/:sessionId/lot` (new lot) |
| List cups → cup with 0 or 1 lot | `/session/:sessionId/lot` or `/session/:sessionId/lot/:lotId` |
| List lots → **Edit** | `/session/:sessionId/lot/:lotId` |
| List cups → **Add new lot** | `/session/:sessionId/lot` |

### Where actions navigate

| Action | Destination |
|--------|-------------|
| **Save** (new lot) | Stays on `/session/:sessionId/lot`; form cleared |
| **Save** (edit existing lot) | `replace` to `/session/:sessionId/lot`; form cleared |
| **Save and Add Another** | Stays on route; form reset with part id kept |
| Duplicate save (cancel confirm) | Stays on form; dialog dismissed |
| Duplicate save (confirm) | Merges qty into existing lot; same post-save flow as successful **Save** |

## Layout & controls

| Element | Copy / behavior |
|---------|-----------------|
| Page heading | Lot entry |
| Part field label | Part number (+ resolved part name when valid) |
| Color label | Color |
| Condition | Inline read-only on one line: `Condition: New` or `Condition: Used` (not focusable) |
| Count label | Count — stepped swipe number input (`min` 0) |
| Primary button | Save |
| Secondary button | Save and Add Another |

### Condition display (session-scoped)

Condition is **not** editable on this form. Display and save value derive from session `partOutOptions.condition` via [`lot-entry-defaults.js`](../../src/lib/lot-entry-defaults.js):

| Session `partOutOptions.condition` | Display | Saved value |
|------------------------------------|---------|-------------|
| `new` | `Condition: New` | `N` |
| `used` | `Condition: Used` | `U` |
| `mixed` | Resolved label (`New` or `Used`) from session counting rules | `N` or `U` |

Workers do not choose New vs Used per lot on this screen.

### Part search (FilterablePicker)

| State | Trigger label / placeholder |
|-------|----------------------------|
| No part selected | Search parts… |
| Part selected | {partId} (trigger); part name beside label |
| Filter input placeholder | Filter parts |
| Min chars not met | Type at least 2 characters to search |
| No filter matches | No parts match "{query}" |

### Color picker (FilterablePicker)

| State | Trigger label |
|-------|---------------|
| No part selected (disabled) | Select a part first |
| Part selected, no color | Select color |
| Color selected | {Color name} ({id}) |
| Filter placeholder | Filter colors |
| No filter matches | No colors match "{query}" |
| None option | None (clears color) |

## Keyboard & focus

| Requirement | Behavior |
|-------------|----------|
| New lot initial focus | On mount (`lotId` absent), part search filter is focused so the worker can type immediately |
| Tab order (fields) | Part → Color → Count (condition skipped) |
| Shift+Tab | Reverses the same field order |
| Picker panel open | **Tab** from filter closes panel and moves focus to the **next** field; **Shift+Tab** from filter closes panel and moves focus to the **previous** field |
| Save buttons | Follow count in natural tab order |

## Messages & feedback

### Duplicate lot confirmation (LotForm)

| Message | Type | Trigger |
|---------|------|---------|
| Duplicate lot | Dialog title | Save returns `duplicate: true` |
| Already counted by {name} (qty {n}). Add {entered} more? | Dialog body | Same — conflicting `(partId, colorId, condition)` with different `lotId` |
| Cancel | Dialog button | Dismisses dialog; form unchanged |
| Confirm | Dialog button | Re-saves with merge; **existing lot qty += entered qty**; normal success flow |
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

## User actions

| Action | Preconditions | Outcome |
|--------|---------------|---------|
| Search / select part | — | Sets partId; enables color list for part |
| Select color | Part selected | Sets colorId |
| Adjust count | — | Sets qty (integer, min 0) |
| Save | — | Calls saveLot; on duplicate shows confirm dialog; on success clears form (or exits edit route), focuses part search |
| Save and Add Another | — | On success: keeps partId, clears color, resets qty to 1, focuses color picker |
| Confirm duplicate save | Duplicate dialog open | Merges qty into existing lot; completes pending Save or Save and Add Another flow |
| Cancel duplicate save | Duplicate dialog open | Closes dialog; form unchanged |

## Data requirements

### Read

| Field / entity | Source (live) | Notes |
|----------------|---------------|-------|
| Existing lot (edit) | `GET /api/v1/sessions/:id/lots/:lotId` | Pre-fill part, color, qty |
| Part catalog search | `GET /bricklink/parts` or proxy | PartSearchCombobox |
| Colors for part | `GET /bricklink/parts/:partId/colors` | ColorPicker options |
| Session partOutOptions | Session record | Condition display and save value |

### Write

| Operation | Endpoint (live) | Notes |
|-----------|-----------------|-------|
| Create/update lot | `POST /api/v1/sessions/:id/lots` | Returns `{ lot, duplicate?, existing? }` on duplicate key |
| Duplicate merge (Unit 0 fixture) | Same payload + `mergeDuplicate: true` | Adds entered qty to existing lot |
| Duplicate key (first attempt) | Same endpoint | `duplicate: true`, `existing: { createdBy, qty }` |

Unique key: `(sessionId, partId, colorId, condition)`.

## Acceptance criteria

- [ ] Part lookup, color, condition label, and count fit on one mobile viewport without scrolling main form
- [ ] Worker can search parts (min 2 chars) and select from filtered list
- [ ] Color picker disabled until part selected; shows part-specific colors
- [ ] Condition shown as read-only inline label from session (`Condition: New` / `Condition: Used`)
- [ ] Tab and Shift+Tab cycle part → color → count (condition not in tab order)
- [ ] New lot: part search filter focused on load for immediate entry
- [ ] **Save** persists lot, clears form, focuses part search (new lot)
- [ ] **Save and Add Another** keeps part id, resets color and qty, focuses color picker
- [ ] **Save** on edit route updates lot without duplicate dialog for same key
- [ ] Duplicate lot shows confirm dialog with creator and existing qty
- [ ] Confirm adds entered qty to existing lot and completes save
- [ ] Cancel duplicate leaves form data intact
- [ ] One lot per form — no multi-line entry on same screen

## Storyboard status

### Implemented (Unit 0)

- Full form with part search, color picker, read-only session condition, stepped count input
- Tab / Shift+Tab field chain (part → color → count)
- Save / Save and Add Another with focus management
- Duplicate confirm dialog with qty merge on confirm
- Edit mode via optional `lotId` route param

### Gaps (Units 1–4)

- No client-side required-field validation before save
- No live part search / color API
- No Bricklink inventory duplicate hint during entry
- No WebSocket updates when another worker saves same lot
- No explicit cup assignment UI on this view (defaults to first cup in fixture)
- Live API `mergeDuplicate` contract (fixture only in Unit 0)

### `data-testid` inventory

| Test id | Element |
|---------|---------|
| `lot-form-view` | Page container |
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

- Required validation: block save without part and/or color?
- Should qty 0 be allowed on save?
- Cup selection: auto-assign vs explicit picker on save?
- Show existing lot qty inline before save (proactive duplicate hint)?
