import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PartSearchCombobox from '@/components/PartSearchCombobox.vue'

vi.mock('@/composables/useSession', () => ({
  useSession: () => ({
    searchParts: (query) => {
      const parts = [
        { partId: '3001', name: 'Brick 2 x 4' },
        { partId: '3003', name: 'Brick 2 x 2' },
        { partId: '3020', name: 'Plate 2 x 4' },
      ]
      const q = query.toLowerCase()
      return parts.filter(
        (p) => p.partId.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
      )
    },
    resolvePartId: (raw) => {
      const trimmed = String(raw ?? '').trim()
      if (!trimmed) return ''
      const parts = [
        { partId: '3001', name: 'Brick 2 x 4' },
        { partId: '3003', name: 'Brick 2 x 2' },
        { partId: '3020', name: 'Plate 2 x 4' },
      ]
      const match = parts.find((p) => p.partId.toLowerCase() === trimmed.toLowerCase())
      return match?.partId ?? trimmed
    },
    lookupPart: (id) => {
      const parts = [
        { partId: '3001', name: 'Brick 2 x 4' },
        { partId: '3003', name: 'Brick 2 x 2' },
        { partId: '3020', name: 'Plate 2 x 4' },
      ]
      return parts.find((p) => p.partId === id) ?? null
    },
  }),
}))

describe('PartSearchCombobox', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the Enter-selected part instead of overwriting with the filter query', async () => {
    const Host = {
      components: { PartSearchCombobox },
      data: () => ({ partId: '' }),
      template: '<PartSearchCombobox v-model="partId" />',
    }
    const wrapper = mount(Host)

    await wrapper.get('[data-testid="part-search-trigger"]').trigger('click')
    const filter = wrapper.get('[data-testid="part-search-filter"]')
    await filter.setValue('30')
    vi.advanceTimersByTime(150)
    await flushPromises()
    await filter.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(wrapper.vm.partId).toBe('3001')
    expect(wrapper.find('[data-testid="part-search-resolved"]').text()).toBe('Brick 2 x 4')
  })

  it('resolves typed text on blur when the user did not pick from the list', async () => {
    const wrapper = mount(PartSearchCombobox, {
      props: { modelValue: '' },
      attachTo: document.body,
    })

    await wrapper.get('[data-testid="part-search-trigger"]').trigger('click')
    const filter = wrapper.get('[data-testid="part-search-filter"]')
    await filter.setValue('3001')
    vi.advanceTimersByTime(150)
    await flushPromises()

    filter.element.blur()
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toEqual([['3001']])
    wrapper.unmount()
  })
})
