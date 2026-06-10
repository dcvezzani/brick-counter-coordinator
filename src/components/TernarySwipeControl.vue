<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch,
} from 'vue'
import { cn } from '@/lib/utils'

const SNAP_X = {
  left: 0.25,
  center: 0.5,
  right: 0.75,
}

const ZONE_BOUNDARIES = {
  left: 1 / 3,
  right: 2 / 3,
}

const DEMOTE_THRESHOLD = 0.125
const CENTER_THUMB_WIDTH = 28
const CENTER_THUMB_HEIGHT = 20
const TRANSITION_MS = 220

const props = defineProps({
  modelValue: { type: [String, null], default: '' },
  name: { type: String, required: true },
  option1Value: { type: String, default: 'option1' },
  option2Value: { type: String, default: 'option2' },
  option1Label: { type: String, default: 'Option 1' },
  option2Label: { type: String, default: 'Option 2' },
  neutralValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  testId: { type: String, default: 'ternary-swipe' },
})

const emit = defineEmits(['update:modelValue', 'change'])

const trackRef = useTemplateRef('trackRef')
const insetLayerRef = useTemplateRef('insetLayerRef')
const thumbRef = useTemplateRef('thumbRef')

const committedZone = ref('center')
const dragging = ref(false)
const dragX = ref(null)
const dragStartZone = ref('center')
const animating = ref(false)
const prefersReducedMotion = ref(false)

let activePointerId = null
let resizeObserver = null
let transitionTimer = null
let reducedMotionQuery = null

const committedValue = computed(() => valueFromZone(committedZone.value))

const ariaValueNow = computed(() => {
  if (committedZone.value === 'left') return 1
  if (committedZone.value === 'right') return 2
  return 0
})

const displayX = computed(() => {
  if (dragging.value && dragX.value != null) return dragX.value
  return SNAP_X[committedZone.value]
})

const visualDemoted = computed(() => {
  if (!dragging.value) return committedZone.value === 'center'
  if (dragStartZone.value === 'center') return true
  const x = dragX.value ?? SNAP_X[dragStartZone.value]
  if (dragStartZone.value === 'left') return x > SNAP_X.left + DEMOTE_THRESHOLD
  if (dragStartZone.value === 'right') return x < SNAP_X.right - DEMOTE_THRESHOLD
  return true
})

const thumbSelectedZone = computed(() => {
  if (dragging.value) {
    if (visualDemoted.value) return 'center'
    return dragStartZone.value
  }
  return committedZone.value
})

const isSelectedThumb = computed(
  () => thumbSelectedZone.value === 'left' || thumbSelectedZone.value === 'right',
)

const thumbLabel = computed(() => {
  if (thumbSelectedZone.value === 'left') return props.option1Label
  if (thumbSelectedZone.value === 'right') return props.option2Label
  return ''
})

const thumbClasses = computed(() =>
  cn(
    'absolute z-10 flex items-center justify-center rounded-full border border-foreground font-medium select-none touch-none',
    isSelectedThumb.value ? 'top-0 bottom-0' : 'top-1/2',
    thumbSelectedZone.value === 'left' && 'bg-primary text-primary-foreground text-sm',
    thumbSelectedZone.value === 'right' && 'bg-accent text-accent-foreground text-sm',
    thumbSelectedZone.value === 'center' && 'bg-muted-foreground',
    animating.value &&
      !prefersReducedMotion.value &&
      'transition-[left,right,width,height,top,bottom,background-color,color,border-radius] duration-200 ease-out',
    dragging.value && 'cursor-grabbing',
    !dragging.value && !props.disabled && 'cursor-grab',
    props.disabled && 'cursor-not-allowed opacity-50',
  ),
)

