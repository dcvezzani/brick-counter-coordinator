# Brick Counter Coordinator — Project Memory

**Owner:** David Vezzani (Dave)  
**Last updated:** 2026-06-10  
**Status:** Plan — Product Spec ready; GitHub Projects v2 board [#2](https://github.com/users/dcvezzani/projects/2) live for **`dcvezzani`**

## What this project is

A **part-out counting coordinator** for a LEGO resale/sorting business. When breaking down sets into individual parts for Bricklink, multiple workers sort LEGO into physical cups while recording counts on mobile devices. A central session consolidates counts in near real time, surfaces duplicate lots, reconciles against the **Bricklink part-out** list, splits organizer pick lists (with **Remarks** / storage locations), and exports **XML** for **Bricklink bulk update**.

**Primary users:** counters/sorters (pick name at join), session lead, organizers.

**Seed documents:** [OVERVIEW_AND_PROPOSAL.md](OVERVIEW_AND_PROPOSAL.md) · [dcv/qa-001.md](dcv/qa-001.md) · extension reference below

## Architecture overview (high level — detail in `/design`)

| Layer | Role |
|-------|------|
| **Worker clients** | Mobile browser — lot entry form (one lot per form), cups list, pick lists |
| **Coordinator server** | Sessions, Bricklink part-out import, consolidated counts, reconciliation, split, XML export |

**Core domain concepts:**

- **Lot** — Part number + color + condition within a session (unique key for duplicate detection).
- **Cup** — Physical or virtual grouping in the UI; a cup may map to one lot or prompt when multiple colors exist for the same part.
- **Session** — One part-out job for a set, seeded from Bricklink part-out data.
- **Remarks / location** — Storage target from Bricklink part-out metadata; flows to organizer pick lists.
- **Reconciliation** — Session totals vs imported part-out list.
- **Pick list** — Per-worker organizer assignments with line checkboxes.

**Integrations (product level):**

| Integration | MVP behavior |
|-------------|----------------|
| Bricklink part-out | Official list + Remarks per line (import — Design chooses scrape vs session fetch) |
| Part search | API-style lookup (reference: Dave's Chrome extension) |
| Color picker | Reuse UX from existing extension |
| Bricklink upload | **XML export** → manual bulk update (no live API) |

**Dave's stack preferences** (for `/design`): mobile HTML5; Node (no TypeScript); Vue; Font Awesome; ShadCN-style UI; WebSockets. See [OVERVIEW_AND_PROPOSAL.md](OVERVIEW_AND_PROPOSAL.md).

## Design reference — bricklink-chrome-extension

**Path:** `/Users/dcvezzani/personal-projects/lego/bricklink-chrome-extension` (sibling repo under `lego/`)

`/design` should trace these modules before inventing new contracts. BrickLink integration uses **session cookies** (`credentials: "include"`) — no public REST API keys.

### By Product Spec area

| Area | Primary files | Notes |
|------|---------------|-------|
| **Color picker** | `src/content/inv-xml-modal.js`, `src/lib/catalog-known-colors.js`, `src/data/bricklink-colors.json` | Part ID → known colors from catalog page; filterable swatch list |
| **Part / inventory lookup** | `src/lib/store-inventory-list.js`, `src/content/inv-xml-modal.js`, `docs/inv-xml-population-rules.md` | POST `list.ajax` by part ID / lot ID; not catalog autocomplete |
| **Part-out import (JSON)** | `scripts/code-scraper.js`, `src/lib/inv-set-edit-dom.js`, `SCRIPTS.md` | DevTools scraper on `invSetEdit.asp`; extension **Load** remarks in `src/content/inv-set-edit.js` |
| **XML export (upload)** | `src/lib/inv-upload-xml.js`, `src/content/inv-xml-modal.js` | `<INVENTORY><ITEM>` for mass **upload** (`invXML.asp`) |
| **XML export (bulk update)** | `scripts/bulk-repair/lib/build-bulk-update-xml.mjs`, `dcv/bulk-updates-02/bulk-update-documentation.md` | `<LOTID>` + `<REMARKS>` patches — **not** wired in extension UI yet; likely shape for coordinator export |

### BrickLink URLs / endpoints (from extension)

| URL | Use |
|-----|-----|
| `POST …/ajax/renovate/storeInventoryDetail/list.ajax` | Store inventory search |
| `GET …/v2/catalog/catalogitem.page?P={partId}` | Known colors for part |
| `https://www.bricklink.com/invSetEdit.asp` | Set part-out Step 2 |
| `https://www.bricklink.com/invXML.asp` | Mass upload UI |

### Design cautions (from extension exploration)

- **Upload XML ≠ bulk-update XML** — coordinator reconciled export must match the **bulk update** schema (`build-bulk-update-xml.mjs`), not only `inv-upload-xml.js` upload shape.
- **Part “search”** in extension = store inventory lookup + manual part ID, not Rebrickable-style catalog search — coordinator may need to port or wrap `list.ajax` server-side with BrickLink session.
- **Part-out JSON** today = manual scraper (`code-scraper.js`); authenticated fetch is an open Design choice.
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
| `feature/part-out-coordinator/` | First Feature — Product Spec, Tech Spec, phase artifacts |
| `dcv/` | Decision / Q&A scratchpad (e.g. qa-001) |
| `OVERVIEW_AND_PROPOSAL.md` | Original proposal |
| `adr/` | ADRs |
| `.claude/deps/ai-dlc/` | AI-DLC submodule |

## Implemented features

| Feature | Status | Folder |
|---------|--------|--------|
| Part-Out Counting Coordinator | Plan — Product Spec draft (qa-001 incorporated) | [feature/part-out-coordinator/](feature/part-out-coordinator/) |

## Conventions

- **Process:** AIDLC — `/plan` → `/design` → `/build` → `/review` → `/ship`
- **Entry UX:** One lot per form; **Save** / **Save and Add Another**; cups list for navigation
- **Workers:** Display name at session join (no auth MVP)
- **Terminology:** **Lot** = part + color + condition; **cup** = physical container or cups-list row
- **BrickLink integration:** AJAX/fetch only — **no iframes**
- **Git:** Feature branches → PR against `main`

## How to run locally

_Not yet defined. Update after `/design` and application scaffold._

## Resolved product decisions (2026-06-09)

Full detail in [dcv/qa-001.md](dcv/qa-001.md) and [feature/part-out-coordinator/product-spec.md](feature/part-out-coordinator/product-spec.md#decisions).
