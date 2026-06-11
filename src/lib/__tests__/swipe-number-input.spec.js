import { describe, expect, it } from 'vitest'
import {
  accumulateDragSteps,
  applySignedSteps,
  clampValue,
  DEFAULT_RATE_CONFIG,
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

  it('displacementToStepRate is zero in dead zone and scales linearly with track max', () => {
    const { minRate, maxRate, deadZonePx } = DEFAULT_RATE_CONFIG
    const maxDisplacementPx = 80

    expect(displacementToStepRate(4, maxDisplacementPx)).toBe(0)
    expect(displacementToStepRate(10, 0)).toBe(0)

    const halfSpan = deadZonePx + (maxDisplacementPx - deadZonePx) / 2
    expect(displacementToStepRate(halfSpan, maxDisplacementPx)).toBe(
      minRate + (maxRate - minRate) * 0.5,
    )

    expect(displacementToStepRate(maxDisplacementPx, maxDisplacementPx)).toBe(maxRate)
    expect(displacementToStepRate(100, maxDisplacementPx)).toBe(maxRate)
  })

  it('accumulateDragSteps emits whole steps over time', () => {
    const first = accumulateDragSteps(80, 0.5, 0, 80)
    expect(first.steps).toBeGreaterThan(0)
    expect(first.accumulator).toBeGreaterThanOrEqual(0)
    expect(first.accumulator).toBeLessThan(1)
  })

  it('applySignedSteps clamps at bounds', () => {
    expect(applySignedSteps(0, -3, { allowNegative: false })).toBe(0)
    expect(applySignedSteps(9, 5, { max: 10 })).toBe(10)
  })
})
