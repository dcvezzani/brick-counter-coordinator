<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch,
} from 'vue'
import { GripVertical } from '@lucide/vue'
import { cn } from '@/lib/utils'
import {
  accumulateDragSteps,
  applySignedSteps,
  clampValue,
  parseNumericValue,
  signedDisplacementFromCenter,
} from '@/lib/swipe-number-input'

const SNAP_MS = 220
const MINUS_HOLD_CLEAR_MS = 1000

const props = defineProps({
  modelValue: { type: Number, default: null },
  name: { type: String, required: true },
  /** Which side the +/- slide control sits on relative to the number field. */
  handlePosition: {
    type: String,
    default: 'right',
    validator: (value) => value === 'left' || value === 'right',
  },
  allowNegative: { type: Boolean, default: false },
  min: { type: Number, default: undefined },
  max: { type: Number, default: undefined },
  disabled: { type: Boolean, default: false },
  testId: { type: String, default: 'swipe-number' },
})

const emit = defineEmits(['update:modelValue', 'change'])

const inputRef = useTemplateRef('inputRef')
const handleRef = useTemplateRef('handleRef')
const slideTrackRef = useTemplateRef('slideTrackRef')

const inputText = ref('')
const inputFocused = ref(false)
const dragging = ref(false)
const snapping = ref(false)
/** Offset from center of slide track; negative = toward +, positive = toward −. */
const handleOffsetPx = ref(0)
const slideTrackWidthPx = ref(0)
const prefersReducedMotion = ref(false)

let activePointerId = null
let dragStartClientX = 0
let dragValue = 0
let stepAccumulator = 0
let rafId = null
let lastFrameTime = 0
let snapRafId = null
let snapStartTime = 0
let snapFromOffset = 0
let resizeObserver = null
let reducedMotionQuery = null
let minusHoldTimerId = null
let minusHoldPointerId = null
let minusHoldClearFired = false

const effectiveMin = computed(() => {
  if (props.min != null) return props.min
  return props.allowNegative ? Number.NEGATIVE_INFINITY : 0
})

const clampOptions = computed(() => ({
  min: effectiveMin.value,
  max: props.max,
  allowNegative: props.allowNegative,
}))

const numericValue = computed(() => {
  const parsed = parseNumericValue(inputText.value, { emptyAsZero: false })
  if (parsed != null) return clampValue(parsed, clampOptions.value)
  if (props.modelValue != null) return clampValue(props.modelValue, clampOptions.value)
  return 0
})

const displayValueForHidden = computed(() => {
  if (props.modelValue != null) return String(props.modelValue)
  return ''
})

const maxHandleOffsetPx = computed(() =>
  Math.max(0, slideTrackWidthPx.value / 2 - 28),
)

const handleStyle = computed(() => ({
  transform: `translateX(calc(-50% + ${handleOffsetPx.value}px))`,
}))

const handleAriaNow = computed(() =>
  props.modelValue != null ? props.modelValue : numericValue.value,
)

const inputWrapperClass = cn(
  'flex min-h-11 shrink-0 basis-[38%] items-center self-stretch px-3',
)

const inputFieldClass = cn(
  'placeholder:text-muted-foreground w-full border-0 bg-transparent p-0 text-base shadow-none outline-none md:text-sm',
  'focus-visible:ring-0 focus-visible:outline-none',
  'disabled:cursor-not-allowed',
)

const handleButtonClass = cn(
  'bg-background text-muted-foreground border-border absolute top-1/2 left-1/2 z-20 flex h-8 w-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-xs select-none',
  'focus-visible:ring-ring/50 outline-none focus-visible:ring-3',
)

const stepButtonClass = cn(
  'text-muted-foreground hover:text-foreground absolute top-1/2 z-10 flex h-11 min-w-11 -translate-y-1/2 cursor-pointer items-center justify-center px-2 text-sm font-medium select-none',
  'focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-3',
  'disabled:cursor-not-allowed disabled:opacity-50',
)

