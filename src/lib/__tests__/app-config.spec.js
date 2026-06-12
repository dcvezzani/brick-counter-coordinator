import { describe, expect, it } from 'vitest'
import { appConfig } from '@/lib/app-config'

describe('appConfig', () => {
  it('loads version 1 preferences', () => {
    expect(appConfig.version).toBe(1)
  })

  it('includes storyboard preferences', () => {
    expect(appConfig.storyboard.badgeSubtitle).toBeTruthy()
    expect(appConfig.storyboard.newSessionHelper).toBeTruthy()
  })

  it('includes new session defaults', () => {
    expect(appConfig.newSession.defaultSetNumber).toBeTruthy()
    expect(appConfig.newSession.defaults.pricing).toBeTruthy()
    expect(appConfig.newSession.defaults.existingLots).toBeTruthy()
  })

  it('includes part search and picker preferences', () => {
    expect(appConfig.partSearch.minFilterChars).toBeGreaterThanOrEqual(0)
    expect(appConfig.picker.debounceMs).toBeGreaterThan(0)
  })

  it('includes lot entry preferences', () => {
    expect(appConfig.lotEntry.defaultQty).toBeGreaterThanOrEqual(0)
    expect(appConfig.lotEntry.countMin).toBeGreaterThanOrEqual(0)
  })

  it('includes swipe number input rate config', () => {
    expect(appConfig.swipeNumberInput.rate.minRate).toBeGreaterThan(0)
    expect(appConfig.swipeNumberInput.rate.maxRate).toBeGreaterThan(
      appConfig.swipeNumberInput.rate.minRate,
    )
    expect(appConfig.swipeNumberInput.rate.deadZonePx).toBeGreaterThanOrEqual(0)
  })

  it('is frozen', () => {
    expect(Object.isFrozen(appConfig)).toBe(true)
  })
})
