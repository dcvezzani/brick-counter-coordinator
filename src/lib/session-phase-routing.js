/**
 * Phase-aware session entry routes.
 * @see docs/view-specs/home.md#post-join-routing
 */
export function sessionRouteForPhase(sessionId, phase) {
  switch (phase) {
    case 'importing':
      return `/session/${sessionId}/import`
    case 'counting':
      return `/session/${sessionId}/lot`
    case 'reconciling':
      return `/session/${sessionId}/reconciliation`
    case 'organizing':
      return `/session/${sessionId}/lots?mode=organizer`
    case 'closed':
      return '/'
    default:
      return `/session/${sessionId}/lot`
  }
}