function formatDisplayValue(value) {
  if (value == null) return ''
  return String(value)
}

function updateSlideTrackWidth() {
  const track = slideTrackRef.value
  if (!track) return
  slideTrackWidthPx.value = track.getBoundingClientRect().width
}

function clampHandleOffset(offset) {
  const max = maxHandleOffsetPx.value
  return Math.max(-max, Math.min(offset, max))
}

function syncInputFromModel() {
  if (inputFocused.value || dragging.value) return
  inputText.value = formatDisplayValue(props.modelValue)
}

function commitValue(nextValue, { emitChange = true } = {}) {
  const clamped = clampValue(nextValue, clampOptions.value)
  if (clamped !== props.modelValue) {
    emit('update:modelValue', clamped)
    if (emitChange) emit('change', clamped)
  } else if (emitChange) {
    emit('change', clamped)
  }
  if (!inputFocused.value) {
    inputText.value = formatDisplayValue(clamped)
  }
  return clamped
}

function onInputFocus() {
  inputFocused.value = true
  if (props.modelValue != null) {
    inputText.value = formatDisplayValue(props.modelValue)
  }
}

function onInputBlur() {
  inputFocused.value = false
  const parsed = parseNumericValue(inputText.value, { emptyAsZero: true })
  const clamped = clampValue(parsed ?? 0, clampOptions.value)
  inputText.value = formatDisplayValue(clamped)
  commitValue(clamped)
}

function onInputInput(event) {
  inputText.value = event.target.value
}

function stepCurrentValue(delta) {
  if (props.disabled || dragging.value) return
  const base =
    parseNumericValue(inputText.value, { emptyAsZero: true }) ??
    props.modelValue ??
    0
  const next = clampValue(base + delta, clampOptions.value)
  inputText.value = formatDisplayValue(next)
  commitValue(next)
}

function resetNumericValueToZero() {
  if (props.disabled || dragging.value) return
  inputText.value = '0'
  commitValue(0)
}

function detachMinusHoldListeners() {
  window.removeEventListener('pointerup', onMinusHoldPointerEnd)
  window.removeEventListener('pointercancel', onMinusHoldPointerEnd)
}

function cancelMinusHoldTimer() {
  if (minusHoldTimerId != null) {
    clearTimeout(minusHoldTimerId)
    minusHoldTimerId = null
  }
}

function resetMinusHoldState() {
  cancelMinusHoldTimer()
  detachMinusHoldListeners()
  minusHoldPointerId = null
  minusHoldClearFired = false
}

function onMinusHoldPointerEnd(event) {
  if (minusHoldPointerId == null) return
  if (event != null && event.pointerId !== minusHoldPointerId) return

  const clearFired = minusHoldClearFired
  resetMinusHoldState()

  if (!clearFired) {
    stepCurrentValue(-1)
  }
}

function onMinusPointerDown(event) {
  if (props.disabled || dragging.value) return
  event.preventDefault()

  resetMinusHoldState()
  minusHoldPointerId = event.pointerId
  minusHoldClearFired = false

  minusHoldTimerId = setTimeout(() => {
    minusHoldTimerId = null
    minusHoldClearFired = true
    resetNumericValueToZero()
  }, MINUS_HOLD_CLEAR_MS)

  window.addEventListener('pointerup', onMinusHoldPointerEnd)
  window.addEventListener('pointercancel', onMinusHoldPointerEnd)
}

function onInputKeydown(event) {
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    stepCurrentValue(event.shiftKey ? 10 : 1)
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    stepCurrentValue(event.shiftKey ? -10 : -1)
  }
}

