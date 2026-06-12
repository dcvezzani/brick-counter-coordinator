# View specs

Per-view requirements for the seven canonical application screens. Use these to verify behavior, capture adjustments, and drive storyboard / implementation reviews.

**Audience:** Dave (product owner), designers, implementers.

**Relationship to other docs:**

| Doc | Role |
|-----|------|
| [Product Spec](../../feature/part-out-coordinator/product-spec.md) | Feature-level outcomes and scenarios |
| [application-views.md](../support/application-views.md) | Short inventory of all views |
| [planned-views-services.md](../support/planned-views-services.md) | Routes, APIs, delivery units |
| [storyboard.md](../support/storyboard.md) | Walkthrough script for Unit 0 |
| **This folder** | Detailed, reviewable spec per view |

Each view spec is **requirements-first** (what the view must do), with a **Storyboard status** section noting what the current fixture UI implements vs. what ships in Units 1–4.

## Process roles (documentation only)

Roles in view specs (**counter**, **session lead**, **organizer**, **Primary actor(s)**, etc.) describe **typical floor workflow**, not software permissions.

- **No role-based auth** — client or server code must not require a user to be authenticated as one role vs. another.
- **Whoever uses a tool** unofficially takes on that process role for the moment.
- Controls are gated by **session phase** and business preconditions (e.g. every row resolved), not by role.

Full policy: [process-roles.md](../process-roles.md).

## Index

Walk views in storyboard order during review:

| # | View | Spec | Route |
|---|------|------|-------|
| 1 | Home | [home.md](./home.md) | `/` |
| 2 | New session | [new-session.md](./new-session.md) | `/session/new` |
| 3 | Part-out import | [part-out-import.md](./part-out-import.md) | `/session/:sessionId/import` |
| 4 | Lot form | [lot-form.md](./lot-form.md) | `/session/:sessionId/lot/:lotId?` |
| 5 | List cups | [list-cups.md](./list-cups.md) | `/session/:sessionId/cups` |
| 6 | List lots | [list-lots.md](./list-lots.md) | `/session/:sessionId/lots` |
| 7 | Part-out reconciliation | [part-out-reconciliation.md](./part-out-reconciliation.md) | `/session/:sessionId/reconciliation` |

**Out of scope:** `/dev/*` swipe playground routes — not product views.

## How to review

1. Open the spec for the view you are walking.
2. Run the app in storyboard mode (`VITE_USE_FIXTURES` default on).
3. Check each item under **Acceptance criteria**.
4. Edit requirements inline or note disagreements in **Open questions**.
5. If a view spec conflicts with the Product Spec, flag it — update Product Spec in a follow-up pass after decisions are made.

## Shared chrome

All session views (everything except **Home** and **New session**) render inside [`AppShell`](../../src/components/AppShell.vue) with bottom [`SessionNav`](../../src/components/SessionNav.vue).

### AppShell header

| Element | Copy | When visible |
|---------|------|--------------|
| App title | Brick Counter | Always |
| Subtitle | Storyboard — sample data | Fixture mode (`VITE_USE_FIXTURES !== 'false'`) |
| Badge | Storyboard | Fixture mode |

### SessionNav (bottom bar)

Visible when the route includes `sessionId`, **except** during **Part-out import** while `phase === 'importing'` — bottom nav is **hidden** until the worker confirms import and the session advances to `counting`. See [part-out-import.md](./part-out-import.md#entry--exit).

| Label | Route | `data-testid` | Phase visibility |
|-------|-------|---------------|------------------|
| Home | `/` | `nav-home` | Always (when nav shown) |
| Cups | `/session/:sessionId/cups` | `nav-cups` | `counting`, `reconciling`, `organizing` only — see [list-cups.md](./list-cups.md#locked-decisions) |
| Lot | `/session/:sessionId/lot` | `nav-lot` | When nav shown |
| Lots | `/session/:sessionId/lots?mode=organizer` | `nav-lots` | When nav shown |
| Reconcile | `/session/:sessionId/reconciliation` | `nav-reconciliation` | `counting`, `reconciling`, `organizing`, `updating_inventory` — hidden during `importing` and `closed` — see [part-out-reconciliation.md](./part-out-reconciliation.md#locked-decisions) |

Nav container: `data-testid="session-nav"`.

### Toast notifications

AppShell hosts toasts on **every session view** (and Home when applicable). Follow [home.md — Toast notifications](./home.md#toast-notifications): top-right viewport, readable copy, configurable TTL, auto-fade dismiss.

| Event | Toast (example copy) |
|-------|----------------------|
| `session.phase` WebSocket | e.g. Session moved to reconciling / organizing / updating inventory |

Phase-change toasts apply to all joined workers on any page — not only the view that triggered the advance.

## Template

Copy [_template.md](./_template.md) when adding a new view spec.
