# ADR-0002: Bricklink integration via AJAX only — no iframes

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-06-10 |
| **Deciders** | David Vezzani |
| **Related** | [product-spec.md](../feature/part-out-coordinator/product-spec.md), [PROJECT.md](../PROJECT.md) |

---

## Context

Bricklink has no public REST API for store inventory. Dave's **bricklink-chrome-extension** uses session cookies with `fetch` and, in some flows, **hidden iframes** to hydrate React widgets (`inventory-iframe-lookup.js`). The Product Spec **forbids iframe-based integration** in the coordinator.

## Decision

All Bricklink calls from the coordinator go through the **server-side proxy** using **HTTP fetch/AJAX** patterns (e.g. `storeInventoryDetail/list.ajax`, catalog color pages). **No iframes** in the coordinator client or server. Port patterns from `store-inventory-list.js`; treat `inventory-iframe-lookup.js` as **anti-reference**.

Store session cookie lives in **server environment only** (`BRICKLINK_SESSION_COOKIE`), never exposed to the browser.

## Options considered

| Option | Summary | Why not chosen |
|--------|---------|----------------|
| Client-side Bricklink fetch | Browser has cookies | Exposes session; CORS/cookie complexity |
| Iframe hydration | Works in extension | **Forbidden** by product constraint |
| Server AJAX proxy | Matches extension list.ajax | **Chosen** |

## Consequences

### Positive

- Clear security boundary for Bricklink session
- Aligns with extension patterns Dave already trusts

### Negative / trade-offs

- Requires valid store cookie on server
- Some extension flows may have no AJAX equivalent — must find alternatives or defer

## Compliance & verification

- Code review: grep for `iframe` in `src/` and `server/` — must be absent
- Product Spec constraint #no-iframes

## References

- **Store inventory search contract:** [docs/bricklink-store-inventory-search.md](../docs/bricklink-store-inventory-search.md)
- Raw capture: [support/search-parts/store-inventory-detail-list-query.md](../docs/support/search-parts/store-inventory-detail-list-query.md)
- Extension: `bricklink-chrome-extension/src/lib/store-inventory-list.js`
- [PROJECT.md — Design reference](../PROJECT.md#design-reference--bricklink-chrome-extension)
