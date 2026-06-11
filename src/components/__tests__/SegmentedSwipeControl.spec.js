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
  const track = wrapper.get('[data-testid="segmented-swipe-track"]')
  track.element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      pointerId: 1,
      pointerType: 'mouse',
      ...extra,
    }),
  )
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

describe('SegmentedSwipeControl', () => {
  beforeEach(() => {
    stubMatchMedia()
  })

  it('renders option labels, none segment, and hidden input', () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        options: THREE_OPTIONS,
      },
    })

    expect(wrapper.get('[data-testid="segmented-swipe-label-0"]').text()).toContain('Moved')
    expect(wrapper.get('[data-testid="segmented-swipe-label-none"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="segmented-swipe-none-segment"]').exists()).toBe(true)

    const hidden = wrapper.get('[data-testid="segmented-swipe-hidden-input"]')
    expect(hidden.element.value).toBe('')
  })

  it('hides thumb when none is committed', () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        options: THREE_OPTIONS,
      },
    })

    expect(wrapper.find('[data-testid="segmented-swipe-thumb"]').exists()).toBe(false)
  })

  it('shows destructive none icon when an option is selected', async () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: 'moved',
        options: THREE_OPTIONS,
      },
    })

    const icon = wrapper.get('[data-testid="segmented-swipe-none-segment"] svg')
    expect(icon.classes()).toContain('text-destructive')
    expect(wrapper.find('[data-testid="segmented-swipe-thumb"]').exists()).toBe(true)
  })

  it('syncs thumb zone when modelValue changes', async () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: '',
        options: THREE_OPTIONS,
      },
    })

    expect(wrapper.find('[data-testid="segmented-swipe-thumb"]').exists()).toBe(false)

    await wrapper.setProps({ modelValue: 'moved' })
    expect(wrapper.get('[data-testid="segmented-swipe-thumb"]').attributes('data-zone')).toBe(
      'option-0',
    )

    await wrapper.setProps({ modelValue: 'trashed' })
    expect(wrapper.get('[data-testid="segmented-swipe-thumb"]').attributes('data-zone')).toBe(
      'option-2',
    )
  })

  it('taps first segment to select first option', async () => {
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
    trackPointerAt(wrapper, 'pointermove', 187)
    trackPointerAt(wrapper, 'pointerup', 187)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['trashed'])
  })

  it('clicks none segment to clear selection', async () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: 'moved',
        options: THREE_OPTIONS,
        neutralValue: 'none',
      },
    })

    await wrapper.get('[data-testid="segmented-swipe-none-segment"]').trigger('click')
    await flushDismissAnimation(wrapper)

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['none'])
    expect(wrapper.find('[data-testid="segmented-swipe-thumb"]').exists()).toBe(false)
  })

  it('drops on none segment after horizontal drag', async () => {
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
    trackPointerAt(wrapper, 'pointermove', 260)
    trackPointerAt(wrapper, 'pointerup', 260)
    await flushDismissAnimation(wrapper)

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['none'])
    expect(wrapper.find('[data-testid="segmented-swipe-thumb"]').exists()).toBe(false)
  })

  it('plays dismiss animation when dragging from neutral onto none segment', async () => {
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
    trackPointerAt(wrapper, 'pointermove', 150)
    trackPointerAt(wrapper, 'pointermove', 260)
    trackPointerAt(wrapper, 'pointerup', 260)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="segmented-swipe-thumb"]').exists()).toBe(true)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await flushDismissAnimation(wrapper)

    expect(wrapper.find('[data-testid="segmented-swipe-thumb"]').exists()).toBe(false)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('drags from first to last option segment', async () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: 'moved',
        options: THREE_OPTIONS,
      },
    })

    mockTrackRect(wrapper)
    pointerAt(wrapper, 'pointerdown', 40)
    pointerAt(wrapper, 'pointermove', 187)
    pointerAt(wrapper, 'pointerup', 187)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['trashed'])
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
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
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
    await flushDismissAnimation(wrapper)
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['none'])
  })

  it('hides none segment when allowNeutral is false', () => {
    const wrapper = mount(SegmentedSwipeControl, {
      props: {
        name: 'status',
        modelValue: 'moved',
        options: THREE_OPTIONS,
        allowNeutral: false,
      },
    })

    expect(wrapper.find('[data-testid="segmented-swipe-none-segment"]').exists()).toBe(false)
  })
})
