# Planned views — routes and service dependencies

Inventory of all currently planned application views for the Part-Out Counting Coordinator. Each view maps to a Vue Router path defined in the [Tech Spec](../../feature/part-out-coordinator/tech-spec.md#routes-vue-router); behavior is specified in the [Product Spec](../../feature/part-out-coordinator/product-spec.md#application-views) and [application-views.md](./application-views.md).

**Delivery context:** Unit 0 (storyboard) uses fixture composables only; Units 1–4 wire the same routes to live REST and WebSocket services under `/api/v1`.

**Process roles:** Counter, session lead, and organizer names in this doc are **floor workflow only** — not RBAC. See [process-roles.md](../process-roles.md).

**Client service layers (planned):**

| Layer | Location | Role |
|-------|----------|------|
| REST client | `src/api/` | Typed wrappers for coordinator HTTP endpoints |
| `useSession` | `src/composables/useSession.js` | Session create/join/list, phase, worker identity |
| `useLots` | `src/composables/useLots.js` | Lot and cup CRUD, duplicate detection |
| `usePartOut` | (composable, Unit 1) | Part-out line fetch, exclude/restore, confirm |
| `usePickList` | (composable, Unit 3) | Organizer split, line status, list-complete |
| `useReconciliation` | (composable, Unit 4) | Diff rows, resolve, XML export |
| `useWebSocket` | (composable, Unit 1+) | Real-time session/lot/pick-list events |
| `useFixtureSession` | `src/composables/useFixtureSession.js` | In-memory mocks when `VITE_USE_FIXTURES=true` (Unit 0) |

---

## 1. Home

| Field | Value |
|-------|-------|
| **Route** | `/` |
| **Delivery unit** | 0 (fixture) → 1 (live join/list) |

### Dependent services

| Service | Endpoints / mechanism |
|---------|----------------------|
| Session | `GET /api/v1/sessions`, `POST /api/v1/sessions/:id/join` |
| Fixture session (Unit 0) | `useFixtureSession` — no HTTP |

### Example usage

**Trigger:** Worker enters a display name and taps **Enter existing session**.

**Flow:** Client calls `GET /api/v1/sessions` to load open sessions (all phases except `closed`; set number, name, phase, worker count).

**Deliverables:** Array of session summaries for the picker; after the worker selects a session, `POST /api/v1/sessions/:id/join` with normalized `{ displayName }` returns a worker record. The client stores `workerDisplayName`, `currentSessionId`, and `currentWorkerId` in `sessionStorage`, connects WebSocket (Unit 1+), and navigates by session phase — see [home.md — Post-join routing](../view-specs/home.md#post-join-routing) (`counting` → **Lot form**, not List cups).

---

## 2. New session

| Field | Value |
|-------|-------|
| **Route** | `/session/new` |
| **Delivery unit** | 0 (fixture) → 1 (live create + Bricklink fetch) |

### Dependent services

| Service | Endpoints / mechanism |
|---------|----------------------|
| Session | `POST /api/v1/sessions` |
| Part-out fetch (server-side, triggered by create) | Bricklink `POST invSetEdit.asp` via coordinator; results stored as `part_out_lines` |
| Fixture session (Unit 0) | Simulated create → redirect to import with fixture lines |

### Example usage

**Trigger:** Session lead searches/selects set via **SetSearchCombobox** (FilterablePicker; client pattern validation), chooses condition (New or Used; no default), and may use **Back to Home** to return to `/`. Display name comes from Home via `sessionStorage`; direct `/session/new` without a name redirects to Home.

**Flow:** Client calls `POST /api/v1/sessions` with `setNumber`, `partOutOptions.condition` (`new` \| `used`), and `displayName`. Server normalizes set number, maps to Bricklink form (fixed pricing/merge constants + `itemNo` / `itemCondition`), retries fetch up to 3 times on network failure, creates session (phase `importing`), and persists `part_out_lines` on success.

**Deliverables:** New `sessionId`, initial phase `importing`, and `part_out_fetch_status` (`ok` or `error`). On **HTTP 201** (fetch ok or error after retries) → **Part-out import** (`/session/:sessionId/import`). Invalid set → **HTTP 422**, fixed client wrapper on New session, no session row. Network failure after retries → session in `importing` with error; import view **Loading then Error** ([new-session.md](../view-specs/new-session.md), [part-out-import.md — Create-time fetch error entry](../view-specs/part-out-import.md#create-time-fetch-error-entry)).

---

## 3. Part-out import

| Field | Value |
|-------|-------|
| **Route** | `/session/:sessionId/import` |
| **Delivery unit** | 0 (fixture table) → 1 (live curation) |

### Dependent services

| Service | Endpoints / mechanism |
|---------|----------------------|
| Session | `GET /api/v1/sessions/:id` (phase, fetch status) |
| Part-out | `GET /api/v1/sessions/:id/part-out/lines`, `PATCH …/lines/:lineId`, `POST …/lines/bulk-exclude`, `POST …/lines/bulk-restore`, `POST …/part-out/confirm`, `POST …/part-out/refetch` |
| WebSocket | `session.phase` event when import is confirmed (any joined worker) |

### Example usage

**Trigger:** View mounts after session create or when any joined worker joins during `importing` ([home.md — Post-join routing](../view-specs/home.md#post-join-routing)).

**Flow:** Client calls `GET /api/v1/sessions/:id/part-out/lines`. Workers exclude out-of-scope lines via footer **Exclude** → `POST …/lines/bulk-exclude` with `{ lineIds: [] }`. Concurrent edits: **last-write-wins** (no real-time line sync for MVP).

**Deliverables:** Full part-out row set (part id, color, condition, expected qty, Remarks, excluded flag, optional thumbnail). After any joined worker taps **Confirm**, `POST …/part-out/confirm` advances phase to `counting` and the app routes to **Lot form** (`/session/:id/lot`).

---

## 4. Lot form

| Field | Value |
|-------|-------|
| **Route** | `/session/:sessionId/lot/:lotId?` (`lotId` omitted = new lot) |
| **Delivery unit** | 0 (fixture) → 2 (live lots + Bricklink helpers) |

### Dependent services

| Service | Endpoints / mechanism |
|---------|----------------------|
| Lots | `GET /api/v1/sessions/:id/lots`, `POST /api/v1/sessions/:id/lots` |
| Cups | `POST /api/v1/sessions/:id/cups` (optional auto-cup on save) |
| Bricklink inventory search | `GET /api/v1/bricklink/inventory-search?q=` (proxy to `list.ajax`) |
| Bricklink colors | `GET /api/v1/bricklink/parts/:partId/colors` |
| WebSocket | `lot.updated` on save from any worker |
| Fixture session (Unit 0) | In-memory lot save and duplicate messaging |

### Example usage

**Trigger:** Worker types in the part search combobox (debounced).

**Flow:** Client calls `GET /api/v1/bricklink/inventory-search?q=3001` to resolve part numbers and optional store lot metadata. After the worker selects color and taps **Save**, client resolves cup: pinned `cupId` from query, part-number auto-select (reuse cup that already has that part id, else create cup), or **Create new cup** override. Then `POST /api/v1/sessions/:id/lots` with part id, color id, session condition (`N` or `U`), qty, and `cupId`. Part and color are required.

**Deliverables:** Saved `lot` object with consolidated qty. If the unique key `(sessionId, partId, colorId, condition)` already exists, response includes `duplicate: true` and `existing: { createdBy, qty }` so the UI can show who counted it first. WebSocket broadcasts `lot.updated` to other clients for near-real-time totals.

**Save and Add Another:** Same `POST`, then reset form while pre-filling the part id field.

---

## 5. List cups

| Field | Value |
|-------|-------|
| **Route** | `/session/:sessionId/cups` |
| **Delivery unit** | 0 (fixture) → 2 (live cups + lot counts) |

### Dependent services

| Service | Endpoints / mechanism |
|---------|----------------------|
| Cups | `GET /api/v1/sessions/:id/cups` — `id`, `label`, `lotCount`, `soleLotId` (when `lotCount === 1`) |
| Lots | Indirect — `soleLotId` on cups payload for 1-lot tap routing (no secondary lots fetch) |
| WebSocket | `lot.updated` refreshes `lotCount` and `soleLotId` while view is open |
| Fixture session (Unit 0) | Static cup/lot graph for branching demo |

### Example usage

**Trigger:** Worker opens **List cups** from session navigation when phase is `counting`, `reconciling`, or `organizing` (SessionNav **Cups** hidden in `importing`, `updating_inventory`, `closed`).

**Flow:** Client calls `GET /api/v1/sessions/:id/cups`. If the response is an empty array, redirect immediately to `/session/:sessionId/lot` (new lot). Otherwise render each cup with label and lot count.

**Deliverables:** Cup list with labels and lot counts. **Add new lot** → `/session/:sessionId/lot` (no pinned cup). Tapping a cup branches on `lotCount`:

- **Zero lots** → `/session/:sessionId/lot?cupId=:cupId` (cup pinned)
- **One lot in cup** → `/session/:sessionId/lot/:soleLotId` (from cups payload)
- **Multiple lots** → `/session/:sessionId/lots?mode=cup&cupId=:cupId`

---

## 6. List lots

| Field | Value |
|-------|-------|
| **Route** | `/session/:sessionId/lots` with query `mode=organizer\|cup` and `cupId` when `mode=cup` |
| **Delivery unit** | 0 (fixture, mode switching) → 2 (cup mode) → 3 (organizer) |

One shared list component (`LotListTable`) serves cup and organizer contexts on this route; the `mode` query selects data source and actions. Discrepancy rows use the same component on **Part-out reconciliation** (§7) — not a `mode` here.

### Dependent services

| Mode | Services | Endpoints |
|------|----------|-----------|
| **Organizer** | Pick list, Lots, WebSocket | `POST …/pick-lists/split`, `GET …/lots?mode=organizer&workerId=`, `PATCH …/pick-lists/:itemId`, `POST …/pick-lists/complete`, `pick_list.updated` |
| **Cup** | Lots | `GET …/lots?cupId=` (`cupId` required) |

Shared across modes: navigation to **Lot form**, **Open cup** (organizer → cup-filtered mode), and print (`window.print()` / print CSS).

### Example usage (organizer mode)

**Trigger:** Session enters `organizing` phase; a worker runs pick-list split (session lead typically); worker opens **List lots** from nav.

**Flow:** `POST /api/v1/sessions/:id/pick-lists/split` assigns lots evenly among joined workers (round-robin by sorted part id). Worker’s view calls `GET /api/v1/sessions/:id/lots?mode=organizer&workerId=:currentWorkerId`.

**Deliverables:** Ordered pick-list rows with Remarks/storage hints. Worker marks a line **moved to storage** → `PATCH …/pick-lists/:itemId` with `{ status: "moved_to_storage" }` → updated row and `pick_list.updated` event. **Mark entire list complete** → `POST …/pick-lists/complete`.

### Example usage (cup mode)

**Trigger:** Worker selects a multi-lot cup on **List cups**.

**Flow:** `GET /api/v1/sessions/:id/lots?cupId=:cupId`.

**Deliverables:** Lots filtered to that cup only; selecting a row opens **Lot form** for edit.

---

## 7. Part-out reconciliation

| Field | Value |
|-------|-------|
| **Route** | `/session/:sessionId/reconciliation` |
| **Delivery unit** | 0 (fixture mismatches) → 4 (live diff + XML export) |

### Dependent services

| Service | Endpoints / mechanism |
|---------|----------------------|
| Reconciliation | `GET /api/v1/sessions/:id/reconciliation`, `POST …/reconciliation/resolve`, `POST …/reconciliation/export-xml` |
| Session | `POST /api/v1/sessions/:id/phase` (`counting` → `reconciling` → `organizing` → `updating_inventory`; `organizing` → `reconciling` without organizer rollback; → `closed` via **Mark session complete** after export) |
| Part-out (read-only context) | Included lines only (`excluded = 0`) drive expected quantities |
| WebSocket | `session.phase`, `lot.updated` refreshes open discrepancy counts |

### Example usage

**Trigger:** Any joined worker opens **Part-out reconciliation** when session phase is `counting`, `reconciling`, `organizing`, or `updating_inventory`. SessionNav **Reconcile** hidden during `importing` and `closed`.

**Flow:** Client calls `GET /api/v1/sessions/:id/reconciliation` to load rows comparing summed session lot totals to **included** part-out lines plus **unexpected-count** rows (`qtyExpected = 0` for lots not on included list). Open row = `!resolved`.

**Resolve:** Any joined worker **Edit**s lots on **Lot form** and **Resolve**s every open row via `POST …/reconciliation/resolve` with `{ lineId }` — explicit sign-off required even when `delta === 0`. Celebratory alert when all included lines match.

**Declare ready to organize:** When every row `resolved === true` in `reconciling`, `POST …/sessions/:id/phase` → `organizing`.

**Organize (Units 3–4):** Pick-list split and **List lots** progress in `organizing` ([list-lots.md](../view-specs/list-lots.md)). **`organizing` → `reconciling`** if count error discovered — pick-list progress preserved. When all organizer lists complete, **Declare ready to import** → `updating_inventory`.

**Export:** In `updating_inventory`, any joined worker runs **Reconciled — export XML** → `POST …/reconciliation/export-xml` — returns XML + `validationUrl` + optional `warnings` (inline alert on view); **phase unchanged**.

**Close session:** After manual Bricklink verify/submit outside the app, **Mark session complete** → `POST …/sessions/:id/phase` → `closed` (requires at least one successful export this session). **`closed`** session routes redirect Home.

**Export deliverables:** Bulk-update XML (`<LOTID>` from `bricklink_lot_id` + `<REMARKS>` per included row) and `validationUrl` (`https://www.bricklink.com/invXML.asp#update`). Client offers download and opens the validation page; upload happens outside the app.

---

## Auxiliary route: Enter existing session

| Field | Value |
|-------|-------|
| **Route** | `/sessions` (modal or sub-view on **Home**, not a separate canonical view) |
| **Delivery unit** | 0 → 1 |

Uses the same **Session** service as **Home** (`GET /api/v1/sessions`, then join). Product vocabulary treats this as part of **Home**, not an eighth view.

---

## Cross-view services

### WebSocket (`useWebSocket`)

| Event | Payload | Views that consume |
|-------|---------|-------------------|
| `lot.updated` | `{ lot }` | Lot form, List cups, List lots, reconciliation |
| `worker.joined` | `{ worker }` | Session-scoped views after join (Lot form, List cups, etc.); pick-list split input |
| `session.phase` | `{ phase }` | All session-scoped views (nav gating, badges) |
| `pick_list.updated` | `{ item }` | List lots (organizer mode) |

**Connect:** `ws://host/ws?sessionId=&workerId=`. On reconnect, client refetches `GET /sessions/:id` and relevant lots; failed POSTs queue in `sessionStorage` with a retry banner (MVP).

### Bricklink helpers (server proxy)

Used primarily by **Lot form**; cookie stays on server (`BRICKLINK_SESSION_COOKIE`).

| Endpoint | Upstream | Purpose |
|----------|----------|---------|
| `GET /bricklink/inventory-search` | `list.ajax` | Part/lot search combobox |
| `GET /bricklink/parts/:partId/colors` | Catalog JSON + `catalogitem.page` | Color picker swatches |
| `GET /bricklink/price-guide` (optional, not MVP-critical) | `catalogPG.asp` | Market avg when no store lot exists |

---

## View ↔ route quick reference

| View | Route |
|------|-------|
| Home | `/` |
| New session | `/session/new` |
| Part-out import | `/session/:sessionId/import` |
| Lot form | `/session/:sessionId/lot/:lotId?` |
| List cups | `/session/:sessionId/cups` |
| List lots | `/session/:sessionId/lots?mode=organizer\|cup&cupId=` (cupId required when mode=cup) |
| Part-out reconciliation | `/session/:sessionId/reconciliation` |

---

## Related documents

- [application-views.md](./application-views.md) — product behavior per view
- [storyboard.md](./storyboard.md) — Unit 0 walkthrough script
- [feature/part-out-coordinator/tech-spec.md](../../feature/part-out-coordinator/tech-spec.md) — API contracts, schema, delivery units
- [feature/part-out-coordinator/product-spec.md](../../feature/part-out-coordinator/product-spec.md) — success criteria and scenarios
