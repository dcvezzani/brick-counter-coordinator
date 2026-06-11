import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SwipeNumberInput from '@/components/SwipeNumberInput.vue'

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

function mockSlideTrackWidth(wrapper, width = 200, testId = 'swipe-number') {
  const slide = wrapper.get(`[data-testid="${testId}-slide"]`).element
  slide.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: 44,
    width,
    height: 44,
    toJSON: () => ({}),
  })
}

function pointerOnHandle(wrapper, type, clientX, pointerId = 1) {
  const handle = wrapper.get('[data-testid="swipe-number-handle"]').element
  handle.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY: 22,
      pointerId,
      pointerType: 'mouse',
    }),
  )
}

function pointerOnMinus(wrapper, type, pointerId = 1) {
  const minus = wrapper.get('[data-testid="swipe-number-minus"]').element
  minus.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: 10,
      clientY: 22,
      pointerId,
      pointerType: 'mouse',
    }),
  )
}

async function tapMinus(wrapper, pointerId = 1) {
  pointerOnMinus(wrapper, 'pointerdown', pointerId)
  window.dispatchEvent(
    new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      clientX: 10,
      clientY: 22,
      pointerId,
      pointerType: 'mouse',
    }),
  )
  await flushPromises()
}

/** Drive drag rAF ticks with increasing timestamps. */
async function runDragFrames(count, startTime = 1000, stepMs = 50) {
  for (let i = 0; i < count; i += 1) {
    const now = startTime + i * stepMs
    vi.spyOn(performance, 'now').mockReturnValue(now)
    await vi.runOnlyPendingTimersAsync()
    await flushPromises()
  }
}

