import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SegmentedSwipeControl from '@/components/SegmentedSwipeControl.vue'

const TRACK_WIDTH = 300
const INSET_PADDING = 4
const INSET_WIDTH = TRACK_WIDTH - INSET_PADDING * 2

const THREE_OPTIONS = [
  { value: 'moved', label: 'Moved' },
  { value: 'new_loc', label: 'New Loc' },
  { value: 'trashed', label: 'Trashed' },
]

function mockTrackRect(wrapper, testId = 'segmented-swipe') {
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

function pointerAt(wrapper, type, clientX, clientY = 22, extra = {}) {
  const thumb = wrapper.get('[data-testid="segmented-swipe-thumb"]')
  const eventInit = {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
    pointerId: 1,
    pointerType: 'mouse',
    ...extra,
  }
  thumb.element.dispatchEvent(new PointerEvent(type, eventInit))
}

function tapTrackAt(wrapper, clientX, pointerId = 2) {
  const track = wrapper.get('[data-testid="segmented-swipe-track"]')
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
  const track = wrapper.get('[data-testid="segmented-swipe-track"]')
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

describe('SegmentedSwipeControl', () => {
  beforeEach(() => {
    stubMatchMedia()
  })

  it('renders labels and hidden input with initial neutral value', () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        options: THREE_OPTIONS,
      },
    })

    expect(wrapper.get('[data-testid="segmented-swipe-label-0"]').text()).toContain('Moved')
    expect(wrapper.get('[data-testid="segmented-swipe-label-1"]').text()).toContain('New Loc')
    expect(wrapper.get('[data-testid="segmented-swipe-label-2"]').text()).toContain('Trashed')

    const hidden = wrapper.get('[data-testid="segmented-swipe-hidden-input"]')
    expect(hidden.attributes('name')).toBe('status')
    expect(hidden.element.value).toBe('')

    const anchor = wrapper.get('[data-testid="segmented-swipe-neutral-anchor"]')
    expect(anchor.classes()).toContain('rounded-full')
    expect(anchor.classes()).toContain('bg-transparent')
  })

  it('syncs thumb zone and index when modelValue changes', async () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        options: THREE_OPTIONS,
      },
    })

    const thumb = () => wrapper.get('[data-testid="segmented-swipe-thumb"]')
    expect(thumb().attributes('data-zone')).toBe('neutral')
    expect(thumb().attributes('data-index')).toBe('-1')

    await wrapper.setProps({ modelValue: 'moved' })
    expect(thumb().attributes('data-zone')).toBe('option-0')
    expect(thumb().attributes('data-index')).toBe('0')

    await wrapper.setProps({ modelValue: 'trashed' })
    expect(thumb().attributes('data-zone')).toBe('option-2')
    expect(thumb().attributes('data-index')).toBe('2')
  })

  it('taps left segment to select first option', async () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        options: THREE_OPTIONS,
      },
    })

    mockTrackRect(wrapper)
    tapTrackAt(wrapper, 40)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['moved'])
    expect(wrapper.get('[data-testid="segmented-swipe-hidden-input"]').element.value).toBe('moved')
    expect(wrapper.get('[data-testid="segmented-swipe-thumb"]').attributes('data-index')).toBe('0')
  })

  it('slides after track tap without lifting finger', async () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        options: THREE_OPTIONS,
      },
    })

    mockTrackRect(wrapper)
    trackPointerAt(wrapper, 'pointerdown', 40)
    trackPointerAt(wrapper, 'pointermove', 250)
    trackPointerAt(wrapper, 'pointerup', 250)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['trashed'])
    expect(wrapper.get('[data-testid="segmented-swipe-hidden-input"]').element.value).toBe('trashed')
  })

  it('taps right segment to select last option', async () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        options: THREE_OPTIONS,
      },
    })

    mockTrackRect(wrapper)
    tapTrackAt(wrapper, 260)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['trashed'])
    expect(wrapper.get('[data-testid="segmented-swipe-hidden-input"]').element.value).toBe('trashed')
  })

  it('taps neutral anchor to return to neutral', async () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: 'moved',
        options: THREE_OPTIONS,
        neutralValue: 'none',
      },
    })

    await wrapper.get('[data-testid="segmented-swipe-neutral-anchor"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['none'])
    expect(wrapper.get('[data-testid="segmented-swipe-hidden-input"]').element.value).toBe('none')
    expect(wrapper.get('[data-testid="segmented-swipe-thumb"]').attributes('data-zone')).toBe('neutral')
  })

  it('drags from first to last segment and selects last option', async () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: 'moved',
        options: THREE_OPTIONS,
      },
    })

    mockTrackRect(wrapper)
    pointerAt(wrapper, 'pointerdown', 50)
    pointerAt(wrapper, 'pointermove', 250)
    pointerAt(wrapper, 'pointerup', 250)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['trashed'])
    expect(wrapper.get('[data-testid="segmented-swipe-thumb"]').attributes('data-index')).toBe('2')
  })

  it('does not morph to neutral during horizontal drag through neutral zone', async () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: 'moved',
        options: THREE_OPTIONS,
      },
    })

    mockTrackRect(wrapper)
    pointerAt(wrapper, 'pointerdown', 50)
    pointerAt(wrapper, 'pointermove', 130)
    await wrapper.vm.$nextTick()

    const thumb = wrapper.get('[data-testid="segmented-swipe-thumb"]')
    expect(thumb.attributes('data-zone')).not.toBe('neutral')
    expect(thumb.classes()).not.toContain('bg-foreground')
  })

  it('does not snap to neutral when releasing after horizontal slide through neutral zone', async () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        options: THREE_OPTIONS,
        neutralValue: 'none',
      },
    })

    mockTrackRect(wrapper)
    trackPointerAt(wrapper, 'pointerdown', 40)
    trackPointerAt(wrapper, 'pointermove', 101)
    trackPointerAt(wrapper, 'pointermove', 250)
    trackPointerAt(wrapper, 'pointerup', 250)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['trashed'])
    expect(wrapper.get('[data-testid="segmented-swipe-hidden-input"]').element.value).toBe('trashed')
  })

  it('snaps to neutral when releasing on the none anchor after horizontal drag', async () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: 'moved',
        options: THREE_OPTIONS,
        neutralValue: 'none',
      },
    })

    mockTrackRect(wrapper)
    trackPointerAt(wrapper, 'pointerdown', 40)
    trackPointerAt(wrapper, 'pointermove', 101)
    trackPointerAt(wrapper, 'pointerup', 101)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['none'])
    expect(wrapper.get('[data-testid="segmented-swipe-thumb"]').attributes('data-zone')).toBe('neutral')
  })

  it('swipe up commits neutral on release', async () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: 'moved',
        options: THREE_OPTIONS,
        neutralValue: 'none',
      },
    })

    mockTrackRect(wrapper)
    pointerAt(wrapper, 'pointerdown', 150, 40)
    pointerAt(wrapper, 'pointermove', 150, 10)
    pointerAt(wrapper, 'pointerup', 150, 10)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['none'])
    expect(wrapper.get('[data-testid="segmented-swipe-thumb"]').attributes('data-zone')).toBe('neutral')
  })

  it('swipe up on release commits neutral', async () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: 'new_loc',
        options: THREE_OPTIONS,
        neutralValue: 'none',
      },
    })

    mockTrackRect(wrapper)
    pointerAt(wrapper, 'pointerdown', 150, 40)
    pointerAt(wrapper, 'pointerup', 152, 12)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['none'])
  })

  it('ignores swipe up when allowNeutral is false', async () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: 'moved',
        options: THREE_OPTIONS,
        allowNeutral: false,
      },
    })

    mockTrackRect(wrapper)
    pointerAt(wrapper, 'pointerdown', 150, 40)
    pointerAt(wrapper, 'pointermove', 150, 10)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.get('[data-testid="segmented-swipe-thumb"]').attributes('data-index')).toBe('0')
  })

  it('does not emit when disabled', async () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        options: THREE_OPTIONS,
        disabled: true,
      },
    })

    mockTrackRect(wrapper)
    tapTrackAt(wrapper, 40)
    pointerAt(wrapper, 'pointerdown', 40)
    pointerAt(wrapper, 'pointerup', 40)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.get('[data-testid="segmented-swipe-hidden-input"]').attributes('disabled')).toBe(
      '',
    )
  })

  it('moves selection with keyboard arrows and home', async () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        options: THREE_OPTIONS,
        neutralValue: 'none',
      },
    })

    const track = wrapper.get('[data-testid="segmented-swipe-track"]')
    await track.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['moved'])

    await wrapper.setProps({ modelValue: 'moved' })
    await track.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['new_loc'])

    await wrapper.setProps({ modelValue: 'new_loc' })
    await track.trigger('keydown', { key: 'Home' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['none'])
  })

  it('hides neutral anchor when allowNeutral is false', () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: 'moved',
        options: THREE_OPTIONS,
        allowNeutral: false,
      },
    })

    expect(wrapper.find('[data-testid="segmented-swipe-neutral-anchor"]').exists()).toBe(false)
  })
})
