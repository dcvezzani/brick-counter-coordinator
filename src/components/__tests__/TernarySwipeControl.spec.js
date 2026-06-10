import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TernarySwipeControl from '@/components/TernarySwipeControl.vue'

const TRACK_WIDTH = 300

function mockTrackRect(wrapper) {
  const track = wrapper.get('[data-testid="ternary-swipe-track"]').element
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

function tapTrackAt(wrapper, clientX) {
  const track = wrapper.get('[data-testid="ternary-swipe-track"]')
  track.element.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      clientX,
      clientY: 22,
      pointerId: 2,
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

  it('demotes thumb appearance while dragging away from left selection', async () => {
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
    pointerAt(wrapper, 'pointermove', 200)
    await wrapper.vm.$nextTick()

    const thumb = wrapper.get('[data-testid="ternary-swipe-thumb"]')
    expect(thumb.attributes('data-zone')).toBe('center')
    expect(thumb.classes()).toContain('bg-muted-foreground')
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
