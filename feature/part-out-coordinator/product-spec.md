# Product Spec — Part-Out Counting Coordinator

**AIDLC phase:** Plan  
**Audience:** Product, engineering leads, stakeholders — **product language only** (no implementation or stack). Unresolved product questions should be **asked in chat** first; this file records **decisions** after they are made.

---

## Overview

| Field | Value |
|-------|-------|
| **Feature** | Part-Out Counting Coordinator |
| **Status** | Ready for approval |
| **Author** | David Vezzani (from [OVERVIEW_AND_PROPOSAL.md](../../OVERVIEW_AND_PROPOSAL.md)) |
| **Created** | 2026-06-09 |
| **Last updated** | 2026-06-10 |
| **Related Tech Spec** | [tech-spec.md](./tech-spec.md) (created in `/design`) |

## Problem & audience

### Problem statement

Sorting and counting LEGO parts for part-out work is slow and coordination-heavy. Today one or two people sort into physical cups while a separate person logs counts into the system. That split workflow creates duplicate effort, idle time, and constant interruptions.

Workers often do not know when someone else is already counting the same part (same part number, color, and condition — a **lot**). Sorting and counting happen in separate passes. The data-entry person waits while counters report verbally, and counters wait while data is typed in.

### Who it's for

- **Counters / sorters** — staff who physically sort LEGO into cups and record quantities on their own mobile device.
- **Session lead** — person who starts a part-out session for a specific set, monitors progress, runs reconciliation, and finalizes the list.
- **Organizers** — workers who later put reconciled parts into labeled drawers, bins, or containers using assigned pick lists.

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
| 2 | **Duplicate-lot awareness** — When worker B enters a lot that worker A already recorded, B sees who created it and the current total for that lot before or immediately after submit. | Enter same part/color/condition from two devices; second worker sees existing-lot message with creator and quantity. |
| 3 | **Mobile-first entry** — A worker can complete one lot entry (part, color, condition, count) on a phone-sized viewport **without scrolling the main form**. | Manual check on phone or narrow viewport; all primary controls visible. |
| 4 | **Session lifecycle** — Lead can create a session from a Bricklink part-out for a set; workers pick a **display name at join**, select the session, and all counts roll up. | End-to-end walkthrough: create → join with name → submit → view session totals. |
| 5 | **Part search** — Worker can search/select a part to populate the part identifier field (search behavior matches business need for finding parts by number or name). | Search for a known part; selection fills the part field. |
| 6 | **Save and Add Another** — Form offers **Save** and **Save and Add Another**; the latter saves the current lot and opens a fresh form with the **same part id pre-filled** (one lot per form). | Submit via Save and Add Another; new form shows previous part id; color/condition/count cleared or ready for entry. |
| 7 | **Cups list navigation** — A **cups list** shows all cups in the session; tapping a cup opens the lot form, or prompts to pick a lot when the cup has **multiple colors** for the same part. | Cup with one color opens directly; cup with multiple colors shows chooser then opens selected lot. |
| 8 | **Reconciliation** — System compares session counts to the imported Bricklink part-out list, showing matches and mismatches, with a filter for **mismatches only**. | Known part-out + session data; report classifies rows correctly. |
| 9 | **Discrepancy resolution** — Workers can resolve mismatches until reconciled totals reflect agreed final quantities. | Resolve at least one mismatch; reconciled view updates. |
| 10 | **Pick-list split** — After finalize, lead generates **roughly even** organizer lists per worker; each line includes **storage location** from part-out Remarks. | Split among M workers; locations visible; no worker gets zero lines when N ≥ M. |
| 11 | **Organizer progress** — Pick-list lines have checkboxes; worker progress persists for their list during the session. | Mark lines complete; state survives refresh within session. |
| 12 | **Pick-list delivery** — Lists on worker devices and printable when a printer is available. | View on device; print or print-ready output for one worker list. |
| 13 | **Bricklink XML export** — Reconciled list exports as **XML** suitable for Bricklink **bulk update** (manual upload). | Export file validates against bulk-update workflow; spot-check row contents vs reconciled session. |