const thumbStyle = computed(() => {
  if (isSelectedThumb.value) {
    if (dragging.value) {
      return {
        left: `${(displayX.value - 0.25) * 100}%`,
        right: 'auto',
        width: '50%',
        top: '0',
        bottom: '0',
        height: 'auto',
        marginTop: '0',
      }
    }

    if (thumbSelectedZone.value === 'left') {
      return {
        left: '0',
        right: 'auto',
        width: '50%',
        top: '0',
        bottom: '0',
        height: 'auto',
        marginTop: '0',
      }
    }

    return {
      left: 'auto',
      right: '0',
      width: '50%',
      top: '0',
      bottom: '0',
      height: 'auto',
      marginTop: '0',
    }
  }

  const widthPct = CENTER_THUMB_WIDTH
  return {
    left: `${(displayX.value - widthPct / 200) * 100}%`,
    right: 'auto',
    width: `${widthPct}%`,
    height: `${CENTER_THUMB_HEIGHT}px`,
    top: '50%',
    bottom: 'auto',
    marginTop: `-${CENTER_THUMB_HEIGHT / 2}px`,
  }
})

function zoneFromValue(value) {
  if (value === props.option1Value) return 'left'
  if (value === props.option2Value) return 'right'
  return 'center'
}

function valueFromZone(zone) {
  if (zone === 'left') return props.option1Value
  if (zone === 'right') return props.option2Value
  return props.neutralValue
}

function zoneFromX(x) {
  if (x < ZONE_BOUNDARIES.left) return 'left'
  if (x > ZONE_BOUNDARIES.right) return 'right'
  return 'center'
}

function pointerXAsFraction(event) {
  const layer = insetLayerRef.value ?? trackRef.value
  if (!layer) return SNAP_X.center
  const rect = layer.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width
  return Math.min(1, Math.max(0, x))
}

function commitZone(zone, { animate = true } = {}) {
  const previous = committedZone.value
  committedZone.value = zone
  const value = valueFromZone(zone)

  if (animate && !prefersReducedMotion.value) {
    animating.value = true
    clearTimeout(transitionTimer)
    transitionTimer = setTimeout(() => {
      animating.value = false
    }, TRANSITION_MS)
  }

  if (value !== props.modelValue) {
    emit('update:modelValue', value)
    emit('change', value)
  } else if (previous !== zone) {
    emit('change', value)
  }
}

function snapToZone(zone) {
  if (props.disabled) return
  commitZone(zone)
}

function onThumbPointerDown(event) {
  if (props.disabled) return
  event.preventDefault()
  activePointerId = event.pointerId
  dragging.value = true
  dragStartZone.value = committedZone.value
  dragX.value = pointerXAsFraction(event)
  animating.value = false
  if (typeof thumbRef.value?.setPointerCapture === 'function') {
    thumbRef.value.setPointerCapture(event.pointerId)
  }
}

function onThumbPointerMove(event) {
  if (!dragging.value || event.pointerId !== activePointerId) return
  dragX.value = pointerXAsFraction(event)
}

function onThumbPointerUp(event) {
  if (!dragging.value || event.pointerId !== activePointerId) return
  finishDrag()
}

function onThumbPointerCancel(event) {
  if (!dragging.value || event.pointerId !== activePointerId) return
  finishDrag()
}

function finishDrag() {
  const x = dragX.value ?? SNAP_X[committedZone.value]
  const zone = zoneFromX(x)
  dragging.value = false
  dragX.value = null
  activePointerId = null
  commitZone(zone)
}

function onTrackPointerDown(event) {
  if (props.disabled || dragging.value) return
  if (event.target.closest('[data-thumb]')) return

  const x = pointerXAsFraction(event)
  const zone = zoneFromX(x)
  snapToZone(zone)
}

function onCenterAnchorClick() {
  snapToZone('center')
}

function onKeydown(event) {
  if (props.disabled) return

  let nextZone = committedZone.value
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    if (committedZone.value === 'right') nextZone = 'center'
    else if (committedZone.value === 'center') nextZone = 'left'
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    if (committedZone.value === 'left') nextZone = 'center'
    else if (committedZone.value === 'center') nextZone = 'right'
  } else if (event.key === 'Home') {
    event.preventDefault()
    nextZone = 'center'
  } else {
    return
  }

  snapToZone(nextZone)
}

