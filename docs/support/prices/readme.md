# Catalog price guide

> **Canonical doc:** [bricklink-catalog-price-guide.md](../../bricklink-catalog-price-guide.md)

## Why a price-guide service

Lot entry and export sometimes need a **price** for part + color + condition. BrickLink does not expose a JSON API for catalog market prices.

| Source | Limitation |
|--------|------------|
| Store inventory (`list.ajax`) | `invPrice` only when the part is **already in your store** |
| **Catalog price guide** (`catalogPG.asp`) | Market **avg price** from **Current Items for Sale** — works even with no store lot |

The chrome extension solves this by fetching HTML, scraping the stats table, and normalizing **Avg Price** by condition (New vs Used). The same approach can be ported to the coordinator server.

## Files in this folder

| File | Purpose |
|------|---------|
| [catalog-price-guide.js](catalog-price-guide.js) | Reference implementation (copy of extension module) |
| [fixtures/catalog-price-guide.html](fixtures/catalog-price-guide.html) | HTML fixture for parser tests (part `15540`, color `85`) |

## Extension source of truth

- `bricklink-chrome-extension/src/lib/catalog-price-guide.js`
- `bricklink-chrome-extension/tests/catalog-price-guide.test.js`
- `bricklink-chrome-extension/docs/inv-xml-population-rules.md` — `prlk` / `prsrc` population rules
