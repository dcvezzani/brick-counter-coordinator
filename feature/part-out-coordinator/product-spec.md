# Product Spec — Part-Out Counting Coordinator

**AIDLC phase:** Plan  
**Audience:** Product, engineering leads, stakeholders — **product language only** (no implementation or stack). Unresolved product questions should be **asked in chat** first; this file records **decisions** after they are made.

---

## Overview

| Field | Value |
|-------|-------|
| **Feature** | Part-Out Counting Coordinator |
| **Status** | Approved |
| **Author** | David Vezzani (from [OVERVIEW_AND_PROPOSAL.md](../../OVERVIEW_AND_PROPOSAL.md)) |
| **Created** | 2026-06-09 |
| **Last updated** | 2026-06-10 (server fetch + Part-out import; single vs two-sweep by purchase type) |
| **Related Tech Spec** | [tech-spec.md](./tech-spec.md) |

## Problem & audience

### Problem statement

Sorting and counting LEGO parts for part-out work is slow and coordination-heavy. Today one or two people sort into physical cups while a separate person logs counts into the system. That split workflow creates duplicate effort, idle time, and constant interruptions.

Workers often do not know when someone else is already counting the same part (same part number, color, and condition — a **lot**). Sorting and counting happen in separate passes. The data-entry person waits while counters report verbally, and counters wait while data is typed in.

### Who it's for

- **Counters / sorters** — staff who physically sort LEGO into cups and record quantities on their own mobile device.
- **Session lead** — person who starts a part-out session for a specific set, monitors progress, runs reconciliation, and finalizes the list.
- **Organizers** — workers who later put reconciled parts into labeled drawers, bins, or containers using assigned pick lists.

**Process roles are documentation-only.** Names like counter, session lead, and organizer describe typical workflow on the floor — not permissions in the app. No code may require role-based authentication; whoever uses a screen unofficially takes on that role for the action. See [docs/process-roles.md](../../docs/process-roles.md).

### Current experience (baseline)

1. One or two people sort parts into cups (sometimes duplicating lots already being worked elsewhere).
2. A dedicated person logs part number, color, condition, and count into the system.
3. Counters interrupt the logger frequently; the logger has dead time between reports.
4. After counting, the logged list is compared manually to the official part-out list.
5. Discrepancies are resolved verbally or with ad-hoc notes.
6. The reconciled list is exported and uploaded to Bricklink via the bulk update tool.
7. Parts are divided among workers for placement into organization storage.

## Outcomes & business impact

### Desired outcomes

- Multiple workers sort and count **in parallel** without losing visibility into what lots already exist in the session.
- Each worker records counts on **their own device**; a **central session view** keeps totals consolidated in near real time.
- Workers are **notified when a lot they are working on already exists**, including who started it and current quantities, so duplicate physical cups are reduced.
- Sorting and counting can happen **in one pass** when practical (same visit to the cup), reducing total handling time.
- When counting finishes, the team gets a **reconciliation view** against the official Bricklink part-out list, with clear match vs mismatch filtering.
- After reconciliation, the team gets a **fair split of pick-list entries** per worker for organizing parts into storage locations (from Bricklink **Remarks** / location metadata), with per-line progress tracking.
- The reconciled list can be **exported as XML** for upload through Bricklink's **bulk update** tool.

### Success criteria (for Validate)

These tie directly to the **scorecard** in `/ship`. Each should be **testable** or **evidence-based** without reading code.

