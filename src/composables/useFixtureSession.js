import { computed, reactive, ref } from 'vue'
import {
  createDemoSession,
  DEMO_COLORS,
  DEMO_PARTS,
  DEMO_SESSION_ID,
  OPEN_SESSIONS,
} from '@/fixtures/demo-session'

const sessions = reactive(new Map())
const currentWorker = ref(null)

function ensureSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, reactive(createDemoSession()))
  }
  return sessions.get(sessionId)
}

function lotKey(partId, colorId, condition) {
  return `${partId}:${colorId}:${condition}`
}

export function useFixtureSession() {
  const isFixtureMode = true

  function listSessions() {
    return [...OPEN_SESSIONS]
  }

  function getSession(sessionId) {
    return ensureSession(sessionId)
  }

  function createSession({ setNumber, name, displayName, partOutOptions }) {
    const id = `session-${Date.now()}`
    const session = reactive({
      ...createDemoSession(),
      id,
      setNumber,
      name: name || `${setNumber} part-out`,
      phase: 'importing',
      partOutOptions: partOutOptions || createDemoSession().partOutOptions,
      workers: [],
      lots: [],
      pickListItems: [],
      pickListSplit: false,
    })
    sessions.set(id, session)
    const worker = joinSession(id, displayName)
    session.leadWorkerId = worker.id
    return { session, worker }
  }

  function joinSession(sessionId, displayName) {
    const session = ensureSession(sessionId)
    const existing = session.workers.find(
      (w) => w.displayName.toLowerCase() === displayName.toLowerCase(),
    )
    if (existing) {
      const error = new Error('Display name already taken in this session')
      error.code = 'DUPLICATE_NAME'
      throw error
    }
    const worker = {
      id: `worker-${Date.now()}`,
      displayName,
      joinedAt: new Date().toISOString(),
    }
    session.workers.push(worker)
    currentWorker.value = worker
    return worker
  }

  function setCurrentWorker(worker) {
    currentWorker.value = worker
  }

  function getCurrentWorker() {
    return currentWorker.value
  }

  function getPartOutLines(sessionId, { includedOnly = false } = {}) {
    const session = ensureSession(sessionId)
    return session.partOutLines
      .filter((line) => (includedOnly ? !line.excluded : true))
      .sort((a, b) => a.sortKey - b.sortKey)
  }

  function setPartOutLineExcluded(sessionId, lineId, excluded) {
    const session = ensureSession(sessionId)
    const line = session.partOutLines.find((l) => l.id === lineId)
    if (line) line.excluded = excluded
  }

  function bulkExcludePartOutLines(sessionId, lineIds) {
    const session = ensureSession(sessionId)
    for (const lineId of lineIds) {
      const line = session.partOutLines.find((l) => l.id === lineId)
      if (line) line.excluded = true
    }
  }

  function confirmPartOut(sessionId) {
    const session = ensureSession(sessionId)
    session.phase = 'counting'
  }

  function getCups(sessionId) {
    const session = ensureSession(sessionId)
    return session.cups.map((cup) => ({
      ...cup,
      lotCount: session.lots.filter((l) => l.cupId === cup.id).length,
    }))
  }

  function getLots(sessionId, { cupId, workerId, mode } = {}) {
    const session = ensureSession(sessionId)
    let lots = [...session.lots]

    if (cupId) {
      lots = lots.filter((l) => l.cupId === cupId)
    }

    if (mode === 'organizer' && workerId) {
      const assignedLotIds = new Set(
        session.pickListItems
          .filter((item) => item.workerId === workerId)
          .map((item) => item.lotId),
      )
      lots = lots.filter((l) => assignedLotIds.has(l.id))
    }

    return lots.sort((a, b) => a.partId.localeCompare(b.partId))
  }

  function getLot(sessionId, lotId) {
    const session = ensureSession(sessionId)
    return session.lots.find((l) => l.id === lotId) ?? null
  }

  function saveLot(sessionId, payload) {
    const session = ensureSession(sessionId)
    const key = lotKey(payload.partId, payload.colorId, payload.condition)
    const existing = session.lots.find(
      (l) => lotKey(l.partId, l.colorId, l.condition) === key,
    )

    if (existing && existing.id !== payload.id) {
      const creator = session.workers.find((w) => w.id === existing.createdByWorkerId)
      return {
        lot: existing,
        duplicate: true,
        existing: {
          createdBy: creator?.displayName ?? 'Unknown',
          qty: existing.qty,
        },
      }
    }

    if (payload.id) {
      const lot = session.lots.find((l) => l.id === payload.id)
      if (lot) {
        Object.assign(lot, payload, { updatedAt: new Date().toISOString() })
        return { lot, duplicate: false }
      }
    }

    const lot = {
      id: `lot-${Date.now()}`,
      partId: payload.partId,
      colorId: payload.colorId,
      condition: payload.condition,
      qty: payload.qty,
      cupId: payload.cupId ?? session.cups[0]?.id,
      createdByWorkerId: currentWorker.value?.id ?? session.leadWorkerId,
      updatedAt: new Date().toISOString(),
    }
    session.lots.push(lot)
    return { lot, duplicate: false }
  }

  function splitPickList(sessionId) {
    const session = ensureSession(sessionId)
    const workers = session.workers
    const sortedLots = [...session.lots].sort((a, b) => a.partId.localeCompare(b.partId))
    session.pickListItems = sortedLots.map((lot, index) => ({
      id: `pick-${lot.id}`,
      workerId: workers[index % workers.length]?.id ?? workers[0]?.id,
      lotId: lot.id,
      sortKey: lot.partId,
      status: 'pending',
      listComplete: false,
    }))
    session.pickListSplit = true
    session.phase = 'organizing'
  }

  function getPickListItems(sessionId, workerId) {
    const session = ensureSession(sessionId)
    return session.pickListItems
      .filter((item) => !workerId || item.workerId === workerId)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  }

  function updatePickListItem(sessionId, itemId, status) {
    const session = ensureSession(sessionId)
    const item = session.pickListItems.find((i) => i.id === itemId)
    if (item) item.status = status
  }

  function completePickList(sessionId, workerId) {
    const session = ensureSession(sessionId)
    for (const item of session.pickListItems) {
      if (item.workerId === workerId) item.listComplete = true
    }
  }

  function getReconciliation(sessionId) {
    const session = ensureSession(sessionId)
    return session.reconciliation
  }

  function resolveReconciliation(sessionId, lineId) {
    const session = ensureSession(sessionId)
    const row = session.reconciliation.find((r) => r.lineId === lineId)
    if (row) {
      row.resolved = true
      row.qtyCounted = row.qtyExpected
      row.delta = 0
    }
  }

  function exportReconciliationXml(sessionId) {
    const session = ensureSession(sessionId)
    const lines = session.reconciliation.filter((r) => r.resolved)
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<INVENTORY>',
      ...lines.map(
        (row) =>
          `  <ITEM><LOTID>${row.lineId}</LOTID><QTY>${row.qtyExpected}</QTY><REMARKS>${row.remarks}</REMARKS></ITEM>`,
      ),
      '</INVENTORY>',
    ].join('\n')
    session.phase = 'organizing'
    return {
      xml,
      validationUrl: 'https://www.bricklink.com/invXML.asp#update',
    }
  }

  function resolvePartId(raw) {
    const trimmed = String(raw ?? '').trim()
    if (!trimmed) return ''
    const match = DEMO_PARTS.find((p) => p.partId.toLowerCase() === trimmed.toLowerCase())
    return match?.partId ?? trimmed
  }

  function lookupPart(raw) {
    const id = resolvePartId(raw)
    if (!id) return null
    return DEMO_PARTS.find((p) => p.partId === id) ?? null
  }

  function searchParts(query) {
    const q = query.toLowerCase()
    return DEMO_PARTS.filter(
      (p) => p.partId.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
    )
  }

  /** Known color ids per part — storyboard subset of DEMO_COLORS. */
  const DEMO_PART_KNOWN_COLOR_IDS = {
    '3001': [86, 11, 1, 5, 15],
    '3003': [5, 11, 1],
    '3020': [1, 86, 11],
    '3062b': [11, 86, 5],
    '4070': [15, 1, 86],
  }

  function getColorsForPart(partId) {
    const canonical = resolvePartId(partId)
    if (!canonical) return []

    const ids = DEMO_PART_KNOWN_COLOR_IDS[canonical]
    if (ids?.length) {
      return ids.map((id) => DEMO_COLORS.find((c) => c.id === id)).filter(Boolean)
    }

    if (lookupPart(canonical)) return [...DEMO_COLORS]

    return []
  }

  function workerName(sessionId, workerId) {
    const session = ensureSession(sessionId)
    return session.workers.find((w) => w.id === workerId)?.displayName ?? 'Unknown'
  }

  function colorName(colorId) {
    return DEMO_COLORS.find((c) => c.id === colorId)?.name ?? `Color ${colorId}`
  }

  function colorHex(colorId) {
    return DEMO_COLORS.find((c) => c.id === colorId)?.hex ?? '#cccccc'
  }

  function resetDemoSession() {
    sessions.clear()
    sessions.set(DEMO_SESSION_ID, reactive(createDemoSession()))
    currentWorker.value = null
  }

  const storyboardBadge = computed(() => 'Storyboard — sample data')

  return {
    isFixtureMode,
    storyboardBadge,
    DEMO_SESSION_ID,
    listSessions,
    getSession,
    createSession,
    joinSession,
    setCurrentWorker,
    getCurrentWorker,
    getPartOutLines,
    setPartOutLineExcluded,
    bulkExcludePartOutLines,
    confirmPartOut,
    getCups,
    getLots,
    getLot,
    saveLot,
    splitPickList,
    getPickListItems,
    updatePickListItem,
    completePickList,
    getReconciliation,
    resolveReconciliation,
    exportReconciliationXml,
    searchParts,
    resolvePartId,
    lookupPart,
    getColorsForPart,
    workerName,
    colorName,
    colorHex,
    resetDemoSession,
  }
}
