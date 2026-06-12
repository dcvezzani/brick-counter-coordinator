# View spec verification

Track review of per-view specs in [`docs/view-specs/`](../docs/view-specs/). Each spec should match product behavior in [application-views.md](../docs/support/application-views.md) and routes in [planned-views-services.md](../docs/support/planned-views-services.md).

**Reviewer:** Dave  
**Last updated:** 2026-06-12

## Progress

| View | Spec | Route | Status |
|------|------|-------|--------|
| Home | [home.md](../docs/view-specs/home.md) | `/` | **Ready** |
| New session | [new-session.md](../docs/view-specs/new-session.md) | `/session/new` | **Ready** |
| Part-out import | [part-out-import.md](../docs/view-specs/part-out-import.md) | `/session/:sessionId/import` | **Ready** |
| Lot form | [lot-form.md](../docs/view-specs/lot-form.md) | `/session/:sessionId/lot/:lotId?` | **Ready** |
| List cups | [list-cups.md](../docs/view-specs/list-cups.md) | `/session/:sessionId/cups` | Not started |
| List lots | [list-lots.md](../docs/view-specs/list-lots.md) | `/session/:sessionId/lots` | Not started |
| Part-out reconciliation | [part-out-reconciliation.md](../docs/view-specs/part-out-reconciliation.md) | `/session/:sessionId/reconciliation` | Not started |

**4 / 7** specs verified.

## Status legend

| Status | Meaning |
|--------|---------|
| **Ready** | Dave reviewed; spec is correct for implementation |
| In progress | Under review |
| Not started | Not yet reviewed |

## Notes

- **List lots** serves three modes via query (`organizer`, `cup`, `reconciliation`); confirm the spec covers all three when reviewing.
- **Enter existing session** is part of Home (route `/sessions` or sub-view), not a separate view spec.
