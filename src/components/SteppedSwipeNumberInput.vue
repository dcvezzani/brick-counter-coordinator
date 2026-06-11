<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
} from 'vue'
import { GripVertical } from '@lucide/vue'
import { useNumericField } from '@/composables/useNumericField'
import { clampValue, parseNumericValue } from '@/lib/numeric-field'
import {
  numericInputFieldClass,
  numericInputWrapperClass,
  numericStepButtonClass,
  steppedHandleButtonClass,
} from '@/lib/numeric-field-ui'
import {
  HORIZONTAL_SLOTS,
  HOLD_REPEAT_MS,
  HOLD_REPEAT_RATE,
  applySteppedDelta,
  createSteppedAxisConfig,
  extremeRepeatDelta,
  horizontalSlotToOffset,
  isExtremeSlot,
  offsetToHorizontalSlot,
  offsetToVerticalSlot,
  slotDelta,
  slotLabelAmounts,
  toLogicalHorizontalSlot,
  toLogicalVerticalSlot,
  verticalSlotToOffset,
} from '@/lib/stepped-swipe-number-input'
import { cn } from '@/lib/utils'

const SNAP_MS = 220
/** Vertical drag range (handle protrudes above/below the 44px track). */
const VERTICAL_HANDLE_RANGE_PX = 24

