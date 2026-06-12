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

| Label | Route | `data-testid` |
|-------|-------|---------------|
| Home | `/` | `nav-home` |
| Cups | `/session/:sessionId/cups` | `nav-cups` |
| Lot | `/session/:sessionId/lot` | `nav-lot` |
| Lots | `/session/:sessionId/lots?mode=organizer` | `nav-lots` |
| Reconcile | `/session/:sessionId/reconciliation` | `nav-reconciliation` |

Nav container: `data-testid="session-nav"`.

## Template

Copy [_template.md](./_template.md) when adding a new view spec.
