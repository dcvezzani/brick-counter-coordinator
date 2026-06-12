/**
 * Display name normalization for Home join/create.
 * @see docs/view-specs/home.md#display-name-rules
 */
export function normalizeDisplayName(raw) {
  return String(raw ?? '').trim().toLowerCase()
}