| # | Criterion | How we'll verify |
|---|-----------|------------------|
| 1 | **Parallel counting** — Two workers can join the same part-out session and submit counts for different lots without overwriting each other. | Simulated session with two devices; both submissions appear in consolidated totals. |
| 2 | **Duplicate-lot awareness** — When worker B enters a lot that worker A already recorded, B sees who created it and the current total for that lot on submit (proactive inline hint optional in Unit 2+). | Enter same part/color/condition from two devices; second worker sees existing-lot confirm dialog with creator and quantity. |
| 3 | **Mobile-first entry** — A worker can complete one lot entry (part, color, session condition label, count) on a phone-sized viewport **without scrolling the main form**. | Manual check on phone or narrow viewport (390px); all primary controls visible. |
| 4 | **Session lifecycle** — Lead can create a session from a Bricklink part-out for a set (server fetch + import curation); workers pick a **display name at join**, select the session, and all counts roll up. | End-to-end walkthrough: create → curate import → join with name → submit → view session totals. |
| 5 | **Part search** — Worker can search/select a part to populate the part identifier field (search behavior matches business need for finding parts by number or name). | Search for a known part; selection fills the part field. |
| 6 | **Save and Add Another** — Form offers **Save** and **Save and Add Another**; the latter saves the current lot and opens a fresh form with the **same part id pre-filled** (one lot per form). | Submit via Save and Add Another; new form shows previous part id; color cleared; qty reset to 1; session condition unchanged. |
| 7 | **List cups navigation** — **List cups** shows all cups in the session; tapping a cup opens **Lot form** (0 or 1 lot) or **List lots** filtered to that cup when it has **multiple lots**. | Cup with zero lots opens Lot form with cup pinned; one lot opens Lot form directly; multiple lots shows cup-filtered List lots then Lot form. |
| 8 | **Reconciliation** — System compares session counts to the imported Bricklink part-out list; **Discrepancies** tab shows open mismatches; **All lines** tab shows full included-line comparison. | Known part-out + session data; open discrepancies classified correctly. |
| 9 | **Discrepancy resolution** — Any joined worker can **Edit** lots on **Lot form** and **Resolve** (explicit sign-off on **every** line, including matching rows) until all rows are resolved. Unexpected session lots (not on included part-out list) appear with expected 0. Celebratory message when included lines all match. | Resolve rows including unexpected counts; **Declare ready to organize** only when every row resolved. |
| 10 | **Pick-list split** — In `organizing` phase, any worker may run **Split list** (session lead typically); system generates **roughly even** organizer lists per worker; each line includes **storage location** from part-out Remarks. | Split among M workers; locations visible; no worker gets zero lines when N ≥ M. |
| 11 | **Organizer progress** — On **List lots**, a worker can mark each lot as **moved to storage**, **needs new storage location**, or open it for editing; **mark entire list complete** when every line is in one of those states. Progress persists for their list during the session. | Mark lines with both outcomes; list-complete enabled only when all lines resolved; state survives refresh. |
| 12 | **Pick-list delivery** — **List lots** is available on worker devices; worker can **send list to printer** when a printer is available. | View on device; print or print-ready output for one worker list. |
| 13 | **Bricklink XML export** — From **Part-out reconciliation** in `updating_inventory`, any joined worker runs **Reconciled — export XML** (generates **XML**, opens Bricklink **bulk update validation**; phase unchanged). **Mark session complete** → `closed` after manual confirm/upload outside the app. | XML validates on Bricklink bulk-update validation page; spot-check row contents vs reconciled session; close only after Mark session complete. |
| 14 | **Application views** — All seven canonical views (see below) are **routable** with session-aware navigation. | Navigate to every view from an active session; no dead-end routes. |
| 15 | **Storyboard walkthrough** — Before live backend work, stakeholders complete key scenarios (below) on an **interactive UI prototype** using **fixture data** only; feedback informs spec updates. | [storyboard.md](../../docs/support/storyboard.md) script checked off; at least one counter/organizer walkthrough; gaps logged. |
| 16 | **Part-out import curation** — After session create, **any joined worker** sees the **full** server-fetched Bricklink part-out list, **confirms** scope (optionally excludes lines for partial-bag two-sweep); reconciliation compares session totals to **included** lines only. | Single-sweep: confirm all lines → count → reconcile. Partial-bag: exclude lines → confirm → count → reconcile; excluded lines not in expected quantities. |

### Business impact

