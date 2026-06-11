import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SteppedSwipeNumberInput from '@/components/SteppedSwipeNumberInput.vue'
import {
  HORIZONTAL_SLOTS,
  createSteppedAxisConfig,
  horizontalSlotToOffset,
  slotLabelAmounts,
  toLogicalHorizontalSlot,
} from '@/lib/stepped-swipe-number-input'

const VERTICAL_HANDLE_RANGE_PX = 24

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

function mockSlideTrackSize(wrapper, width = 200, height = 44, testId = 'stepped-swipe-number') {
  const slide = wrapper.get(`[data-testid="${testId}-slide"]`).element
  slide.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  })
}

function pointerOnHandle(wrapper, type, clientX, clientY = 22, pointerId = 1, testId = 'stepped-swipe-number') {
  const handle = wrapper.get(`[data-testid="${testId}-handle"]`).element
  handle.dispatchEvent(
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

function pointerOnWindow(type, clientX, clientY = 22, pointerId = 1) {
  window.dispatchEvent(
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

function horizontalSlotTargetX(startX, slotCount, direction = 1) {
  const width = 200
  const maxOffset = width / 2 - 28
  const slotWidth = maxOffset / HORIZONTAL_SLOTS
  return startX + direction * slotCount * slotWidth
}

/** Default axis: drag right for increment slots. */
function dragIncrementHorizontalSlots(wrapper, slotCount, testId = 'stepped-swipe-number') {
  const startX = 100
  pointerOnHandle(wrapper, 'pointerdown', startX, 22, 1, testId)
  pointerOnWindow('pointermove', horizontalSlotTargetX(startX, slotCount, 1), 22)
}

/** Default axis: drag left for decrement slots. */
function dragDecrementHorizontalSlots(wrapper, slotCount, testId = 'stepped-swipe-number') {
  const startX = 100
  pointerOnHandle(wrapper, 'pointerdown', startX, 22, 1, testId)
  pointerOnWindow('pointermove', horizontalSlotTargetX(startX, slotCount, -1), 22)
}

function pointerOnMinus(wrapper, type, pointerId = 1, testId = 'stepped-swipe-number') {
  const minus = wrapper.get(`[data-testid="${testId}-minus"]`).element
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

function pointerOnPlus(wrapper, type, pointerId = 1, testId = 'stepped-swipe-number') {
  const plus = wrapper.get(`[data-testid="${testId}-plus"]`).element
  plus.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: 190,
      clientY: 22,
      pointerId,
      pointerType: 'mouse',
    }),
  )
}

async function tapMinus(wrapper, pointerId = 1, testId = 'stepped-swipe-number') {
  pointerOnMinus(wrapper, 'pointerdown', pointerId, testId)
  pointerOnWindow('pointerup', 10, 22, pointerId)
  await flushPromises()
}

async function tapPlus(wrapper, pointerId = 1, testId = 'stepped-swipe-number') {
  pointerOnPlus(wrapper, 'pointerdown', pointerId, testId)
  pointerOnWindow('pointerup', 190, 22, pointerId)
  await flushPromises()
}

function focusHandle(wrapper, testId = 'stepped-swipe-number') {
  wrapper.get(`[data-testid="${testId}-handle"]`).element.focus()
}

async function keyOnHandle(wrapper, key, testId = 'stepped-swipe-number') {
  wrapper.get(`[data-testid="${testId}-handle"]`).element.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  )
  await flushPromises()
}

async function keyOnInput(wrapper, key, options = {}, testId = 'stepped-swipe-number') {
  wrapper.get(`[data-testid="${testId}-input"]`).element.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      shiftKey: options.shiftKey ?? false,
    }),
  )
  await flushPromises()
}

async function keyUpOnWindow(key) {
  window.dispatchEvent(
    new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }),
  )
  await flushPromises()
}

function maxHandleOffsetForTrackWidth(width) {
  return width / 2 - 28
}

