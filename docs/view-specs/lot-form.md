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

Workers record one lot at a time: part id + color + condition + quantity. A lot is the unique counting key within a session. The form must fit on one mobile viewport without scrolling primary controls.

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
| Duplicate save failure | Stays on form; duplicate alert shown |

## Layout & controls

| Element | Copy / behavior |
|---------|-----------------|
| Page heading | Lot entry |
| Part field label | Part number (+ resolved part name when valid) |
| Color label | Color |
| Condition label | Condition — radio **New** / **Used** |
| Count label | Count — stepped swipe number input (`min` 0) |
| Primary button | Save |
| Secondary button | Save and Add Another |

### Condition defaults

| Session condition mix | Default lot condition |
|-----------------------|----------------------|
| `new` | New (N) |
| `used` | Used (U) |
| `mixed` | Last choice in `sessionStorage`, else Used |

Mixed sessions persist last condition choice per session after successful save.

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

## Messages & feedback

### Alerts (LotForm)

| Message | Type | Trigger |
|---------|------|---------|
| Duplicate lot | Destructive alert title | Save returns `duplicate: true` |
| Lot already exists — counted by {name} (qty {n}) | Destructive alert body | Same — another lot exists with same `(partId, colorId, condition)` and different `lotId` |
| {name} = Unknown | Body fallback | Original worker record missing |

Duplicate alert is cleared at the start of each save attempt and after successful save.

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
| Select condition | — | Sets N or U |
| Adjust count | — | Sets qty (integer, min 0) |
| Save | — | Calls saveLot; on success clears form (or exits edit route), focuses part search |
| Save and Add Another | — | On success: keeps partId, clears color, resets qty to 1, applies default condition, focuses color picker |
| Save (duplicate) | Conflicting lot key | Shows duplicate alert; form unchanged |

## Data requirements

### Read

| Field / entity | Source (live) | Notes |
|----------------|---------------|-------|
| Existing lot (edit) | `GET /api/v1/sessions/:id/lots/:lotId` | Pre-fill form |
| Part catalog search | `GET /bricklink/parts` or proxy | PartSearchCombobox |
| Colors for part | `GET /bricklink/parts/:partId/colors` | ColorPicker options |
| Session partOutOptions | Session record | Condition default |

### Write

| Operation | Endpoint (live) | Notes |
|-----------|-----------------|-------|
| Create/update lot | `POST /api/v1/sessions/:id/lots` | Returns `{ lot, duplicate?, existing? }` on duplicate key |
| Duplicate key | Same endpoint | `duplicate: true`, `existing: { createdBy, qty }` |

Unique key: `(sessionId, partId, colorId, condition)`.

## Acceptance criteria

- [ ] Part lookup, color, condition, and count fit on one mobile viewport without scrolling main form
- [ ] Worker can search parts (min 2 chars) and select from filtered list
- [ ] Color picker disabled until part selected; shows part-specific colors
- [ ] Condition defaults match session new/used/mixed rules
- [ ] **Save** persists lot, clears form, focuses part search (new lot)
- [ ] **Save and Add Another** keeps part id, resets color and qty, focuses color picker
- [ ] **Save** on edit route updates lot without duplicate alert for same key
- [ ] Duplicate lot shows destructive alert with creator display name and existing qty
- [ ] Duplicate alert does not clear form data
- [ ] One lot per form — no multi-line entry on same screen

## Storyboard status

### Implemented (Unit 0)

- Full form with part search, color picker, condition, stepped count input
- Save / Save and Add Another with focus management
- Fixture duplicate detection on `(partId, colorId, condition)`
- Condition defaults from session + sessionStorage for mixed
- Edit mode via optional `lotId` route param

### Gaps (Units 1–4)

- No client-side required-field validation before save
- No live part search / color API
- No Bricklink inventory duplicate hint during entry
- No WebSocket updates when another worker saves same lot
- No explicit cup assignment UI on this view (defaults to first cup in fixture)

### `data-testid` inventory

| Test id | Element |
|---------|---------|
| `lot-form-view` | Page container |
| `lot-form` | Form root |
| `part-search-*` | Part picker (trigger, panel, filter, options) |
| `part-search-resolved` | Resolved part name |
| `color-picker-*` | Color picker |
| `cond-n`, `cond-u` | Condition radios |
| `lot-qty`, `lot-qty-input`, etc. | Count input |
| `duplicate-alert` | Duplicate lot alert |
| `save-lot` | Save button |
| `save-and-add-another` | Save and Add Another button |

## Open questions

- Required validation: block save without part and/or color?
- Should qty 0 be allowed on save?
- Cup selection: auto-assign vs explicit picker on save?
- Show existing lot qty inline before save (proactive duplicate hint)?
