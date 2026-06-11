import { describe, expect, it } from 'vitest'
import {
  defaultContainsFilter,
  defaultPrefixFilter,
  findPickerOption,
} from '@/lib/filterable-picker'

const OPTIONS = [
  { value: '3001', label: '3001' },
  { value: '3003', label: '3003' },
]

const COLOR_OPTIONS = [
  { value: 5, label: 'Brick Yellow (5)' },
  { value: 11, label: 'Black (11)' },
]

describe('filterable-picker helpers', () => {
  it('defaultPrefixFilter matches label and value prefixes', () => {
    expect(defaultPrefixFilter(OPTIONS, '30')).toHaveLength(2)
    expect(defaultPrefixFilter(OPTIONS, '3003')).toEqual([{ value: '3003', label: '3003' }])
  })

  it('defaultContainsFilter matches substrings in label and value', () => {
    expect(defaultContainsFilter(COLOR_OPTIONS, 'yel')).toEqual([
      { value: 5, label: 'Brick Yellow (5)' },
    ])
    expect(defaultContainsFilter(OPTIONS, '30')).toHaveLength(2)
    expect(defaultContainsFilter(OPTIONS, '003')).toEqual([{ value: '3003', label: '3003' }])
  })

  it('findPickerOption resolves by value', () => {
    expect(findPickerOption(OPTIONS, '3001')?.label).toBe('3001')
    expect(findPickerOption(OPTIONS, null)).toBeUndefined()
  })
})