describe('SteppedSwipeNumberInput', () => {
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
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 5 },
    })

    expect(wrapper.get('[data-testid="stepped-swipe-number-input"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="stepped-swipe-number-handle"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="stepped-swipe-number-hidden-input"]').element.value).toBe('5')
  })

  it('shows plain plus and minus labels at rest with no vertical labels', () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 5 },
    })

    expect(wrapper.get('[data-testid="stepped-swipe-number-plus"]').text()).toBe('+')
    expect(wrapper.get('[data-testid="stepped-swipe-number-minus"]').text()).toBe('−')
    expect(wrapper.find('[data-testid="stepped-swipe-number-plus-ten"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="stepped-swipe-number-minus-ten"]').exists()).toBe(false)
  })

  it('places plus label on the right when horizontal increment is right (default)', () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 5 },
    })

    const plusClass = wrapper.get('[data-testid="stepped-swipe-number-plus"]').classes()
    const minusClass = wrapper.get('[data-testid="stepped-swipe-number-minus"]').classes()
    expect(plusClass).toContain('left-[calc(50%+2rem)]')
    expect(minusClass).toContain('right-[calc(50%+2rem)]')
  })

  it('places plus label on the left when horizontal increment is left', () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 5, horizontalIncrementDirection: 'left' },
    })

    const plusClass = wrapper.get('[data-testid="stepped-swipe-number-plus"]').classes()
    expect(plusClass).toContain('right-[calc(50%+2rem)]')
  })

  it('places plus-ten overlay on the bottom when vertical increment is down', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 5, verticalIncrementDirection: 'down' },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)

    const startY = 22
    pointerOnHandle(wrapper, 'pointerdown', 100, startY)
    pointerOnWindow('pointermove', 100, startY + VERTICAL_HANDLE_RANGE_PX * 0.5)
    await flushPromises()

    const plusTenClass = wrapper.get('[data-testid="stepped-swipe-number-plus-ten"]').classes()
    expect(plusTenClass).toContain('bottom-0')
    expect(plusTenClass).toContain('translate-y-1/2')
  })

  it('shows dynamic +N on the increment label after dragging right (default increment)', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 0 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)

    dragIncrementHorizontalSlots(wrapper, 3)
    await flushPromises()

    expect(wrapper.get('[data-testid="stepped-swipe-number-plus"]').text()).toBe('+3')
    expect(wrapper.find('[data-testid="stepped-swipe-number-plus-ten"]').exists()).toBe(true)
  })

  it('shows decrement label when dragging left without increment amount', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 10 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)

    dragDecrementHorizontalSlots(wrapper, 3)
    await flushPromises()

    expect(wrapper.get('[data-testid="stepped-swipe-number-plus"]').text()).toBe('+')
    expect(wrapper.get('[data-testid="stepped-swipe-number-minus"]').text()).toBe('−3')
  })

  it('reduces increment label when moving back toward rest origin', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 0 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)

    const startX = 100

    pointerOnHandle(wrapper, 'pointerdown', startX, 22)
    pointerOnWindow('pointermove', horizontalSlotTargetX(startX, 5, 1), 22)
    await flushPromises()
    expect(wrapper.get('[data-testid="stepped-swipe-number-plus"]').text()).toBe('+5')

    pointerOnWindow('pointermove', horizontalSlotTargetX(startX, 2, 1), 22)
    await flushPromises()
    expect(wrapper.get('[data-testid="stepped-swipe-number-plus"]').text()).toBe('+2')
    expect(slotLabelAmounts(-2, 0).hIncrement).toBe(2)
  })

  it('shows dynamic −N on the bottom label after vertical decrement (default up increment)', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 7, min: 0 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)

    const startY = 22
    const downY = startY + VERTICAL_HANDLE_RANGE_PX * 0.5

    pointerOnHandle(wrapper, 'pointerdown', 100, startY)
    pointerOnWindow('pointermove', 100, downY)
    await flushPromises()

    expect(wrapper.get('[data-testid="stepped-swipe-number-minus-ten"]').text()).toBe('−10')
  })

  it('increments when horizontalIncrementDirection is left and handle drags left', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 0, horizontalIncrementDirection: 'left' },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)

    dragDecrementHorizontalSlots(wrapper, 3)
    await flushPromises()

    const updates = wrapper.emitted('update:modelValue') ?? []
    expect(updates.at(-1)?.[0]).toBe(3)
    expect(wrapper.get('[data-testid="stepped-swipe-number-plus"]').text()).toBe('+3')
  })

  it('increments by 10 when verticalIncrementDirection is down and handle drags down', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 5, verticalIncrementDirection: 'down' },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)

    const startY = 22
    const downY = startY + VERTICAL_HANDLE_RANGE_PX * 0.5

    pointerOnHandle(wrapper, 'pointerdown', 100, startY)
    pointerOnWindow('pointermove', 100, downY)
    await flushPromises()

    const updates = wrapper.emitted('update:modelValue') ?? []
    expect(updates.at(-1)?.[0]).toBe(15)
    expect(wrapper.get('[data-testid="stepped-swipe-number-plus-ten"]').text()).toBe('+10')
  })

  it('resets labels to plain plus and minus after release and snap', async () => {
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

    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 0 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)

    dragIncrementHorizontalSlots(wrapper, 2)
    pointerOnHandle(wrapper, 'pointerup', horizontalSlotTargetX(100, 2, 1), 22)
    await flushPromises()

    expect(wrapper.get('[data-testid="stepped-swipe-number-plus"]').text()).toBe('+')
    expect(wrapper.get('[data-testid="stepped-swipe-number-minus"]').text()).toBe('−')
    expect(wrapper.find('[data-testid="stepped-swipe-number-plus-ten"]').exists()).toBe(false)
  })

  it('increments the left label number during hold-at-extreme repeat', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 0, max: 20 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)

    const rightX = horizontalSlotTargetX(100, HORIZONTAL_SLOTS, 1)

    pointerOnHandle(wrapper, 'pointerdown', 100, 22)
    pointerOnWindow('pointermove', rightX, 22)
    await flushPromises()

    const labelBeforeHold = wrapper.get('[data-testid="stepped-swipe-number-plus"]').text()

    await vi.advanceTimersByTimeAsync(1000)
    for (let i = 0; i < 8; i += 1) {
      vi.spyOn(performance, 'now').mockReturnValue(2000 + i * 50)
      await vi.runOnlyPendingTimersAsync()
      await flushPromises()
    }

    const labelAfterHold = wrapper.get('[data-testid="stepped-swipe-number-plus"]').text()
    const beforeNum = Number.parseInt(labelBeforeHold.slice(1), 10)
    const afterNum = Number.parseInt(labelAfterHold.slice(1), 10)
    expect(afterNum).toBeGreaterThan(beforeNum)

    pointerOnWindow('pointerup', rightX, 22)
    await flushPromises()
  })

  it('drag through N horizontal slots increments by N when dragging right', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 0 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)

    dragIncrementHorizontalSlots(wrapper, 3)
    await flushPromises()

    const updates = wrapper.emitted('update:modelValue') ?? []
    expect(updates.at(-1)?.[0]).toBe(3)

    pointerOnHandle(wrapper, 'pointerup', horizontalSlotTargetX(100, 3, 1), 22)
    await flushPromises()
  })

  it('drag up one vertical slot adds 10 with default axis', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 5 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)

    const startY = 22
    const upY = startY - VERTICAL_HANDLE_RANGE_PX * 0.5

    pointerOnHandle(wrapper, 'pointerdown', 100, startY)
    pointerOnWindow('pointermove', 100, upY)
    await flushPromises()

    const updates = wrapper.emitted('update:modelValue') ?? []
    expect(updates.at(-1)?.[0]).toBe(15)

    pointerOnHandle(wrapper, 'pointerup', 100, upY)
    await flushPromises()
  })

  it('decrement 10 from 7 with min 0 sets value to 0', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 7, min: 0 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)

    const startY = 22
    const downY = startY + VERTICAL_HANDLE_RANGE_PX * 0.5

    pointerOnHandle(wrapper, 'pointerdown', 100, startY)
    pointerOnWindow('pointermove', 100, downY)
    await flushPromises()

    const updates = wrapper.emitted('update:modelValue') ?? []
    expect(updates.at(-1)?.[0]).toBe(0)

    pointerOnHandle(wrapper, 'pointerup', 100, downY)
    await flushPromises()
  })

  it('hold at max increment extreme repeats after 1s', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 0, max: 5 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)

    const rightX = horizontalSlotTargetX(100, HORIZONTAL_SLOTS, 1)

    pointerOnHandle(wrapper, 'pointerdown', 100, 22)
    pointerOnWindow('pointermove', rightX, 22)
    await flushPromises()

    await vi.advanceTimersByTimeAsync(1000)
    for (let i = 0; i < 5; i += 1) {
      vi.spyOn(performance, 'now').mockReturnValue(2000 + i * 50)
      await vi.runOnlyPendingTimersAsync()
      await flushPromises()
    }

    const updates = wrapper.emitted('update:modelValue') ?? []
    const last = updates.at(-1)?.[0] ?? 0
    expect(last).toBeGreaterThan(0)
    expect(last).toBeLessThanOrEqual(5)

    pointerOnWindow('pointerup', rightX, 22)
    await flushPromises()
  })

  it('maps physical right slot to logical increment with default axis', () => {
    const axis = createSteppedAxisConfig({ horizontalIncrement: 'right' })
    expect(toLogicalHorizontalSlot(3, axis)).toBe(-3)
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

    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 1 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)

    dragIncrementHorizontalSlots(wrapper, 2)
    pointerOnHandle(wrapper, 'pointerup', horizontalSlotTargetX(100, 2, 1), 22)
    await flushPromises()

    const handle = wrapper.get('[data-testid="stepped-swipe-number-handle"]')
    expect(handle.attributes('style') ?? '').toMatch(
      /translate\(calc\(-50% \+ 0px\), calc\(-50% \+ 0px\)\)/,
    )
  })

  it('tapping plus increments by 1', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 5 },
    })

    await tapPlus(wrapper)

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([6])
    expect(wrapper.get('[data-testid="stepped-swipe-number-input"]').element.value).toBe('6')
  })

  it('tapping minus decrements by 1', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 5, min: 0 },
    })

    await tapMinus(wrapper)

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([4])
    expect(wrapper.get('[data-testid="stepped-swipe-number-input"]').element.value).toBe('4')
  })

  it('holding minus for 1 second sets the value to the floor', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 42, min: 0 },
    })

    pointerOnMinus(wrapper, 'pointerdown')
    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([0])
    expect(wrapper.get('[data-testid="stepped-swipe-number-input"]').element.value).toBe('0')

    pointerOnWindow('pointerup', 10, 22)
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([0])
  })

  it('releasing minus before 1 second decrements once, not to floor', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 42, min: 0 },
    })

    pointerOnMinus(wrapper, 'pointerdown')
    await vi.advanceTimersByTimeAsync(500)
    pointerOnWindow('pointerup', 10, 22)
    await flushPromises()

    const updates = wrapper.emitted('update:modelValue') ?? []
    expect(updates.some(([value]) => value === 0)).toBe(false)
    expect(wrapper.get('[data-testid="stepped-swipe-number-input"]').element.value).toBe('41')
  })

  it('holding plus for 1 second sets the value to max', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 3, max: 10 },
    })

    pointerOnPlus(wrapper, 'pointerdown')
    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([10])
    expect(wrapper.get('[data-testid="stepped-swipe-number-input"]').element.value).toBe('10')

    pointerOnWindow('pointerup', 190, 22)
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([10])
  })

  it('releasing plus before 1 second increments once, not to ceiling', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 3, max: 10 },
    })

    pointerOnPlus(wrapper, 'pointerdown')
    await vi.advanceTimersByTimeAsync(500)
    pointerOnWindow('pointerup', 190, 22)
    await flushPromises()

    const updates = wrapper.emitted('update:modelValue') ?? []
    expect(updates.some(([value]) => value === 10)).toBe(false)
    expect(wrapper.get('[data-testid="stepped-swipe-number-input"]').element.value).toBe('4')
  })

  it('holding plus for 1 second without max only increments on release', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 3 },
    })

    pointerOnPlus(wrapper, 'pointerdown')
    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    pointerOnWindow('pointerup', 190, 22)
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([4])
    expect(wrapper.get('[data-testid="stepped-swipe-number-input"]').element.value).toBe('4')
  })

  it('moves handle right with ArrowRight and increments value by slot count', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 0 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)
    focusHandle(wrapper)

    await keyOnHandle(wrapper, 'ArrowRight')
    await keyOnHandle(wrapper, 'ArrowRight')
    await keyOnHandle(wrapper, 'ArrowRight')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([3])
    expect(wrapper.get('[data-testid="stepped-swipe-number-plus"]').text()).toBe('+3')
  })

  it('reduces increment label when handle moves left after right nudges', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 0 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)
    focusHandle(wrapper)

    await keyOnHandle(wrapper, 'ArrowRight')
    await keyOnHandle(wrapper, 'ArrowRight')
    await keyOnHandle(wrapper, 'ArrowRight')
    expect(wrapper.get('[data-testid="stepped-swipe-number-plus"]').text()).toBe('+3')

    await keyOnHandle(wrapper, 'ArrowLeft')
    expect(wrapper.get('[data-testid="stepped-swipe-number-plus"]').text()).toBe('+2')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([2])
  })

  it('moves handle up with w and applies vertical increment', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 5, min: 0 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)
    focusHandle(wrapper)

    await keyOnHandle(wrapper, 'w')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([15])
    expect(wrapper.get('[data-testid="stepped-swipe-number-plus-ten"]').text()).toBe('+10')
  })

  it('moves handle right with d like ArrowRight', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 0 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)
    focusHandle(wrapper)

    await keyOnHandle(wrapper, 'd')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([1])
    expect(wrapper.get('[data-testid="stepped-swipe-number-plus"]').text()).toBe('+1')
  })

  it('Escape snaps handle back to rest after keyboard nudge', async () => {
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

    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 0 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)
    focusHandle(wrapper)

    await keyOnHandle(wrapper, 'ArrowRight')
    await keyOnHandle(wrapper, 'Escape')

    const handle = wrapper.get('[data-testid="stepped-swipe-number-handle"]')
    expect(handle.attributes('style') ?? '').toMatch(
      /translate\(calc\(-50% \+ 0px\), calc\(-50% \+ 0px\)\)/,
    )
  })

  it('input ArrowUp still increments value when input is focused', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 5 },
    })

    wrapper.get('[data-testid="stepped-swipe-number-input"]').element.focus()
    await keyOnInput(wrapper, 'ArrowUp')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([6])
    expect(wrapper.get('[data-testid="stepped-swipe-number-input"]').element.value).toBe('6')
  })

  it('Space resets handle position visually without changing value', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 0 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)
    focusHandle(wrapper)

    await keyOnHandle(wrapper, 'ArrowRight')
    await keyOnHandle(wrapper, 'ArrowRight')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([2])

    await keyOnHandle(wrapper, ' ')

    const handle = wrapper.get('[data-testid="stepped-swipe-number-handle"]')
    expect(handle.attributes('style') ?? '').toMatch(
      /translate\(calc\(-50% \+ 0px\), calc\(-50% \+ 0px\)\)/,
    )
    expect(wrapper.get('[data-testid="stepped-swipe-number-plus"]').text()).toBe('+')
    expect(wrapper.get('[data-testid="stepped-swipe-number-input"]').element.value).toBe('2')
  })

  it('keyup away from slot extreme keeps handle displaced', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 0 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)
    focusHandle(wrapper)

    await keyOnHandle(wrapper, 'ArrowRight')
    await keyOnHandle(wrapper, 'ArrowRight')
    await keyUpOnWindow('ArrowRight')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([2])
    expect(wrapper.get('[data-testid="stepped-swipe-number-plus"]').text()).toBe('+2')
    const trackWidth = 200
    const expectedOffset = horizontalSlotToOffset(2, maxHandleOffsetForTrackWidth(trackWidth))
    const handle = wrapper.get('[data-testid="stepped-swipe-number-handle"]')
    expect(handle.attributes('style') ?? '').toContain(`+ ${expectedOffset}px`)
  })

  it('keyup at horizontal slot extreme snaps one slot inward', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 0 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)
    focusHandle(wrapper)

    for (let i = 0; i < HORIZONTAL_SLOTS; i += 1) {
      await keyOnHandle(wrapper, 'ArrowRight')
    }
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([HORIZONTAL_SLOTS])

    await keyUpOnWindow('ArrowRight')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([HORIZONTAL_SLOTS - 1])
    expect(wrapper.get('[data-testid="stepped-swipe-number-plus"]').text()).toBe(
      `+${HORIZONTAL_SLOTS - 1}`,
    )
  })

  it('holds horizontal slot extreme until key is released', async () => {
    const trackWidth = 200
    const maxOffset = maxHandleOffsetForTrackWidth(trackWidth)
    const extremeOffset = horizontalSlotToOffset(HORIZONTAL_SLOTS, maxOffset)

    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 0 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper, trackWidth)
    focusHandle(wrapper)

    for (let i = 0; i < HORIZONTAL_SLOTS; i += 1) {
      await keyOnHandle(wrapper, 'ArrowRight')
    }

    const handle = wrapper.get('[data-testid="stepped-swipe-number-handle"]')
    expect(handle.attributes('style') ?? '').toContain(`+ ${extremeOffset}px`)

    await keyUpOnWindow('ArrowRight')

    const inwardOffset = horizontalSlotToOffset(HORIZONTAL_SLOTS - 1, maxOffset)
    expect(handle.attributes('style') ?? '').toContain(`+ ${inwardOffset}px`)
  })

  it('keyup at vertical slot extreme snaps one slot inward', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 5, min: 0 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)
    focusHandle(wrapper)

    await keyOnHandle(wrapper, 'w')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([15])
    expect(wrapper.find('[data-testid="stepped-swipe-number-plus-ten"]').exists()).toBe(true)

    await keyUpOnWindow('w')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([15])
    expect(wrapper.get('[data-testid="stepped-swipe-number-input"]').element.value).toBe('5')
    expect(wrapper.find('[data-testid="stepped-swipe-number-plus-ten"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="stepped-swipe-number-plus"]').text()).toBe('+')
  })

  it('keyup below horizontal slot extreme does not snap when value is capped', async () => {
    const wrapper = mount(SteppedSwipeNumberInput, {
      props: { name: 'qty', modelValue: 0, max: 5 },
      attachTo: document.body,
    })
    mockSlideTrackSize(wrapper)
    focusHandle(wrapper)

    for (let i = 0; i < 5; i += 1) {
      await keyOnHandle(wrapper, 'ArrowRight')
    }
    await keyUpOnWindow('ArrowRight')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([5])
    expect(wrapper.get('[data-testid="stepped-swipe-number-plus"]').text()).toBe('+5')
  })
})