- **Time saved** — Fewer duplicate sorts, fewer counting passes, less idle time for the dedicated logger role.
- **Accuracy** — Consolidated real-time totals and structured reconciliation reduce transcription errors and missed duplicate cups.
- **Throughput** — More staff can participate simultaneously during peak part-out work.
- **Bricklink continuity** — XML export fits the existing bulk-update workflow without requiring live store API integration in MVP.

## Application views

Canonical screen inventory from [application-views.md](../../docs/support/application-views.md). These names are the **product vocabulary** for navigation, Design Tech Specs, and Validate UI checks. `/design` maps each view to a route; **Unit 0 (storyboard)** implements every route with fixture UI before live backend work.

| View | Purpose | Primary actions |
|------|---------|-----------------|
| **Home** | Session entry | Worker enters **display name**; chooses **create a new session** or **enter an existing session**. |
| **New session** | Session creation | Search/select **set number** (SetSearchCombobox) and **condition** (New or Used); **Back to Home**; submit — server **fetches** the official part-out list using fixed Bricklink pricing/merge defaults. |
| **Part-out import** | Curate counting scope | Shows **all** fetched part-out lines (part, color, condition, qty, Remarks). **Any joined worker** may **confirm** to start counting (typical: full list, no changes). For partial-bag sets, workers may **exclude** out-of-scope lines per sweep; excluded lines can be **restored** before confirm. |
| **Lot form** | Counting entry | A **lot** = part id + color + condition. Enter or find part number, select color, enter count; session condition shown read-only; **Save** or **Save and Add Another**. Part and color required. |
| **List cups** | Cup navigation | Browse session cups. **Add new lot** opens **Lot form** (part-number cup auto-select on save). Tap cup: **0 lots** → new **Lot form** (cup pinned); **1 lot** → edit lot; **multiple lots** → cup-filtered **List lots**. Counting default landing is **Lot form**, not List cups. |
| **List lots** | Organizer pick list (per worker) or cup lot picker | SessionNav **Lots** always when nav shown. **Organizer:** this worker's share of lots (evenly divided, ordered by part id, **Location** from Remarks). Mark lot **moved to storage** or **needs new storage location**; **open lot for editing**; **open associated cup**; **send list to printer**; **mark entire list complete** when every line is resolved. **Cup mode:** pick a lot from a multi-lot cup (see **List cups**). New lots via SessionNav **Lot** or **List cups** — not on this view. |
| **Part-out reconciliation** | Reconcile & export | Compare session counts to **included** part-out lines; in `counting`: diff preview + **Compare with Part-Out List** → `reconciling`; in `reconciling`: **Discrepancies** / **All lines** tabs, **Edit** + **Resolve**, **Declare ready to organize**; SessionNav **Reconcile** from `counting` through `updating_inventory`; **Return to reconciling** from organizing; export + **Mark session complete** in `updating_inventory`; any joined worker; phase-change **toasts**. |

### View naming note

**List lots** (`/session/:id/lots`) serves two contexts via `mode` query — same list UI pattern, different data filters:

| Context | Filter / scope | Reached from |
|---------|----------------|--------------|
| **Organizer list** | This worker's assigned lots for the session | SessionNav **Lots** after pick-list split |
| **Cup list** | Lots in one physical cup only | **List cups** when a cup has multiple lots |

**Part-out reconciliation** is a separate view (`/session/:id/reconciliation`) that reuses the shared list component for discrepancy rows — not a `mode` on List lots. See [list-lots.md](../../docs/view-specs/list-lots.md) and [part-out-reconciliation.md](../../docs/view-specs/part-out-reconciliation.md).

### Delivery units (MVP slices)

Work is split into **Units** at `/design` (one Tech Spec and one or more GitHub board cards per Unit).