watch(
  () => props.modelValue,
  (value) => {
    if (dragging.value) return
    committedZone.value = zoneFromValue(value)
  },
  { immediate: true },
)

function onReducedMotionChange(event) {
  prefersReducedMotion.value = event.matches
}

onMounted(() => {
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  prefersReducedMotion.value = reducedMotionQuery.matches
  reducedMotionQuery.addEventListener('change', onReducedMotionChange)

  const observeTarget = insetLayerRef.value ?? trackRef.value
  if (typeof ResizeObserver !== 'undefined' && observeTarget) {
    resizeObserver = new ResizeObserver(() => {
      // Layout uses percentages; observer keeps ref fresh for pointer math.
    })
    resizeObserver.observe(observeTarget)
  }
})

onBeforeUnmount(() => {
  clearTimeout(transitionTimer)
  reducedMotionQuery?.removeEventListener('change', onReducedMotionChange)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="relative w-full" :data-testid="testId">
    <input
      type="hidden"
      :name="name"
      :value="committedValue"
      :disabled="disabled"
      :data-testid="`${testId}-hidden-input`"
    />

    <div
      ref="trackRef"
      role="slider"
      :aria-valuemin="0"
      :aria-valuemax="2"
      :aria-valuenow="ariaValueNow"
      :aria-valuetext="
        committedZone === 'left'
          ? option1Label
          : committedZone === 'right'
            ? option2Label
            : 'None selected'
      "
      :aria-disabled="disabled"
      tabindex="0"
      :data-testid="`${testId}-track`"
      :class="
        cn(
          'bg-muted relative min-h-11 w-full rounded-full border p-1',
          'focus-visible:ring-ring/50 outline-none focus-visible:ring-3',
          disabled && 'pointer-events-none opacity-50',
        )
      "
      @pointerdown="onTrackPointerDown"
      @keydown="onKeydown"
    >
      <div class="pointer-events-none absolute inset-0 grid grid-cols-2">
        <div
          class="flex items-center justify-center px-2"
          :data-testid="`${testId}-label-left`"
        >
          <span
            :class="
              cn(
                'text-sm font-medium',
                committedZone === 'left' ? 'text-transparent' : 'text-muted-foreground',
              )
            "
          >
            {{ option1Label }}
          </span>
        </div>
        <div
          class="flex items-center justify-center px-2"
          :data-testid="`${testId}-label-right`"
        >
          <span
            :class="
              cn(
                'text-sm font-medium',
                committedZone === 'right' ? 'text-transparent' : 'text-muted-foreground',
              )
            "
          >
            {{ option2Label }}
          </span>
        </div>
      </div>

      <div
        class="pointer-events-none absolute top-1 bottom-1 left-1/2 -translate-x-1/2 border-l border-dashed border-border"
        aria-hidden="true"
      />

      <button
        type="button"
        tabindex="-1"
        :disabled="disabled"
        :data-testid="`${testId}-center-anchor`"
        class="bg-foreground absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-foreground focus-visible:ring-ring/50 outline-none focus-visible:ring-2"
        aria-label="Clear selection"
        @click.stop="onCenterAnchorClick"
      />

      <div
        ref="insetLayerRef"
        class="absolute inset-1"
        :data-testid="`${testId}-inset`"
      >
        <div
          ref="thumbRef"
          data-thumb
          :data-testid="`${testId}-thumb`"
          :data-zone="thumbSelectedZone"
          :class="thumbClasses"
          :style="thumbStyle"
          @pointerdown="onThumbPointerDown"
          @pointermove="onThumbPointerMove"
          @pointerup="onThumbPointerUp"
          @pointercancel="onThumbPointerCancel"
        >
          <span v-if="thumbLabel" class="truncate px-1">{{ thumbLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
