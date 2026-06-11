/**
 * BrickLink color catalog helpers — ported from bricklink-chrome-extension/src/lib/bricklink-colors.js
 * and catalog-known-colors.js (colorsForPartPicker).
 */

/**
 * @param {{ id: number, name: string, swatch?: string, hex?: string }[]} colors
 * @param {string} query
 * @returns {{ id: number, name: string, swatch?: string, hex?: string }[]}
 */
export function filterColors(colors, query) {
  const q = query.trim().toLowerCase()
  if (!q) return [...colors]
  return colors.filter((c) => c.name.toLowerCase().startsWith(q) || String(c.id).startsWith(q))
}

/**
 * @param {{ id: number, name: string }[]} colors
 * @param {number | string | null | undefined} id
 */
export function getColorById(colors, id) {
  if (id == null || id === '') return undefined
  const numeric = Number(id)
  if (!Number.isFinite(numeric)) return undefined
  return colors.find((c) => c.id === numeric)
}

/**
 * Resolve display swatch from catalog entry (hex in fixtures, swatch in production JSON).
 * @param {{ swatch?: string, hex?: string } | undefined} color
 */
export function colorSwatch(color) {
  return color?.swatch ?? color?.hex ?? '#cccccc'
}

/**
 * Order and filter known color ids for a part (picker list source).
 * @param {{ id: number, name: string }[]} catalog
 * @param {number[]} knownIds
 * @param {string} query
 */
export function colorsForPartPicker(catalog, knownIds, query) {
  if (!knownIds?.length) return filterColors(catalog, query)

  const ordered = []
  for (const id of knownIds) {
    const entry = getColorById(catalog, id)
    if (entry) ordered.push(entry)
  }
  return filterColors(ordered, query)
}
