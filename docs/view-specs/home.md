# Home

**Status:** Draft — for Dave review  
**Last updated:** 2026-06-11

---

## Overview

| Field | Value |
|-------|-------|
| **View name** | Home |
| **Route** | `/` |
| **Route params** | — |
| **Query params** | — |
| **Primary actor(s)** | Any worker (counter, lead, organizer) |
| **Delivery unit** | 0 (fixture) → 1 (live join/list) |
| **Source file** | [`src/views/HomeView.vue`](../../src/views/HomeView.vue) |

## Related docs

- [Product Spec — Application views](../../feature/part-out-coordinator/product-spec.md#application-views)
- [Product Spec — Scenario 1: Home → session](../../feature/part-out-coordinator/product-spec.md#key-scenarios)
- [Planned views & services — Home](../support/planned-views-services.md#1-home)
- [Storyboard walkthrough § 1. Home](../support/storyboard.md#1-home)
- [Shared chrome](./README.md#shared-chrome)

## Purpose

Session entry point. Workers identify themselves with a display name and either create a new part-out session or join an existing open session.

## Entry & exit

### How users arrive

| From | Path / action |
|------|---------------|
| App launch / bookmark | `/` |
| SessionNav **Home** | `/` (from any session view) |

### Where actions navigate

| Action | Destination |
|--------|-------------|
| **Create new session** (with display name) | `/session/new` |
| **Enter existing session** → select session | `/session/:sessionId/cups` |
| Dev playgrounds (dev build only) | `/dev/*` |

## Layout & controls

| Element | Copy / behavior |
|---------|-----------------|
| Page heading | Welcome |
| Helper text | Enter your name, then create or join a counting session. |
| Label | Display name |
| Input placeholder | Your name |
| Primary button | Create new session |
| Secondary button | Enter existing session |
| Dev buttons (dev only) | Dev: Ternary swipe playground, Dev: Segmented swipe playground, Dev: Swipe number playground, Dev: Stepped swipe number playground |

### Open sessions dialog

Shown after **Enter existing session** when display name is valid.

| Element | Copy / behavior |
|---------|-----------------|
| Dialog title | Open sessions |
| Dialog description | Select a session to join as {displayName} |
| Session row | Session name (bold); subtitle: `{setNumber} · {phase} · {workerCount} workers` |

## Messages & feedback

| Message | Type | Trigger |
|---------|------|---------|
| Enter your display name first | Destructive alert | **Create new session** or **Enter existing session** tapped with empty display name |
| That name is already taken in this session — pick another name. | Destructive alert | Join fails with duplicate display name in target session |
| {error message} | Destructive alert | Other join errors (`e.message`) |

No success toast on join — navigation to List cups is the confirmation.

## User actions

| Action | Preconditions | Outcome |
|--------|---------------|---------|
| Enter display name | — | Enables create/join |
| Create new session | Non-empty display name | Stores name in `sessionStorage` (`workerDisplayName`); navigates to New session |
| Enter existing session | Non-empty display name | Opens Open sessions dialog with list of open sessions |
| Select session in dialog | Valid session; name not taken in session | Joins session, sets current worker, navigates to List cups |
| Open dev playground | Dev build only | Navigates to `/dev/*` route |

## Data requirements

### Read

| Field / entity | Source (live) | Notes |
|----------------|---------------|-------|
| Open sessions list | `GET /api/v1/sessions` | Set number, name, phase, worker count per session |

### Write

| Operation | Endpoint (live) | Notes |
|-----------|-----------------|-------|
| Join session | `POST /api/v1/sessions/:id/join` `{ displayName }` | Returns worker record; **409 Conflict** if name taken (no auto-suffix) |

Display name for **create** is passed via client storage until New session submit; not persisted server-side until session create.

## Acceptance criteria

- [ ] Worker can enter a display name before any session action
- [ ] Empty display name blocks create and join with clear error message
- [ ] **Create new session** navigates to New session with name remembered
- [ ] **Enter existing session** shows a picker of open sessions with set, phase, and worker count
- [ ] Selecting a session joins as the entered display name and lands on List cups
- [ ] Duplicate display name in a session is rejected with a clear message (no silent rename)
- [ ] SessionNav is **not** shown on Home (no `sessionId` in route)
- [ ] Storyboard mode shows fixture session list (non-persistent sample data)

## Storyboard status

### Implemented (Unit 0)

- Display name input and validation
- Create → New session with `sessionStorage` name
- Join dialog with fixture `OPEN_SESSIONS`
- Duplicate name detection via fixture `joinSession` (`DUPLICATE_NAME` error code)
- Dev-only playground links

### Gaps (Units 1–4)

- Live `GET /api/v1/sessions` for open session discovery
- Live `POST …/join` with 409 handling per Tech Spec
- No loading/error state for failed session list fetch
- No “resume last session” shortcut

### `data-testid` inventory

| Test id | Element |
|---------|---------|
| `home-view` | Page container |
| `display-name` | Display name input |
| `create-session` | Create new session button |
| `enter-existing` | Enter existing session button |
| `dev-ternary-swipe` | Dev playground link (dev only) |
| `dev-segmented-swipe` | Dev playground link (dev only) |
| `dev-swipe-number` | Dev playground link (dev only) |
| `dev-stepped-swipe-number` | Dev playground link (dev only) |
| `session-{sessionId}` | Session row in join dialog |

## Open questions

- Should Home show sessions the worker already joined, or only “open” sessions?
- Is display name case-sensitive for duplicate detection?
