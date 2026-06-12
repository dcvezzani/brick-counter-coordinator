# Process roles (documentation only)

**Status:** Locked — Dave 2026-06-12  
**Applies to:** Product Spec, Tech Spec, view specs, diagrams, storyboard, and all other project documentation.

## Policy

Roles named in this project — for example **counter**, **session lead**, **organizer**, or **primary actor** on a view — are **informational only**. They describe who typically performs a step in the physical workflow, not a permission model in software.

**Implementation rule:** No code (client or server) may require authenticating or authorizing a user as one role versus another. There is no role-based access control for MVP. Any joined worker with a display name may use any control the UI exposes for the current session phase.

**Operational rule:** Whoever is using a screen at a given moment **unofficially** takes on the associated process role for that action. Documentation may say “session lead typically…” to set team expectations; it must **not** be read as a requirement to block other workers in the app.

## What this means for specs and code

| Documentation pattern | Correct interpretation |
|-----------------------|------------------------|
| **Primary actor(s)** on a view spec | Typical user of that screen — not an RBAC gate |
| “Session lead creates…” / “lead advances phase…” | Process guideline — UI does not enforce unless a separate locked decision says otherwise |
| `lead_worker_id` on the session record | **Audit metadata** — who created the session — not a credential for phase transitions or privileged APIs |
| `POST …/sessions/:id/phase` | Any joined worker may call when the UI offers the action; server validates **phase preconditions** (e.g. all rows resolved), not role membership |
| SessionNav visibility | Gated by **session phase** and route — not by worker role |

When reviewing or writing specs, prefer **“any joined worker”** for who may tap a control, and reserve role names for **who usually does** the work on the floor.

## Related docs

- [View specs — README](./view-specs/README.md)
- [Product Spec — Who it's for](../feature/part-out-coordinator/product-spec.md#who-its-for)
- [Tech Spec — Session lifecycle](../feature/part-out-coordinator/tech-spec.md#session-lifecycle-server-state-machine)
