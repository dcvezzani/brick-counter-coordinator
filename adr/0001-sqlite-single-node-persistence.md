# ADR-0001: SQLite persistence on a single Node coordinator

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-06-10 |
| **Deciders** | David Vezzani |
| **Related** | [feature/part-out-coordinator/tech-spec.md](../feature/part-out-coordinator/tech-spec.md) |

---

## Context

The Part-Out Counting Coordinator serves a **single LEGO resale business** with workers on a local network. Sessions are short-lived (one part-out job). There is no multi-tenant or high-availability requirement in the Product Spec MVP.

## Decision

Use **SQLite** (file-based) as the persistence layer, accessed from a **single Node.js coordinator process**. The same process serves REST, WebSockets, and (in production) static SPA assets. No separate database server for MVP.

## Options considered

| Option | Summary | Why not chosen |
|--------|---------|----------------|
| In-memory only | Fast, no migrations | Data loss on restart unacceptable during active counting |
| PostgreSQL | Robust, scalable | Operational overhead for single-machine MVP |
| SQLite | Embedded, simple backup | **Chosen** — fits single-node deployment |

## Consequences

### Positive

- One binary/process to deploy; easy local dev
- File backup = copy `.sqlite` file

### Negative / trade-offs

- Not horizontally scalable without redesign
- Write concurrency limited vs Postgres

### Neutral / follow-ups

- Revisit if multi-store or cloud HA becomes a requirement

## Compliance & verification

- Tech Spec data section references SQLite only
- Review checklist: no second DB client introduced without new ADR

## References

- [feature/part-out-coordinator/tech-spec.md](../feature/part-out-coordinator/tech-spec.md#data)
