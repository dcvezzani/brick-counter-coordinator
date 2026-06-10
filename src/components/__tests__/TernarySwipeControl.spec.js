import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  const thumb = wrapper.get('[data-testid="ternary-swipe-thumb"]')
  const eventInit = {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY: 22,
    pointerId: 1,
    pointerType: 'mouse',
    ...extra,
  }
  thumb.element.dispatchEvent(new PointerEvent(type, eventInit))
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

describe('TernarySwipeControl', () => {
  beforeEach(() => {
    stubMatchMedia()
  })

  it('renders labels and hidden input with initial neutral value', () => {
    const wrapper = mount(TernarySwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        option1Label: 'Moved',
        option2Label: 'New loc',
      },
    })

    expect(wrapper.get('[data-testid="ternary-swipe-label-left"]').text()).toContain('Moved')
    expect(wrapper.get('[data-testid="ternary-swipe-label-right"]').text()).toContain('New loc')

    const hidden = wrapper.get('[data-testid="ternary-swipe-hidden-input"]')
    expect(hidden.attributes('name')).toBe('status')
    expect(hidden.element.value).toBe('')

    const anchor = wrapper.get('[data-testid="ternary-swipe-center-anchor"]')
    expect(anchor.classes()).toContain('rounded-full')
    expect(anchor.classes()).toContain('bg-transparent')
    expect(anchor.attributes('style')).toContain('width: 10px')
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

    expect(wrapper.get('[data-testid="ternary-swipe-thumb"]').attributes('data-zone')).toBe(
      'center',
    )

    await wrapper.setProps({ modelValue: 'moved' })
    expect(wrapper.get('[data-testid="ternary-swipe-thumb"]').attributes('data-zone')).toBe('left')

    await wrapper.setProps({ modelValue: 'new_loc' })
    expect(wrapper.get('[data-testid="ternary-swipe-thumb"]').attributes('data-zone')).toBe('right')
  })

  it('taps left half to select option 1', async () => {
    const wrapper = mount(TernarySwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        option1Value: 'moved',
        option2Value: 'new_loc',
      },
    })

    mockTrackRect(wrapper)
    tapTrackAt(wrapper, 40)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['moved'])
    expect(wrapper.get('[data-testid="ternary-swipe-hidden-input"]').element.value).toBe('moved')
    expect(wrapper.get('[data-testid="ternary-swipe-thumb"]').attributes('data-zone')).toBe('left')
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
    trackPointerAt(wrapper, 'pointerdown', 40)
    trackPointerAt(wrapper, 'pointermove', 250)
    trackPointerAt(wrapper, 'pointerup', 250)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['new_loc'])
    expect(wrapper.get('[data-testid="ternary-swipe-hidden-input"]').element.value).toBe('new_loc')
    expect(wrapper.get('[data-testid="ternary-swipe-thumb"]').attributes('data-zone')).toBe('right')
  })

  it('taps right half to select option 2', async () => {
    const wrapper = mount(TernarySwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        option1Value: 'moved',
        option2Value: 'new_loc',
      },
    })

    mockTrackRect(wrapper)
    tapTrackAt(wrapper, 260)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['new_loc'])
    expect(wrapper.get('[data-testid="ternary-swipe-hidden-input"]').element.value).toBe('new_loc')
  })

  it('taps center anchor to return to neutral', async () => {
    const wrapper = mount(TernarySwipeControl, {
      props: {
        name: 'status',
        modelValue: 'moved',
        option1Value: 'moved',
        option2Value: 'new_loc',
        neutralValue: 'pending',
      },
    })

    await wrapper.get('[data-testid="ternary-swipe-center-anchor"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['pending'])
    expect(wrapper.get('[data-testid="ternary-swipe-hidden-input"]').element.value).toBe('pending')
  })

  it('returns to neutral when dragging from left-selected into center zone', async () => {
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
    pointerAt(wrapper, 'pointerdown', 50)
    pointerAt(wrapper, 'pointermove', 150)
    pointerAt(wrapper, 'pointerup', 150)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['pending'])
    expect(wrapper.get('[data-testid="ternary-swipe-thumb"]').attributes('data-zone')).toBe('center')
  })

  it('morphs toward circle while dragging away from left selection toward center', async () => {
    const wrapper = mount(TernarySwipeControl, {
      props: {
        name: 'status',
        modelValue: 'moved',
        option1Value: 'moved',
        option2Value: 'new_loc',
      },
    })

    mockTrackRect(wrapper)
    pointerAt(wrapper, 'pointerdown', 50)
    pointerAt(wrapper, 'pointermove', 150)
    await wrapper.vm.$nextTick()

    const thumb = wrapper.get('[data-testid="ternary-swipe-thumb"]')
    expect(thumb.attributes('data-zone')).toBe('center')
    expect(thumb.classes()).toContain('bg-foreground')
    expect(thumb.attributes('style')).toContain('width: 10px')
    expect(thumb.attributes('style')).toContain('opacity: 1')
  })

  it('fades option pill opacity when offset from left snap during drag', async () => {
    const wrapper = mount(TernarySwipeControl, {
      props: {
        name: 'status',
        modelValue: 'moved',
        option1Value: 'moved',
        option2Value: 'new_loc',
      },
    })

    mockTrackRect(wrapper)
    pointerAt(wrapper, 'pointerdown', 50)
    pointerAt(wrapper, 'pointermove', 100)
    await wrapper.vm.$nextTick()

    const style = wrapper.get('[data-testid="ternary-swipe-thumb"]').attributes('style')
    expect(style).toMatch(/opacity: 0\.[0-9]+/)
    expect(style).not.toContain('opacity: 1')
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
    pointerAt(wrapper, 'pointerdown', 50)
    pointerAt(wrapper, 'pointermove', 250)
    pointerAt(wrapper, 'pointerup', 250)
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
    tapTrackAt(wrapper, 40)
    pointerAt(wrapper, 'pointerdown', 40)
    pointerAt(wrapper, 'pointerup', 40)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.get('[data-testid="ternary-swipe-hidden-input"]').attributes('disabled')).toBe(
      '',
    )
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
    await track.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['moved'])

    await wrapper.setProps({ modelValue: 'moved' })
    await track.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['pending'])
  })
})