| Unit | What ships | Backend / data |
|------|------------|----------------|
| **0 — Storyboard** | All seven views navigable; **shadcn-vue** layout and controls; realistic **fixture** session | **None** — in-memory or static mocks only |
| **1 — Shell & session (live)** | **Home**, **New session**, **Part-out import** (fixture or live fetch) | Session create/join API; server part-out fetch |
| **2 — Counting** | **Lot form**, **List cups**, cup-scoped **List lots** | Live lots + real-time totals |
| **3 — Organizer lists** | Worker **List lots** (split, progress, print, list-complete) | Pick-list split + persistence |
| **4 — Reconciliation & export** | **Part-out reconciliation** (**Reconciled** → XML → Bricklink validation) | Reconciliation + XML export (import curation ships in Unit 1) |

**Unit 0 (storyboard) — product intent:** Dave and stakeholders **walk through** the app in a browser, talk through scenarios, and refine the Product Spec **before** coordinator server or BrickLink integration. Same routes and view names as production; UI built with **shadcn-vue** per [docs/tech-stack.md](../../docs/tech-stack.md). Walkthrough script: [storyboard.md](../../docs/support/storyboard.md).

**Unit 0 acceptance:** all views reachable; fixture data supports scenarios 1–8; storyboard labeled as non-persistent sample data; walkthrough feedback captured.

**Unit 1+** extends the **same** view components and routes — no throwaway prototype fork.

Success criteria **#15** → Unit 0; **#1–#7, #14, #16** → Units 0–2 ( **#16** live in Unit 1); **#8–#9, #13** → Unit 4; **#10–#12** → Unit 3.

### Session lifecycle

End-to-end phase order for a single part-out session:

| Step | Phase | Primary views / actions |
|------|-------|-------------------------|
| 1 | `importing` | Part-out import — curate included lines |
| 2 | `counting` | Lot form, List cups — workers record lots |
| 3 | `reconciling` | Part-out reconciliation — Edit lots, Resolve discrepancies (sign-off); **Declare ready to organize** when all cleared |
| 4 | `organizing` | List lots — split pick list; organizers mark lines moved / needs location; mark lists complete; **Declare ready to import** when all lists complete |
| 5 | `updating_inventory` | Part-out reconciliation — **Reconciled — export XML**; Bricklink bulk update validation (manual upload); **Mark session complete** when handoff done |
| 6 | `closed` | Session done — session routes redirect Home |

Any joined worker may advance phase via API when the UI offers the control and preconditions are met (see [process-roles.md](../../docs/process-roles.md)). **`counting` → `reconciling`:** worker taps **Compare with Part-Out List** on Part-out reconciliation. **Declare ready to organize** advances `reconciling` → `organizing` when every reconciliation row is resolved. **Declare ready to import** advances `organizing` → `updating_inventory`. **`organizing` → `reconciling`** when a count error is discovered — organizer pick-list progress is preserved (no rollback). **Reconciled — export XML** does **not** change phase. **Mark session complete** advances `updating_inventory` → `closed`. **`closed`** sessions redirect to Home.

## User experience & scenarios

### Key scenarios

1. **Home → session** — On **Home**, worker enters display name and chooses **create a new session** or **enter an existing session**.

2. **New session** — Session lead opens **New session** (after entering display name on Home), specifies set number and condition (New or Used), and submits. Server fetches the full official part-out list using fixed Bricklink wizard defaults for pricing and inventory merge ([new-session.md](../../docs/view-specs/new-session.md)).

3. **Curate import (Part-out import)** — Any joined worker reviews all fetched lines and confirms scope before counting. **Most sessions are a single sweep** — confirm the full list with no exclusions:
   - **Brand-new sealed set** — all parts are **new**; no used bricks expected; one session, confirm all lines.
   - **Loose brick purchase** — all parts are **used**; no new bricks expected; one session, confirm all lines.
   - **Partial-bag set** (some bags opened, some sealed) — **two sweeps**: first session excludes lines still in sealed bags and counts **used** parts found outside bags; a **second session** excludes the opposite subset and counts **new** parts from sealed bags. Workers exclude out-of-scope lines per sweep before confirm. Concurrent curation: **last-write-wins** (no real-time line sync for MVP).

