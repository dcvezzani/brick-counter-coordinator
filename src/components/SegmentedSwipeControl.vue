<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch,
} from 'vue'
import { X } from '@lucide/vue'
import { cn } from '@/lib/utils'

const TRANSITION_MS = 220

const DEFAULT_THUMB_CLASSES = [
  'bg-primary text-primary-foreground text-sm',
  'bg-accent text-accent-foreground text-sm',
  'bg-destructive text-destructive-foreground text-sm',
]

const props = defineProps({
  options: {
    type: Array,
    required: true,
    validator(value) {
      return (
        value.length >= 2 &&
        value.every(
          (option) =>
            option &&
            typeof option.value === 'string' &&
            typeof option.label === 'string',
        )
      )
    },
  },
  modelValue: { type: [String, null], default: '' },
  name: { type: String, required: true },
  neutralValue: { type: String, default: '' },
  allowNeutral: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  testId: { type: String, default: 'segmented-swipe' },
  trackClass: { type: [String, Object, Array], default: '' },
})

const emit = defineEmits(['update:modelValue', 'change'])

const trackRef = useTemplateRef('trackRef')
const insetLayerRef = useTemplateRef('insetLayerRef')
const thumbRef = useTemplateRef('thumbRef')

/** null = none; number = option index */
const committedIndex = ref(null)
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

const trackSegmentCount = computed(() =>
  props.options.length + (props.allowNeutral ? 1 : 0),
)

const noneSegmentIndex = computed(() =>
  props.allowNeutral ? props.options.length : -1,
)

const segmentWidthPercent = computed(() => 100 / trackSegmentCount.value)

const proximityFalloff = computed(() =>
  Math.min(0.25, 0.5 / trackSegmentCount.value),
)

const snapPoints = computed(() =>
  Array.from(
    { length: trackSegmentCount.value },
    (_, index) => (index + 0.5) / trackSegmentCount.value,
  ),
)

const committedValue = computed(() => {
  if (committedIndex.value == null) return props.neutralValue
  return props.options[committedIndex.value]?.value ?? props.neutralValue
})

const ariaValueNow = computed(() => {
  if (committedIndex.value == null) return 0
  return committedIndex.value + 1
})

const ariaValueMax = computed(() => props.options.length)

const ariaValueText = computed(() => {
  if (committedIndex.value == null) return 'None selected'
  return props.options[committedIndex.value]?.label ?? 'None selected'
})

const displayX = computed(() => {
  if (dismissingToNone.value && props.allowNeutral) {
    return snapPoints.value[noneSegmentIndex.value]
  }
  if (dragging.value && dragX.value != null) return dragX.value
  if (committedIndex.value == null) return null
  return snapPoints.value[committedIndex.value]
})

const showThumb = computed(
  () => dragging.value || committedIndex.value != null || dismissingToNone.value,
)

const labelGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${trackSegmentCount.value}, minmax(0, 1fr))`,
}))

const noneIconClass = computed(() =>
  cn(
    'size-4 shrink-0',
    committedIndex.value != null || dragging.value
      ? 'text-destructive'
      : 'text-muted-foreground',
  ),
)

function proximity(x, target) {
  return Math.max(0, 1 - Math.abs(x - target) / proximityFalloff.value)
}

function thumbClassForIndex(index) {
  return (
    props.options[index]?.thumbClass ??
    DEFAULT_THUMB_CLASSES[index % DEFAULT_THUMB_CLASSES.length]
  )
}

function updateInsetDimensions() {
  const layer = insetLayerRef.value
  if (!layer) return
  const rect = layer.getBoundingClientRect()
  insetWidthPx.value = rect.width
  insetHeightPx.value = rect.height
}

function segmentIndexFromX(x) {
  return Math.min(
    trackSegmentCount.value - 1,
    Math.max(0, Math.floor(x * trackSegmentCount.value)),
  )
}

function indexFromSegment(segmentIndex) {
  if (!props.allowNeutral || segmentIndex < props.options.length) {
    return segmentIndex
  }
  return null
}

const activeSegmentIndex = computed(() => {
  if (!showThumb.value || displayX.value == null) return -1
  return segmentIndexFromX(displayX.value)
})

const visualZone = computed(() => {
  if (activeSegmentIndex.value === noneSegmentIndex.value) return 'none'
  if (activeSegmentIndex.value >= 0) return `option-${activeSegmentIndex.value}`
  return 'none'
})

const highlightedLabelIndex = computed(() => {
  if (activeSegmentIndex.value === noneSegmentIndex.value) return null
  if (activeSegmentIndex.value >= 0) return activeSegmentIndex.value
  if (!dragging.value && committedIndex.value != null) return committedIndex.value
  return null
})

function labelTextClassForIndex(index) {
  if (highlightedLabelIndex.value !== index) return 'text-muted-foreground'
  const custom = props.options[index]?.thumbClass ?? ''
  const match = custom.match(/text-\S+-foreground/)
  if (match) return match[0]
  const defaults = [
    'text-primary-foreground',
    'text-accent-foreground',
    'text-destructive-foreground',
  ]
  return defaults[index % defaults.length]
}

const thumbClasses = computed(() => {
  const segmentIndex = activeSegmentIndex.value
  const onNoneSegment =
    props.allowNeutral && segmentIndex === noneSegmentIndex.value

  return cn(
    'absolute z-10 flex items-center justify-center rounded-full font-medium select-none touch-none',
    onNoneSegment && 'bg-destructive text-destructive-foreground text-sm',
    !onNoneSegment &&
      segmentIndex >= 0 &&
      thumbClassForIndex(segmentIndex),
    !onNoneSegment && segmentIndex >= 0 && 'border border-foreground',
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

  const segmentIndex = activeSegmentIndex.value
  const opacityStyle = props.disabled ? {} : { opacity: 1 }

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

  if (!dragging.value && committedIndex.value != null) {
    const leftPercent = (committedIndex.value / trackSegmentCount.value) * 100
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
  const segmentProximity =
    segmentIndex >= 0 ? proximity(x, snapPoints.value[segmentIndex]) : 0

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

function indexFromValue(value) {
  const index = props.options.findIndex((option) => option.value === value)
  if (index >= 0) return index
  return props.allowNeutral ? null : 0
}

function resolveFromX(x) {
  return indexFromSegment(segmentIndexFromX(x))
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

function commitIndex(index, { animate = true } = {}) {
  const previous = committedIndex.value
  committedIndex.value = index
  const value = committedValue.value

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
  } else if (previous !== index) {
    emit('change', value)
  }
}

function dismissToNone({ fromDrag = false } = {}) {
  if (!props.allowNeutral || props.disabled) return

  const previous = committedIndex.value
  if (previous == null && !fromDrag) {
    commitIndex(null, { animate: false })
    return
  }

  if (prefersReducedMotion.value) {
    if (previous != null) commitIndex(null, { animate: false })
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
    committedIndex.value = null

    if (previous != null && value !== props.modelValue) {
      emit('update:modelValue', value)
      emit('change', value)
    } else if (previous != null) {
      emit('change', value)
    }
  }, TRANSITION_MS)
}

function commitNeutral() {
  dismissToNone()
}

function snapToIndex(index) {
  if (props.disabled) return
  commitIndex(index)
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
  const resolved = resolveFromX(x)
  dragging.value = false
  dragX.value = null
  activePointerId = null

  if (resolved === null) {
    dismissToNone({ fromDrag: true })
    return
  }

  commitIndex(resolved)
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
  commitNeutral()
}

function onKeydown(event) {
  if (props.disabled) return

  if (event.key === 'Home') {
    event.preventDefault()
    commitNeutral()
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    if (committedIndex.value == null) {
      snapToIndex(props.options.length - 1)
    } else if (committedIndex.value > 0) {
      snapToIndex(committedIndex.value - 1)
    } else {
      dismissToNone()
    }
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    if (committedIndex.value == null) {
      snapToIndex(0)
    } else if (committedIndex.value < props.options.length - 1) {
      snapToIndex(committedIndex.value + 1)
    } else {
      dismissToNone()
    }
  }
}

watch(
  () => props.modelValue,
  (value) => {
    if (dragging.value || dismissingToNone.value) return
    committedIndex.value = indexFromValue(value)
  },
  { immediate: true },
)

watch(
  () => [props.allowNeutral, props.neutralValue, props.options],
  () => {
    if (dragging.value || dismissingToNone.value) return
    committedIndex.value = indexFromValue(props.modelValue)
  },
  { deep: true },
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
      :aria-valuemax="ariaValueMax"
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

      <div
        ref="insetLayerRef"
        class="absolute inset-1 z-10"
        :data-testid="`${testId}-inset`"
      >
        <div
          v-if="showThumb"
          ref="thumbRef"
          data-thumb
          :data-testid="`${testId}-thumb`"
          :data-zone="visualZone"
          :data-index="committedIndex ?? -1"
          :class="thumbClasses"
          :style="thumbStyle"
        />
      </div>

      <div class="absolute inset-0 z-20 grid" :style="labelGridStyle">
        <div
          v-for="(option, index) in options"
          :key="option.value"
          class="pointer-events-none flex items-center justify-center px-1"
          :data-testid="`${testId}-label-${index}`"
        >
          <span
            :class="cn('truncate text-sm font-medium', labelTextClassForIndex(index))"
          >
            {{ option.label }}
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