### Business impact

- **Time saved** — Fewer duplicate sorts, fewer counting passes, less idle time for the dedicated logger role.
- **Accuracy** — Consolidated real-time totals and structured reconciliation reduce transcription errors and missed duplicate cups.
- **Throughput** — More staff can participate simultaneously during peak part-out work.
- **Bricklink continuity** — XML export fits the existing bulk-update workflow without requiring live store API integration in MVP.

## User experience & scenarios

### Key scenarios

1. **Start a part-out session** — Session lead creates a session from a **Bricklink part-out** for a set (set number plus standard Bricklink options: pricing basis, new/used, inventory overwrite vs consolidate). Workers see the session in a list, **enter a display name when joining**, and begin counting.

2. **Record a lot (single lot per form)** — Worker enters part (via search/picker), color, condition (new or used), and count. Form fits on one mobile screen without scrolling. Worker taps **Save** to record and stay on context, or **Save and Add Another** to record and immediately get a **new form with the same part id pre-filled** (for entering another color/condition of that part).

3. **Discover an existing lot** — If the part/color/condition already exists in the session, worker sees who created it, current quantity, and that other physical cups may exist for the same lot.

4. **Browse cups** — Worker opens the **cups list** showing all cups in the session. Tapping a cup:
   - **One color** for the part(s) in that cup → opens that lot in the entry form for view/edit.
   - **Multiple colors** for the same part → worker **chooses which lot** to open, then the form loads that lot.

5. **Reconcile against Bricklink part-out** — Lead opens reconciliation vs the imported official list. Matches and mismatches are shown; lead filters to mismatches only and workers resolve discrepancies.

6. **Finalize, split, and organize** — Lead finalizes reconciliation. System splits entries across workers (~even). Each pick-list line shows part, color, condition, quantity, and **storage location** from Bricklink **Remarks** ("My Remarks" / location). Workers use device or printed list and check off lines as parts are placed.

7. **Export to Bricklink** — Lead exports the reconciled list as **XML** and uploads via Bricklink **bulk update** (outside the app — familiar manual step).

### Experience principles

- **Mobile-first** — Primary interaction is thumb-friendly on phone or tablet at the sorting table.
- **One lot per form** — Keep entry simple; use Save and Add Another for rapid entry of related lots (same part, different color).
- **Low interruption** — No shouting across the room to avoid duplicates or confirm counts.
- **Clear, calm feedback** — Lot-exists and reconciliation messages show who, what, and how many.
- **Elegant and engaging UI** — Polished, modern interface; Dave wants high-quality UX without hand-tuning every pixel (implementation in `/design`).
- **Reuse familiar controls** — Color selection should feel consistent with Dave's **existing LEGO tooling** (reference implementations available for Design — see Related documents).
- **Glanceable progress** — Lead and workers can see whether the session is in counting, reconciliation, or organizing.

## Scope

### In scope