function stopDragLoop() {
  if (rafId != null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  lastFrameTime = 0
  stepAccumulator = 0
}

function tickDragFrame(timestamp) {
  if (!dragging.value) return

  if (!lastFrameTime) {
    lastFrameTime = timestamp
  }
  const deltaSeconds = Math.min(0.05, (timestamp - lastFrameTime) / 1000)
  lastFrameTime = timestamp

  const logicalDisplacement = signedDisplacementFromCenter(
    handleOffsetPx.value,
    props.handlePosition,
  )
  const { accumulator, steps } = accumulateDragSteps(
    logicalDisplacement,
    deltaSeconds,
    stepAccumulator,
    maxHandleOffsetPx.value,
  )
  stepAccumulator = accumulator

  if (steps > 0) {
    const direction = Math.sign(logicalDisplacement) || 1
    const signedSteps = direction * steps
    dragValue = applySignedSteps(dragValue, signedSteps, clampOptions.value)
    inputText.value = formatDisplayValue(dragValue)
    commitValue(dragValue, { emitChange: false })
  }

  rafId = requestAnimationFrame(tickDragFrame)
}

function cancelSnapAnimation() {
  if (snapRafId != null) {
    cancelAnimationFrame(snapRafId)
    snapRafId = null
  }
  snapping.value = false
}

function animateHandleHome() {
  cancelSnapAnimation()

  if (prefersReducedMotion.value || handleOffsetPx.value === 0) {
    handleOffsetPx.value = 0
    snapping.value = false
    return
  }

  snapping.value = true
  snapFromOffset = handleOffsetPx.value
  snapStartTime = performance.now()

  const step = (now) => {
    const t = Math.min(1, (now - snapStartTime) / SNAP_MS)
    const eased = 1 - (1 - t) ** 3
    handleOffsetPx.value = snapFromOffset * (1 - eased)

    if (t < 1) {
      snapRafId = requestAnimationFrame(step)
      return
    }

    handleOffsetPx.value = 0
    snapping.value = false
    snapRafId = null
  }

  snapRafId = requestAnimationFrame(step)
}

function beginHandleDrag(event) {
  if (props.disabled) return
  event.preventDefault()
  cancelSnapAnimation()
  stopDragLoop()
  updateSlideTrackWidth()

  activePointerId = event.pointerId
  dragging.value = true
  dragStartClientX = event.clientX
  handleOffsetPx.value = 0

  const base =
    parseNumericValue(inputText.value, { emptyAsZero: true }) ??
    props.modelValue ??
    0
  dragValue = clampValue(base, clampOptions.value)
  inputText.value = formatDisplayValue(dragValue)

  if (typeof handleRef.value?.setPointerCapture === 'function') {
    handleRef.value.setPointerCapture(event.pointerId)
  }

  attachWindowPointerListeners()
  rafId = requestAnimationFrame(tickDragFrame)
}

function onHandlePointerMove(event) {
  if (!dragging.value || event.pointerId !== activePointerId) return
  const raw = event.clientX - dragStartClientX
  handleOffsetPx.value = clampHandleOffset(raw)
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
  stopDragLoop()
  commitValue(dragValue)
  animateHandleHome()
}

function onReducedMotionChange(event) {
  prefersReducedMotion.value = event.matches
}

watch(
  () => props.modelValue,
  () => {
    syncInputFromModel()
  },
  { immediate: true },
)

onMounted(() => {
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  prefersReducedMotion.value = reducedMotionQuery.matches
  reducedMotionQuery.addEventListener('change', onReducedMotionChange)

  updateSlideTrackWidth()
  if (typeof ResizeObserver !== 'undefined' && slideTrackRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateSlideTrackWidth()
    })
    resizeObserver.observe(slideTrackRef.value)
  }
})

onBeforeUnmount(() => {
  resetMinusHoldState()
  detachWindowPointerListeners()
  releasePointerCaptureIfNeeded(activePointerId)
  stopDragLoop()
  cancelSnapAnimation()
  resizeObserver?.disconnect()
  reducedMotionQuery?.removeEventListener('change', onReducedMotionChange)
})
</script>

