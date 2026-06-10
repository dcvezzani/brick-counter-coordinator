# Colors

> **Canonical doc:** [bricklink-colors.md](../../bricklink-colors.md)

## Purpose

Power the **color picker** and any UI that maps BrickLink color id → swatch, hex, or English name.

| Layer | Source |
|-------|--------|
| Full catalog | `bricklink-colors.json` + `bricklink-colors.js` |
| Per-part subset | `catalog-known-colors.js` — scrape `catalogitem.page` |

## Files to port from extension

| Extension path | Coordinator use |
|----------------|-----------------|
| `src/data/bricklink-colors.json` | Bundle on server (or `src/data/`) |
| `src/lib/bricklink-colors.js` | `filterColors`, `getColorById` |
| `src/lib/catalog-known-colors.js` | Known color ids + `colorsForPartPicker` |

## Fixtures

| File | Role |
|------|------|
| [fixtures/known-colors-snippet.html](fixtures/known-colors-snippet.html) | Parser test — part `15540` order `85, 11, 63, 5, 2, 1` |

## Extension reference docs

- `bricklink-chrome-extension/dcv/bulk-updates-02/colors-data-spec.md` — JSON schema, picker UX
- `bricklink-chrome-extension/dcv/bulk-updates-02/getting-known-colors.md` — catalog page scrape notes
