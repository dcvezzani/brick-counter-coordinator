import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FilterablePicker from '@/components/FilterablePicker.vue'

const OPTIONS = [
  { value: 11, label: 'Black (11)' },
  { value: 41, label: 'Aqua (41)' },
  { value: 86, label: 'Light Bluish Gray (86)' },
]

describe('FilterablePicker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('toggles the panel and filters with prefix match after debounce', async () => {
    const wrapper = mount(FilterablePicker, {
      props: {
        modelValue: null,
        options: OPTIONS,
        testId: 'picker',
        allowNone: true,
      },
    })

    expect(wrapper.find('[data-testid="picker-panel"]').exists()).toBe(false)
    await wrapper.get('[data-testid="picker-trigger"]').trigger('click')
    expect(wrapper.find('[data-testid="picker-panel"]').exists()).toBe(true)

    const filter = wrapper.get('[data-testid="picker-filter"]')
    await filter.setValue('a')
    vi.advanceTimersByTime(150)
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('[data-testid^="picker-option-"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="picker-option-41"]').classes()).toContain('bg-accent')
  })

  it('selects the highlighted option on Enter', async () => {
    const wrapper = mount(FilterablePicker, {
      props: { modelValue: null, options: OPTIONS, testId: 'picker' },
    })

    await wrapper.get('[data-testid="picker-trigger"]').trigger('click')
    const filter = wrapper.get('[data-testid="picker-filter"]')
    await filter.setValue('b')
    vi.advanceTimersByTime(150)
    await wrapper.vm.$nextTick()
    await filter.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('update:modelValue')).toEqual([[11]])
    expect(wrapper.emitted('close')).toEqual([[{ filterQuery: 'b', fromSelection: true }]])
  })

  it('uses a custom filter function when provided', async () => {
    const wrapper = mount(FilterablePicker, {
      props: {
        modelValue: null,
        options: OPTIONS,
        testId: 'picker',
        filterOptions: (query) => (query === 'x' ? [{ value: 'x', label: 'Custom' }] : OPTIONS),
      },
    })

    await wrapper.get('[data-testid="picker-trigger"]').trigger('click')
    const filter = wrapper.get('[data-testid="picker-filter"]')
    await filter.setValue('x')
    vi.advanceTimersByTime(150)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="picker-option-x"]').exists()).toBe(true)
  })

  it('hides options until minFilterChars is met', async () => {
    const wrapper = mount(FilterablePicker, {
      props: {
        modelValue: null,
        options: OPTIONS,
        testId: 'picker',
        minFilterChars: 2,
      },
    })

    await wrapper.get('[data-testid="picker-trigger"]').trigger('click')
    const filter = wrapper.get('[data-testid="picker-filter"]')
    await filter.setValue('a')
    vi.advanceTimersByTime(150)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="picker-min-chars"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid^="picker-option-"]')).toHaveLength(0)

    await filter.setValue('aq')
    vi.advanceTimersByTime(150)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="picker-min-chars"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid^="picker-option-"]')).toHaveLength(1)
  })

  it('focuses the trigger via focusTrigger and opens the panel', async () => {
    const wrapper = mount(FilterablePicker, {
      props: { modelValue: null, options: OPTIONS, testId: 'picker' },
      attachTo: document.body,
    })

    wrapper.vm.focusTrigger()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="picker-panel"]').exists()).toBe(true)
    expect(document.activeElement?.dataset.testid).toBe('picker-filter')
  })

  it('opens the panel on a single click without immediately closing', async () => {
    const wrapper = mount(FilterablePicker, {
      props: { modelValue: null, options: OPTIONS, testId: 'picker' },
      attachTo: document.body,
    })

    await wrapper.get('[data-testid="picker-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="picker-panel"]').exists()).toBe(true)
    expect(document.activeElement?.dataset.testid).toBe('picker-filter')
  })

  it('closes the panel when the trigger is clicked while already open', async () => {
    const wrapper = mount(FilterablePicker, {
      props: { modelValue: null, options: OPTIONS, testId: 'picker' },
      attachTo: document.body,
    })

    const trigger = wrapper.get('[data-testid="picker-trigger"]')
    await trigger.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="picker-panel"]').exists()).toBe(true)

    await trigger.trigger('pointerdown')
    await trigger.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="picker-panel"]').exists()).toBe(false)
  })
})