4. **Record a lot (Lot form)** — Worker enters part (via search/picker), color, and count. Session condition (New or Used) is shown read-only from session setup. Form fits on one mobile screen without scrolling. Worker taps **Save** or **Save and Add Another** (latter pre-fills part id; clears color; resets qty to 1).

5. **Discover an existing lot** — If the part/color/condition already exists in the session, worker sees who created it, current quantity, and that other physical cups may exist for the same lot.

6. **Browse cups (List cups)** — Worker opens **List cups** from session navigation (counting phase default landing is **Lot form** — scenario 4). Tapping a cup:
   - **Zero lots** in the cup → opens **Lot form** (new lot) with that cup pre-selected.
   - **One lot** in the cup → opens **Lot form** for that lot.
   - **Multiple lots** in the cup → opens **List lots** filtered to that cup; worker picks a lot, then **Lot form**.

7. **Reconcile (Part-out reconciliation)** — SessionNav **Reconcile** from `counting` through `updating_inventory`. In `counting`: preview diff; **Compare with Part-Out List** advances phase. In `reconciling`: **Discrepancies** / **All lines** tabs, **Edit**, **Resolve** on every line, **Declare ready to organize** when all rows resolved. During `organizing`: **Return to reconciling** without losing organizer progress.

8. **Declare ready to organize** — When every row is resolved, lead or worker presses **Declare ready to organize** → `organizing`.

9. **Split organizer lists (List lots)** — Any worker runs **Split list** on **List lots** (organizer mode). Lots divide evenly across joined workers, ordered by part id, with storage **Location** from Remarks. If a count error is found during organizing, lead may return to `reconciling` without losing **Moved** / **New loc** progress on pick lists.

10. **Organize (List lots)** — Each worker opens their **List lots** view. They mark lots **moved to storage** or **needs new storage location**, edit lots, jump to the associated cup, print the list, and **mark entire list complete** when every line is resolved. When all workers' lists are complete, any worker may **Declare ready to import** → `updating_inventory`.

11. **Export to Bricklink** — On **Part-out reconciliation** (`updating_inventory`), any joined worker presses **Reconciled — export XML**. Generates **XML**, opens Bricklink **bulk update validation** (phase unchanged). After manual confirm/upload outside the app, worker presses **Mark session complete** → `closed`.

### Experience principles

- **Mobile-first** — Primary interaction is thumb-friendly on phone or tablet at the sorting table.
- **One lot per form** — Keep entry simple; use Save and Add Another for rapid entry of related lots (same part, different color).
- **Low interruption** — No shouting across the room to avoid duplicates or confirm counts.
- **Clear, calm feedback** — Lot-exists and reconciliation messages show who, what, and how many.
- **Elegant and engaging UI** — Polished, modern interface; Dave wants high-quality UX without hand-tuning every pixel (implementation in `/design`).
- **Reuse familiar controls** — Color selection should feel consistent with Dave's **existing LEGO tooling** (reference implementations available for Design — see Related documents).
- **Glanceable progress** — Lead and workers can see whether the session is in counting, reconciliation, or organizing.
- **Stable view names** — Use the seven canonical views above in UI labels and navigation; avoid inventing alternate screen names per Unit.
- **Storyboard before backend** — Interactive prototype (Unit 0) for stakeholder feedback; not a separate design-only artifact.

## Scope

### In scope

