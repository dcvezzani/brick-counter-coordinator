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

const SELECTOR_SIZE_PX = 10
const TRANSITION_MS = 220
const LABEL_VISIBILITY_THRESHOLD = 0.6
const SWIPE_UP_THRESHOLD = 24

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

/** null = neutral; number = option index */
const committedIndex = ref(null)
const dragging = ref(false)
const dragX = ref(null)
const dragStartX = ref(0)
const dragStartY = ref(0)
const animating = ref(false)
const prefersReducedMotion = ref(false)
const insetWidthPx = ref(0)
const insetHeightPx = ref(0)

let activePointerId = null
let resizeObserver = null
let transitionTimer = null
let reducedMotionQuery = null

const segmentCount = computed(() => props.options.length)

const neutralX = computed(() => 1 / segmentCount.value)

const proximityFalloff = computed(() =>
  Math.min(0.25, 0.5 / segmentCount.value),
)

const segmentWidthPercent = computed(() => 100 / segmentCount.value)

const snapPoints = computed(() =>
  props.options.map((_, index) => (index + 0.5) / segmentCount.value),
)

const committedValue = computed(() => {
  if (committedIndex.value == null) return props.neutralValue
  return props.options[committedIndex.value]?.value ?? props.neutralValue
})

const ariaValueNow = computed(() => {
  if (committedIndex.value == null) return 0
  return committedIndex.value + 1
})

const ariaValueText = computed(() => {
  if (committedIndex.value == null) return 'None selected'
  return props.options[committedIndex.value]?.label ?? 'None selected'
})

const displayX = computed(() => {
  if (dragging.value && dragX.value != null) return dragX.value
  if (committedIndex.value == null) return neutralX.value
  return snapPoints.value[committedIndex.value]
})

const labelGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${segmentCount.value}, minmax(0, 1fr))`,
}))

function proximity(x, target) {
  return Math.max(0, 1 - Math.abs(x - target) / proximityFalloff.value)
}

function lerp(start, end, amount) {
  return start + (end - start) * amount
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

const thumbMorph = computed(() => {
  const x = displayX.value

  if (dragging.value) {
    const neutralBlend = props.allowNeutral ? proximity(x, neutralX.value) : 0
    let dominantOptionIndex = 0
    let optionProximity = 0

    props.options.forEach((_, index) => {
      const value = proximity(x, snapPoints.value[index])
      if (value > optionProximity) {
        optionProximity = value
        dominantOptionIndex = index
      }
    })

    return { neutralBlend, optionProximity, dominantOptionIndex }
  }

  if (committedIndex.value == null) {
    return { neutralBlend: 1, optionProximity: 0, dominantOptionIndex: 0 }
  }

  return {
    neutralBlend: 0,
    optionProximity: 1,
    dominantOptionIndex: committedIndex.value,
  }
})

const visualZone = computed(() => {
  if (thumbMorph.value.neutralBlend >= 0.5) return 'neutral'
  return `option-${thumbMorph.value.dominantOptionIndex}`
})

const thumbLabel = computed(() => {
  if (thumbMorph.value.neutralBlend > 0.5) return ''
  if (thumbMorph.value.optionProximity <= LABEL_VISIBILITY_THRESHOLD) return ''
  const index = thumbMorph.value.dominantOptionIndex
  return props.options[index]?.label ?? ''
})

const thumbClasses = computed(() => {
  const { neutralBlend, optionProximity, dominantOptionIndex } = thumbMorph.value
  const isCircleDominant = neutralBlend > 0.5

  return cn(
    'absolute z-10 flex items-center justify-center rounded-full font-medium select-none touch-none',
    isCircleDominant && 'bg-foreground',
    !isCircleDominant && thumbClassForIndex(dominantOptionIndex),
    !isCircleDominant && optionProximity > 0.2 && 'border border-foreground',
    animating.value &&
      !prefersReducedMotion.value &&
      !dragging.value &&
      'transition-[left,width,height,top,opacity,background-color,color,border-radius] duration-200 ease-out',
    dragging.value && 'cursor-grabbing',
    !dragging.value && !props.disabled && 'cursor-grab',
    props.disabled && 'cursor-not-allowed opacity-50',
  )
})

const thumbStyle = computed(() => {
  const { neutralBlend, optionProximity } = thumbMorph.value
  let opacity = dragging.value ? (neutralBlend > 0.5 ? 1 : optionProximity) : 1

  if (dragging.value && props.allowNeutral) {
    const deltaY = dragStartY.value - (dragLastY.value ?? dragStartY.value)
    const deltaX = Math.abs((dragLastX.value ?? dragStartX.value) - dragStartX.value)
    if (deltaY > 0 && deltaY > deltaX) {
      opacity *= Math.max(0.4, 1 - deltaY / SWIPE_UP_THRESHOLD)
    }
  }

  const opacityStyle = props.disabled ? {} : { opacity }

  if (!dragging.value) {
    if (committedIndex.value != null) {
      const leftPercent = (committedIndex.value / segmentCount.value) * 100
      return {
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

    const half = SELECTOR_SIZE_PX / 2
    return {
      left: `calc(${displayX.value * 100}% - ${half}px)`,
      right: 'auto',
      width: `${SELECTOR_SIZE_PX}px`,
      height: `${SELECTOR_SIZE_PX}px`,
      maxWidth: `${SELECTOR_SIZE_PX}px`,
      maxHeight: `${SELECTOR_SIZE_PX}px`,
      top: '50%',
      bottom: 'auto',
      marginTop: `-${half}px`,
      ...opacityStyle,
    }
  }

  const x = displayX.value
  const insetW = insetWidthPx.value || 1
  const insetH = insetHeightPx.value || SELECTOR_SIZE_PX
  const pillW = insetW / segmentCount.value
  const pillH = insetH
  const t = neutralBlend

  const width = lerp(pillW, SELECTOR_SIZE_PX, t)
  const height = lerp(pillH, SELECTOR_SIZE_PX, t)

  let pillLeft = x * insetW - pillW / 2
  pillLeft = Math.max(0, Math.min(pillLeft, insetW - pillW))

  const circleLeft = x * insetW - width / 2
  const left = lerp(pillLeft, circleLeft, t)
  const top = lerp(0, insetH / 2 - height / 2, t)

  return {
    left: `${left}px`,
    right: 'auto',
    width: `${width}px`,
    height: `${height}px`,
    maxWidth: `${width}px`,
    maxHeight: `${height}px`,
    top: `${top}px`,
    bottom: 'auto',
    marginTop: '0',
    ...opacityStyle,
  }
})

const dragLastX = ref(0)
const dragLastY = ref(0)

function indexFromValue(value) {
  const index = props.options.findIndex((option) => option.value === value)
  if (index >= 0) return index
  return props.allowNeutral ? null : 0
}

function resolveFromX(x) {
  let best = { kind: 'option', index: 0, score: -1 }

  props.options.forEach((_, index) => {
    const score = proximity(x, snapPoints.value[index])
    if (score > best.score) {
      best = { kind: 'option', index, score }
    }
  })

  if (props.allowNeutral) {
    const neutralScore = proximity(x, neutralX.value)
    if (neutralScore > best.score) {
      best = { kind: 'neutral', index: null, score: neutralScore }
    }
  }

  return best
}

function pointerXAsFraction(event) {
  const layer = insetLayerRef.value ?? trackRef.value
  if (!layer) return neutralX.value
  const rect = layer.getBoundingClientRect()
  if (layer === insetLayerRef.value) {
    insetWidthPx.value = rect.width
    insetHeightPx.value = rect.height
  }
  const x = (event.clientX - rect.left) / rect.width
  return Math.min(1, Math.max(0, x))
}

function commitIndex(index, { animate = true } = {}) {
  const previous = committedIndex.value
  committedIndex.value = index
  const value = committedValue.value

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
  } else if (previous !== index) {
    emit('change', value)
  }
}

function commitNeutral({ animate = true } = {}) {
  if (!props.allowNeutral || props.disabled) return
  commitIndex(null, { animate })
}

function snapToIndex(index) {
  if (props.disabled) return
  commitIndex(index)
}

function isSwipeUp(event) {
  if (!props.allowNeutral) return false
  const deltaY = dragStartY.value - event.clientY
  const deltaX = Math.abs(event.clientX - dragStartX.value)
  return deltaY >= SWIPE_UP_THRESHOLD && deltaY > deltaX
}

function onThumbPointerDown(event) {
  if (props.disabled) return
  event.preventDefault()
  activePointerId = event.pointerId
  dragging.value = true
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY
  dragLastX.value = event.clientX
  dragLastY.value = event.clientY
  dragX.value = pointerXAsFraction(event)
  animating.value = false
  if (typeof thumbRef.value?.setPointerCapture === 'function') {
    thumbRef.value.setPointerCapture(event.pointerId)
  }
}

function finishSwipeUp() {
  dragging.value = false
  dragX.value = null
  activePointerId = null
  commitNeutral()
}

function onThumbPointerMove(event) {
  if (!dragging.value || event.pointerId !== activePointerId) return
  dragLastX.value = event.clientX
  dragLastY.value = event.clientY
  if (isSwipeUp(event)) {
    finishSwipeUp()
    return
  }
  dragX.value = pointerXAsFraction(event)
}

function finishDrag(event) {
  if (isSwipeUp(event)) {
    finishSwipeUp()
    return
  }

  const x = dragX.value ?? displayX.value
  const resolved = resolveFromX(x)
  dragging.value = false
  dragX.value = null
  activePointerId = null
  commitIndex(resolved.index)
}

function onThumbPointerUp(event) {
  if (!dragging.value || event.pointerId !== activePointerId) return
  finishDrag(event)
}

function onThumbPointerCancel(event) {
  if (!dragging.value || event.pointerId !== activePointerId) return
  finishDrag(event)
}

function onTrackPointerDown(event) {
  if (props.disabled || dragging.value) return
  if (event.target.closest('[data-thumb], [data-neutral-anchor]')) return

  const x = pointerXAsFraction(event)
  const resolved = resolveFromX(x)
  snapToIndex(resolved.index)
}

function onNeutralAnchorClick() {
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
      snapToIndex(segmentCount.value - 1)
    } else if (committedIndex.value > 0) {
      snapToIndex(committedIndex.value - 1)
    }
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    if (committedIndex.value == null) {
      snapToIndex(0)
    } else if (committedIndex.value < segmentCount.value - 1) {
      snapToIndex(committedIndex.value + 1)
    }
  }
}

watch(
  () => props.modelValue,
  (value) => {
    if (dragging.value) return
    committedIndex.value = indexFromValue(value)
  },
  { immediate: true },
)

watch(
  () => [props.allowNeutral, props.neutralValue, props.options],
  () => {
    if (dragging.value) return
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
      :aria-valuemax="segmentCount"
      :aria-valuenow="ariaValueNow"
      :aria-valuetext="ariaValueText"
      :aria-disabled="disabled"
      tabindex="0"
      :data-testid="`${testId}-track`"
      :class="
        cn(
          'bg-muted relative min-h-11 w-full rounded-full border p-1',
          'focus-visible:ring-ring/50 outline-none focus-visible:ring-3',
          disabled && 'pointer-events-none opacity-50',
          trackClass,
        )
      "
      @pointerdown="onTrackPointerDown"
      @keydown="onKeydown"
    >
      <div
        class="pointer-events-none absolute inset-0 grid"
        :style="labelGridStyle"
      >
        <div
          v-for="(option, index) in options"
          :key="option.value"
          class="flex items-center justify-center px-1"
          :data-testid="`${testId}-label-${index}`"
        >
          <span
            :class="
              cn(
                'truncate text-sm font-medium',
                committedIndex === index ? 'text-transparent' : 'text-muted-foreground',
              )
            "
          >
            {{ option.label }}
          </span>
        </div>
      </div>

      <div
        v-for="divider in segmentCount - 1"
        :key="`divider-${divider}`"
        class="pointer-events-none absolute top-1 bottom-1 border-l border-dashed border-border"
        :style="{ left: `${(divider / segmentCount) * 100}%` }"
        aria-hidden="true"
      />

      <div
        ref="insetLayerRef"
        class="absolute inset-1"
        :data-testid="`${testId}-inset`"
      >
        <button
          v-if="allowNeutral"
          type="button"
          tabindex="-1"
          data-neutral-anchor
          :disabled="disabled"
          :data-testid="`${testId}-neutral-anchor`"
          class="absolute top-1/2 max-h-2.5 max-w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground bg-transparent focus-visible:ring-ring/50 outline-none focus-visible:ring-2"
          :style="{
            left: `calc(${(1 / segmentCount) * 100}% )`,
            width: `${SELECTOR_SIZE_PX}px`,
            height: `${SELECTOR_SIZE_PX}px`,
          }"
          aria-label="Clear selection"
          @click.stop="onNeutralAnchorClick"
        />

        <div
          ref="thumbRef"
          data-thumb
          :data-testid="`${testId}-thumb`"
          :data-zone="visualZone"
          :data-index="committedIndex ?? -1"
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
