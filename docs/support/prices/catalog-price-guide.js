/**
 * Reference copy of bricklink-chrome-extension/src/lib/catalog-price-guide.js
 * Canonical doc: docs/bricklink-catalog-price-guide.md
 * Fixture: docs/support/prices/fixtures/catalog-price-guide.html
 */
const CATALOG_PRICE_GUIDE_BASE =
  "https://www.bricklink.com/catalogPG.asp";

/** @type {Map<string, string>} */
const avgPriceCache = new Map();

/**
 * @param {string} partId
 * @param {string | number} colorId
 * @returns {string}
 */
export function buildCatalogPriceGuideUrl(partId, colorId) {
  const trimmedPart = String(partId ?? "").trim();
  const trimmedColor = String(colorId ?? "").trim();
  if (!trimmedPart || !trimmedColor) return "";
  const params = new URLSearchParams({
    P: trimmedPart,
    colorid: trimmedColor,
  });
  return `${CATALOG_PRICE_GUIDE_BASE}?${params.toString()}`;
}

/**
 * @param {string} text
 * @returns {string}
 */
export function normalizeBricklinkPrice(text) {
  const cleaned = String(text ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/US\s*\$/i, "")
    .trim();
  const match = cleaned.match(/[\d,.]+/);
  if (!match) return "";
  return match[0].replace(/,/g, "");
}

/**
 * @param {string} text
 * @returns {string}
 */
function normalizeLabel(text) {
  return String(text ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {Document} doc
 * @returns {HTMLTableElement | null}
 */
function findPriceGuideStatsTable(doc) {
  for (const el of doc.querySelectorAll("td, font, b")) {
    if (!el.textContent?.includes("Current Items for Sale")) continue;
    let table = el.closest("table");
    while (table instanceof HTMLTableElement) {
      const text = table.textContent ?? "";
      if (
        text.includes("Last 6 Months Sales") &&
        text.includes("Current Items for Sale")
      ) {
        return table;
      }
      const parent = table.parentElement?.closest("table");
      table = parent instanceof HTMLTableElement ? parent : null;
    }
  }
  return null;
}

/**
 * @param {HTMLTableElement} table
 * @returns {HTMLTableRowElement | null}
 */
function findPriceGuideDataRow(table) {
  for (const tr of table.querySelectorAll("tr")) {
    const bg = (tr.getAttribute("bgcolor") ?? tr.getAttribute("BGCOLOR") ?? "")
      .trim()
      .toLowerCase();
    if (bg === "#c0c0c0") return tr;
  }
  return null;
}

/**
 * @param {HTMLTableCellElement} cell
 * @returns {string}
 */
function readAvgPriceFromColumnCell(cell) {
  for (const tr of cell.querySelectorAll("tr")) {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 2) continue;
    if (normalizeLabel(tds[0].textContent) !== "Avg Price:") continue;
    const valueEl = tds[1].querySelector("b") ?? tds[1];
    return normalizeBricklinkPrice(valueEl.textContent);
  }
  return "";
}

/**
 * @param {Document} doc
 * @param {string} condition N or U
 * @returns {string}
 */
export function parseAvgForSalePriceFromDocument(doc, condition) {
  const table = findPriceGuideStatsTable(doc);
  if (!table) return "";

  const dataRow = findPriceGuideDataRow(table);
  if (!dataRow) return "";

  const cells = dataRow.querySelectorAll(":scope > td");
  const colIndex = condition === "N" ? 2 : 3;
  const cell = cells[colIndex];
  if (!(cell instanceof HTMLTableCellElement)) return "";

  return readAvgPriceFromColumnCell(cell);
}

/**
 * @param {string} html
 * @param {string} condition N or U
 * @returns {string}
 */
export function parseAvgForSalePriceFromHtml(html, condition) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return parseAvgForSalePriceFromDocument(doc, condition);
}

/**
 * @param {string} partId
 * @param {string | number} colorId
 * @param {string} condition
 * @returns {string}
 */
function priceGuideCacheKey(partId, colorId, condition) {
  const cond = condition === "N" ? "N" : "U";
  return `${String(partId).trim()}:${String(colorId).trim()}:${cond}`;
}

/**
 * @param {{ partId?: string, colorId?: string | number, condition?: string, signal?: AbortSignal, force?: boolean }} opts
 * @returns {Promise<{ avgPrice: string, priceGuideUrl: string }>}
 */
export async function fetchAvgForSalePrice(opts = {}) {
  const partId = String(opts.partId ?? "").trim();
  const colorId = String(opts.colorId ?? "").trim();
  const condition = opts.condition === "N" ? "N" : "U";
  const priceGuideUrl = buildCatalogPriceGuideUrl(partId, colorId);
  const empty = { avgPrice: "", priceGuideUrl: "" };

  if (!partId || !colorId) return empty;

  const cacheKey = priceGuideCacheKey(partId, colorId, condition);
  if (!opts.force && avgPriceCache.has(cacheKey)) {
    return {
      avgPrice: avgPriceCache.get(cacheKey) ?? "",
      priceGuideUrl,
    };
  }

  if (!priceGuideUrl) return empty;

  try {
    const response = await fetch(priceGuideUrl, {
      credentials: "include",
      signal: opts.signal,
    });
    if (!response.ok) {
      return { avgPrice: "", priceGuideUrl };
    }
    const html = await response.text();
    const avgPrice = parseAvgForSalePriceFromHtml(html, condition);
    avgPriceCache.set(cacheKey, avgPrice);
    return { avgPrice, priceGuideUrl };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    return { avgPrice: "", priceGuideUrl };
  }
}

/** Visible for tests */
export function resetPriceGuideCacheForTests() {
  avgPriceCache.clear();
}
