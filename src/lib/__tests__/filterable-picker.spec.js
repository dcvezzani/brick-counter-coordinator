import { describe, expect, it } from 'vitest'
import { defaultPrefixFilter, findPickerOption } from '@/lib/filterable-picker'

const OPTIONS = [
  { value: '3001', label: '3001' },
  { value: '3003', label: '3003' },
]

describe('filterable-picker helpers', () => {
  it('defaultPrefixFilter matches label and value prefixes', () => {
    expect(defaultPrefixFilter(OPTIONS, '30')).toHaveLength(2)
    expect(defaultPrefixFilter(OPTIONS, '3003')).toEqual([{ value: '3003', label: '3003' }])
  })

  it('findPickerOption resolves by value', () => {
    expect(findPickerOption(OPTIONS, '3001')?.label).toBe('3001')
    expect(findPickerOption(OPTIONS, null)).toBeUndefined()
  })
})
