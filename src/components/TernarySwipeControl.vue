<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { X } from '@lucide/vue'
import { cn } from '@/lib/utils'

const TRANSITION_MS = 220
const PROXIMITY_FALLOFF = 0.25

const props = defineProps({
  modelValue: { type: [String, null], default: '' },
  name: { type: String, required: true },
  option1Value: { type: String, default: 'option1' },
  option2Value: { type: String, default: 'option2' },
  option1Label: { type: String, default: 'Option 1' },
  option2Label: { type: String, default: 'Option 2' },
  neutralValue: { type: String, default: '' },
  allowNeutral: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  testId: { type: String, default: 'ternary-swipe' },
  trackClass: { type: [String, Object, Array], default: '' },
})

const emit = defineEmits(['update:modelValue', 'change'])

const trackRef = useTemplateRef('trackRef')
const insetLayerRef = useTemplateRef('insetLayerRef')
const thumbRef = useTemplateRef('thumbRef')

/** 'left' | 'right' | 'none' */
const committedZone = ref('none')
const dragging = ref(false)
const dragX = ref(null)
const animating = ref(false)
const dismissingToNone = ref(false)
const dismissVisualActive = ref(false)
const prefersReducedMotion = ref(false)
const insetWidthPx = ref(0)
const insetHeightPx = ref(0)

let activePointerId = null
let resizeObserver = null
let transitionTimer = null
let reducedMotionQuery = null

const trackSegmentCount = computed(() => (props.allowNeutral ? 3 : 2))

const noneSegmentIndex = computed(() => (props.allowNeutral ? 2 : -1))

const segmentWidthPercent = computed(() => 100 / trackSegmentCount.value)

const snapPoints = computed(() =>
  Array.from(
    { length: trackSegmentCount.value },
    (_, index) => (index + 0.5) / trackSegmentCount.value,
  ),
)

const committedValue = computed(() => valueFromZone(committedZone.value))

const ariaValueNow = computed(() => {
  if (committedZone.value === 'left') return 1
  if (committedZone.value === 'right') return 2
  return 0
})

const ariaValueText = computed(() => {
  if (committedZone.value === 'left') return props.option1Label
  if (committedZone.value === 'right') return props.option2Label
  return 'None selected'
})

const displayX = computed(() => {
  if (dismissingToNone.value && props.allowNeutral) {
    return snapPoints.value[noneSegmentIndex.value]
  }
  if (dragging.value && dragX.value != null) return dragX.value
  if (committedZone.value === 'none') return null
  if (committedZone.value === 'left') return snapPoints.value[0]
  return snapPoints.value[1]
})

const showThumb = computed(
  () => dragging.value || committedZone.value !== 'none' || dismissingToNone.value,
)

const labelGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${trackSegmentCount.value}, minmax(0, 1fr))`,
}))

const noneIconClass = computed(() =>
  cn(
    'size-4 shrink-0',
    committedZone.value !== 'none' || dragging.value ? 'text-destructive' : 'text-muted-foreground',
  ),
)

function proximity(x, target) {
  return Math.max(0, 1 - Math.abs(x - target) / PROXIMITY_FALLOFF)
}

function updateInsetDimensions() {
  const layer = insetLayerRef.value
  if (!layer) return
  const rect = layer.getBoundingClientRect()
  insetWidthPx.value = rect.width
  insetHeightPx.value = rect.height
}

function segmentIndexFromX(x) {
  return Math.min(trackSegmentCount.value - 1, Math.max(0, Math.floor(x * trackSegmentCount.value)))
}

function zoneFromSegmentIndex(segmentIndex) {
  if (segmentIndex === 0) return 'left'
  if (segmentIndex === 1) return 'right'
  return 'none'
}

function segmentIndexFromZone(zone) {
  if (zone === 'left') return 0
  if (zone === 'right') return 1
  return noneSegmentIndex.value
}

const activeSegmentIndex = computed(() => {
  if (!showThumb.value || displayX.value == null) return -1
  return segmentIndexFromX(displayX.value)
})

const visualZone = computed(() => {
  const index = activeSegmentIndex.value
  if (index === noneSegmentIndex.value) return 'none'
  if (index === 0) return 'left'
  if (index === 1) return 'right'
  return 'none'
})

const highlightedSide = computed(() => {
  if (activeSegmentIndex.value === noneSegmentIndex.value) return null
  if (activeSegmentIndex.value === 0) return 'left'
  if (activeSegmentIndex.value === 1) return 'right'
  if (!dragging.value && committedZone.value !== 'none') return committedZone.value
  return null
})

function labelTextClass(side) {
  if (highlightedSide.value !== side) return 'text-muted-foreground'
  return side === 'left' ? 'text-primary-foreground' : 'text-accent-foreground'
}

const thumbClasses = computed(() => {
  const index = activeSegmentIndex.value
  const onNoneSegment = props.allowNeutral && index === noneSegmentIndex.value

  return cn(
    'absolute z-10 flex items-center justify-center rounded-full font-medium select-none touch-none',
    onNoneSegment && 'bg-destructive text-destructive-foreground text-sm',
    !onNoneSegment && index === 0 && 'bg-primary text-primary-foreground text-sm',
    !onNoneSegment && index === 1 && 'bg-accent text-accent-foreground text-sm',
    !onNoneSegment && index >= 0 && 'border border-foreground',
    dismissingToNone.value &&
      !prefersReducedMotion.value &&
      'bg-destructive text-destructive-foreground transition-[transform,opacity] duration-200 ease-out',
    animating.value &&
      !prefersReducedMotion.value &&
      !dragging.value &&
      !dismissingToNone.value &&
      'transition-[left,width,height,top,opacity,background-color,color] duration-200 ease-out',
    dragging.value && 'cursor-grabbing',
    !dragging.value && !props.disabled && 'cursor-grab',
    props.disabled && 'cursor-not-allowed opacity-50',
  )
})

const thumbStyle = computed(() => {
  if (!showThumb.value || displayX.value == null) return { display: 'none' }

  const opacityStyle = props.disabled ? {} : { opacity: 1 }
  const segmentIndex = activeSegmentIndex.value

  if (dismissingToNone.value) {
    const leftPercent = (noneSegmentIndex.value / trackSegmentCount.value) * 100
    const shrinkStyle = prefersReducedMotion.value
      ? {}
      : {
          transform: dismissVisualActive.value ? 'scale(0)' : 'scale(1)',
          opacity: dismissVisualActive.value ? 0 : 1,
        }
    return {
      display: 'flex',
      left: `${leftPercent}%`,
      right: 'auto',
      width: `${segmentWidthPercent.value}%`,
      top: '0',
      bottom: '0',
      height: 'auto',
      marginTop: '0',
      maxWidth: 'none',
      maxHeight: 'none',
      transformOrigin: 'center center',
      ...shrinkStyle,
      ...opacityStyle,
    }
  }

  if (!dragging.value && committedZone.value !== 'none') {
    const zoneIndex = segmentIndexFromZone(committedZone.value)
    const leftPercent = (zoneIndex / trackSegmentCount.value) * 100
    return {
      display: 'flex',
      left: `${leftPercent}%`,
      right: 'auto',
      width: `${segmentWidthPercent.value}%`,
      top: '0',
      bottom: '0',
      height: 'auto',
      marginTop: '0',
      maxWidth: 'none',
      maxHeight: 'none',
      ...opacityStyle,
    }
  }

  const x = displayX.value
  const insetW = insetWidthPx.value || 1
  const insetH = insetHeightPx.value || 44
  const pillW = insetW / trackSegmentCount.value
  const pillH = insetH
  const segmentProximity = segmentIndex >= 0 ? proximity(x, snapPoints.value[segmentIndex]) : 0

  let pillLeft = x * insetW - pillW / 2
  pillLeft = Math.max(0, Math.min(pillLeft, insetW - pillW))

  return {
    display: 'flex',
    left: `${pillLeft}px`,
    right: 'auto',
    width: `${pillW}px`,
    height: `${pillH}px`,
    maxWidth: `${pillW}px`,
    maxHeight: `${pillH}px`,
    top: '0',
    bottom: 'auto',
    marginTop: '0',
    opacity: props.disabled ? undefined : segmentProximity,
    ...opacityStyle,
  }
})

function zoneFromValue(value) {
  if (value === props.option1Value) return 'left'
  if (value === props.option2Value) return 'right'
  return props.allowNeutral ? 'none' : 'left'
}

function valueFromZone(zone) {
  if (zone === 'left') return props.option1Value
  if (zone === 'right') return props.option2Value
  return props.neutralValue
}

function zoneFromX(x) {
  return zoneFromSegmentIndex(segmentIndexFromX(x))
}

function pointerXAsFraction(event) {
  const layer = insetLayerRef.value ?? trackRef.value
  if (!layer) return 0
  const rect = layer.getBoundingClientRect()
  if (layer === insetLayerRef.value) {
    insetWidthPx.value = rect.width
    insetHeightPx.value = rect.height
  }
  const fraction = (event.clientX - rect.left) / rect.width
  return Math.min(1, Math.max(0, fraction))
}

function commitZone(zone, { animate = true } = {}) {
  const previous = committedZone.value
  committedZone.value = zone
  const value = valueFromZone(zone)

  if (animate && !prefersReducedMotion.value && !dismissingToNone.value) {
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

function dismissToNone({ fromDrag = false } = {}) {
  if (!props.allowNeutral || props.disabled) return

  const previous = committedZone.value
  if (previous === 'none' && !fromDrag) {
    commitZone('none', { animate: false })
    return
  }

  if (prefersReducedMotion.value) {
    if (previous !== 'none') commitZone('none', { animate: false })
    return
  }

  dismissingToNone.value = true
  dismissVisualActive.value = false
  animating.value = false

  nextTick(() => {
    requestAnimationFrame(() => {
      dismissVisualActive.value = true
    })
  })

  clearTimeout(transitionTimer)
  transitionTimer = setTimeout(() => {
    const value = props.neutralValue
    dismissingToNone.value = false
    dismissVisualActive.value = false
    committedZone.value = 'none'

    if (previous !== 'none' && value !== props.modelValue) {
      emit('update:modelValue', value)
      emit('change', value)
    } else if (previous !== 'none') {
      emit('change', value)
    }
  }, TRANSITION_MS)
}

function snapToZone(zone) {
  if (props.disabled) return
  commitZone(zone)
}

function beginPointerDrag(event) {
  if (props.disabled || dragging.value) return
  if (event.target.closest('[data-none-segment]')) return
  event.preventDefault()
  dismissingToNone.value = false
  dismissVisualActive.value = false
  activePointerId = event.pointerId
  dragging.value = true
  dragX.value = pointerXAsFraction(event)
  animating.value = false
  if (typeof trackRef.value?.setPointerCapture === 'function') {
    trackRef.value.setPointerCapture(event.pointerId)
  }
}

function finishDrag() {
  const x = dragX.value ?? displayX.value ?? 0
  const zone = zoneFromX(x)
  dragging.value = false
  dragX.value = null
  activePointerId = null

  if (zone === 'none') {
    dismissToNone({ fromDrag: true })
    return
  }

  commitZone(zone)
}

function onTrackPointerMove(event) {
  if (!dragging.value || event.pointerId !== activePointerId) return
  dragX.value = pointerXAsFraction(event)
}

function onTrackPointerDown(event) {
  beginPointerDrag(event)
}

function onTrackPointerUp(event) {
  if (!dragging.value || event.pointerId !== activePointerId) return
  finishDrag()
}

function onTrackPointerCancel(event) {
  if (!dragging.value || event.pointerId !== activePointerId) return
  finishDrag()
}

function onNoneSegmentClick() {
  dismissToNone()
}

function onKeydown(event) {
  if (props.disabled) return

  if (event.key === 'Home') {
    event.preventDefault()
    dismissToNone()
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    if (committedZone.value === 'none') snapToZone('right')
    else if (committedZone.value === 'right') snapToZone('left')
    else dismissToNone()
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    if (committedZone.value === 'none') snapToZone('left')
    else if (committedZone.value === 'left') snapToZone('right')
    else dismissToNone()
  }
}

watch(
  () => props.modelValue,
  (value) => {
    if (dragging.value || dismissingToNone.value) return
    committedZone.value = zoneFromValue(value)
  },
  { immediate: true },
)

watch(
  () => props.allowNeutral,
  () => {
    if (dragging.value || dismissingToNone.value) return
    committedZone.value = zoneFromValue(props.modelValue)
  },
)

function onReducedMotionChange(event) {
  prefersReducedMotion.value = event.matches
}

onMounted(() => {
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  prefersReducedMotion.value = reducedMotionQuery.matches
  reducedMotionQuery.addEventListener('change', onReducedMotionChange)

  updateInsetDimensions()

  const observeTarget = insetLayerRef.value ?? trackRef.value
  if (typeof ResizeObserver !== 'undefined' && observeTarget) {
    resizeObserver = new ResizeObserver(() => {
      updateInsetDimensions()
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
      :aria-valuetext="ariaValueText"
      :aria-disabled="disabled"
      tabindex="0"
      :data-testid="`${testId}-track`"
      :class="
        cn(
          'bg-muted relative min-h-11 w-full touch-none rounded-full border p-1',
          'focus-visible:ring-ring/50 outline-none focus-visible:ring-3',
          disabled && 'pointer-events-none opacity-50',
          trackClass,
        )
      "
      @pointerdown="onTrackPointerDown"
      @pointermove="onTrackPointerMove"
      @pointerup="onTrackPointerUp"
      @pointercancel="onTrackPointerCancel"
      @keydown="onKeydown"
    >
      <div
        v-for="divider in trackSegmentCount - 1"
        :key="`divider-${divider}`"
        class="pointer-events-none absolute top-1 bottom-1 z-[1] border-l border-dashed border-border"
        :style="{ left: `${(divider / trackSegmentCount) * 100}%` }"
        aria-hidden="true"
      />

      <div ref="insetLayerRef" class="absolute inset-1 z-10" :data-testid="`${testId}-inset`">
        <div
          v-if="showThumb"
          ref="thumbRef"
          data-thumb
          :data-testid="`${testId}-thumb`"
          :data-zone="visualZone"
          :class="thumbClasses"
          :style="thumbStyle"
        />
      </div>

      <div class="absolute inset-0 z-20 grid" :style="labelGridStyle">
        <div
          class="pointer-events-none flex items-center justify-center px-2"
          :data-testid="`${testId}-label-left`"
        >
          <span :class="cn('truncate text-sm font-medium', labelTextClass('left'))">
            {{ option1Label }}
          </span>
        </div>
        <div
          class="pointer-events-none flex items-center justify-center px-2"
          :data-testid="`${testId}-label-right`"
        >
          <span :class="cn('truncate text-sm font-medium', labelTextClass('right'))">
            {{ option2Label }}
          </span>
        </div>
        <div
          v-if="allowNeutral"
          class="flex items-center justify-center px-1"
          :data-testid="`${testId}-label-none`"
        >
          <button
            type="button"
            tabindex="-1"
            data-none-segment
            :disabled="disabled"
            :data-testid="`${testId}-none-segment`"
            class="flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:ring-ring/50 outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50"
            :class="dragging && 'pointer-events-none'"
            aria-label="Clear selection"
            @click.stop="onNoneSegmentClick"
          >
            <X :class="noneIconClass" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
