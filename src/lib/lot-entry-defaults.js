const STORAGE_KEY_PREFIX = 'lot-entry-condition:'

function storageKey(sessionId) {
  return `${STORAGE_KEY_PREFIX}${sessionId}`
}

/**
 * @param {string} sessionId
 * @param {{ partOutOptions?: { condition?: string } } | null | undefined} session
 * @returns {'N' | 'U'}
 */
export function resolveDefaultLotCondition(sessionId, session) {
  const mix = session?.partOutOptions?.condition ?? 'mixed'

  if (mix === 'new') return 'N'
  if (mix === 'used') return 'U'

  const stored = sessionStorage.getItem(storageKey(sessionId))
  if (stored === 'N' || stored === 'U') return stored
  return 'U'
}

/**
 * @param {string} sessionId
 * @param {{ partOutOptions?: { condition?: string } } | null | undefined} session
 * @param {'N' | 'U'} condition
 */
export function persistLotConditionChoice(sessionId, session, condition) {
  if (session?.partOutOptions?.condition !== 'mixed') return
  if (condition !== 'N' && condition !== 'U') return
  sessionStorage.setItem(storageKey(sessionId), condition)
}
