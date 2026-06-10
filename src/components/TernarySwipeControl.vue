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

const PROXIMITY_FALLOFF = 0.25
const SELECTOR_SIZE_PX = 10
const TRANSITION_MS = 220
const LABEL_VISIBILITY_THRESHOLD = 0.6

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
  /** Optional classes merged onto the track (e.g. min-h-8 for a shorter control). */
  trackClass: { type: [String, Object, Array], default: '' },
})

const emit = defineEmits(['update:modelValue', 'change'])

const trackRef = useTemplateRef('trackRef')
const insetLayerRef = useTemplateRef('insetLayerRef')
const thumbRef = useTemplateRef('thumbRef')

const committedZone = ref('center')
const dragging = ref(false)
const dragX = ref(null)
const animating = ref(false)
const prefersReducedMotion = ref(false)
const insetWidthPx = ref(0)
const insetHeightPx = ref(0)

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

function proximity(x, target) {
  return Math.max(0, 1 - Math.abs(x - target) / PROXIMITY_FALLOFF)
}

function lerp(start, end, amount) {
  return start + (end - start) * amount
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
    const neutralBlend = proximity(x, SNAP_X.center)
    const leftProximity = proximity(x, SNAP_X.left)
    const rightProximity = proximity(x, SNAP_X.right)
    const optionProximity = Math.max(leftProximity, rightProximity)
    const dominantOption = leftProximity >= rightProximity ? 'left' : 'right'

    return { neutralBlend, optionProximity, dominantOption }
  }

  if (committedZone.value === 'center') {
    return { neutralBlend: 1, optionProximity: 0, dominantOption: 'left' }
  }

  return {
    neutralBlend: 0,
    optionProximity: 1,
    dominantOption: committedZone.value,
  }
})

const visualZone = computed(() => {
  if (thumbMorph.value.neutralBlend >= 0.5) return 'center'
  return thumbMorph.value.dominantOption
})

const thumbLabel = computed(() => {
  if (thumbMorph.value.neutralBlend > 0.5) return ''
  if (thumbMorph.value.optionProximity <= LABEL_VISIBILITY_THRESHOLD) return ''
  if (thumbMorph.value.dominantOption === 'left') return props.option1Label
  if (thumbMorph.value.dominantOption === 'right') return props.option2Label
  return ''
})

const thumbClasses = computed(() => {
  const { neutralBlend, optionProximity, dominantOption } = thumbMorph.value
  const isCircleDominant = neutralBlend > 0.5

  return cn(
    'absolute z-10 flex items-center justify-center rounded-full font-medium select-none touch-none',
    isCircleDominant && 'bg-foreground',
    !isCircleDominant &&
      dominantOption === 'left' &&
      'bg-primary text-primary-foreground text-sm',
    !isCircleDominant &&
      dominantOption === 'right' &&
      'bg-accent text-accent-foreground text-sm',
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
  const opacity = dragging.value ? (neutralBlend > 0.5 ? 1 : optionProximity) : 1
  const opacityStyle = props.disabled ? {} : { opacity }

  if (!dragging.value) {
    if (committedZone.value === 'left') {
      return {
        left: '0',
        right: 'auto',
        width: '50%',
        top: '0',
        bottom: '0',
        height: 'auto',
        marginTop: '0',
        maxWidth: 'none',
        maxHeight: 'none',
        ...opacityStyle,
      }
    }

    if (committedZone.value === 'right') {
      return {
        left: 'auto',
        right: '0',
        width: '50%',
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

  const pillW = insetW * 0.5
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
  if (layer === insetLayerRef.value) {
    insetWidthPx.value = rect.width
    insetHeightPx.value = rect.height
  }
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
  if (event.target.closest('[data-thumb], [data-center-anchor]')) return

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
          trackClass,
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

      <div
        ref="insetLayerRef"
        class="absolute inset-1"
        :data-testid="`${testId}-inset`"
      >
        <button
          type="button"
          tabindex="-1"
          data-center-anchor
          :disabled="disabled"
          :data-testid="`${testId}-center-anchor`"
          class="absolute top-1/2 left-1/2 max-h-2.5 max-w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground bg-transparent focus-visible:ring-ring/50 outline-none focus-visible:ring-2"
          :style="{
            width: `${SELECTOR_SIZE_PX}px`,
            height: `${SELECTOR_SIZE_PX}px`,
          }"
          aria-label="Clear selection"
          @click.stop="onCenterAnchorClick"
        />

        <div
          ref="thumbRef"
          data-thumb
          :data-testid="`${testId}-thumb`"
          :data-zone="visualZone"
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
