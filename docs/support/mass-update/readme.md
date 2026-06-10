# Mass update

> **Canonical doc:** [bricklink-mass-update-export.md](../../bricklink-mass-update-export.md)

## Purpose

After reconciliation, the coordinator must turn a JSON part-out / session list into **BrickLink bulk-update XML** and get it into the **Mass Inventory Update** tool so the lead can verify and submit on BrickLink.

BrickLink provides a textarea on [invXML.asp#update](https://www.bricklink.com/invXML.asp#update). There is no JSON API for submit — paste XML → **Verify File** → review → confirm.

## Coordinator vs extension modules

| Flow | Extension module | Coordinator |
|------|------------------|-------------|
| **Bulk update** (patch existing lots by `<LOTID>`) | `scripts/bulk-repair/lib/build-bulk-update-xml.mjs` | **Unit 4 export** — port this |
| **Mass upload** (new lots: `<ITEMID>`, `<COLOR>`, …) | `src/lib/inv-upload-xml.js` | Not reconciled export; reference only |

Dave’s readme originally cited `inv-upload-xml.js` — that is the **upload** path. Reconciled handoff uses **bulk update** XML instead ([PROJECT.md](../../../PROJECT.md) design caution: upload ≠ bulk update).

## Handoff options

1. **Coordinator:** generate XML → download or copy to clipboard → user opens mass update page and pastes.
2. **Future extension:** on `invXML.asp`, write the **update** textarea (`data-ts-name="inv-update__textarea-xml"`) like the Add inventory modal does for upload.

## Extension planning docs

Copy source / reference (sibling repo):

- `bricklink-chrome-extension/dcv/bulk-updates-02/` — bulk-update help, upload format, DOM specs, fixtures
- `bricklink-chrome-extension/dcv/bulk-updates-02/bulk-update-documentation.md` — BrickLink tag reference
- `bricklink-chrome-extension/scripts/bulk-repair/lib/build-bulk-update-xml.mjs` — MVP XML builder