- **Storyboard prototype (Unit 0)** — Navigable UI for all views with fixture data; [storyboard.md](../../docs/support/storyboard.md).
- **Seven application views** — **Home**, **New session**, **Part-out import**, **Lot form**, **List cups**, **List lots**, **Part-out reconciliation** (see [Application views](#application-views)); routes established in **Unit 0**, live behavior added in Units 1–4.
- Part-out **session** creation from a **Bricklink part-out** for a given set (set number and Bricklink part-out options); **server-side fetch** of the official list ([ADR-0004](../../adr/0004-part-out-server-fetch-curated-import.md)).
- **Part-out import** curation — any joined worker reviews fetched list and confirms before counting; excludes out-of-scope lines only when needed (**two-sweep** for partial-bag sets; single sweep for brand-new or loose purchases). Concurrent curation: **last-write-wins**.
- Worker **display name at join** on **Home** (no account system required for MVP).
- Worker **self-service entry** on **Lot form**: part identifier, color, quantity — session condition read-only — **one lot per form**; part and color required.
- Form actions: **Save** and **Save and Add Another** (pre-fill part id on the latter).
- **Part search / picker** (search API/integration — mechanism deferred to `/design`; Dave has reference behavior in existing tooling).
- **Color picker** UX aligned with Dave's existing LEGO extension patterns (Design reuses or ports behavior).
- **List cups** with navigation to **Lot form** or cup-filtered **List lots** when a cup has multiple lots.
- **Real-time or near-real-time** consolidated session totals across workers.
- **Duplicate-lot notification** when a lot already exists in the session.
- **Part-out reconciliation** vs imported Bricklink part-out: matches, mismatches, discrepancy list.
- **Discrepancy resolution** until reconciled totals are agreed.
- **List lots** organizer view: even split across workers, ordered by part id; **Location** column from part-out Remarks; per-lot **moved to storage** / **needs new storage location**; **edit lot**, **open associated cup**, **print**, **mark entire list complete** (disabled until all lines resolved).
- **Reconciled** action: XML generation and handoff to Bricklink **bulk update validation** page.

### Out of scope

- **Live Bricklink store API submit** — Upload remains manual via bulk update tool using exported XML.
- **User accounts, passwords, or PIN auth** for MVP — display name at join only.
- **Multiple lots on one form** — explicitly not supported; use Save and Add Another instead.
- **Inventory management** beyond the active part-out session.
- **Billing, pricing, or listing management** on Bricklink beyond part-out import and bulk-update export.
- **Native mobile apps** — mobile browser only for this Feature.
- **Multi-tenant / multi-store SaaS** — single business, single deployment.

### Dependencies on other teams or features

- **Bricklink part-out** as the source of truth for the official list per set (including Remarks/location per line).
- Dave's **bricklink-chrome-extension** repo (`/Users/dcvezzani/personal-projects/lego/bricklink-chrome-extension`) as **reference** for color picker, inventory lookup, part-out scrape, and XML export shapes — see [PROJECT.md](../../PROJECT.md#design-reference--bricklink-chrome-extension). Not a runtime dependency unless chosen in Tech Spec.
- Bricklink **bulk update** tool (external) for final inventory upload.

## Constraints (non-technical where possible)

- Must work on **mobile browsers** (phone and tablet) as the primary client.
- Must support **multiple simultaneous workers** on the same session without data loss.
- Session data must stay **consistent** while workers join, leave, and submit concurrently.
- **Color picker** and **part search** should align with workflows the team already uses in existing LEGO tooling.
- Polished UI via **shadcn-vue** on Vue 3 (see [docs/tech-stack.md](../../docs/tech-stack.md)); mobile-first layouts.
- Reliability matters during active counting sessions (dropped connection must not silently lose submitted counts — behavior defined in `/design`).
- **No iframe-based BrickLink integration** in this application. The reference extension uses iframes for some flows (e.g. part-out My Remarks lookup), but the coordinator **must not** adopt that pattern. Prefer direct **AJAX/fetch** approaches (as in the extension's inventory lot lookup / new-lot entry flow) for any BrickLink session calls. Iframe workarounds are **explicitly forbidden** unless a human approves an exception with documented evidence that no AJAX equivalent exists.

## Decisions

Resolved in [qa-001.md](../../docs/support/qa-001.md):

| Date | Decision |
|------|----------|
| 2026-06-09 | Feature slug: `part-out-coordinator`. Seed: [OVERVIEW_AND_PROPOSAL.md](../../OVERVIEW_AND_PROPOSAL.md). |
| 2026-06-09 | **Part catalog / search:** Searchable parts via an API-style lookup; color picker reuses patterns from Dave's existing extension (Design to align with reference code). |
| 2026-06-09 | **Part-out list source:** Bricklink part-out for a set (set number + Bricklink options: pricing, new/used, overwrite vs consolidate inventory). Import mechanism (e.g. JSON from extension scrape vs authenticated fetch) is a **Design** choice; Dave has reference implementations. |
| 2026-06-09 | **Bricklink handoff:** MVP exports reconciled list as **XML** for **Bricklink bulk update** — not live API submit. |
| 2026-06-09 | **Worker identity:** **Pick display name at join** — no auth system for MVP. |
| 2026-06-09 | **Multi-color cups / entry:** **One lot per form.** Buttons: **Save** and **Save and Add Another** (latter pre-fills part id on new form). **Cups list** view: tap cup → open lot directly if one color; if multiple colors for same part, prompt to choose lot then open form. |
| 2026-06-09 | **Storage locations:** From Bricklink part-out **Remarks** ("My Remarks" / location) on each line — carried through to pick lists. |
| 2026-06-09 | **Design reference codebase:** Sibling repo `bricklink-chrome-extension` at `/Users/dcvezzani/personal-projects/lego/bricklink-chrome-extension` — color picker, inventory lookup, part-out scrape, XML shapes. Module map in [PROJECT.md](../../PROJECT.md#design-reference--bricklink-chrome-extension). |
| 2026-06-09 | **No iframes:** Coordinator must **not** use iframe-based BrickLink integration. Port AJAX patterns (e.g. extension `store-inventory-list.js` / `list.ajax`) instead. Extension iframe code (`inventory-iframe-lookup.js`) is **reference only for what to avoid** — do not modify extension repo. |
| 2026-06-10 | **Application views:** Six canonical views per [application-views.md](../../docs/support/application-views.md). **Unit 1** registers all routes (Home + New session fully functional; others stubbed). Units 2–4 deliver full behavior on the same views. |
| 2026-06-10 | **Organizer line states:** On **List lots**, a lot is **moved to storage** or **needs new storage location** (not a single generic checkbox). **Mark entire list complete** when all lines are in one of those states. |
| 2026-06-10 | **Reconciled handoff:** **Reconciled** on **Part-out reconciliation** generates XML and opens Bricklink **bulk update validation** (not silent background upload). |
| 2026-06-10 | **Storyboard (Unit 0):** Interactive shadcn-vue prototype with fixture data — all views navigable for stakeholder walkthroughs before backend ([storyboard.md](../../docs/support/storyboard.md)). |
| 2026-06-10 | **UI stack:** **shadcn-vue** + Tailwind v4 + Lucide + Vue Router on Vite; client **JavaScript** (`typescript: false`). Supersedes Font Awesome / generic ShadCN notes. |
| 2026-06-10 | **Part-out import:** **Server-side fetch** on session create (not JSON upload). New **Part-out import** view shows full fetched list; lead confirms before counting (excludes lines only when needed). **Single sweep** for brand-new sealed sets (all new) or loose bricks (all used). **Two sweeps** only for partial-bag sets (mixed opened/sealed bags). Supersedes [ADR-0003](../../adr/0003-part-out-import-json-upload-mvp.md) → [ADR-0004](../../adr/0004-part-out-server-fetch-curated-import.md). |
| 2026-06-11 | **New session scope:** Form exposes **set number + condition only**; Bricklink pricing and inventory-merge options are fixed server-side ([new-session.md](../../docs/view-specs/new-session.md)). Display name remains on Home. |
| 2026-06-12 | **New session UX (Dave):** Explicit **Back to Home**; **SetSearchCombobox** (FilterablePicker) + client set pattern validation; invalid set uses fixed client wrapper copy; create-time fetch error on import → **Loading then Error**; direct `/session/new` without display name → **redirect to Home** ([new-session.md](../../docs/view-specs/new-session.md)). |
| 2026-06-12 | **Part-out import UX (Dave):** **Any joined worker** may curate/confirm; Confirm **disabled** at zero included (no toast); concurrent curation **last-write-wins**; keep curate helper during fetch error; thumbnails **100×100 px** 1:1 ([part-out-import.md](../../docs/view-specs/part-out-import.md)). |
| 2026-06-12 | **List lots view spec:** Two modes on route (`cup`, `organizer`); reconciliation is Part-out reconciliation only. **Add lot** via SessionNav **Lot** / **List cups**, not on List lots. **Split list** once per session; any worker. Organizer **Delete** own lines only. **Mark complete** gated until all lines resolved. **Location** column required in organizer mode. |
| 2026-06-12 | **Session lifecycle (Model C):** `reconciling` → **Declare ready to organize** → `organizing` → **Declare ready to import** → `updating_inventory` → **Reconciled — export XML** (phase unchanged) → manual Bricklink handoff → **Mark session complete** → `closed`. See [home.md](../../docs/view-specs/home.md), [part-out-reconciliation.md](../../docs/view-specs/part-out-reconciliation.md). |
| 2026-06-12 | **Reconciliation MVP scope (Dave):** Promote Unit 4 gaps to requirements — tabs, Edit, live API, Mark complete, phase toasts, Reconcile nav from counting onward, no Cond column, refactor legacy List lots mode. |
| 2026-06-12 | **Process roles (Dave):** Counter, session lead, and organizer are **documentation-only** — no role-based auth in code; whoever uses a tool unofficially takes that role. `lead_worker_id` is audit metadata. See [process-roles.md](../../docs/process-roles.md). |
| 2026-06-12 | **MVP nav & phase (Dave):** SessionNav **Lots** always when bar shown; **Compare with Part-Out List** (`counting` → `reconciling`); any joined worker for `POST …/phase`; lot qty min 1; SetSearchCombobox in Unit 0. See [session-nav-by-view.md](../../docs/session-nav-by-view.md). |
| 2026-06-12 | **List lots & New session (Dave):** Organizer guard copy per phase (**Reconcile** / **export**); split once; delete own organizer lines; cup `cupId` redirect after `GET …/cups`; Unit 1+ set catalog = static bundled JSON. See [list-lots.md](../../docs/view-specs/list-lots.md), [new-session.md](../../docs/view-specs/new-session.md). |
| 2026-06-12 | **MVP gaps locked (Dave):** Duplicate merge `confirmMerge: true`; **Split list** once per session; organizer **Delete** own lines only; Lot form **New cup**; fixture defers to view specs ([README — Fixture vs target](../../docs/view-specs/README.md#fixture-vs-target-unit-0)). |

## Related documents

- Storyboard walkthrough: [storyboard.md](../../docs/support/storyboard.md)
- Tech stack: [docs/tech-stack.md](../../docs/tech-stack.md)
- Application views (canonical): [application-views.md](../../docs/support/application-views.md)
- Process roles policy: [process-roles.md](../../docs/process-roles.md)
- Q&A: [qa-001.md](../../docs/support/qa-001.md)
- Design reference map: [PROJECT.md — bricklink-chrome-extension](../../PROJECT.md#design-reference--bricklink-chrome-extension)
- Seed proposal: [OVERVIEW_AND_PROPOSAL.md](../../OVERVIEW_AND_PROPOSAL.md)
- Tech Spec: [tech-spec.md](./tech-spec.md) (in review — `/design` 2026-06-10)
- View/service inventory: [planned-views-services.md](../../docs/support/planned-views-services.md)
- Process: [docs/AIDLC.md](../../docs/AIDLC.md)
- Project memory: [PROJECT.md](../../PROJECT.md)
- Parent issue: [GitHub #2](https://github.com/dcvezzani/brick-counter-coordinator/issues/2) (`AIDLC feature folder: feature/part-out-coordinator/`)

## Human approval

- [x] Product owner approved before Design
