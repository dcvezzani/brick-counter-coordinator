import { describe, expect, it } from 'vitest'
import { sessionRouteForPhase } from '@/lib/session-phase-routing'

describe('sessionRouteForPhase', () => {
  const sessionId = 'session-demo'

  it('routes each open phase per home.md', () => {
    expect(sessionRouteForPhase(sessionId, 'importing')).toBe(`/session/${sessionId}/import`)
    expect(sessionRouteForPhase(sessionId, 'counting')).toBe(`/session/${sessionId}/lot`)
    expect(sessionRouteForPhase(sessionId, 'reconciling')).toBe(
      `/session/${sessionId}/reconciliation`,
    )
    expect(sessionRouteForPhase(sessionId, 'organizing')).toBe(
      `/session/${sessionId}/lots?mode=organizer`,
    )
    expect(sessionRouteForPhase(sessionId, 'updating_inventory')).toBe(
      `/session/${sessionId}/reconciliation`,
    )
    expect(sessionRouteForPhase(sessionId, 'closed')).toBe('/')
  })
})
