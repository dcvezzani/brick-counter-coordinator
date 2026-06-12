# Home

**Status:** Draft — for Dave review  
**Last updated:** 2026-06-12

---

## Overview

| Field | Value |
|-------|-------|
| **View name** | Home |
| **Route** | `/` |
| **Route params** | — |
| **Query params** | — |
| **Primary actor(s)** | Join: any worker (counter, lead, organizer). Create: session lead (process role — any worker with a display name may tap **Create new session**). |
| **Delivery unit** | 0 (fixture) → 1 (live join/list) |
| **Source file** | [`src/views/HomeView.vue`](../../src/views/HomeView.vue) |

## Related docs

- [Product Spec — Application views](../../feature/part-out-coordinator/product-spec.md#application-views)
- [Product Spec — Session lifecycle](../../feature/part-out-coordinator/product-spec.md#session-lifecycle)
- [Product Spec — Scenario 1: Home → session](../../feature/part-out-coordinator/product-spec.md#key-scenarios)
- [Tech Spec — Sessions API](../../feature/part-out-coordinator/tech-spec.md#sessions-unit-1)
- [Planned views & services — Home](../support/planned-views-services.md#1-home)
- [Storyboard walkthrough § 1. Home](../support/storyboard.md#1-home)
- [Shared chrome](./README.md#shared-chrome)
- [View navigation diagram](../diagrams/view-navigation.mmd)
- [Session phases diagram](../diagrams/session-phases-state.mmd)

## Purpose

Session entry point. Workers identify themselves with a display name and either create a new part-out session (lead) or join an existing open session (any worker).

**Copy note:** Product Spec prose uses “enter an existing session”; the UI button label is **Enter existing session** (canonical for layout and `data-testid`).

## Locked decisions

| Topic | Decision |
|-------|----------|
| **Session lifecycle** | **Model C** — six phases: `importing` → `counting` → `reconciling` → `organizing` → `updating_inventory` → `closed`. XML export runs in `updating_inventory` after organizer lists complete; **Mark session complete** closes the session after manual Bricklink handoff. See [session-phases-state.mmd](../diagrams/session-phases-state.mmd). |
| **Post-join routing** | Phase-aware via [`sessionRouteForPhase`](../../src/lib/session-phase-routing.js); counting default is **Lot form**, not List cups |
| **Open session list** | All sessions where `phase !== 'closed'` |
| **Display name** | Trim + case-fold (lowercase) on client and server before uniqueness check and persist |
| **Re-join** | No “already joined” session-picker special casing for MVP; duplicate normalized name in a session returns **409** |
| **Create button** | Process guideline (session lead creates); UI does not block other workers |

## Entry & exit

### How users arrive

| From | Path / action |
|------|---------------|
| App launch / bookmark | `/` |
| SessionNav **Home** | `/` (from any session view) |
| Legacy / bookmark | `/sessions` redirects to `/` (join UI remains the Home dialog) |

### Where actions navigate

| Action | Destination |
|--------|-------------|
| **Create new session** (with display name) | `/session/new` |
| Direct `/session/new` without display name | Redirect to `/` ([new-session.md](./new-session.md#entry--exit)) |
| **Enter existing session** → select session | Phase-aware route (see [Post-join routing](#post-join-routing)) |
| Dev playgrounds (dev build only, non-product) | `/dev/*` |

### Post-join routing

After a successful join, navigate by the joined session’s `phase` (from join response or session summary):

| Phase | Route |
|-------|-------|
| `importing` | `/session/:sessionId/import` |
| `counting` | `/session/:sessionId/lot` |
| `reconciling` | `/session/:sessionId/reconciliation` |
| `organizing` | `/session/:sessionId/lots?mode=organizer` |
| `updating_inventory` | `/session/:sessionId/reconciliation` |
| `closed` | Must not appear in open session list; any session-scoped route redirects to Home |

## Layout & controls

| Element | Copy / behavior |
|---------|-----------------|
| Page heading | Welcome |
| Helper text | Enter your name, then create or join a counting session. |
| Label | Display name |
| Input placeholder | Your name |
| Primary button | Create new session |
| Secondary button | Enter existing session |
| Dev buttons (dev only) | Dev: Ternary swipe playground, Dev: Segmented swipe playground, Dev: Swipe number playground, Dev: Stepped swipe number playground — **non-product**; `import.meta.env.DEV` only |

### Open sessions dialog

Shown after **Enter existing session** when display name is valid.

| Element | Copy / behavior |
|---------|-----------------|
| Dialog title | Open sessions |
| Dialog description | Select a session to join as {displayName} (normalized) |
| Session row | Session name (bold); subtitle: `{setNumber} · {phaseLabel} · {workerCount} workers` |
| Loading | Spinner or skeleton rows while `GET /api/v1/sessions` is in flight (Unit 1+) |
| Empty state | “No open sessions right now” when list is empty |
| Fetch error | Destructive alert inside dialog + **Retry** (Unit 1+) |

**Phase labels** (human-readable in subtitle; map from server `phase` enum):

| `phase` | Label |
|---------|-------|
| `importing` | Importing |
| `counting` | Counting |
| `reconciling` | Reconciling |
| `organizing` | Organizing |
| `updating_inventory` | Updating inventory |

## Display name rules

Applied on **create**, **join**, and `sessionStorage` writes (client and server):

1. **Trim** leading/trailing whitespace.
2. **Case-fold** to a canonical form (lowercase) before uniqueness check and persist.
3. **Uniqueness** is per session: `"Alex"` and `" alex "` are duplicates after normalization.
4. **409 Conflict** on join: show fixed copy (see Messages); do not auto-suffix or silently rename.

Implementation: [`normalizeDisplayName`](../../src/lib/display-name.js).

## Client state

| When | `sessionStorage` keys | In-memory (`useSession`) |
|------|----------------------|--------------------------|
| Create new session | `workerDisplayName` (normalized) | — |
| Join success | `workerDisplayName`, `currentSessionId`, `currentWorkerId` (normalized name) | `setCurrentWorker(worker)` |

Unit 1+: connect `useWebSocket` after successful join (before navigation). Display name for **create** is passed via client storage until New session submit; not persisted server-side until session create.

## Toast notifications

When the user needs to be notified (non-blocking status or outcome feedback on Home):

| Requirement | Behavior |
|-------------|----------|
| Presentation | Toast the user can see and read; after a short display time the toast **fades out** and is no longer visible |
| Position | **Top-right** corner of the display device’s viewport (fixed to viewport, not scrolled page content) |
| Display time (TTL) | **Configurable** per toast invocation (app-level default is acceptable for MVP) |

**When to use toast vs other feedback:**

| Pattern | Use for |
|---------|---------|
| **Toast** | Transient notifications the user should notice but does not need to dismiss manually |
| **Destructive alert (page)** | Blocking validation before an action can proceed (e.g. empty display name) |
| **Destructive alert / empty state (dialog)** | Errors or empty state while the open sessions dialog is open and the user must act |

Join success does **not** use a toast — navigation to the phase-appropriate view is the confirmation.

## Messages & feedback

| Message | Type | Trigger | Placement |
|---------|------|---------|-----------|
| Enter your display name first | Destructive alert | **Create new session** or **Enter existing session** tapped with empty display name | Page (below input) |
| That name is already taken in this session — pick another name. | Destructive alert | Join fails with duplicate display name (409 or fixture `DUPLICATE_NAME`) | **Inside open sessions dialog**; dialog stays open |
| {error message} | Destructive alert | Other join errors | **Inside open sessions dialog** |
| No open sessions right now | Hint / empty state | `GET /sessions` returns empty array | Inside dialog |
| Failed to load sessions. Try again. | Destructive alert + Retry | `GET /sessions` fails (Unit 1+) | Inside dialog |

Transient notifications on Home (when added) use [toast notifications](#toast-notifications), not inline alerts.

## User actions

| Action | Preconditions | Outcome |
|--------|---------------|---------|
| Enter display name | — | Required before create/join succeed; validated on button click (buttons remain enabled) |
| Create new session | Non-empty display name (normalized) | Stores normalized name in `sessionStorage` (`workerDisplayName`); navigates to New session |
| Enter existing session | Non-empty display name (normalized) | Opens Open sessions dialog; loads open sessions (fixture or `GET /api/v1/sessions`) |
| Select session in dialog | Valid session; name not taken in session | Joins session, persists client state, connects WebSocket (Unit 1+), navigates per [Post-join routing](#post-join-routing) |
| Dismiss dialog | — | Closes dialog; no navigation |
| Open dev playground | Dev build only | Navigates to `/dev/*` route |

## Data requirements

### Read

| Field / entity | Source (live) | Notes |
|----------------|---------------|-------|
| Open sessions list | `GET /api/v1/sessions` | Set number, name, phase, worker count per session. **Filter:** all sessions where `phase !== 'closed'` (`importing`, `counting`, `reconciling`, `organizing`, `updating_inventory`). No “already joined” special casing for MVP. |

### Write

| Operation | Endpoint (live) | Notes |
|-----------|-----------------|-------|
| Join session | `POST /api/v1/sessions/:id/join` `{ displayName }` | Server normalizes name; returns worker record + session phase; **409 Conflict** if normalized name taken (no auto-suffix) |

## Acceptance criteria

- [ ] Worker can enter a display name before any session action
- [ ] Empty display name blocks create and join with clear error message on the page
- [ ] Display names are trimmed and case-folded; `"Alex"` and `" alex "` are treated as duplicates within a session
- [ ] **Create new session** navigates to New session with normalized name in `sessionStorage`
- [ ] **Enter existing session** shows a picker of non-`closed` sessions with set, phase label, and worker count
- [ ] Open sessions dialog shows loading, empty, and fetch-error states (Unit 1+)
- [ ] Join errors (duplicate name, other failures) appear inside the dialog; dialog stays open on 409
- [ ] Selecting a session joins as the normalized display name and lands on the phase-appropriate route (`counting` → Lot form, `updating_inventory` → reconciliation)
- [ ] Duplicate display name in a session is rejected with a clear message (no silent rename)
- [ ] SessionNav is **not** shown on Home (no `sessionId` in route)
- [ ] `/sessions` redirects to Home
- [ ] Storyboard mode shows fixture session list (non-persistent sample data)
- [ ] Transient user notifications on Home use toasts: top-right viewport, readable copy, configurable TTL, auto-fade dismiss

## Storyboard status

### Implemented (Unit 0)

- Display name input and validation with trim + case-fold via `normalizeDisplayName`
- Create → New session with normalized `workerDisplayName` in `sessionStorage`
- Join dialog with fixture `OPEN_SESSIONS` (non-`closed` filter)
- Human-readable phase labels in session picker (`sessionPhaseLabel`)
- Duplicate name detection via fixture `joinSession` (`DUPLICATE_NAME`; case-insensitive after normalization)
- Join errors inside open-sessions dialog; page errors for empty name before dialog
- Empty state when no open sessions (`open-sessions-empty`)
- Phase-aware post-join routing via `sessionRouteForPhase` (including `updating_inventory` → reconciliation)
- `sessionStorage` on join: `workerDisplayName`, `currentSessionId`, `currentWorkerId`
- Dev-only playground links
- `data-testid`: `open-sessions-dialog`, `open-sessions-empty`

### Gaps (Units 1–4)

- Live `GET /api/v1/sessions` for open session discovery (non-`closed` filter)
- Live `POST …/join` with 409 handling and server-side name normalization
- Loading and fetch-error states in open sessions dialog (`open-sessions-loading`, `open-sessions-retry`)
- Connect `useWebSocket` after successful join
- Toast notification host (top-right, configurable TTL, auto-fade) for transient Home feedback

### Out of scope (MVP)

- **Resume last session** shortcut on Home

### `data-testid` inventory

| Test id | Element |
|---------|---------|
| `home-view` | Page container |
| `display-name` | Display name input |
| `create-session` | Create new session button |
| `enter-existing` | Enter existing session button |
| `open-sessions-dialog` | Open sessions dialog content |
| `open-sessions-loading` | Loading state in dialog (Unit 1+) |
| `open-sessions-empty` | Empty state in dialog |
| `open-sessions-retry` | Retry after fetch failure (Unit 1+) |
| `dev-ternary-swipe` | Dev playground link (dev only) |
| `dev-segmented-swipe` | Dev playground link (dev only) |
| `dev-swipe-number` | Dev playground link (dev only) |
| `dev-stepped-swipe-number` | Dev playground link (dev only) |
| `session-{sessionId}` | Session row in join dialog |

## Open questions

- None at this time (session list scope, name normalization, post-join routing, and Model C lifecycle locked 2026-06-12).
