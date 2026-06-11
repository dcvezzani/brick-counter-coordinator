import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TernarySwipeControl from '@/components/TernarySwipeControl.vue'

const TRACK_WIDTH = 300
const INSET_PADDING = 4
const INSET_WIDTH = TRACK_WIDTH - INSET_PADDING * 2

function mockTrackRect(wrapper, testId = 'ternary-swipe') {
  const track = wrapper.get(`[data-testid="${testId}-track"]`).element
  track.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: TRACK_WIDTH,
    bottom: 44,
    width: TRACK_WIDTH,
    height: 44,
    toJSON: () => ({}),
  })

  const inset = wrapper.get(`[data-testid="${testId}-inset"]`).element
  inset.getBoundingClientRect = () => ({
    x: INSET_PADDING,
    y: INSET_PADDING,
    top: INSET_PADDING,
    left: INSET_PADDING,
    right: INSET_PADDING + INSET_WIDTH,
    bottom: 44 - INSET_PADDING,
    width: INSET_WIDTH,
    height: 44 - INSET_PADDING * 2,
    toJSON: () => ({}),
  })
}

function pointerAt(wrapper, type, clientX, extra = {}) {
  const track = wrapper.get('[data-testid="ternary-swipe-track"]')
  track.element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY: 22,
      pointerId: 1,
      pointerType: 'mouse',
      ...extra,
    }),
  )
}

function tapTrackAt(wrapper, clientX, pointerId = 2) {
  const track = wrapper.get('[data-testid="ternary-swipe-track"]')
  const eventInit = {
    bubbles: true,
    clientX,
    clientY: 22,
    pointerId,
    pointerType: 'mouse',
  }
  track.element.dispatchEvent(new PointerEvent('pointerdown', eventInit))
  track.element.dispatchEvent(new PointerEvent('pointerup', { ...eventInit }))
}

function trackPointerAt(wrapper, type, clientX, clientY = 22, pointerId = 3) {
  const track = wrapper.get('[data-testid="ternary-swipe-track"]')
  track.element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      pointerId,
      pointerType: 'mouse',
    }),
  )
}

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

/** Wait for shrink/fade dismiss animation (220ms) to finish and emit. */
async function flushDismissAnimation(wrapper) {
  await wrapper.vm.$nextTick()
  await new Promise((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 220)
    })
  })
  await wrapper.vm.$nextTick()
}