describe('SwipeNumberInput', () => {
  beforeEach(() => {
    stubMatchMedia()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })

    let rafId = 0
    vi.stubGlobal('requestAnimationFrame', (cb) => {
      rafId += 1
      const id = rafId
      setTimeout(() => cb(performance.now()), 0)
      return id
    })
    vi.stubGlobal('cancelAnimationFrame', (id) => {
      clearTimeout(id)
    })
    vi.spyOn(performance, 'now').mockReturnValue(1000)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders input, handle, and hidden input', () => {
    const wrapper = mount(SwipeNumberInput, {
      props: { name: 'qty', modelValue: 5 },
    })

    expect(wrapper.get('[data-testid="swipe-number-input"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="swipe-number-handle"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="swipe-number-hidden-input"]').element.value).toBe('5')
  })

  it('typing and blur emits parsed value', async () => {
    const wrapper = mount(SwipeNumberInput, {
      props: { name: 'qty', modelValue: null },
    })

    const input = wrapper.get('[data-testid="swipe-number-input"]')
    await input.setValue('12')
    await input.trigger('blur')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([12])
  })

  it('empty value drag left increments from zero', async () => {
    const wrapper = mount(SwipeNumberInput, {
      props: { name: 'qty', modelValue: null },
      attachTo: document.body,
    })
    mockSlideTrackWidth(wrapper)

    pointerOnHandle(wrapper, 'pointerdown', 200)
    pointerOnHandle(wrapper, 'pointermove', 120)
    await runDragFrames(8)

    const updates = wrapper.emitted('update:modelValue') ?? []
    const last = updates.at(-1)?.[0] ?? 0
    expect(last).toBeGreaterThan(0)

    pointerOnHandle(wrapper, 'pointerup', 120)
    await flushPromises()
  })

  it('drag right decrements an existing value', async () => {
    const wrapper = mount(SwipeNumberInput, {
      props: { name: 'qty', modelValue: 10 },
      attachTo: document.body,
    })
    mockSlideTrackWidth(wrapper)

    pointerOnHandle(wrapper, 'pointerdown', 100)
    pointerOnHandle(wrapper, 'pointermove', 160)
    await runDragFrames(8)

    const updates = wrapper.emitted('update:modelValue') ?? []
    const last = updates.at(-1)?.[0]
    expect(last).toBeLessThan(10)

    pointerOnHandle(wrapper, 'pointerup', 160)
    await flushPromises()
  })

  it('does not go below zero when allowNegative is false', async () => {
    const wrapper = mount(SwipeNumberInput, {
      props: { name: 'qty', modelValue: 0, allowNegative: false },
      attachTo: document.body,
    })
    mockSlideTrackWidth(wrapper)

    pointerOnHandle(wrapper, 'pointerdown', 100)
    pointerOnHandle(wrapper, 'pointermove', 180)
    await runDragFrames(10)

    const updates = wrapper.emitted('update:modelValue') ?? []
    for (const [value] of updates) {
      expect(value).toBeGreaterThanOrEqual(0)
    }

    pointerOnHandle(wrapper, 'pointerup', 180)
    await flushPromises()
  })

  function pointerOnWindow(type, clientX, pointerId = 1) {
    window.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY: 0,
        pointerId,
        pointerType: 'mouse',
      }),
    )
  }

  it('ends drag and snaps handle when pointerup fires outside the component', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const wrapper = mount(SwipeNumberInput, {
      props: { name: 'qty', modelValue: 1 },
      attachTo: document.body,
    })
    mockSlideTrackWidth(wrapper)

    const addListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener')

    pointerOnHandle(wrapper, 'pointerdown', 200)
    expect(addListenerSpy).toHaveBeenCalledWith('pointerup', expect.any(Function))

    pointerOnWindow('pointermove', 50)

    pointerOnWindow('pointerup', 50)
    expect(removeListenerSpy).toHaveBeenCalledWith('pointerup', expect.any(Function))
    await flushPromises()

    expect(wrapper.attributes('data-dragging')).toBe('false')
    expect(wrapper.get('[data-testid="swipe-number-handle"]').attributes('style') ?? '').toMatch(
      /\+\s*0px\)/,
    )
  })

  it('snaps handle back to rest on release', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const wrapper = mount(SwipeNumberInput, {
      props: { name: 'qty', modelValue: 1 },
      attachTo: document.body,
    })
    mockSlideTrackWidth(wrapper)

    pointerOnHandle(wrapper, 'pointerdown', 200)
    pointerOnHandle(wrapper, 'pointermove', 140)
    pointerOnHandle(wrapper, 'pointerup', 140)
    await flushPromises()

    const handle = wrapper.get('[data-testid="swipe-number-handle"]')
    expect(handle.attributes('style') ?? '').toMatch(/\+\s*0px\)/)
  })

  it('clicking plus increments by 1', async () => {
    const wrapper = mount(SwipeNumberInput, {
      props: { name: 'qty', modelValue: 5 },
    })

    await wrapper.get('[data-testid="swipe-number-plus"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([6])
    expect(wrapper.get('[data-testid="swipe-number-input"]').element.value).toBe('6')
  })

  it('tapping minus decrements by 1', async () => {
    const wrapper = mount(SwipeNumberInput, {
      props: { name: 'qty', modelValue: 5 },
    })

    await tapMinus(wrapper)

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([4])
    expect(wrapper.get('[data-testid="swipe-number-input"]').element.value).toBe('4')
  })

  it('tapping minus does not go below zero when allowNegative is false', async () => {
    const wrapper = mount(SwipeNumberInput, {
      props: { name: 'qty', modelValue: 0, allowNegative: false },
    })

    await tapMinus(wrapper)

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.get('[data-testid="swipe-number-input"]').element.value).toBe('0')
  })

  it('holding minus for 1 second sets the value to zero', async () => {
    const wrapper = mount(SwipeNumberInput, {
      props: { name: 'qty', modelValue: 42 },
    })

    pointerOnMinus(wrapper, 'pointerdown')
    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([0])
    expect(wrapper.emitted('change')?.at(-1)).toEqual([0])
    expect(wrapper.get('[data-testid="swipe-number-input"]').element.value).toBe('0')

    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
      }),
    )
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([0])
  })

  it('releasing minus before 1 second does not reset the value to zero', async () => {
    const wrapper = mount(SwipeNumberInput, {
      props: { name: 'qty', modelValue: 42 },
    })

    pointerOnMinus(wrapper, 'pointerdown')
    await vi.advanceTimersByTimeAsync(500)
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
      }),
    )
    await flushPromises()

    const updates = wrapper.emitted('update:modelValue') ?? []
    expect(updates.some(([value]) => value === 0)).toBe(false)
    expect(wrapper.get('[data-testid="swipe-number-input"]').element.value).toBe('41')
  })

  it('renders slide control on the left when configured', () => {
    const wrapper = mount(SwipeNumberInput, {
      props: { name: 'qty', modelValue: 1, handlePosition: 'left' },
    })

    const track = wrapper.get('[data-testid="swipe-number-track"]')
    expect(track.element.firstElementChild?.getAttribute('data-testid')).toBe('swipe-number-slide')
    expect(wrapper.get('[data-testid="swipe-number-plus"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="swipe-number-minus"]').exists()).toBe(true)
  })
})
