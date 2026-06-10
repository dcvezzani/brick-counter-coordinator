# Brick Counter Coordinator — Project Memory

**Owner:** David Vezzani (Dave)  
**Last updated:** 2026-06-10 (JS client, shadcn-vue, storyboard Unit 0)  
**Status:** Design — Tech Spec draft; GitHub Projects v2 board [#2](https://github.com/users/dcvezzani/projects/2) live for **`dcvezzani`**

## What this project is

A **part-out counting coordinator** for a LEGO resale/sorting business. When breaking down sets into individual parts for Bricklink, multiple workers sort LEGO into physical cups while recording counts on mobile devices. A central session consolidates counts in near real time, surfaces duplicate lots, reconciles against the **Bricklink part-out** list, splits organizer pick lists (with **Remarks** / storage locations), and exports **XML** for **Bricklink bulk update**.

**Primary users:** counters/sorters (pick name at join), session lead, organizers.

**Seed documents:** [OVERVIEW_AND_PROPOSAL.md](OVERVIEW_AND_PROPOSAL.md) · [docs/support/qa-001.md](docs/support/qa-001.md) · [docs/support/application-views.md](docs/support/application-views.md) · extension reference below

## Architecture overview (high level — detail in `/design`)

| Layer | Role |
|-------|------|
| **Worker clients** | Mobile browser — seven views: Home, New session, Part-out import, Lot form, List cups, List lots, Part-out reconciliation (see [docs/support/application-views.md](docs/support/application-views.md)) |
| **Coordinator server** | Sessions, Bricklink part-out **server fetch** + import curation, consolidated counts, reconciliation, split, XML export |

**Core domain concepts:**

- **Lot** — Part number + color + condition within a session (unique key for duplicate detection).
- **Cup** — Physical or virtual grouping in the UI; a cup may map to one lot or prompt when multiple colors exist for the same part.
- **Session** — One part-out job for a set, seeded from Bricklink part-out data.
- **Remarks / location** — Storage target from Bricklink part-out metadata; flows to organizer pick lists.
- **Reconciliation** — Session totals vs imported part-out list.
- **Pick list** — Per-worker organizer assignments on **List lots** (moved to storage / needs new location / list-complete).

**Integrations (product level):**

| Integration | MVP behavior |
|-------------|----------------|
| Bricklink part-out | Official list + Remarks per line — **server fetch** on session create; lead curates in Part-out import view ([ADR-0004](adr/0004-part-out-server-fetch-curated-import.md)) |
| Part search | API-style lookup (reference: Dave's Chrome extension) |
| Color picker | Reuse UX from existing extension |
| Bricklink upload | **XML export** → manual bulk update (no live API) |

**Tech stack:** [docs/tech-stack.md](docs/tech-stack.md) — **Vue 3 + Vite + shadcn-vue + Tailwind v4 + Lucide + Vue Router** (client **JavaScript**, `components.json` → `typescript: false`). **Storyboard first** (Unit 0): navigable UI with fixture data, no backend. **Coordinator server** (Node, WebSockets) — contracts in `/design`. Mobile HTML5 primary.

**UI tooling:** shadcn-vue CLI · MCP in [`.cursor/mcp.json`](.cursor/mcp.json) · skill [`.agents/skills/shadcn-vue`](.agents/skills/shadcn-vue/SKILL.md)

## Design reference — bricklink-chrome-extension

**Path:** `/Users/dcvezzani/personal-projects/lego/bricklink-chrome-extension` (sibling repo under `lego/`)

`/design` should trace these modules before inventing new contracts. BrickLink integration uses **session cookies** (`credentials: "include"`) — no public REST API keys.

### By Product Spec area

| Area | Primary files | Notes |
|------|---------------|-------|
| **Color picker** | `src/lib/catalog-known-colors.js`, `src/lib/bricklink-colors.js`, `src/data/bricklink-colors.json`, [docs/bricklink-colors.md](docs/bricklink-colors.md) | Catalog JSON + per-part known colors from `catalogitem.page`; swatch picker |
| **Part / inventory lookup** | `src/lib/store-inventory-list.js`, `src/content/inv-xml-modal.js`, [docs/bricklink-store-inventory-search.md](docs/bricklink-store-inventory-search.md) | POST `list.ajax` by part ID / lot ID; not catalog autocomplete |
| **Catalog price guide** | `src/lib/catalog-price-guide.js`, [docs/support/prices/catalog-price-guide.js](docs/support/prices/catalog-price-guide.js), [docs/bricklink-catalog-price-guide.md](docs/bricklink-catalog-price-guide.md) | GET `catalogPG.asp` + HTML scrape for market avg price by part/color/condition |
| **Part-out fetch & parse** | `scripts/code-scraper.js`, `src/lib/inv-set-edit-dom.js`, `SCRIPTS.md`, [docs/bricklink-set-part-out-fetch.md](docs/bricklink-set-part-out-fetch.md) | Server POSTs `invSetEdit.asp` with session cookie; port DOM parser (not JSON upload) |
| **XML export (upload)** | `src/lib/inv-upload-xml.js`, `src/content/inv-xml-modal.js` | New lots — mass **upload** (`invXMLverify.asp`); not coordinator reconciled export |
| **XML export (bulk update)** | `scripts/bulk-repair/lib/build-bulk-update-xml.mjs`, [docs/bricklink-mass-update-export.md](docs/bricklink-mass-update-export.md) | Reconciled export → `<LOTID>` patches → `invXML.asp#update` verify ([docs/support/mass-update/readme.md](docs/support/mass-update/readme.md)) |

### BrickLink URLs / endpoints (from extension)

| URL | Use |
|-----|-----|
| `POST …/ajax/renovate/storeInventoryDetail/list.ajax` | Store inventory search ([docs/bricklink-store-inventory-search.md](docs/bricklink-store-inventory-search.md)) |
| `GET …/v2/catalog/catalogitem.page?P={partId}` | Known colors for part ([docs/bricklink-colors.md](docs/bricklink-colors.md)) |
| `GET …/catalogPG.asp?P={partId}&colorid={colorId}` | Catalog price guide — scrape avg price ([docs/bricklink-catalog-price-guide.md](docs/bricklink-catalog-price-guide.md)) |
| `POST https://www.bricklink.com/invSetEdit.asp` | Set part-out Step 2 — **fetch official list** ([docs/bricklink-set-part-out-fetch.md](docs/bricklink-set-part-out-fetch.md)) |
| `https://www.bricklink.com/invXML.asp` | Mass upload UI (`invXMLverify.asp`) |
| `https://www.bricklink.com/invXML.asp#update` | Mass **update** — paste bulk-update XML ([docs/bricklink-mass-update-export.md](docs/bricklink-mass-update-export.md)) |

### Design cautions (from extension exploration)

- **Upload XML ≠ bulk-update XML** — coordinator reconciled export must match the **bulk update** schema (`build-bulk-update-xml.mjs`), not `inv-upload-xml.js` upload shape. See [docs/bricklink-mass-update-export.md](docs/bricklink-mass-update-export.md).
- **Part “search”** in extension = store inventory lookup + manual part ID, not Rebrickable-style catalog search — coordinator proxies `list.ajax` server-side ([docs/bricklink-store-inventory-search.md](docs/bricklink-store-inventory-search.md)).
- **Part-out import** = server fetch + curated import view ([ADR-0004](adr/0004-part-out-server-fetch-curated-import.md)); parser aligns with `code-scraper.js` / `inv-set-edit-dom.js`.
- **No iframes (hard constraint)** — Dave forbids iframe-based BrickLink integration in the coordinator. The extension's part-out **My Remarks** flow uses `src/lib/inventory-iframe-lookup.js` (hidden iframe + React hydration) — **do not port this**. Prefer the **AJAX** path used by new-lot entry: `src/lib/store-inventory-list.js` → `POST …/storeInventoryDetail/list.ajax` (consumed from `src/content/inv-xml-modal.js`). Extension repo is **read-only reference**; no changes there.

| Pattern | Extension module | Coordinator |
|---------|------------------|-------------|
| **Use** | `store-inventory-list.js` (`list.ajax`) | Port or proxy via server with BrickLink session |
| **Avoid** | `inventory-iframe-lookup.js` | Forbidden — no iframe hydration for remarks/lookup |

**Entry docs:** `bricklink-chrome-extension/AGENTS.md`, `SCRIPTS.md`

## Directory structure

| Path | Purpose |
|------|---------|
| `docs/AIDLC.md` | Canonical AIDLC process |
| `docs/bricklink-colors.md` | Color catalog JSON + per-part known colors (`catalogitem.page`) |
| `docs/bricklink-set-part-out-fetch.md` | Bricklink part-out list fetch (POST `invSetEdit.asp`, cookie, parse) |
| `docs/bricklink-store-inventory-search.md` | Bricklink store inventory search (`list.ajax`, part/lot lookup) |
| `docs/bricklink-catalog-price-guide.md` | Bricklink catalog price guide (`catalogPG.asp`, HTML scrape) |
| `docs/bricklink-mass-update-export.md` | Reconciled bulk-update XML + `invXML.asp#update` handoff |
| `docs/tech-stack.md` | Vue / shadcn-vue / tooling |
| `src/` | Vite app — views, router, shadcn-vue components |
| `docs/support/storyboard.md` | Storyboard walkthrough script & exit criteria |
| `feature/part-out-coordinator/` | First Feature — Product Spec, Tech Spec, phase artifacts |
| `docs/support/` | Support docs, Q&A, storyboard, BrickLink raw captures (`colors/`, `prices/`, `search-parts/`, `set-part-out-list/`, `mass-update/`) |
| `OVERVIEW_AND_PROPOSAL.md` | Original proposal |
| `adr/` | ADRs |
| `.claude/deps/ai-dlc/` | AI-DLC submodule |

## Implemented features

| Feature | Status | Folder |
|---------|--------|--------|
| Part-Out Counting Coordinator | Design — Tech Spec draft (Units 0–4); Vite/shadcn-vue scaffold in repo | [feature/part-out-coordinator/](feature/part-out-coordinator/) |

## Conventions

- **Process:** AIDLC — `/plan` → `/design` → `/build` → `/review` → `/ship`
- **Storyboard (Unit 0):** All seven views navigable with fixture data before backend — [docs/support/storyboard.md](docs/support/storyboard.md)
- **Application views:** Home → New session → Part-out import → Lot form / List cups / List lots / Part-out reconciliation
- **Entry UX:** One lot per form; **Save** / **Save and Add Another**; **List cups** for navigation
- **Workers:** Display name at session join (no auth MVP)
- **Terminology:** **Lot** = part + color + condition; **cup** = physical container or cups-list row
- **BrickLink integration:** AJAX/fetch only — **no iframes**
- **Git:** Feature branches → PR against `main`

## How to run locally

**Storyboard / frontend (today):**

```bash
npm install
npm run dev
```

Open the dev server URL; storyboard views live under `src/views/` (added in Unit 0). Unit tests: `npm run test:unit`. E2E: `npm run test:e2e`.

**Full stack:** `server/` Node coordinator + WebSockets — see [feature/part-out-coordinator/tech-spec.md](feature/part-out-coordinator/tech-spec.md). Dev: `npm run dev:all` (after Unit 1 build).

## Resolved product decisions (2026-06-09)

Full detail in [docs/support/qa-001.md](docs/support/qa-001.md) and [feature/part-out-coordinator/product-spec.md](feature/part-out-coordinator/product-spec.md#decisions).
