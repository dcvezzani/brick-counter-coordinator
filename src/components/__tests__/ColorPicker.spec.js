import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ColorPicker from '@/components/ColorPicker.vue'

const COLORS = [
  { id: 11, name: 'Black', hex: '#05131d' },
  { id: 41, name: 'Aqua', hex: '#0084ff' },
  { id: 86, name: 'Light Bluish Gray', hex: '#9ba19d' },
]

describe('ColorPicker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hides options until the trigger is activated', async () => {
    const wrapper = mount(ColorPicker, {
      props: { colors: COLORS, modelValue: null },
    })

    expect(wrapper.find('[data-testid="color-picker-panel"]').exists()).toBe(false)
    await wrapper.get('[data-testid="color-picker-trigger"]').trigger('click')
    expect(wrapper.find('[data-testid="color-picker-panel"]').exists()).toBe(true)
  })

  it('toggles the panel closed when the trigger is clicked again', async () => {
    const wrapper = mount(ColorPicker, {
      props: { colors: COLORS, modelValue: null },
    })

    const trigger = wrapper.get('[data-testid="color-picker-trigger"]')
    await trigger.trigger('click')
    expect(wrapper.find('[data-testid="color-picker-panel"]').exists()).toBe(true)
    await trigger.trigger('pointerdown')
    await trigger.trigger('click')
    expect(wrapper.find('[data-testid="color-picker-panel"]').exists()).toBe(false)
  })

  it('filters colors by prefix after debounce and highlights the first match', async () => {
    const wrapper = mount(ColorPicker, {
      props: { colors: COLORS, modelValue: null },
    })

    await wrapper.get('[data-testid="color-picker-trigger"]').trigger('click')
    const filter = wrapper.get('[data-testid="color-picker-filter"]')
    await filter.setValue('a')
    vi.advanceTimersByTime(150)
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('[data-testid^="color-picker-option-"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="color-picker-option-41"]').classes()).toContain('bg-accent')
  })

  it('selects the highlighted color on Enter', async () => {
    const wrapper = mount(ColorPicker, {
      props: { colors: COLORS, modelValue: null },
    })

    await wrapper.get('[data-testid="color-picker-trigger"]').trigger('click')
    const filter = wrapper.get('[data-testid="color-picker-filter"]')
    await filter.setValue('b')
    vi.advanceTimersByTime(150)
    await wrapper.vm.$nextTick()

    await filter.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('update:modelValue')).toEqual([[11]])
    expect(wrapper.find('[data-testid="color-picker-panel"]').exists()).toBe(false)
  })

  it('is disabled when no part colors are provided', () => {
    const wrapper = mount(ColorPicker, {
      props: { colors: [], modelValue: null },
    })

    expect(wrapper.get('[data-testid="color-picker-trigger"]').attributes('disabled')).toBeDefined()
  })

  it('opens the panel when focus() is called', async () => {
    const wrapper = mount(ColorPicker, {
      props: { colors: COLORS, modelValue: null },
      attachTo: document.body,
    })

    wrapper.vm.focus()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="color-picker-panel"]').exists()).toBe(true)
    expect(document.activeElement?.dataset.testid).toBe('color-picker-filter')
  })
})