- Part-out **session** creation from a **Bricklink part-out** for a given set (set number and Bricklink part-out options).
- Worker **display name at join** (no account system required for MVP).
- Worker **self-service entry** of lots: part identifier, color, condition, quantity — **one lot per form**.
- Form actions: **Save** and **Save and Add Another** (pre-fill part id on the latter).
- **Part search / picker** (search API/integration — mechanism deferred to `/design`; Dave has reference behavior in existing tooling).
- **Color picker** UX aligned with Dave's existing LEGO extension patterns (Design reuses or ports behavior).
- **Cups list** view with navigation rules for single- vs multi-color cups.
- **Real-time or near-real-time** consolidated session totals across workers.
- **Duplicate-lot notification** when a lot already exists in the session.
- **Reconciliation report** vs imported Bricklink part-out list: matches, mismatches, mismatch-only filter.
- **Discrepancy resolution** until reconciled totals are agreed.
- **Even split** of reconciled entries across session workers for organizing.
- **Pick lists** with **storage location** per line (from part-out **Remarks** metadata) and **per-line completion** tracking.
- **Delivery** of pick lists to worker session views and to a **printer** when available.
- **XML export** of reconciled list for **Bricklink bulk update** tool.

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
- Dave prefers polished UI via component library + AI-assisted layout (detail in `/design`).
- Reliability matters during active counting sessions (dropped connection must not silently lose submitted counts — behavior defined in `/design`).
- **No iframe-based BrickLink integration** in this application. The reference extension uses iframes for some flows (e.g. part-out My Remarks lookup), but the coordinator **must not** adopt that pattern. Prefer direct **AJAX/fetch** approaches (as in the extension's inventory lot lookup / new-lot entry flow) for any BrickLink session calls. Iframe workarounds are **explicitly forbidden** unless a human approves an exception with documented evidence that no AJAX equivalent exists.

## Decisions

Key product decisions established during planning (based on [OVERVIEW_AND_PROPOSAL.md](../../OVERVIEW_AND_PROPOSAL.md) and iterative refinement):

| Date | Decision |
|------|----------|
| 2026-06-09 | Feature slug: `part-out-coordinator`. |
| 2026-06-09 | **Part catalog / search:** Searchable parts via an API-style lookup; color picker reuses patterns from Dave's existing LEGO Chrome extension (Design to align with reference code). |
| 2026-06-09 | **Part-out list source:** Bricklink part-out for a set (set number + Bricklink options: pricing, new/used, overwrite vs consolidate inventory). Import mechanism (e.g. JSON from extension scrape vs authenticated fetch) is a **Design** choice; Dave has reference implementations. |
| 2026-06-09 | **Bricklink handoff:** MVP exports reconciled list as **XML** for **Bricklink bulk update** — not live API submit. |
| 2026-06-09 | **Worker identity:** **Pick display name at join** — no auth system for MVP. |
| 2026-06-09 | **Multi-color cups / entry:** **One lot per form.** Buttons: **Save** and **Save and Add Another** (latter pre-fills part id on new form). **Cups list** view: tap cup → open lot directly if one color; if multiple colors for same part, prompt to choose lot then open form. |
| 2026-06-09 | **Storage locations:** From Bricklink part-out **Remarks** ("My Remarks" / location) on each line — carried through to pick lists. |
| 2026-06-09 | **Design reference codebase:** Sibling repo `bricklink-chrome-extension` at `/Users/dcvezzani/personal-projects/lego/bricklink-chrome-extension` — color picker, inventory lookup, part-out scrape, XML shapes. Module map in [PROJECT.md](../../PROJECT.md#design-reference--bricklink-chrome-extension). |
| 2026-06-09 | **No iframes:** Coordinator must **not** use iframe-based BrickLink integration. Port AJAX patterns (e.g. extension `store-inventory-list.js` / `list.ajax`) instead. Extension iframe code (`inventory-iframe-lookup.js`) is **reference only for what to avoid** — do not modify extension repo. |

## Related documents

- Design reference map: [PROJECT.md — bricklink-chrome-extension](../../PROJECT.md#design-reference--bricklink-chrome-extension)
- Seed proposal: [OVERVIEW_AND_PROPOSAL.md](../../OVERVIEW_AND_PROPOSAL.md)
- Tech Spec: [tech-spec.md](./tech-spec.md) (pending `/design`)
- Process: [docs/AIDLC.md](../../docs/AIDLC.md)
- Project memory: [PROJECT.md](../../PROJECT.md)
- Parent GitHub issue: [#2](https://github.com/dcvezzani/brick-counter-coordinator/issues/2)

## Human approval

- [ ] Product owner approved before Design
