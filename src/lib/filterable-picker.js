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
 * @param {{ value: string | number, label: string }[]} options
 * @param {string | number | null | undefined} value
 */
export function findPickerOption(options, value) {
  if (value == null || value === '') return undefined
  return options.find((option) => option.value === value)
}