<template>
  <div
    class="relative w-full"
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
          'border-input bg-background flex min-h-11 w-full items-stretch overflow-hidden rounded-md border shadow-xs',
          disabled && 'pointer-events-none opacity-50',
        )
      "
      :data-testid="`${testId}-track`"
    >
      <div
        v-if="handlePosition === 'left'"
        ref="slideTrackRef"
        class="relative min-w-0 flex-1 touch-none bg-muted/40"
        :data-testid="`${testId}-slide`"
      >
        <button
          type="button"
          tabindex="-1"
          :disabled="disabled"
          :class="cn(stepButtonClass, 'left-0.5')"
          :data-testid="`${testId}-minus`"
          aria-label="Decrease by 1. Hold to set to zero."
          @pointerdown="onMinusPointerDown"
        >
          −
        </button>
        <button
          type="button"
          tabindex="-1"
          :disabled="disabled"
          :class="cn(stepButtonClass, 'right-0.5')"
          :data-testid="`${testId}-plus`"
          aria-label="Increase by 1"
          @click="stepCurrentValue(1)"
        >
          +
        </button>
        <button
          ref="handleRef"
          type="button"
          tabindex="-1"
          :data-testid="`${testId}-handle`"
          :disabled="disabled"
          role="slider"
          :aria-valuenow="handleAriaNow"
          :aria-valuemin="effectiveMin === Number.NEGATIVE_INFINITY ? undefined : effectiveMin"
          :aria-valuemax="max"
          aria-label="Drag toward plus to increase or minus to decrease"
          :aria-disabled="disabled"
          :class="cn(handleButtonClass, dragging ? 'cursor-grabbing' : 'cursor-grab')"
          :style="handleStyle"
          @pointerdown="beginHandleDrag"
          @pointermove="onHandlePointerMove"
          @pointerup="finishHandleDrag"
          @pointercancel="finishHandleDrag"
        >
          <GripVertical class="size-4 shrink-0" aria-hidden="true" />
        </button>
      </div>

      <div :class="inputWrapperClass">
        <input
          ref="inputRef"
          :value="inputText"
          type="text"
          inputmode="numeric"
          pattern="[0-9-]*"
          :disabled="disabled"
          :data-testid="`${testId}-input`"
          :class="inputFieldClass"
          @focus="onInputFocus"
          @blur="onInputBlur"
          @input="onInputInput"
          @keydown="onInputKeydown"
        />
      </div>

      <div
        v-if="handlePosition === 'right'"
        ref="slideTrackRef"
        class="relative min-w-0 flex-1 touch-none bg-muted/40"
        :data-testid="`${testId}-slide`"
      >
        <button
          type="button"
          tabindex="-1"
          :disabled="disabled"
          :class="cn(stepButtonClass, 'left-0.5')"
          :data-testid="`${testId}-plus`"
          aria-label="Increase by 1"
          @click="stepCurrentValue(1)"
        >
          +
        </button>
        <button
          type="button"
          tabindex="-1"
          :disabled="disabled"
          :class="cn(stepButtonClass, 'right-0.5')"
          :data-testid="`${testId}-minus`"
          aria-label="Decrease by 1. Hold to set to zero."
          @pointerdown="onMinusPointerDown"
        >
          −
        </button>
        <button
          ref="handleRef"
          type="button"
          tabindex="-1"
          :data-testid="`${testId}-handle`"
          :disabled="disabled"
          role="slider"
          :aria-valuenow="handleAriaNow"
          :aria-valuemin="effectiveMin === Number.NEGATIVE_INFINITY ? undefined : effectiveMin"
          :aria-valuemax="max"
          aria-label="Drag toward plus to increase or minus to decrease"
          :aria-disabled="disabled"
          :class="cn(handleButtonClass, dragging ? 'cursor-grabbing' : 'cursor-grab')"
          :style="handleStyle"
          @pointerdown="beginHandleDrag"
          @pointermove="onHandlePointerMove"
          @pointerup="finishHandleDrag"
          @pointercancel="finishHandleDrag"
        >
          <GripVertical class="size-4 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>