describe('TernarySwipeControl', () => {
  beforeEach(() => {
    stubMatchMedia()
  })

  it('renders labels, none segment, and hidden input', () => {
    const wrapper = mount(TernarySwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        option1Label: 'Moved',
        option2Label: 'New loc',
      },
    })

    expect(wrapper.get('[data-testid="ternary-swipe-label-left"]').text()).toContain('Moved')
    expect(wrapper.get('[data-testid="ternary-swipe-label-none"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="ternary-swipe-none-segment"]').exists()).toBe(true)

    const hidden = wrapper.get('[data-testid="ternary-swipe-hidden-input"]')
    expect(hidden.element.value).toBe('')
    expect(wrapper.find('[data-testid="ternary-swipe-thumb"]').exists()).toBe(false)
  })

  it('syncs thumb zone when modelValue changes', async () => {
    const wrapper = mount(TernarySwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        option1Value: 'moved',
        option2Value: 'new_loc',
      },
    })

    expect(wrapper.find('[data-testid="ternary-swipe-thumb"]').exists()).toBe(false)

    await wrapper.setProps({ modelValue: 'moved' })
    expect(wrapper.get('[data-testid="ternary-swipe-thumb"]').attributes('data-zone')).toBe('left')

    await wrapper.setProps({ modelValue: 'new_loc' })
    expect(wrapper.get('[data-testid="ternary-swipe-thumb"]').attributes('data-zone')).toBe('right')
  })

  it('taps left segment to select option 1', async () => {
    const wrapper = mount(TernarySwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        option1Value: 'moved',
        option2Value: 'new_loc',
      },
    })

    mockTrackRect(wrapper)
    tapTrackAt(wrapper, 53)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['moved'])
    expect(wrapper.get('[data-testid="ternary-swipe-hidden-input"]').element.value).toBe('moved')
  })

  it('slides after track tap without lifting finger', async () => {
    const wrapper = mount(TernarySwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        option1Value: 'moved',
        option2Value: 'new_loc',
      },
    })

    mockTrackRect(wrapper)
    trackPointerAt(wrapper, 'pointerdown', 53)
    trackPointerAt(wrapper, 'pointermove', 150)
    trackPointerAt(wrapper, 'pointerup', 150)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['new_loc'])
  })

  it('clicks none segment to return to neutral', async () => {
    const wrapper = mount(TernarySwipeControl, {
      props: {
        name: 'status',
        modelValue: 'moved',
        option1Value: 'moved',
        option2Value: 'new_loc',
        neutralValue: 'pending',
      },
    })

    await wrapper.get('[data-testid="ternary-swipe-none-segment"]').trigger('click')
    await flushDismissAnimation(wrapper)

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['pending'])
    expect(wrapper.find('[data-testid="ternary-swipe-thumb"]').exists()).toBe(false)
  })

  it('drops on none segment after drag', async () => {
    const wrapper = mount(TernarySwipeControl, {
      props: {
        name: 'status',
        modelValue: 'moved',
        option1Value: 'moved',
        option2Value: 'new_loc',
        neutralValue: 'pending',
      },
    })

    mockTrackRect(wrapper)
    trackPointerAt(wrapper, 'pointerdown', 53)
    trackPointerAt(wrapper, 'pointermove', 247)
    trackPointerAt(wrapper, 'pointerup', 247)
    await flushDismissAnimation(wrapper)

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['pending'])
  })

  it('plays dismiss animation when dragging from neutral onto none segment', async () => {
    const wrapper = mount(TernarySwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        option1Value: 'moved',
        option2Value: 'new_loc',
        neutralValue: 'pending',
      },
    })

    mockTrackRect(wrapper)
    trackPointerAt(wrapper, 'pointerdown', 53)
    trackPointerAt(wrapper, 'pointermove', 150)
    trackPointerAt(wrapper, 'pointermove', 247)
    trackPointerAt(wrapper, 'pointerup', 247)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="ternary-swipe-thumb"]').exists()).toBe(true)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await flushDismissAnimation(wrapper)

    expect(wrapper.find('[data-testid="ternary-swipe-thumb"]').exists()).toBe(false)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('drags from left to right and selects option 2', async () => {
    const wrapper = mount(TernarySwipeControl, {
      props: {
        name: 'status',
        modelValue: 'moved',
        option1Value: 'moved',
        option2Value: 'new_loc',
      },
    })

    mockTrackRect(wrapper)
    pointerAt(wrapper, 'pointerdown', 53)
    pointerAt(wrapper, 'pointermove', 150)
    pointerAt(wrapper, 'pointerup', 150)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['new_loc'])
    expect(wrapper.get('[data-testid="ternary-swipe-thumb"]').attributes('data-zone')).toBe('right')
  })

  it('does not emit when disabled', async () => {
    const wrapper = mount(TernarySwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        option1Value: 'moved',
        disabled: true,
      },
    })

    mockTrackRect(wrapper)
    tapTrackAt(wrapper, 53)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('moves selection with keyboard arrows', async () => {
    const wrapper = mount(TernarySwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        option1Value: 'moved',
        option2Value: 'new_loc',
        neutralValue: 'pending',
      },
    })

    const track = wrapper.get('[data-testid="ternary-swipe-track"]')
    await track.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['moved'])

    await wrapper.setProps({ modelValue: 'moved' })
    await track.trigger('keydown', { key: 'ArrowLeft' })
    await flushDismissAnimation(wrapper)
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['pending'])
  })
})
