import { beforeEach, describe, expect, it } from 'vitest'
import { useFixtureSession } from '@/composables/useFixtureSession'

describe('useFixtureSession', () => {
  const fixture = useFixtureSession()

  beforeEach(() => {
    fixture.resetDemoSession()
  })

  it('lists open sessions for storyboard', () => {
    const sessions = fixture.listSessions()
    expect(sessions.length).toBeGreaterThan(0)
    expect(sessions[0]).toHaveProperty('setNumber')
  })

  it('rejects duplicate display names on join', () => {
    fixture.joinSession(fixture.DEMO_SESSION_ID, 'Casey')
    expect(() => fixture.joinSession(fixture.DEMO_SESSION_ID, 'Casey')).toThrow()
  })

  it('detects duplicate lots on save', () => {
    fixture.setCurrentWorker({ id: 'worker-test', displayName: 'Test' })
    const session = fixture.getSession(fixture.DEMO_SESSION_ID)
    const existing = session.lots[0]
    const result = fixture.saveLot(fixture.DEMO_SESSION_ID, {
      partId: existing.partId,
      colorId: existing.colorId,
      condition: existing.condition,
      qty: 1,
    })
    expect(result.duplicate).toBe(true)
    expect(result.existing.createdBy).toBeTruthy()
  })

  it('excludes and restores part-out lines', () => {
    const lineId = fixture.getPartOutLines(fixture.DEMO_SESSION_ID)[0].id
    fixture.setPartOutLineExcluded(fixture.DEMO_SESSION_ID, lineId, true)
    expect(fixture.getPartOutLines(fixture.DEMO_SESSION_ID, { includedOnly: true })).not.toContainEqual(
      expect.objectContaining({ id: lineId }),
    )
    fixture.setPartOutLineExcluded(fixture.DEMO_SESSION_ID, lineId, false)
    expect(fixture.getPartOutLines(fixture.DEMO_SESSION_ID, { includedOnly: true })).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: lineId })]),
    )
  })

  it('returns part-specific known colors for the storyboard catalog', () => {
    const colors = fixture.getColorsForPart('3001')
    expect(colors.map((c) => c.id)).toEqual([86, 11, 1, 5, 15])
    expect(fixture.getColorsForPart('')).toEqual([])
  })

  it('resolves part ids case-insensitively and enables colors', () => {
    expect(fixture.resolvePartId('3062B')).toBe('3062b')
    expect(fixture.getColorsForPart('3062B').length).toBeGreaterThan(0)
  })

  it('advances phase on part-out confirm', () => {
    const { session } = fixture.createSession({
      setNumber: '99999-1',
      displayName: 'Lead',
    })
    fixture.confirmPartOut(session.id)
    expect(fixture.getSession(session.id).phase).toBe('counting')
  })
})
