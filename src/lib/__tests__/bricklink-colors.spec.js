import { describe, expect, it } from 'vitest'
import { filterColors, getColorById, colorsForPartPicker } from '@/lib/bricklink-colors'

const SAMPLE = [
  { id: 11, name: 'Black' },
  { id: 41, name: 'Aqua' },
  { id: 86, name: 'Light Bluish Gray' },
]

describe('bricklink-colors', () => {
  it('filterColors returns all colors when query is empty', () => {
    expect(filterColors(SAMPLE, '')).toEqual(SAMPLE)
  })

  it('filterColors matches names that start with query (case insensitive)', () => {
    expect(filterColors(SAMPLE, 'a')).toEqual([
      { id: 41, name: 'Aqua' },
    ])
    expect(filterColors(SAMPLE, 'bl')).toEqual([{ id: 11, name: 'Black' }])
  })

  it('filterColors matches ids that start with query', () => {
    expect(filterColors(SAMPLE, '8')).toEqual([{ id: 86, name: 'Light Bluish Gray' }])
  })

  it('getColorById resolves numeric ids', () => {
    expect(getColorById(SAMPLE, 41)?.name).toBe('Aqua')
    expect(getColorById(SAMPLE, null)).toBeUndefined()
  })

  it('colorsForPartPicker preserves known id order and filters', () => {
    const catalog = [
      { id: 1, name: 'White' },
      { id: 11, name: 'Black' },
      { id: 86, name: 'Light Bluish Gray' },
    ]
    expect(colorsForPartPicker(catalog, [86, 11], 'l')).toEqual([
      { id: 86, name: 'Light Bluish Gray' },
    ])
  })
})