const props = defineProps({
  modelValue: { type: Number, default: null },
  name: { type: String, required: true },
  allowNegative: { type: Boolean, default: false },
  min: { type: Number, default: undefined },
  max: { type: Number, default: undefined },
  disabled: { type: Boolean, default: false },
  testId: { type: String, default: 'stepped-swipe-number' },
  /** Slide handle right (default) or left to apply +1 slots. */
  horizontalIncrementDirection: {
    type: String,
    default: 'right',
    validator: (value) => value === 'right' || value === 'left',
  },
  /** Slide handle up (default) or down to apply +10. */
  verticalIncrementDirection: {
    type: String,
    default: 'up',
    validator: (value) => value === 'up' || value === 'down',
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const handleRef = useTemplateRef('handleRef')
const slideTrackRef = useTemplateRef('slideTrackRef')

const dragging = ref(false)
const keyboardEngaged = ref(false)
const snapping = ref(false)
const handleOffsetXPx = ref(0)
const handleOffsetYPx = ref(0)
const slideTrackWidthPx = ref(0)
const currentHSlot = ref(0)
const currentVSlot = ref(0)
const holdRepeatHIncrementBonus = ref(0)
const holdRepeatHDecrementBonus = ref(0)
const holdRepeatVIncrementBonus = ref(0)
const holdRepeatVDecrementBonus = ref(0)
const prefersReducedMotion = ref(false)

let activePointerId = null
let dragStartClientX = 0
let dragStartClientY = 0
let dragValue = 0
let lastHSlot = 0
let lastVSlot = 0
let snapRafId = null
let snapStartTime = 0
let snapFromX = 0
let snapFromY = 0
let resizeObserver = null
let reducedMotionQuery = null
let holdTimerId = null
let holdRepeatRafId = null
let holdRepeatLastTime = 0
let holdRepeatAccumulator = 0
let minusLabelHoldTimerId = null
let minusLabelHoldPointerId = null
let minusLabelBoundFired = false
let plusLabelHoldTimerId = null
let plusLabelHoldPointerId = null
let plusLabelBoundFired = false
/** @type {Set<string>} */
const pressedKeyboardKeys = new Set()
let windowKeyUpAttached = false

const {
  inputText,
  effectiveMin,
  clampOptions,
  numericValue,
  formatDisplayValue,
  commitValue,
  onInputFocus,
  onInputBlur,
  onInputInput,
  stepBy,
} = useNumericField(props, emit, {
  isLocked: () => dragging.value || keyboardEngaged.value,
})

const displayValueForHidden = computed(() => {
  if (props.modelValue != null) return String(props.modelValue)
  return ''
})

const maxHandleOffsetXPx = computed(() =>
  Math.max(0, slideTrackWidthPx.value / 2 - 28),
)

const maxHandleOffsetYPx = computed(() => VERTICAL_HANDLE_RANGE_PX)

const handleStyle = computed(() => ({
  transform: `translate(calc(-50% + ${handleOffsetXPx.value}px), calc(-50% + ${handleOffsetYPx.value}px))`,
}))

const handleAriaNow = computed(() =>
  props.modelValue != null ? props.modelValue : numericValue.value,
)

const axisConfig = computed(() =>
  createSteppedAxisConfig({
    horizontalIncrement:
      /** @type {import('@/lib/stepped-swipe-number-input').HorizontalIncrementDirection} */ (
        props.horizontalIncrementDirection
      ),
    verticalIncrement:
      /** @type {import('@/lib/stepped-swipe-number-input').VerticalIncrementDirection} */ (
        props.verticalIncrementDirection
      ),
  }),
)

const handleAriaLabel = computed(() => {
  const hInc = props.horizontalIncrementDirection
  const vInc = props.verticalIncrementDirection
  const hDec = hInc === 'right' ? 'left' : 'right'
  const vDec = vInc === 'up' ? 'down' : 'up'
  return `Drag ${hInc} or ${vInc} to increase, ${hDec} or ${vDec} to decrease. Use arrow keys or WASD when focused. Space resets handle position.`
})

const hasFiniteFloor = computed(
  () => effectiveMin.value !== Number.NEGATIVE_INFINITY,
)

const plusAriaLabel = computed(() =>
  props.max != null
    ? 'Increase by 1. Hold to set to maximum.'
    : 'Increase by 1',
)

const minusAriaLabel = computed(() =>
  hasFiniteFloor.value
    ? 'Decrease by 1. Hold to set to minimum.'
    : 'Decrease by 1',
)

const isDisplaced = computed(
  () =>
    dragging.value ||
    snapping.value ||
    handleOffsetXPx.value !== 0 ||
    handleOffsetYPx.value !== 0 ||
    currentHSlot.value !== 0 ||
    currentVSlot.value !== 0,
)

const positionAmounts = computed(() =>
  slotLabelAmounts(currentHSlot.value, currentVSlot.value),
)

const incrementHorizontalLabel = computed(() => {
  if (!isDisplaced.value) return '+'
  const amount = positionAmounts.value.hIncrement + holdRepeatHIncrementBonus.value
  return amount > 0 ? `+${amount}` : '+'
})

const decrementHorizontalLabel = computed(() => {
  if (!isDisplaced.value) return '−'
  const amount = positionAmounts.value.hDecrement + holdRepeatHDecrementBonus.value
  return amount > 0 ? `−${amount}` : '−'
})

const incrementVerticalLabel = computed(() => {
  const amount = positionAmounts.value.vIncrement + holdRepeatVIncrementBonus.value
  return amount > 0 ? `+${amount}` : '+'
})

const decrementVerticalLabel = computed(() => {
  const amount = positionAmounts.value.vDecrement + holdRepeatVDecrementBonus.value
  return amount > 0 ? `−${amount}` : '−'
})

const incrementHorizontalOnRight = computed(
  () => props.horizontalIncrementDirection === 'right',
)

const incrementVerticalOnBottom = computed(
  () => props.verticalIncrementDirection === 'down',
)

const hSideNearCenterClass =
  'absolute top-1/2 h-11 min-w-8 -translate-y-1/2 px-1'

const hIncrementClass = computed(() =>
  cn(
    hSideNearCenterClass,
    incrementHorizontalOnRight.value
      ? 'left-[calc(50%+2rem)]'
      : 'right-[calc(50%+2rem)]',
  ),
)

const hDecrementClass = computed(() =>
  cn(
    hSideNearCenterClass,
    incrementHorizontalOnRight.value
      ? 'right-[calc(50%+2rem)]'
      : 'left-[calc(50%+2rem)]',
  ),
)

const vOverlayBaseClass =
  'pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 bg-background px-1 text-xs leading-none shadow-xs'

const vIncrementOverlayClass = computed(() =>
  cn(
    vOverlayBaseClass,
    incrementVerticalOnBottom.value
      ? 'bottom-0 translate-y-1/2'
      : 'top-0 -translate-y-1/2',
  ),
)

const vDecrementOverlayClass = computed(() =>
  cn(
    vOverlayBaseClass,
    incrementVerticalOnBottom.value
      ? 'top-0 -translate-y-1/2'
      : 'bottom-0 translate-y-1/2',
  ),
)

const stepButtonClass = cn(numericStepButtonClass, 'text-sm')

function resetHoldBonuses() {
  holdRepeatHIncrementBonus.value = 0
  holdRepeatHDecrementBonus.value = 0
  holdRepeatVIncrementBonus.value = 0
  holdRepeatVDecrementBonus.value = 0
}

function accumulateHoldBonus({ delta1, delta10 }) {
  if (delta1 > 0) holdRepeatHIncrementBonus.value += delta1
  else if (delta1 < 0) holdRepeatHDecrementBonus.value += Math.abs(delta1)

  if (delta10 > 0) holdRepeatVIncrementBonus.value += delta10
  else if (delta10 < 0) holdRepeatVDecrementBonus.value += Math.abs(delta10)
}

function updateSlideTrackSize() {
  const track = slideTrackRef.value
  if (!track) return
  const rect = track.getBoundingClientRect()
  slideTrackWidthPx.value = rect.width
}

function clampHandleOffsetX(offset) {
  const max = maxHandleOffsetXPx.value
  return Math.max(-max, Math.min(offset, max))
}

function clampHandleOffsetY(offset) {
  const max = maxHandleOffsetYPx.value
  return Math.max(-max, Math.min(offset, max))
}

function readSlotsFromOffsets() {
  const physicalH = offsetToHorizontalSlot(handleOffsetXPx.value, maxHandleOffsetXPx.value)
  const physicalV = offsetToVerticalSlot(handleOffsetYPx.value, maxHandleOffsetYPx.value)
  const h = toLogicalHorizontalSlot(physicalH, axisConfig.value)
  const v = toLogicalVerticalSlot(physicalV, axisConfig.value)
  currentHSlot.value = h
  currentVSlot.value = v
  return { h, v }
}

function applySlotTransition(nextH, nextV) {
  const delta = slotDelta(lastHSlot, lastVSlot, nextH, nextV)
  if (delta.delta1 === 0 && delta.delta10 === 0) return

  dragValue = applySteppedDelta(dragValue, delta, clampOptions.value)
  inputText.value = formatDisplayValue(dragValue)
  commitValue(dragValue, { emitChange: false })
  lastHSlot = nextH
  lastVSlot = nextV
}

function cancelHoldRepeat() {
  if (holdTimerId != null) {
    clearTimeout(holdTimerId)
    holdTimerId = null
  }
  if (holdRepeatRafId != null) {
    cancelAnimationFrame(holdRepeatRafId)
    holdRepeatRafId = null
  }
  holdRepeatLastTime = 0
  holdRepeatAccumulator = 0
}

function tickHoldRepeat(timestamp) {
  if (!dragging.value && !keyboardEngaged.value) {
    cancelHoldRepeat()
    return
  }

  const { h, v } = readSlotsFromOffsets()
  if (!isExtremeSlot(h, v)) {
    cancelHoldRepeat()
    scheduleHoldRepeat()
    return
  }

  if (!holdRepeatLastTime) {
    holdRepeatLastTime = timestamp
  }

  const deltaSeconds = Math.min(0.05, (timestamp - holdRepeatLastTime) / 1000)
  holdRepeatLastTime = timestamp
  holdRepeatAccumulator += HOLD_REPEAT_RATE * deltaSeconds

  const steps = Math.floor(holdRepeatAccumulator)
  holdRepeatAccumulator -= steps

  if (steps > 0) {
    const repeatDelta = extremeRepeatDelta(h, v)
    for (let i = 0; i < steps; i += 1) {
      const next = applySteppedDelta(dragValue, repeatDelta, clampOptions.value)
      if (next === dragValue) break
      accumulateHoldBonus(repeatDelta)
      dragValue = next
    }
    inputText.value = formatDisplayValue(dragValue)
    commitValue(dragValue, { emitChange: false })
  }

  holdRepeatRafId = requestAnimationFrame(tickHoldRepeat)
}

function scheduleHoldRepeat() {
  cancelHoldRepeat()
  const { h, v } = readSlotsFromOffsets()
  if (!isExtremeSlot(h, v)) return

  holdTimerId = setTimeout(() => {
    holdTimerId = null
    holdRepeatLastTime = 0
    holdRepeatAccumulator = 0
    holdRepeatRafId = requestAnimationFrame(tickHoldRepeat)
  }, HOLD_REPEAT_MS)
}

function onSlotsChanged() {
  const { h, v } = readSlotsFromOffsets()
  if (!isExtremeSlot(h, v)) {
    resetHoldBonuses()
  }
  if (h !== lastHSlot || v !== lastVSlot) {
    applySlotTransition(h, v)
  }
  cancelHoldRepeat()
  scheduleHoldRepeat()
}

function onInputKeydown(event) {
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    stepBy(event.shiftKey ? 10 : 1)
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    stepBy(event.shiftKey ? -10 : -1)
  }
}

function seedDragValueFromInput() {
  const base =
    parseNumericValue(inputText.value, { emptyAsZero: true }) ??
    props.modelValue ??
    0
  dragValue = clampValue(base, clampOptions.value)
  inputText.value = formatDisplayValue(dragValue)
}

function beginKeyboardControl() {
  if (keyboardEngaged.value) return
  cancelSnapAnimation()
  cancelHoldRepeat()
  resetHoldBonuses()
  updateSlideTrackSize()
  keyboardEngaged.value = true
  handleOffsetXPx.value = 0
  handleOffsetYPx.value = 0
  lastHSlot = 0
  lastVSlot = 0
  currentHSlot.value = 0
  currentVSlot.value = 0
  seedDragValueFromInput()
}

function finishKeyboardControl() {
  if (!keyboardEngaged.value) return
  clearPressedKeyboardKeys()
  keyboardEngaged.value = false
  cancelHoldRepeat()
  commitValue(dragValue)
  animateHandleHome()
}

function detachWindowKeyUpListener() {
  if (!windowKeyUpAttached) return
  window.removeEventListener('keyup', onWindowKeyUp)
  windowKeyUpAttached = false
}

function attachWindowKeyUpListener() {
  if (windowKeyUpAttached) return
  window.addEventListener('keyup', onWindowKeyUp)
  windowKeyUpAttached = true
}

function clearPressedKeyboardKeys() {
  pressedKeyboardKeys.clear()
  detachWindowKeyUpListener()
}

function readPhysicalSlots() {
  return {
    h: offsetToHorizontalSlot(handleOffsetXPx.value, maxHandleOffsetXPx.value),
    v: offsetToVerticalSlot(handleOffsetYPx.value, maxHandleOffsetYPx.value),
  }
}

function isAtSlotExtremeForNudge(dH, dV) {
  const { h, v } = readPhysicalSlots()
  if (dH > 0 && h === HORIZONTAL_SLOTS) return true
  if (dH < 0 && h === -HORIZONTAL_SLOTS) return true
  if (dV < 0 && v === -1) return true
  if (dV > 0 && v === 1) return true
  return false
}

function resetKeyboardVisualOrigin() {
  if (!keyboardEngaged.value) {
    beginKeyboardControl()
  }
  cancelSnapAnimation()
  cancelHoldRepeat()
  resetHoldBonuses()
  handleOffsetXPx.value = 0
  handleOffsetYPx.value = 0
  lastHSlot = 0
  lastVSlot = 0
  currentHSlot.value = 0
  currentVSlot.value = 0
}

function snapKeyboardOneSlotInward(dH, dV) {
  if (dH !== 0) {
    const curPhysicalH = readPhysicalSlots().h
    const nextPhysicalH = curPhysicalH - Math.sign(dH)
    handleOffsetXPx.value = horizontalSlotToOffset(
      nextPhysicalH,
      maxHandleOffsetXPx.value,
    )
  }
  if (dV !== 0) {
    const curPhysicalV = readPhysicalSlots().v
    const nextPhysicalV = curPhysicalV - Math.sign(dV)
    handleOffsetYPx.value = verticalSlotToOffset(
      /** @type {-1 | 0 | 1} */ (nextPhysicalV),
      maxHandleOffsetYPx.value,
    )
  }
  onSlotsChanged()
}

function nudgeHandleByPhysicalSlots(dH, dV) {
  beginKeyboardControl()
  const curPhysicalH = offsetToHorizontalSlot(
    handleOffsetXPx.value,
    maxHandleOffsetXPx.value,
  )
  const curPhysicalV = offsetToVerticalSlot(
    handleOffsetYPx.value,
    maxHandleOffsetYPx.value,
  )
  const nextPhysicalH = Math.max(
    -HORIZONTAL_SLOTS,
    Math.min(HORIZONTAL_SLOTS, curPhysicalH + dH),
  )
  const nextPhysicalV = Math.max(-1, Math.min(1, curPhysicalV + dV))
  handleOffsetXPx.value = horizontalSlotToOffset(
    nextPhysicalH,
    maxHandleOffsetXPx.value,
  )
  handleOffsetYPx.value = verticalSlotToOffset(
    /** @type {-1 | 0 | 1} */ (nextPhysicalV),
    maxHandleOffsetYPx.value,
  )
  onSlotsChanged()
}

/**
 * @param {string} key
 * @returns {string}
 */
function normalizeKeyboardKey(key) {
  return key.length === 1 ? key.toLowerCase() : key
}

/**
 * @param {string} key
 * @returns {{ dH: number, dV: number } | null}
 */
function resolvePhysicalNudgeFromKey(key) {
  const normalized = normalizeKeyboardKey(key)
  switch (normalized) {
    case 'ArrowRight':
    case 'd':
      return { dH: 1, dV: 0 }
    case 'ArrowLeft':
    case 'a':
      return { dH: -1, dV: 0 }
    case 'ArrowUp':
    case 'w':
      return { dH: 0, dV: -1 }
    case 'ArrowDown':
    case 's':
      return { dH: 0, dV: 1 }
    default:
      return null
  }
}

function onWindowKeyUp(event) {
  if (props.disabled || dragging.value) return
  if (event.metaKey || event.ctrlKey || event.altKey) return

  const nudge = resolvePhysicalNudgeFromKey(event.key)
  if (!nudge) return

  const normalizedKey = normalizeKeyboardKey(event.key)
  if (!pressedKeyboardKeys.has(normalizedKey)) return

  pressedKeyboardKeys.delete(normalizedKey)
  if (pressedKeyboardKeys.size === 0) {
    detachWindowKeyUpListener()
  }

  if (isAtSlotExtremeForNudge(nudge.dH, nudge.dV)) {
    snapKeyboardOneSlotInward(nudge.dH, nudge.dV)
    cancelHoldRepeat()
    resetHoldBonuses()
  }
}

function onHandleKeyup(event) {
  onWindowKeyUp(event)
}

function onHandleKeydown(event) {
  if (props.disabled || dragging.value) return
  if (event.metaKey || event.ctrlKey || event.altKey) return

  if (event.key === 'Escape') {
    if (keyboardEngaged.value) {
      event.preventDefault()
      finishKeyboardControl()
    }
    return
  }

  if (event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault()
    resetKeyboardVisualOrigin()
    return
  }

  const nudge = resolvePhysicalNudgeFromKey(event.key)
  if (!nudge) return

  if (event.repeat && isAtSlotExtremeForNudge(nudge.dH, nudge.dV)) {
    event.preventDefault()
    return
  }

  event.preventDefault()
  pressedKeyboardKeys.add(normalizeKeyboardKey(event.key))
  attachWindowKeyUpListener()
  nudgeHandleByPhysicalSlots(nudge.dH, nudge.dV)
}

function detachMinusLabelHoldListeners() {
  window.removeEventListener('pointerup', onMinusLabelPointerEnd)
  window.removeEventListener('pointercancel', onMinusLabelPointerEnd)
}

function cancelMinusLabelHoldTimer() {
  if (minusLabelHoldTimerId != null) {
    clearTimeout(minusLabelHoldTimerId)
    minusLabelHoldTimerId = null
  }
}

function resetMinusLabelHoldState() {
  cancelMinusLabelHoldTimer()
  detachMinusLabelHoldListeners()
  minusLabelHoldPointerId = null
  minusLabelBoundFired = false
}

function commitToFloor() {
  if (props.disabled || dragging.value) return
  if (!hasFiniteFloor.value) return
  commitValue(effectiveMin.value)
}

function onMinusLabelPointerEnd(event) {
  if (minusLabelHoldPointerId == null) return
  if (event != null && event.pointerId !== minusLabelHoldPointerId) return

  const boundFired = minusLabelBoundFired
  resetMinusLabelHoldState()

  if (!boundFired) {
    stepBy(-1)
  }
}

function onMinusLabelPointerDown(event) {
  if (props.disabled || dragging.value) return
  event.preventDefault()

  resetMinusLabelHoldState()
  minusLabelHoldPointerId = event.pointerId
  minusLabelBoundFired = false

  if (hasFiniteFloor.value) {
    minusLabelHoldTimerId = setTimeout(() => {
      minusLabelHoldTimerId = null
      minusLabelBoundFired = true
      commitToFloor()
    }, HOLD_REPEAT_MS)
  }

  window.addEventListener('pointerup', onMinusLabelPointerEnd)
  window.addEventListener('pointercancel', onMinusLabelPointerEnd)
}

function detachPlusLabelHoldListeners() {
  window.removeEventListener('pointerup', onPlusLabelPointerEnd)
  window.removeEventListener('pointercancel', onPlusLabelPointerEnd)
}

function cancelPlusLabelHoldTimer() {
  if (plusLabelHoldTimerId != null) {
    clearTimeout(plusLabelHoldTimerId)
    plusLabelHoldTimerId = null
  }
}

function resetPlusLabelHoldState() {
  cancelPlusLabelHoldTimer()
  detachPlusLabelHoldListeners()
  plusLabelHoldPointerId = null
  plusLabelBoundFired = false
}

function commitToCeiling() {
  if (props.disabled || dragging.value) return
  if (props.max == null) return
  commitValue(props.max)
}

function onPlusLabelPointerEnd(event) {
  if (plusLabelHoldPointerId == null) return
  if (event != null && event.pointerId !== plusLabelHoldPointerId) return

  const boundFired = plusLabelBoundFired
  resetPlusLabelHoldState()

  if (!boundFired) {
    stepBy(1)
  }
}

function onPlusLabelPointerDown(event) {
  if (props.disabled || dragging.value) return
  event.preventDefault()

  resetPlusLabelHoldState()
  plusLabelHoldPointerId = event.pointerId
  plusLabelBoundFired = false

  if (props.max != null) {
    plusLabelHoldTimerId = setTimeout(() => {
      plusLabelHoldTimerId = null
      plusLabelBoundFired = true
      commitToCeiling()
    }, HOLD_REPEAT_MS)
  }

  window.addEventListener('pointerup', onPlusLabelPointerEnd)
  window.addEventListener('pointercancel', onPlusLabelPointerEnd)
}

function resetLabelHoldState() {
  resetMinusLabelHoldState()
  resetPlusLabelHoldState()
}

function cancelSnapAnimation() {
  if (snapRafId != null) {
    cancelAnimationFrame(snapRafId)
    snapRafId = null
  }
  snapping.value = false
}

function finishSnapHome() {
  handleOffsetXPx.value = 0
  handleOffsetYPx.value = 0
  currentHSlot.value = 0
  currentVSlot.value = 0
  snapping.value = false
  resetHoldBonuses()
}

function animateHandleHome() {
  cancelSnapAnimation()

  if (
    prefersReducedMotion.value ||
    (handleOffsetXPx.value === 0 && handleOffsetYPx.value === 0)
  ) {
    finishSnapHome()
    return
  }

  snapping.value = true
  snapFromX = handleOffsetXPx.value
  snapFromY = handleOffsetYPx.value
  snapStartTime = performance.now()

  const step = (now) => {
    const t = Math.min(1, (now - snapStartTime) / SNAP_MS)
    const eased = 1 - (1 - t) ** 3
    handleOffsetXPx.value = snapFromX * (1 - eased)
    handleOffsetYPx.value = snapFromY * (1 - eased)
    readSlotsFromOffsets()

    if (t < 1) {
      snapRafId = requestAnimationFrame(step)
      return
    }

    finishSnapHome()
    snapRafId = null
  }

  snapRafId = requestAnimationFrame(step)
}

function beginHandleDrag(event) {
  if (props.disabled) return
  event.preventDefault()
  clearPressedKeyboardKeys()
  finishKeyboardControl()
  cancelSnapAnimation()
  cancelHoldRepeat()
  resetLabelHoldState()
  resetHoldBonuses()
  updateSlideTrackSize()

  activePointerId = event.pointerId
  dragging.value = true
  dragStartClientX = event.clientX
  dragStartClientY = event.clientY
  handleOffsetXPx.value = 0
  handleOffsetYPx.value = 0
  lastHSlot = 0
  lastVSlot = 0
  currentHSlot.value = 0
  currentVSlot.value = 0
  seedDragValueFromInput()

  if (typeof handleRef.value?.setPointerCapture === 'function') {
    handleRef.value.setPointerCapture(event.pointerId)
  }

  attachWindowPointerListeners()
}

function onHandlePointerMove(event) {
  if (!dragging.value || event.pointerId !== activePointerId) return
  const rawX = event.clientX - dragStartClientX
  const rawY = event.clientY - dragStartClientY
  handleOffsetXPx.value = clampHandleOffsetX(rawX)
  handleOffsetYPx.value = clampHandleOffsetY(rawY)
  onSlotsChanged()
}

function releasePointerCaptureIfNeeded(pointerId) {
  const handle = handleRef.value
  if (
    pointerId != null &&
    handle &&
    typeof handle.hasPointerCapture === 'function' &&
    handle.hasPointerCapture(pointerId)
  ) {
    handle.releasePointerCapture(pointerId)
  }
}

function onWindowPointerMove(event) {
  onHandlePointerMove(event)
}

function onWindowPointerEnd(event) {
  finishHandleDrag(event)
}

function attachWindowPointerListeners() {
  window.addEventListener('pointermove', onWindowPointerMove)
  window.addEventListener('pointerup', onWindowPointerEnd)
  window.addEventListener('pointercancel', onWindowPointerEnd)
}

function detachWindowPointerListeners() {
  window.removeEventListener('pointermove', onWindowPointerMove)
  window.removeEventListener('pointerup', onWindowPointerEnd)
  window.removeEventListener('pointercancel', onWindowPointerEnd)
}

function finishHandleDrag(event) {
  if (!dragging.value) return
  if (event != null && event.pointerId !== activePointerId) return

  const pointerId = activePointerId
  dragging.value = false
  activePointerId = null
  detachWindowPointerListeners()
  releasePointerCaptureIfNeeded(pointerId)
  cancelHoldRepeat()
  commitValue(dragValue)
  animateHandleHome()
}

function onReducedMotionChange(event) {
  prefersReducedMotion.value = event.matches
}

onMounted(() => {
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  prefersReducedMotion.value = reducedMotionQuery.matches
  reducedMotionQuery.addEventListener('change', onReducedMotionChange)

  updateSlideTrackSize()
  if (typeof ResizeObserver !== 'undefined' && slideTrackRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateSlideTrackSize()
    })
    resizeObserver.observe(slideTrackRef.value)
  }
})

