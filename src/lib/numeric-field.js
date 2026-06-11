/**
 * @param {string | number | null | undefined} raw
 * @param {{ emptyAsZero?: boolean }} [options]
 * @returns {number | null}
 */
export function parseNumericValue(raw, { emptyAsZero = false } = {}) {
  if (raw == null || raw === '') {
    return emptyAsZero ? 0 : null
  }
  const text = String(raw).trim()
  if (text === '' || text === '-') {
    return emptyAsZero ? 0 : null
  }
  const parsed = Number.parseInt(text, 10)
  if (Number.isNaN(parsed)) return emptyAsZero ? 0 : null
  return parsed
}

/**
 * @param {number} value
 * @param {{ min?: number, max?: number, allowNegative?: boolean }} [options]
 * @returns {number}
 */
export function clampValue(value, { min, max, allowNegative = false } = {}) {
  let result = value
  const floor = min ?? (allowNegative ? Number.NEGATIVE_INFINITY : 0)
  if (result < floor) result = floor
  if (max != null && result > max) result = max
  return result
}
