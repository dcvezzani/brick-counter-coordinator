# BrickLink mass update — XML export & validation handoff

How to turn a reconciled part-out list into **BrickLink bulk-update XML** and stage it in the **Mass Inventory Update** tool for verification and manual submit.

**Coordinator use:** Unit 4 **Reconciled** → `POST /sessions/:id/reconciliation/export-xml` → download/copy XML → BrickLink validation page ([product-spec](../feature/part-out-coordinator/product-spec.md)).

**Raw notes:** [support/mass-update/readme.md](support/mass-update/readme.md)

---

## Overview

BrickLink has **no live store API** for inventory submit in MVP. After counting and reconciliation, the coordinator:

1. **Builds** bulk-update XML from reconciled rows (lot ID + fields to patch).
2. **Delivers** XML to the session lead (download, clipboard, optional extension assist).
3. **Opens** the BrickLink mass-update UI for **verify → confirm → post** (human steps outside the app).

There is no server-side “submit to BrickLink” — validation and upload happen on `bricklink.com` with the user’s store session.

---

## Upload XML vs bulk-update XML (critical)

`invXML.asp` hosts **two different** XML workflows. Do not mix schemas.

| Mode | BrickLink section | Verify form | Textarea `data-ts-name` | Extension module | Coordinator |
|------|-------------------|-------------|-------------------------|------------------|-------------|
| **Mass upload** (new lots) | Add many items | `invXMLverify.asp` | `inv-upload__textarea-xml` | `inv-upload-xml.js` (`serializeUploadXml`) | **Not** reconciled export |
| **Mass update** (patch lots) | [Mass Update](https://www.bricklink.com/invXML.asp#update) | `invXMLupdateVerify.asp` | `inv-update__textarea-xml` | `build-bulk-update-xml.mjs` | **Yes** — Unit 4 export |

**Upload** items use `<ITEMTYPE>`, `<ITEMID>`, `<COLOR>`, `<PRICE>`, `<QTY>`, etc.  
**Bulk update** items require `<LOTID>` and only include tags for fields being changed.

See extension [upload-xml-format.md](https://github.com/dcvezzani/bricklink-chrome-extension/blob/main/dcv/bulk-updates-02/upload-xml-format.md) vs [bulk-update-documentation.md](https://github.com/dcvezzani/bricklink-chrome-extension/blob/main/dcv/bulk-updates-02/bulk-update-documentation.md).

---

## Why this service exists

| Need | How mass update helps |
|------|------------------------|
| Push reconciled **Remarks** (storage locations) to store lots | `<REMARKS>` per `<LOTID>` |
| Adjust qty after physical count vs part-out | `<QTY>` with `+` / `-` prefix (BrickLink rules) |
| Patch price, condition, etc. | Optional tags per [bulk-update help](https://www.bricklink.com/help.asp?helpID=251) |
| Stay within MVP (no API keys) | Manual verify on BrickLink after XML handoff |

Part-out fetch gives expected lines; counting produces session totals; reconciliation resolves deltas; **export** produces the BrickLink patch file.

---

## Bulk-update XML format

Authoritative tag reference: extension [dcv/bulk-updates-02/bulk-update-documentation.md](https://github.com/dcvezzani/bricklink-chrome-extension/blob/main/dcv/bulk-updates-02/bulk-update-documentation.md) (BrickLink helpID 251).

### Envelope

```xml
<?xml version="1.0" encoding="UTF-8"?>
<INVENTORY>
   <ITEM>
      <LOTID>2516600</LOTID>
      <REMARKS>UB0021</REMARKS>
   </ITEM>
</INVENTORY>
```

| Rule | Value |
|------|--------|
| Root | Single `<INVENTORY>` |
| Required per item | `<LOTID>` — existing store lot ID |
| Optional tags | Only fields being updated (`<REMARKS>`, `<PRICE>`, `<QTY>`, …) |
| `<QTY>` | Must use **`+`** or **`-`** prefix (relative adjust, not absolute) |
| Escaping | `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;` — no raw HTML |
| Max size | **204800 bytes** (entire file; rollback on partial failure) |

### Coordinator MVP builder

Port `buildBulkUpdateXml` from `bricklink-chrome-extension/scripts/bulk-repair/lib/build-bulk-update-xml.mjs`:

```js
// Input: { lotId, remarks }[] from reconciled part_out_lines (bricklink_lot_id + remarks)
// Output: XML string with escaped REMARKS per LOTID
```

Expand later for `<QTY>`, `<PRICE>`, etc. when reconciliation resolves those fields.

`escapeXmlText`: extension `scripts/bulk-repair/lib/xml-escape.mjs` or `inv-upload-xml.js`.

---

## JSON → XML pipeline (coordinator)

```mermaid
flowchart LR
  PO[part_out_lines included] --> REC[reconciliation + resolve]
  LOTS[session lots / overrides] --> REC
  REC --> ROWS[{ lotId, remarks, ... }]
  ROWS --> XML[buildBulkUpdateXml]
  XML --> OUT[download / clipboard / extension]
  OUT --> BL[invXML.asp#update verify]
```

| Source field | XML tag | Notes |
|--------------|---------|-------|
| `part_out_lines.bricklink_lot_id` | `<LOTID>` | From part-out fetch / store inventory |
| `part_out_lines.remarks` or organizer pick | `<REMARKS>` | Storage location |
| Reconciliation qty delta (future) | `<QTY>` | e.g. `+3` or `-2` per BrickLink rules |

Skip rows without `bricklink_lot_id` — bulk update cannot create new catalog lots.

---

## BrickLink UI — validation handoff

| Step | Action |
|------|--------|
| 1 | Open [Mass Inventory Update](https://www.bricklink.com/invXML.asp#update) (logged into store) |
| 2 | Paste XML into the update textarea: `textarea[name="xmlFile"][data-ts-name="inv-update__textarea-xml"]` |
| 3 | Click **Verify File** → POST `invXMLupdateVerify.asp` |
| 4 | Review verification page — changed fields shown in **bold** |
| 5 | Confirm submit (user action on BrickLink) |

**Validation URL** for coordinator API response: `https://www.bricklink.com/invXML.asp#update`

### Handoff options

| Method | Who | Notes |
|--------|-----|-------|
| **Download XML** | Coordinator SPA | `Content-Disposition` attachment from `export-xml` |
| **Copy to clipboard** | Coordinator SPA | Lead pastes into BrickLink textarea |
| **Open validation tab** | Coordinator SPA | `window.open(validationUrl)` + clipboard prompt |
| **Extension staging** (future) | Chrome extension on `invXML.asp` | Mirror extension Queue: write textarea + `input`/`change` events ([`setUploadTextareaValue`](https://github.com/dcvezzani/bricklink-chrome-extension/blob/main/src/lib/inv-xml-upload-dom.js) pattern for **update** textarea) |

Extension **Add inventory** modal uses the **upload** textarea (`inv-upload-xml.js`) — different form. For bulk update staging, target `inv-update__textarea-xml` / `invXMLupdateVerify.asp`.

---

## Coordinator API (Unit 4)

| Method | Path | Response |
|--------|------|----------|
| `POST` | `/sessions/:id/reconciliation/export-xml` | `{ xml, validationUrl, byteSize, warnings? }` |

**Checks before return:**

- XML ≤ 204800 bytes (`UPLOAD_XML_MAX_BYTES` in `inv-upload-xml.js` applies to both flows)
- Every `<ITEM>` has `<LOTID>`
- `escapeXmlText` on all text nodes
- Optional: warn if row count × avg size approaches limit

**Not in scope:** POST XML to BrickLink server-side; auto-submit after verify.

---

## Reference code (extension)

| Topic | Path |
|-------|------|
| Bulk-update XML builder | `scripts/bulk-repair/lib/build-bulk-update-xml.mjs` |
| XML escape | `scripts/bulk-repair/lib/xml-escape.mjs` |
| Upload XML (new lots — **not** coordinator export) | `src/lib/inv-upload-xml.js` |
| Upload textarea DOM | `src/lib/inv-xml-upload-dom.js` |
| Bulk-update help capture | `bricklink-chrome-extension/dcv/bulk-updates-02/bulk-update-documentation.md` |
| Upload format spec | `bricklink-chrome-extension/dcv/bulk-updates-02/upload-xml-format.md` |
| Planning / UX | `bricklink-chrome-extension/dcv/bulk-updates-02/overview-and-proposal.md`, `product-spec.md` |
| CLI example | `scripts/bulk-repair/tsv-to-bulk-update-xml.mjs` |

Tests: `tests/build-bulk-update-xml.test.js`

---

## Tests

| Case | Assert |
|------|--------|
| `buildBulkUpdateXml` | Multiple rows → valid `<INVENTORY>` with `<LOTID>` + `<REMARKS>` |
| `escapeXmlText` | `&`, `<`, `>` escaped |
| Size limit | XML > 204800 bytes → error before handoff |
| Missing lot ID | Row omitted or validation error |
| Round-trip | Sample matches extension test fixtures |

---

## Related docs

- [Tech Spec — Reconciliation & export](../feature/part-out-coordinator/tech-spec.md#reconciliation-unit-4)
- [docs/bricklink-set-part-out-fetch.md](bricklink-set-part-out-fetch.md) — import side (`invSetEdit.asp`)
- [PROJECT.md — XML export rows](../PROJECT.md#design-reference--bricklink-chrome-extension)
- [ADR-0002](../adr/0002-bricklink-ajax-only-no-iframes.md) — no iframe submit; manual BrickLink UI
