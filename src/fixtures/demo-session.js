/** Demo session fixture — storyboard walkthrough data (Unit 0). */

export const DEMO_COLORS = [
  { id: 1, name: 'White', hex: '#ffffff' },
  { id: 5, name: 'Brick Yellow', hex: '#f2cd37' },
  { id: 11, name: 'Black', hex: '#05131d' },
  { id: 15, name: 'Trans-Clear', hex: '#fcfcfc' },
  { id: 86, name: 'Light Bluish Gray', hex: '#9ba19d' },
]

export const DEMO_PARTS = [
  { partId: '3001', name: 'Brick 2 x 4' },
  { partId: '3003', name: 'Brick 2 x 2' },
  { partId: '3020', name: 'Plate 2 x 4' },
  { partId: '3062b', name: 'Brick Round 1 x 1' },
  { partId: '4070', name: 'Brick Special 1 x 1 with Headlight' },
]

export const DEMO_SESSION_ID = 'demo-session-70404'

export function createDemoSession() {
  const workers = [
    { id: 'worker-alex', displayName: 'Alex', joinedAt: '2026-06-10T10:00:00Z' },
    { id: 'worker-jordan', displayName: 'Jordan', joinedAt: '2026-06-10T10:05:00Z' },
    { id: 'worker-sam', displayName: 'Sam', joinedAt: '2026-06-10T10:10:00Z' },
  ]

  const cups = [
    { id: 'cup-a', label: 'Cup A — grays' },
    { id: 'cup-b', label: 'Cup B — yellows' },
    { id: 'cup-c', label: 'Cup C — mixed' },
    { id: 'cup-d', label: 'Cup D — specials' },
    { id: 'cup-e', label: 'Cup E — empty' },
  ]

  const lots = [
    {
      id: 'lot-1',
      partId: '3001',
      colorId: 86,
      condition: 'U',
      qty: 12,
      cupId: 'cup-a',
      createdByWorkerId: 'worker-alex',
      updatedAt: '2026-06-10T11:00:00Z',
    },
    {
      id: 'lot-2',
      partId: '3003',
      colorId: 5,
      condition: 'U',
      qty: 8,
      cupId: 'cup-b',
      createdByWorkerId: 'worker-jordan',
      updatedAt: '2026-06-10T11:15:00Z',
    },
    {
      id: 'lot-3',
      partId: '3020',
      colorId: 1,
      condition: 'N',
      qty: 4,
      cupId: 'cup-c',
      createdByWorkerId: 'worker-sam',
      updatedAt: '2026-06-10T11:20:00Z',
    },
    {
      id: 'lot-4',
      partId: '3062b',
      colorId: 11,
      condition: 'U',
      qty: 6,
      cupId: 'cup-c',
      createdByWorkerId: 'worker-alex',
      updatedAt: '2026-06-10T11:25:00Z',
    },
    {
      id: 'lot-5',
      partId: '4070',
      colorId: 15,
      condition: 'N',
      qty: 2,
      cupId: 'cup-d',
      createdByWorkerId: 'worker-jordan',
      updatedAt: '2026-06-10T11:30:00Z',
    },
  ]

  const partOutLines = [
    {
      id: 'pol-1',
      partId: '3001',
      colorId: 86,
      condition: 'U',
      qtyExpected: 12,
      remarks: 'Bin A-12',
      bricklinkLotId: 'BL-10001',
      excluded: false,
      sortKey: 1,
    },
    {
      id: 'pol-2',
      partId: '3003',
      colorId: 5,
      condition: 'U',
      qtyExpected: 10,
      remarks: 'Bin B-03',
      bricklinkLotId: 'BL-10002',
      excluded: false,
      sortKey: 2,
    },
    {
      id: 'pol-3',
      partId: '3020',
      colorId: 1,
      condition: 'N',
      qtyExpected: 4,
      remarks: 'Bin C-01',
      bricklinkLotId: 'BL-10003',
      excluded: false,
      sortKey: 3,
    },
    {
      id: 'pol-4',
      partId: '3062b',
      colorId: 11,
      condition: 'U',
      qtyExpected: 8,
      remarks: 'Bin C-02',
      bricklinkLotId: 'BL-10004',
      excluded: false,
      sortKey: 4,
    },
    {
      id: 'pol-5',
      partId: '4070',
      colorId: 15,
      condition: 'N',
      qtyExpected: 2,
      remarks: 'Bin D-01',
      bricklinkLotId: 'BL-10005',
      excluded: false,
      sortKey: 5,
    },
    {
      id: 'pol-6',
      partId: '3001',
      colorId: 1,
      condition: 'N',
      qtyExpected: 6,
      remarks: 'Sealed bag — sweep 2',
      bricklinkLotId: 'BL-10006',
      excluded: true,
      sortKey: 6,
    },
  ]

  const pickListItems = lots.map((lot, index) => ({
    id: `pick-${lot.id}`,
    workerId: workers[index % workers.length].id,
    lotId: lot.id,
    sortKey: lot.partId,
    status: index === 0 ? 'moved_to_storage' : 'pending',
    listComplete: false,
  }))

  const reconciliation = partOutLines
    .filter((line) => !line.excluded)
    .map((line) => {
      const lot = lots.find(
        (l) =>
          l.partId === line.partId && l.colorId === line.colorId && l.condition === line.condition,
      )
      const counted = lot?.qty ?? 0
      const delta = counted - line.qtyExpected
      return {
        lineId: line.id,
        partId: line.partId,
        colorId: line.colorId,
        condition: line.condition,
        qtyExpected: line.qtyExpected,
        qtyCounted: counted,
        delta,
        remarks: line.remarks,
        bricklinkLotId: line.bricklinkLotId,
        qtyAgreed: delta === 0 ? counted : null,
        resolved: delta === 0,
      }
    })

  return {
    id: DEMO_SESSION_ID,
    setNumber: '70404-1',
    name: 'Castle 70404 — June part-out',
    phase: 'counting',
    partOutFetchStatus: 'ok',
    partOutFetchError: null,
    partOutOptions: {
      pricing: 'stock',
      condition: 'mixed',
      overwrite: false,
    },
    createdAt: '2026-06-10T09:00:00Z',
    leadWorkerId: 'worker-alex',
    workers,
    cups,
    lots,
    partOutLines,
    pickListItems,
    reconciliation,
    pickListSplit: false,
  }
}

export const OPEN_SESSIONS = [
  {
    id: DEMO_SESSION_ID,
    setNumber: '70404-1',
    name: 'Castle 70404 — June part-out',
    phase: 'counting',
    workerCount: 3,
  },
  {
    id: 'session-10247',
    setNumber: '10247-1',
    name: 'Ferris Wheel — May part-out',
    phase: 'importing',
    workerCount: 1,
  },
]
