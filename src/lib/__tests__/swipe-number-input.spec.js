import { describe, expect, it } from 'vitest'
import {
  accumulateDragSteps,
  applySignedSteps,
  clampValue,
  displacementToStepRate,
  parseNumericValue,
  signedDisplacement,
  signedDisplacementFromCenter,
} from '@/lib/swipe-number-input'

describe('swipe-number-input helpers', () => {
  it('parseNumericValue handles empty and integers', () => {
    expect(parseNumericValue('')).toBeNull()
    expect(parseNumericValue('', { emptyAsZero: true })).toBe(0)
    expect(parseNumericValue('42')).toBe(42)
    expect(parseNumericValue('-3')).toBe(-3)
  })

  it('clampValue respects min, max, and allowNegative', () => {
    expect(clampValue(5, { allowNegative: false })).toBe(5)
    expect(clampValue(-1, { allowNegative: false })).toBe(0)
    expect(clampValue(99, { max: 10 })).toBe(10)
    expect(clampValue(-5, { allowNegative: true, min: -2 })).toBe(-2)
  })

  it('signedDisplacementFromCenter maps drag toward plus/minus', () => {
    expect(signedDisplacementFromCenter(-20, 'right')).toBe(20)
    expect(signedDisplacementFromCenter(20, 'right')).toBe(-20)
    expect(signedDisplacementFromCenter(20, 'left')).toBe(20)
    expect(signedDisplacementFromCenter(-20, 'left')).toBe(-20)
  })

  it('signedDisplacement mirrors for left vs right control', () => {
    expect(signedDisplacement(-20, 'right')).toBe(20)
    expect(signedDisplacement(20, 'right')).toBe(-20)
    expect(signedDisplacement(20, 'left')).toBe(20)
    expect(signedDisplacement(-20, 'left')).toBe(-20)
  })

  it('displacementToStepRate is zero in dead zone and accelerates', () => {
    expect(displacementToStepRate(4)).toBe(0)
    const slow = displacementToStepRate(20)
    const fast = displacementToStepRate(120)
    expect(fast).toBeGreaterThan(slow)
    expect(fast).toBeGreaterThan(0)
  })

  it('accumulateDragSteps emits whole steps over time', () => {
    const first = accumulateDragSteps(120, 0.5, 0)
    expect(first.steps).toBeGreaterThan(0)
    expect(first.accumulator).toBeGreaterThanOrEqual(0)
    expect(first.accumulator).toBeLessThan(1)
  })

  it('applySignedSteps clamps at bounds', () => {
    expect(applySignedSteps(0, -3, { allowNegative: false })).toBe(0)
    expect(applySignedSteps(9, 5, { max: 10 })).toBe(10)
  })
})
