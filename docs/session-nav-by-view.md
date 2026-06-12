# SessionNav by view

**Status:** Locked — Dave 2026-06-12 (MVP reference; organizer guard copy in [list-lots.md](./view-specs/list-lots.md#empty-states))  
**Audience:** Dave, implementers, spec authors

Canonical bottom bar: [`SessionNav`](../src/components/SessionNav.vue) inside [`AppShell`](../src/components/AppShell.vue). Container `data-testid="session-nav"`.

**Sources:** [view-specs/README.md — SessionNav](./view-specs/README.md#sessionnav-bottom-bar), per-view specs, [process-roles.md](./process-roles.md).

**MVP principles:**

- **Lots** and **Lot** nav items are **always visible** whenever SessionNav is shown (after session create/join).
- **Cups** and **Reconcile** follow phase rules below.
- No role-based hiding ([process-roles.md](./process-roles.md)).
- Phase advances (`POST …/sessions/:id/phase`) — any joined worker when the UI offers the control.

---

## Global rules

### When the whole bar is hidden

| Condition | SessionNav |
|-----------|------------|
| Route has **no** `sessionId` (**Home**, **New session**) | **Hidden** |
| **Part-out import** while `phase === 'importing'` | **Hidden** |
| `phase === 'closed'` | **Hidden** — session routes redirect **Home** |

### When the bar is shown

Any route matching `/session/:sessionId/*` **except** Part-out import during `importing`, and except `closed` (redirect before render).

### Nav item visibility by session phase

| Nav label | `data-testid` | Target route | `importing` | `counting` | `reconciling` | `organizing` | `updating_inventory` |
|-----------|---------------|--------------|-------------|------------|---------------|--------------|----------------------|
| **Home** | `nav-home` | `/` | — | ✓ | ✓ | ✓ | ✓ |
| **Cups** | `nav-cups` | `/session/:sessionId/cups` | — | ✓ | ✓ | ✓ | ✗ |
| **Lot** | `nav-lot` | `/session/:sessionId/lot` | — | ✓ | ✓ | ✓ | ✓ |
| **Lots** | `nav-lots` | `/session/:sessionId/lots?mode=organizer` | — | ✓ | ✓ | ✓ | ✓ |
| **Reconcile** | `nav-reconciliation` | `/session/:sessionId/reconciliation` | — | ✓ | ✓ | ✓ | ✓ |

`—` = whole bar hidden. ✓ = item visible and tappable. ✗ = item not rendered.

**Lots (locked):** Always visible whenever SessionNav is shown. Organizer **workflow** UI on the destination is full only in `organizing`; earlier phases show a simple empty/helper state ([list-lots.md](./view-specs/list-lots.md#locked-decisions)).

**Active item:** Highlight the nav button matching the current primary view. Cup-mode List lots (`?mode=cup`) highlights **Cups**, not **Lots**.

---

## Per view

### 1. Home — **No SessionNav**

### 2. New session — **No SessionNav**

### 3. Part-out import

| Condition | SessionNav |
|-----------|------------|
| `phase === 'importing'` | **Hidden** |
| After confirm → `counting` | Nav appears on **Lot form** |

Fetch states (Loading, Error, Ready) do not change SessionNav.

### 4. Lot form

**Active:** Lot

| Phase | Home | Cups | Lot | Lots | Reconcile |
|-------|------|------|-----|------|-----------|
| `counting` – `organizing` | ✓ | ✓ | active | ✓ | ✓ |
| `updating_inventory` | ✓ | ✗ | active | ✓ | ✓ |

### 5. List cups

**Active:** Cups · Reachable via nav in `counting`, `reconciling`, `organizing` only.

| Phase | Home | Cups | Lot | Lots | Reconcile |
|-------|------|------|-----|------|-----------|
| `counting` – `organizing` | ✓ | active | ✓ | ✓ | ✓ |

**Empty cups on mount:** redirect to `/lot` (nav unchanged if worker lands on Lot form).

### 6. List lots

| Mode | Active nav |
|------|------------|
| `?mode=organizer` | **Lots** |
| `?mode=cup&cupId=` | **Cups** |

Same nav buttons in both modes:

| Phase | Home | Cups | Lot | Lots | Reconcile |
|-------|------|------|-----|------|-----------|
| `counting` – `updating_inventory` | ✓ | ✓† | ✓ | active‡ | ✓ |

† Cup mode: **Cups** active. ‡ Organizer mode: **Lots** active. **Cups** hidden in `updating_inventory`.

**Organizer mode when `phase` ≠ `organizing`:** Phase-specific guard copy only ([list-lots.md](./view-specs/list-lots.md#empty-states)):

| `phase` | Helper (points worker to SessionNav) |
|---------|--------------------------------------|
| `counting` | …Open **Reconcile** when counting is done. |
| `reconciling` | …Finish on **Reconcile**, then declare ready to organize. |
| `updating_inventory` | …Open **Reconcile** to **export** your Bricklink update. |

**Cup mode — missing / invalid `cupId`:** Missing → immediate redirect `/cups`. Invalid → redirect after `GET …/cups` confirms id absent.

### 7. Part-out reconciliation

**Active:** Reconcile

| Phase | Home | Cups | Lot | Lots | Reconcile |
|-------|------|------|-----|------|-----------|
| `counting` – `organizing` | ✓ | ✓ | ✓ | ✓ | active |
| `updating_inventory` | ✓ | ✗ | ✓ | ✓ | active |

**In-page primary actions** (not SessionNav):

| Phase | Primary action |
|-------|----------------|
| `counting` | **Compare with Part-Out List** → `reconciling` |
| `reconciling` | **Declare ready to organize** (when all rows resolved) |
| `organizing` | **Return to reconciling** (optional) |
| `updating_inventory` | **Reconciled — export XML** · **Mark session complete** (after export) |

---

## Quick lookup

| View | Nav buttons (when bar shown) |
|------|------------------------------|
| **Lot form** | Home, Cups†, Lot, Lots, Reconcile |
| **List cups** | Home, Cups, Lot, Lots, Reconcile |
| **List lots** | Home, Cups†, Lot, Lots, Reconcile |
| **Part-out reconciliation** | Home, Cups†, Lot, Lots, Reconcile |

† **Cups** hidden in `updating_inventory`.

---

## Consistency checklist

- [ ] SessionNav hidden: **Home**, **New session**, **Part-out import** during `importing`, `closed`
- [ ] **Lots** always visible when bar shown
- [ ] **Cups** hidden only in `updating_inventory` (+ bar hidden in `importing` / `closed`)
- [ ] **Reconcile** hidden only in `importing` / `closed`
- [ ] No nav gating by role
- [ ] Cup-mode List lots highlights **Cups**
- [ ] **Compare with Part-Out List** on reconciliation view in `counting`

---

## Related docs

- [View specs — Shared chrome](./view-specs/README.md#shared-chrome)
- [Process roles](./process-roles.md)
- [View navigation diagram](./diagrams/view-navigation.mmd)
- [Session phases state diagram](./diagrams/session-phases-state.mmd)
- [Reconciliation workflow](./diagrams/reconciliation-workflow.mmd)
