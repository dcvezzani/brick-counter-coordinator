/**
 * Default prefix filter for FilterablePicker options.
 * @param {{ value: string | number, label: string }[]} options
 * @param {string} query
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
 * @param {{ value: string | number, label: string }[]} options
 * @param {string} query
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
 * @param {{ value: string | number, label: string }[]} options
 * @param {string | number | null | undefined} value
 */
export function findPickerOption(options, value) {
  if (value == null || value === '') return undefined
  return options.find((option) => option.value === value)
}