onBeforeUnmount(() => {
  detachWindowPointerListeners()
  detachWindowKeyUpListener()
  releasePointerCaptureIfNeeded(activePointerId)
  cancelHoldRepeat()
  finishKeyboardControl()
  resetLabelHoldState()
  cancelSnapAnimation()
  resizeObserver?.disconnect()
  reducedMotionQuery?.removeEventListener('change', onReducedMotionChange)
})
</script>

<template>
  <div
    class="relative w-full overflow-visible"
    :data-testid="testId"
    :data-dragging="dragging ? 'true' : 'false'"
    :data-snapping="snapping ? 'true' : 'false'"
  >
    <input
      type="hidden"
      :name="name"
      :value="displayValueForHidden"
      :disabled="disabled"
      :data-testid="`${testId}-hidden-input`"
    />

    <div
      :class="
        cn(
          'border-input bg-background flex min-h-11 w-full items-stretch overflow-x-clip overflow-y-visible rounded-md border shadow-xs',
          disabled && 'pointer-events-none opacity-50',
        )
      "
      :data-testid="`${testId}-track`"
    >
      <div :class="numericInputWrapperClass">
        <input
          :value="inputText"
          type="text"
          inputmode="numeric"
          pattern="-?[0-9]*"
          :disabled="disabled"
          :data-testid="`${testId}-input`"
          :class="numericInputFieldClass"
          @focus="onInputFocus"
          @blur="onInputBlur"
          @input="onInputInput"
          @keydown="onInputKeydown"
        />
      </div>

      <div
        ref="slideTrackRef"
        class="relative isolate min-h-11 min-w-0 flex-1 touch-none overflow-visible bg-muted/40"
        :data-testid="`${testId}-slide`"
      >
        <div class="relative z-0 mx-auto h-11 w-full max-w-full">
          <button
            type="button"
            tabindex="-1"
            :disabled="disabled"
            :class="cn(stepButtonClass, hIncrementClass)"
            :data-testid="`${testId}-plus`"
            :aria-label="plusAriaLabel"
            @pointerdown="onPlusLabelPointerDown"
          >
            {{ incrementHorizontalLabel }}
          </button>

          <button
            type="button"
            tabindex="-1"
            :disabled="disabled"
            :class="cn(stepButtonClass, hDecrementClass)"
            :data-testid="`${testId}-minus`"
            :aria-label="minusAriaLabel"
            @pointerdown="onMinusLabelPointerDown"
          >
            {{ decrementHorizontalLabel }}
          </button>

          <button
            ref="handleRef"
            type="button"
            :tabindex="disabled ? -1 : 0"
            :data-testid="`${testId}-handle`"
            :disabled="disabled"
            role="slider"
            :aria-valuenow="handleAriaNow"
            :aria-valuemin="effectiveMin === Number.NEGATIVE_INFINITY ? undefined : effectiveMin"
            :aria-valuemax="max"
            :aria-label="handleAriaLabel"
            :aria-disabled="disabled"
            :class="cn(steppedHandleButtonClass, dragging ? 'cursor-grabbing' : 'cursor-grab')"
            :style="handleStyle"
            @pointerdown="beginHandleDrag"
            @pointermove="onHandlePointerMove"
            @pointerup="finishHandleDrag"
            @pointercancel="finishHandleDrag"
            @keydown="onHandleKeydown"
            @keyup="onHandleKeyup"
            @blur="finishKeyboardControl"
          >
            <GripVertical class="size-4 shrink-0" aria-hidden="true" />
          </button>
        </div>

        <button
          v-if="isDisplaced"
          type="button"
          tabindex="-1"
          disabled
          :class="cn(stepButtonClass, vIncrementOverlayClass)"
          :data-testid="`${testId}-plus-ten`"
          aria-hidden="true"
        >
          {{ incrementVerticalLabel }}
        </button>

        <button
          v-if="isDisplaced"
          type="button"
          tabindex="-1"
          disabled
          :class="cn(stepButtonClass, vDecrementOverlayClass)"
          :data-testid="`${testId}-minus-ten`"
          aria-hidden="true"
        >
          {{ decrementVerticalLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
