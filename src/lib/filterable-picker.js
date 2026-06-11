/**
 * @typedef {object} PickerOption
 * @property {string | number} value
 * @property {string} label
 * @property {unknown} [data]
 */

/**
 * Default prefix filter for FilterablePicker options.
 * @param {PickerOption[]} options
 * @param {string} query
 * @returns {PickerOption[]}
 */
export function defaultPrefixFilter(options, query) {
  const q = query.trim().toLowerCase()
  if (!q) return [...options]
  return options.filter(
    (option) =>
      option.label.toLowerCase().startsWith(q) ||
      String(option.value).toLowerCase().startsWith(q),
  )
}

/**
 * Substring filter for FilterablePicker options (label or value contains query).
 * @param {PickerOption[]} options
 * @param {string} query
 * @returns {PickerOption[]}
 */
export function defaultContainsFilter(options, query) {
  const q = query.trim().toLowerCase()
  if (!q) return [...options]
  return options.filter(
    (option) =>
      option.label.toLowerCase().includes(q) ||
      String(option.value).toLowerCase().includes(q),
  )
}

/**
 * @param {PickerOption[]} options
 * @param {string | number | null | undefined} value
 * @returns {PickerOption | undefined}
 */
export function findPickerOption(options, value) {
  if (value == null || value === '') return undefined
  return options.find((option) => option.value === value)
}
