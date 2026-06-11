import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LotForm from '@/components/LotForm.vue'
import { useSession } from '@/composables/useSession'
import {
  persistLotConditionChoice,
  resolveDefaultLotCondition,
} from '@/lib/lot-entry-defaults'

vi.mock('@/composables/useSession')
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const SESSION_ID = 'test-session'

function setupSession(partOutCondition = 'used') {
  const session = { partOutOptions: { condition: partOutCondition } }
  const saveLot = vi.fn(() => ({ duplicate: false }))
  vi.mocked(useSession).mockReturnValue({
    getSession: () => session,
    getLot: vi.fn(),
    saveLot,
    getColorsForPart: vi.fn(() => [{ id: 11, name: 'Black', hex: '#05131d' }]),
    resolvePartId: vi.fn((id) => id || ''),
    searchParts: vi.fn(() => [{ partId: '3001', name: 'Brick 2 x 4' }]),
    lookupPart: vi.fn((id) =>
      id === '3001' ? { partId: '3001', name: 'Brick 2 x 4' } : null,
    ),
  })
  return { session, saveLot }
}

function checkedCondition(wrapper) {
  const selected = wrapper.find('[data-testid="cond-n"][data-state="checked"]')
  if (selected.exists()) return 'N'
  const used = wrapper.find('[data-testid="cond-u"][data-state="checked"]')
  if (used.exists()) return 'U'
  return null
}

describe('lot-entry-defaults', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('maps session new/used mix to lot condition', () => {
    expect(resolveDefaultLotCondition('s1', { partOutOptions: { condition: 'new' } })).toBe(
      'N',
    )
    expect(resolveDefaultLotCondition('s1', { partOutOptions: { condition: 'used' } })).toBe(
      'U',
    )
  })

  it('reads last choice from sessionStorage for mixed sessions', () => {
    sessionStorage.setItem('lot-entry-condition:s1', 'N')
    expect(
      resolveDefaultLotCondition('s1', { partOutOptions: { condition: 'mixed' } }),
    ).toBe('N')
  })

  it('persists last choice only for mixed sessions', () => {
    persistLotConditionChoice('s1', { partOutOptions: { condition: 'mixed' } }, 'N')
    expect(sessionStorage.getItem('lot-entry-condition:s1')).toBe('N')

    sessionStorage.clear()
    persistLotConditionChoice('s1', { partOutOptions: { condition: 'new' } }, 'U')
    expect(sessionStorage.getItem('lot-entry-condition:s1')).toBeNull()
  })
})

describe('LotForm', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('defaults condition to N when session is new-only', async () => {
    setupSession('new')
    const wrapper = mount(LotForm, {
      props: { sessionId: SESSION_ID, lotId: null },
    })
    await flushPromises()
    expect(checkedCondition(wrapper)).toBe('N')
  })

  it('defaults condition to U when session is used-only', async () => {
    setupSession('used')
    const wrapper = mount(LotForm, {
      props: { sessionId: SESSION_ID, lotId: null },
    })
    await flushPromises()
    expect(checkedCondition(wrapper)).toBe('U')
  })

  it('defaults condition from sessionStorage for mixed sessions', async () => {
    sessionStorage.setItem(`lot-entry-condition:${SESSION_ID}`, 'N')
    setupSession('mixed')
    const wrapper = mount(LotForm, {
      props: { sessionId: SESSION_ID, lotId: null },
    })
    await flushPromises()
    expect(checkedCondition(wrapper)).toBe('N')
  })

  it('focuses part search filter on mount for new lots', async () => {
    setupSession('used')
    const wrapper = mount(LotForm, {
      props: { sessionId: SESSION_ID, lotId: null },
      attachTo: document.body,
    })
    await flushPromises()
    expect(wrapper.find('[data-testid="part-search-panel"]').exists()).toBe(true)
    expect(document.activeElement?.dataset.testid).toBe('part-search-filter')
  })

  it('opens color picker panel after Save and Add Another', async () => {
    setupSession('mixed')
    const wrapper = mount(LotForm, {
      props: { sessionId: SESSION_ID, lotId: null },
      attachTo: document.body,
    })
    await flushPromises()

    await wrapper.get('[data-testid="part-search-trigger"]').trigger('click')
    const filter = wrapper.get('[data-testid="part-search-filter"]')
    await filter.setValue('30')
    vi.advanceTimersByTime(150)
    await flushPromises()
    await filter.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    await wrapper.get('[data-testid="color-picker-trigger"]').trigger('click')
    await wrapper.get('[data-testid="color-picker-option-11"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="save-and-add-another"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="color-picker-panel"]').exists()).toBe(true)
    expect(document.activeElement?.dataset.testid).toBe('color-picker-filter')
    expect(sessionStorage.getItem(`lot-entry-condition:${SESSION_ID}`)).toBe('U')
  })
})
