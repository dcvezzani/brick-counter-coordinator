import { describe, expect, it } from 'vitest'
import {
  HORIZONTAL_SLOTS,
  applySteppedDelta,
  createSteppedAxisConfig,
  extremeRepeatDelta,
  isExtremeSlot,
  offsetToHorizontalSlot,
  offsetToVerticalSlot,
  slotDelta,
  slotLabelAmounts,
  toLogicalHorizontalSlot,
  toLogicalVerticalSlot,
} from '@/lib/stepped-swipe-number-input'

const clampAtZero = { min: 0, allowNegative: false }

describe('stepped-swipe-number-input helpers', () => {
  it('offsetToHorizontalSlot maps edge-to-edge to ±10', () => {
    const max = 100
    expect(offsetToHorizontalSlot(0, max)).toBe(0)
    expect(offsetToHorizontalSlot(-100, max)).toBe(-HORIZONTAL_SLOTS)
    expect(offsetToHorizontalSlot(100, max)).toBe(HORIZONTAL_SLOTS)
  })

  it('offsetToVerticalSlot maps up and down', () => {
    const max = 40
    expect(offsetToVerticalSlot(0, max)).toBe(0)
    expect(offsetToVerticalSlot(-20, max)).toBe(-1)
    expect(offsetToVerticalSlot(20, max)).toBe(1)
  })

  it('slotDelta counts horizontal slot crossings', () => {
    expect(slotDelta(0, 0, -10, 0)).toEqual({ delta1: 10, delta10: 0 })
    expect(slotDelta(0, 0, 10, 0)).toEqual({ delta1: -10, delta10: 0 })
  })

  it('slotDelta counts vertical slot crossings', () => {
    expect(slotDelta(0, 0, 0, -1)).toEqual({ delta1: 0, delta10: 10 })
    expect(slotDelta(0, 0, 0, 1)).toEqual({ delta1: 0, delta10: -10 })
  })

  it('applySteppedDelta adds +10 for ten left slots', () => {
    const result = applySteppedDelta(0, { delta1: 10, delta10: 0 }, clampAtZero)
    expect(result).toBe(10)
  })

  it('applySteppedDelta subtracts 10 for ten right slots', () => {
    const result = applySteppedDelta(20, { delta1: -10, delta10: 0 }, clampAtZero)
    expect(result).toBe(10)
  })

  it('applySteppedDelta adds +10 for vertical up', () => {
    const result = applySteppedDelta(5, { delta1: 0, delta10: 10 }, clampAtZero)
    expect(result).toBe(15)
  })

  it('decrement 10 from value 7 with min 0 sets 0', () => {
    const result = applySteppedDelta(7, { delta1: 0, delta10: -10 }, clampAtZero)
    expect(result).toBe(0)
  })

  it('isExtremeSlot detects horizontal and vertical extremes', () => {
    expect(isExtremeSlot(-10, 0)).toBe(true)
    expect(isExtremeSlot(10, 0)).toBe(true)
    expect(isExtremeSlot(0, -1)).toBe(true)
    expect(isExtremeSlot(0, 1)).toBe(true)
    expect(isExtremeSlot(-5, 0)).toBe(false)
    expect(isExtremeSlot(0, 0)).toBe(false)
  })

  it('toLogicalHorizontalSlot inverts when increment direction is right', () => {
    const axis = createSteppedAxisConfig({ horizontalIncrement: 'right' })
    expect(toLogicalHorizontalSlot(5, axis)).toBe(-5)
    expect(toLogicalHorizontalSlot(-3, createSteppedAxisConfig({ horizontalIncrement: 'left' }))).toBe(
      -3,
    )
  })

  it('toLogicalVerticalSlot inverts when increment direction is down', () => {
    const axis = createSteppedAxisConfig({ verticalIncrement: 'down' })
    expect(toLogicalVerticalSlot(1, axis)).toBe(-1)
    expect(toLogicalVerticalSlot(-1, createSteppedAxisConfig({ verticalIncrement: 'up' }))).toBe(-1)
  })

  it('slotLabelAmounts maps physical right slot to increment when axis is right', () => {
    const physicalRight = 3
    const logical = toLogicalHorizontalSlot(
      physicalRight,
      createSteppedAxisConfig({ horizontalIncrement: 'right' }),
    )
    expect(slotLabelAmounts(logical, 0)).toEqual({
      hIncrement: 3,
      hDecrement: 0,
      vIncrement: 0,
      vDecrement: 0,
    })
  })

  it('slotLabelAmounts reflects position relative to rest origin', () => {
    expect(slotLabelAmounts(0, 0)).toEqual({
      hIncrement: 0,
      hDecrement: 0,
      vIncrement: 0,
      vDecrement: 0,
    })
    expect(slotLabelAmounts(-3, 0)).toEqual({
      hIncrement: 3,
      hDecrement: 0,
      vIncrement: 0,
      vDecrement: 0,
    })
    expect(slotLabelAmounts(5, 1)).toEqual({
      hIncrement: 0,
      hDecrement: 5,
      vIncrement: 0,
      vDecrement: 10,
    })
    expect(slotLabelAmounts(0, -1)).toEqual({
      hIncrement: 0,
      hDecrement: 0,
      vIncrement: 10,
      vDecrement: 0,
    })
  })

  it('extremeRepeatDelta returns hold-repeat direction', () => {
    expect(extremeRepeatDelta(-10, 0)).toEqual({ delta1: 1, delta10: 0 })
    expect(extremeRepeatDelta(10, 0)).toEqual({ delta1: -1, delta10: 0 })
    expect(extremeRepeatDelta(0, -1)).toEqual({ delta1: 0, delta10: 10 })
    expect(extremeRepeatDelta(0, 1)).toEqual({ delta1: 0, delta10: -10 })
  })
})
