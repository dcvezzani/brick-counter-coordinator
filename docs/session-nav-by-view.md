# SessionNav by view

**Status:** Draft — MVP reference for spec consistency  
**Last updated:** 2026-06-12  
**Audience:** Dave, implementers, spec authors

Canonical bottom bar: [`SessionNav`](../src/components/SessionNav.vue) inside [`AppShell`](../src/components/AppShell.vue). Container `data-testid="session-nav"`.

**Sources:** [view-specs/README.md — SessionNav](./view-specs/README.md#sessionnav-bottom-bar), per-view specs, [process-roles.md](./process-roles.md).

**MVP principle:** Show nav items whenever the bar is visible unless a view spec **explicitly** hides an item by phase. No role-based hiding. When specs were ambiguous (e.g. **Lots** before `organizing`), this doc chooses the **open** option: keep the nav item visible; the destination view handles empty or out-of-phase copy.

---

## Global rules

### When the whole bar is hidden

| Condition | SessionNav |
|-----------|------------|
| Route has **no** `sessionId` (**Home**, **New session**) | **Hidden** |
| **Part-out import** while `phase === 'importing'` | **Hidden** |
| `phase === 'closed'` (worker should not remain on session routes) | **Hidden** — session routes redirect **Home** |

### When the bar is shown

Any route matching `/session/:sessionId/*` **except** Part-out import during `importing`, and except `closed` (redirect before render).

### Nav item visibility by session phase

Applies whenever SessionNav is shown. **Home** and **Lot** follow “when nav shown.” **Cups**, **Lots**, and **Reconcile** are phase-gated per locked view specs.

| Nav label | `data-testid` | Target route | `importing` | `counting` | `reconciling` | `organizing` | `updating_inventory` |
|-----------|---------------|--------------|-------------|------------|---------------|--------------|----------------------|
| **Home** | `nav-home` | `/` | — | ✓ | ✓ | ✓ | ✓ |
| **Cups** | `nav-cups` | `/session/:sessionId/cups` | — | ✓ | ✓ | ✓ | ✗ |
| **Lot** | `nav-lot` | `/session/:sessionId/lot` | — | ✓ | ✓ | ✓ | ✓ |
| **Lots** | `nav-lots` | `/session/:sessionId/lots?mode=organizer` | — | ✓ | ✓ | ✓ | ✓ |
| **Reconcile** | `nav-reconciliation` | `/session/:sessionId/reconciliation` | — | ✓ | ✓ | ✓ | ✓ |

`—` = whole bar hidden (importing). ✓ = item visible and tappable. ✗ = item **not rendered** (or disabled with no navigation — prefer **not rendered** for MVP).

**Lots (MVP open rule):** Visible in every phase where SessionNav is shown, including `counting`, `reconciling`, and `updating_inventory`. Organizer **workflow** still starts in `organizing`; earlier phases show a simple empty or status message on the List lots view (see below). Resolves open question in [list-lots.md](./view-specs/list-lots.md#open-questions).

**Active item:** Highlight the nav button that matches the current primary view. Cup-mode List lots (`?mode=cup`) is a drill-down from **Cups** — highlight **Cups**, not **Lots**.

---

## Per view

### 1. Home

| Field | Value |
|-------|-------|
| **Route** | `/` |
| **SessionNav** | **Not shown** (no `sessionId`) |

---

### 2. New session

| Field | Value |
|-------|-------|
| **Route** | `/session/new` |
| **SessionNav** | **Not shown** (no `sessionId` until after create) |

---

### 3. Part-out import

| Field | Value |
|-------|-------|
| **Route** | `/session/:sessionId/import` |

#### SessionNav by condition

| Condition | SessionNav bar | Notes |
|-----------|----------------|-------|
| `phase === 'importing'` | **Hidden** | Only session-scoped screen during import ([part-out-import.md](./view-specs/part-out-import.md#entry--exit)) |
| After confirm → `counting` | Worker navigates to **Lot form**; nav **shown** on next view | — |

Fetch UI states (Loading, Error, Ready) do **not** change SessionNav — bar stays hidden until phase leaves `importing`.

---

### 4. Lot form

| Field | Value |
|-------|-------|
| **Routes** | `/session/:sessionId/lot`, `/session/:sessionId/lot/:lotId`, optional `?cupId=` |
| **Active nav item** | **Lot** |

#### SessionNav by `phase`

| Phase | Bar shown? | Home | Cups | Lot | Lots | Reconcile |
|-------|------------|------|------|-----|------|-----------|
| `importing` | — | — | — | — | — | — |
| `counting` | ✓ | ✓ | ✓ | ✓ (active) | ✓ | ✓ |
| `reconciling` | ✓ | ✓ | ✓ | ✓ (active) | ✓ | ✓ |
| `organizing` | ✓ | ✓ | ✓ | ✓ (active) | ✓ | ✓ |
| `updating_inventory` | ✓ | ✓ | ✗ | ✓ (active) | ✓ | ✓ |
| `closed` | Redirect Home | — | — | — | — | — |

New lot vs edit lot does **not** change SessionNav.

---

### 5. List cups

| Field | Value |
|-------|-------|
| **Route** | `/session/:sessionId/cups` |
| **Active nav item** | **Cups** |
| **Reachability** | Direct nav only when `phase` is `counting`, `reconciling`, or `organizing` ([list-cups.md](./view-specs/list-cups.md#locked-decisions)) |

#### SessionNav by `phase`

| Phase | Bar shown? | Home | Cups | Lot | Lots | Reconcile |
|-------|------------|------|------|-----|------|-----------|
| `importing` | — | — | — | — | — | — |
| `counting` | ✓ | ✓ | ✓ (active) | ✓ | ✓ | ✓ |
| `reconciling` | ✓ | ✓ | ✓ (active) | ✓ | ✓ | ✓ |
| `organizing` | ✓ | ✓ | ✓ (active) | ✓ | ✓ | ✓ |
| `updating_inventory` | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| `closed` | Redirect Home | — | — | — | — | — |

#### View-level conditions (same nav)

| Condition | SessionNav | Page behavior |
|-----------|------------|---------------|
| `GET …/cups` returns **empty** array on mount | Unchanged (if phase allows this view) | Redirect to **Lot form** (`/lot`) — worker may not see List cups UI ([list-cups.md](./view-specs/list-cups.md#empty-states)) |
| Cups exist | Standard row above | — |

---

### 6. List lots

Two product modes on one route; **SessionNav is identical** in both.

| Mode | Route | Active nav item |
|------|-------|-----------------|
| **cup** | `?mode=cup&cupId=` | **Cups** (drill-down from cups) |
| **organizer** | `?mode=organizer` | **Lots** |

#### SessionNav by `phase` — organizer mode (`?mode=organizer`)

| Phase | Bar shown? | Home | Cups | Lot | Lots | Reconcile |
|-------|------------|------|------|-----|------|-----------|
| `importing` | — | — | — | — | — | — |
| `counting` | ✓ | ✓ | ✓ | ✓ | ✓ (active) | ✓ |
| `reconciling` | ✓ | ✓ | ✓ | ✓ | ✓ (active) | ✓ |
| `organizing` | ✓ | ✓ | ✓ | ✓ | ✓ (active) | ✓ |
| `updating_inventory` | ✓ | ✓ | ✗ | ✓ | ✓ (active) | ✓ |
| `closed` | Redirect Home | — | — | — | — | — |

**MVP destination when phase ≠ `organizing` (open rule):**

| Phase | Tapping **Lots** nav or landing via nav |
|-------|----------------------------------------|
| `counting` | Organizer mode page with short helper: organizing starts after reconciliation (e.g. “Pick lists are available in the organizing phase.”). No **Split list** / status actions. |
| `reconciling` | Same guarded empty state — reconciliation must finish and phase advance first. |
| `organizing` | Full organizer UI per [list-lots.md](./view-specs/list-lots.md). |
| `updating_inventory` | Read-only or completion message: organizing done; use **Reconcile** for export. No phase-advance buttons on this view. |

#### SessionNav by `phase` — cup mode (`?mode=cup&cupId=`)

Same button visibility as organizer mode table above; **Cups** is active.

| Condition | SessionNav | Page behavior |
|-----------|------------|---------------|
| Missing or invalid `cupId` | Unchanged | Redirect **List cups** or empty state — do not list all session lots ([list-lots.md](./view-specs/list-lots.md#locked-decisions)) |
| Valid `cupId` | Standard | Cup-filtered lot table |

---

### 7. Part-out reconciliation

| Field | Value |
|-------|-------|
| **Route** | `/session/:sessionId/reconciliation` |
| **Active nav item** | **Reconcile** |

#### SessionNav by `phase`

| Phase | Bar shown? | Home | Cups | Lot | Lots | Reconcile |
|-------|------------|------|------|-----|------|-----------|
| `importing` | — | — | — | — | — | — |
| `counting` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (active) |
| `reconciling` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (active) |
| `organizing` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (active) |
| `updating_inventory` | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ (active) |
| `closed` | Redirect Home | — | — | — | — | — |

SessionNav does **not** change between reconciliation **page** phases; only **in-page** primary actions differ ([part-out-reconciliation.md](./view-specs/part-out-reconciliation.md#layout--controls)):

| Phase | In-page primary actions (not SessionNav) |
|-------|------------------------------------------|
| `counting` | Preview only — **Edit** / **Resolve** / **Declare ready to organize** disabled |
| `reconciling` | **Edit**, **Resolve**, **Declare ready to organize** when preconditions met |
| `organizing` | **Return to reconciling** (optional) |
| `updating_inventory` | **Reconciled — export XML**, **Mark session complete** (after export) |

Fetch/reconciliation table tabs do **not** affect SessionNav.

---

## Quick lookup: view → visible nav buttons

Summary when SessionNav is **shown** (correct phase row from tables above).

| View | Typical `phase` | Nav buttons shown |
|------|-----------------|-------------------|
| **Lot form** | `counting` – `updating_inventory` | Home, Cups†, Lot, Lots, Reconcile |
| **List cups** | `counting` – `organizing` | Home, Cups, Lot, Lots, Reconcile |
| **List lots** (organizer) | any shown phase | Home, Cups†, Lot, Lots, Reconcile |
| **List lots** (cup) | `counting` – `organizing` | Home, Cups, Lot, Lots, Reconcile |
| **Part-out reconciliation** | `counting` – `updating_inventory` | Home, Cups†, Lot, Lots, Reconcile |

† **Cups** hidden when `phase === 'updating_inventory'`.

---

## Consistency checklist (for spec reviews)

Use this when editing view specs or implementing `SessionNav.vue`:

- [ ] SessionNav hidden on **Home**, **New session**, and **Part-out import** during `importing`
- [ ] **Cups** hidden only in `updating_inventory` and `closed` (and whole bar hidden in `importing`)
- [ ] **Reconcile** hidden only in `importing` and `closed`
- [ ] **Lot**, **Lots**, and **Home** visible whenever the bar is shown (MVP)
- [ ] No nav item hidden by worker role or `lead_worker_id`
- [ ] Cup-mode List lots highlights **Cups**, not **Lots**
- [ ] `session.phase` WebSocket updates nav visibility without full page reload
- [ ] `closed` session: no SessionNav — redirect **Home**

---

## Related docs

- [View specs — Shared chrome](./view-specs/README.md#shared-chrome)
- [Process roles](./process-roles.md)
- [View navigation diagram](./diagrams/view-navigation.mmd)
- [Session phases state diagram](./diagrams/session-phases-state.mmd)

## Open follow-ups

| Topic | This doc’s MVP stance | Promote to view spec when locked |
|-------|----------------------|----------------------------------|
| **Lots** nav before `organizing` | Show nav; guarded empty state on destination | Update [list-lots.md](./view-specs/list-lots.md) open question |
| **Cups** item: hide vs disable in `updating_inventory` | Hide (not rendered) | Align [list-cups.md](./view-specs/list-cups.md) if disable preferred |
| Exact copy for out-of-phase **Lots** empty state | Placeholder guidance above | Product copy pass |
