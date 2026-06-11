import { clampValue } from '@/lib/numeric-field'

export const HORIZONTAL_SLOTS = 10
export const HOLD_REPEAT_MS = 1000
/** Hold-repeat cadence: steps per second at an extreme slot. */
export const HOLD_REPEAT_RATE = 10

/**
 * @typedef {'left' | 'right'} HorizontalIncrementDirection
 * @typedef {'up' | 'down'} VerticalIncrementDirection
 * @typedef {{ horizontalIncrement: HorizontalIncrementDirection, verticalIncrement: VerticalIncrementDirection }} SteppedAxisConfig
 */

/**
 * @param {{ horizontalIncrement?: HorizontalIncrementDirection, verticalIncrement?: VerticalIncrementDirection }} [options]
 * @returns {SteppedAxisConfig}
 */
export function createSteppedAxisConfig({
  horizontalIncrement = 'right',
  verticalIncrement = 'up',
} = {}) {
  return { horizontalIncrement, verticalIncrement }
}

/**
 * Map screen-space horizontal slot to logical slot (negative = increment territory).
 *
 * @param {number} physicalSlot
 * @param {SteppedAxisConfig} axis
 * @returns {number}
 */
export function toLogicalHorizontalSlot(physicalSlot, axis) {
  return axis.horizontalIncrement === 'left' ? physicalSlot : -physicalSlot
}

/**
 * Map screen-space vertical slot to logical slot (negative = increment territory).
 *
 * @param {number} physicalSlot
 * @param {SteppedAxisConfig} axis
 * @returns {number}
 */
export function toLogicalVerticalSlot(physicalSlot, axis) {
  return axis.verticalIncrement === 'up' ? physicalSlot : -physicalSlot
}

/**
 * @param {number} offsetPx - negative = left, positive = right (screen space)
 * @param {number} maxOffsetPx
 * @returns {number} slot in [-10..10], 0 = center
 */
export function offsetToHorizontalSlot(offsetPx, maxOffsetPx) {
  if (maxOffsetPx <= 0) return 0
  const slotWidth = maxOffsetPx / HORIZONTAL_SLOTS
  if (Math.abs(offsetPx) < slotWidth / 2) return 0
  const slot = Math.round(offsetPx / slotWidth)
  return Math.max(-HORIZONTAL_SLOTS, Math.min(HORIZONTAL_SLOTS, slot))
}

/**
 * @param {number} offsetPx - negative = up, positive = down (screen space)
 * @param {number} maxOffsetPx
 * @returns {-1 | 0 | 1}
 */
export function offsetToVerticalSlot(offsetPx, maxOffsetPx) {
  if (maxOffsetPx <= 0) return 0
  const threshold = maxOffsetPx * 0.35
  if (Math.abs(offsetPx) < threshold) return 0
  return offsetPx < 0 ? -1 : 1
}

/**
 * @param {number} slot - physical horizontal slot in [-10..10]
 * @param {number} maxOffsetPx
 * @returns {number}
 */
export function horizontalSlotToOffset(slot, maxOffsetPx) {
  if (maxOffsetPx <= 0 || slot === 0) return 0
  const slotWidth = maxOffsetPx / HORIZONTAL_SLOTS
  return slot * slotWidth
}

/**
 * @param {-1 | 0 | 1} slot - physical vertical slot
 * @param {number} maxOffsetPx
 * @returns {number}
 */
export function verticalSlotToOffset(slot, maxOffsetPx) {
  if (maxOffsetPx <= 0 || slot === 0) return 0
  return slot < 0 ? -maxOffsetPx * 0.5 : maxOffsetPx * 0.5
}

/**
 * @param {number} prevH
 * @param {number} prevV
 * @param {number} nextH
 * @param {number} nextV
 * @returns {{ delta1: number, delta10: number }}
 */
export function slotDelta(prevH, prevV, nextH, nextV) {
  return {
    delta1: prevH - nextH,
    delta10: (prevV - nextV) * 10,
  }
}

/**
 * @param {number} value
 * @param {number} stepSize
 * @param {number} direction
 * @param {{ min?: number, max?: number, allowNegative?: boolean }} clampOptions
 * @returns {number}
 */
function applySingleStep(value, stepSize, direction, clampOptions) {
  if (stepSize === 10 && direction < 0) {
    const floor = clampOptions.min ?? (clampOptions.allowNegative ? Number.NEGATIVE_INFINITY : 0)
    if (value < 10 && floor === 0 && !clampOptions.allowNegative) {
      return 0
    }
  }
  return clampValue(value + direction * stepSize, clampOptions)
}

/**
 * @param {number} value
 * @param {{ delta1: number, delta10: number }} delta
 * @param {{ min?: number, max?: number, allowNegative?: boolean }} clampOptions
 * @returns {number}
 */
export function applySteppedDelta(value, { delta1, delta10 }, clampOptions) {
  let result = value
  const floor = clampOptions.min ?? (clampOptions.allowNegative ? Number.NEGATIVE_INFINITY : 0)

  if (delta1 !== 0) {
    const direction = Math.sign(delta1)
    for (let i = 0; i < Math.abs(delta1); i += 1) {
      result = applySingleStep(result, 1, direction, clampOptions)
      if (direction > 0 && clampOptions.max != null && result >= clampOptions.max) break
      if (direction < 0 && result <= floor) break
    }
  }

  if (delta10 !== 0) {
    const direction = Math.sign(delta10)
    const count = Math.abs(delta10) / 10
    for (let i = 0; i < count; i += 1) {
      result = applySingleStep(result, 10, direction, clampOptions)
      if (direction > 0 && clampOptions.max != null && result >= clampOptions.max) break
      if (direction < 0 && result <= floor) break
    }
  }

  return result
}

/**
 * @param {number} hSlot
 * @param {number} vSlot
 * @returns {boolean}
 */
export function isExtremeSlot(hSlot, vSlot) {
  return Math.abs(hSlot) === HORIZONTAL_SLOTS || Math.abs(vSlot) === 1
}

/**
 * Label amounts derived from logical slot position relative to rest origin.
 *
 * @param {number} hSlot - logical horizontal slot
 * @param {number} vSlot - logical vertical slot
 * @returns {{ hIncrement: number, hDecrement: number, vIncrement: number, vDecrement: number }}
 */
export function slotLabelAmounts(hSlot, vSlot) {
  return {
    hIncrement: hSlot < 0 ? Math.abs(hSlot) : 0,
    hDecrement: hSlot > 0 ? hSlot : 0,
    vIncrement: vSlot < 0 ? 10 : 0,
    vDecrement: vSlot > 0 ? 10 : 0,
  }
}

export function extremeRepeatDelta(hSlot, vSlot) {
  let delta1 = 0
  let delta10 = 0

  if (hSlot === -HORIZONTAL_SLOTS) delta1 = 1
  else if (hSlot === HORIZONTAL_SLOTS) delta1 = -1

  if (vSlot === -1) delta10 = 10
  else if (vSlot === 1) delta10 = -10

  return { delta1, delta10 }
}
