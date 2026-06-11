import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LotForm from '@/components/LotForm.vue'
import { useSession } from '@/composables/useSession'
import { persistLotConditionChoice, resolveDefaultLotCondition } from '@/lib/lot-entry-defaults'

vi.mock('@/composables/useSession')
const routerPush = vi.fn()
const routerReplace = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
    currentRoute: { value: { path: '/session/test-session/lot' } },
  }),
}))

const SESSION_ID = 'test-session'

function setupSession(partOutCondition = 'used', saveLotImpl) {
  const session = { partOutOptions: { condition: partOutCondition } }
  const saveLot = saveLotImpl ?? vi.fn(() => ({ lot: { id: 'lot-test' }, duplicate: false }))
  vi.mocked(useSession).mockReturnValue(
    /** @type {any} */ ({
      getSession: () => session,
      getLot: vi.fn(),
      saveLot,
      getColorsForPart: vi.fn(() => [{ id: 11, name: 'Black', hex: '#05131d' }]),
      resolvePartId: vi.fn((id) => id || ''),
      searchParts: vi.fn(() => [{ partId: '3001', name: 'Brick 2 x 4' }]),
      lookupPart: vi.fn((id) => (id === '3001' ? { partId: '3001', name: 'Brick 2 x 4' } : null)),
    }),
  )
  return { session, saveLot }
}

async function fillLotForm(wrapper) {
  if (!wrapper.find('[data-testid="part-search-panel"]').exists()) {
    await wrapper.get('[data-testid="part-search-trigger"]').trigger('click')
  }
  const filter = wrapper.get('[data-testid="part-search-filter"]')
  await filter.setValue('30')
  vi.advanceTimersByTime(150)
  await flushPromises()
  await filter.trigger('keydown', { key: 'Enter' })
  await flushPromises()

  await wrapper.get('[data-testid="color-picker-trigger"]').trigger('click')
  await wrapper.get('[data-testid="color-picker-option-11"]').trigger('click')
  await flushPromises()
}

describe('lot-entry-defaults', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('maps session new/used mix to lot condition', () => {
    expect(resolveDefaultLotCondition('s1', { partOutOptions: { condition: 'new' } })).toBe('N')
    expect(resolveDefaultLotCondition('s1', { partOutOptions: { condition: 'used' } })).toBe('U')
  })

  it('reads last choice from sessionStorage for mixed sessions', () => {
    sessionStorage.setItem('lot-entry-condition:s1', 'N')
    expect(resolveDefaultLotCondition('s1', { partOutOptions: { condition: 'mixed' } })).toBe('N')
  })

  it('persists last choice only for mixed sessions', () => {
    persistLotConditionChoice('s1', { partOutOptions: { condition: 'mixed' } }, 'N')
    expect(sessionStorage.getItem('lot-entry-condition:s1')).toBe('N')

    sessionStorage.clear()
    persistLotConditionChoice('s1', { partOutOptions: { condition: 'new' } }, 'U')
    expect(sessionStorage.getItem('lot-entry-condition:s1')).toBeNull()
  })
})

function stubMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('LotForm', () => {
  beforeEach(() => {
    sessionStorage.clear()
    routerPush.mockClear()
    routerReplace.mockClear()
    stubMatchMedia()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows read-only session condition for new-only sessions', async () => {
    setupSession('new')
    const wrapper = mount(LotForm, {
      props: { sessionId: SESSION_ID, lotId: null },
    })
    await flushPromises()
    expect(wrapper.get('[data-testid="lot-condition"]').text()).toBe('Condition: New')
    expect(wrapper.find('[data-testid="cond-n"]').exists()).toBe(false)
  })

  it('shows read-only session condition for used-only sessions', async () => {
    setupSession('used')
    const wrapper = mount(LotForm, {
      props: { sessionId: SESSION_ID, lotId: null },
    })
    await flushPromises()
    expect(wrapper.get('[data-testid="lot-condition"]').text()).toBe('Condition: Used')
  })

  it('shows read-only condition from sessionStorage for mixed sessions', async () => {
    sessionStorage.setItem(`lot-entry-condition:${SESSION_ID}`, 'N')
    setupSession('mixed')
    const wrapper = mount(LotForm, {
      props: { sessionId: SESSION_ID, lotId: null },
    })
    await flushPromises()
    expect(wrapper.get('[data-testid="lot-condition"]').text()).toBe('Condition: New')
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

  it('clears the form and focuses part search after Save', async () => {
    setupSession('mixed')
    const wrapper = mount(LotForm, {
      props: { sessionId: SESSION_ID, lotId: null },
      attachTo: document.body,
    })
    await flushPromises()

    await fillLotForm(wrapper)

    await wrapper.get('[data-testid="save-lot"]').trigger('click')
    await flushPromises()

    expect(routerPush).not.toHaveBeenCalled()
    expect(routerReplace).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="part-search-trigger"]').text()).toContain('Search parts')
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

    await fillLotForm(wrapper)

    await wrapper.get('[data-testid="save-and-add-another"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="color-picker-panel"]').exists()).toBe(true)
    expect(document.activeElement?.dataset.testid).toBe('color-picker-filter')
  })

  it('shows duplicate confirm dialog and merges on confirm', async () => {
    const saveLot = vi
      .fn()
      .mockReturnValueOnce({
        duplicate: true,
        existing: { createdBy: 'Alex', qty: 4 },
      })
      .mockReturnValueOnce({ lot: { id: 'lot-merged' }, duplicate: false, merged: true })

    setupSession('used', saveLot)
    const wrapper = mount(LotForm, {
      props: { sessionId: SESSION_ID, lotId: null },
      attachTo: document.body,
    })
    await flushPromises()

    await fillLotForm(wrapper)
    await wrapper.get('[data-testid="save-lot"]').trigger('click')
    await flushPromises()

    expect(document.body.querySelector('[data-testid="duplicate-confirm-dialog"]')).toBeTruthy()
    expect(document.body.textContent).toContain('Already counted by Alex (qty 4)')

    const confirmBtn = document.body.querySelector('[data-testid="duplicate-confirm"]')
    expect(confirmBtn).toBeTruthy()
    await confirmBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(saveLot).toHaveBeenCalledTimes(2)
    expect(saveLot.mock.calls[1][1]).toMatchObject({ mergeDuplicate: true })
    expect(document.body.querySelector('[data-testid="duplicate-confirm-dialog"]')).toBeNull()
    expect(wrapper.find('[data-testid="part-search-panel"]').exists()).toBe(true)
  })

  it('cancels duplicate save without a second saveLot call', async () => {
    const saveLot = vi.fn(() => ({
      duplicate: true,
      existing: { createdBy: 'Alex', qty: 4 },
    }))

    setupSession('used', saveLot)
    const wrapper = mount(LotForm, {
      props: { sessionId: SESSION_ID, lotId: null },
      attachTo: document.body,
    })
    await flushPromises()

    await fillLotForm(wrapper)
    await wrapper.get('[data-testid="save-lot"]').trigger('click')
    await flushPromises()

    const cancelBtn = document.body.querySelector('[data-testid="duplicate-cancel"]')
    expect(cancelBtn).toBeTruthy()
    await cancelBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(saveLot).toHaveBeenCalledTimes(1)
    expect(document.body.querySelector('[data-testid="duplicate-confirm-dialog"]')).toBeNull()
    expect(wrapper.get('[data-testid="part-search-trigger"]').text()).toContain('3001')
  })
})
