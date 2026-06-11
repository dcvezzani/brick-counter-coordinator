export const DEFAULT_RATE_CONFIG = {
  maxDragPx: 120,
  minRate: 2,
  maxRate: 50,
  deadZonePx: 8,
}

/**
 * @param {string | number | null | undefined} raw
 * @param {{ emptyAsZero?: boolean }} [options]
 * @returns {number | null}
 */
export function parseNumericValue(raw, { emptyAsZero = false } = {}) {
  if (raw == null || raw === '') {
    return emptyAsZero ? 0 : null
  }
  const text = String(raw).trim()
  if (text === '' || text === '-') {
    return emptyAsZero ? 0 : null
  }
  const parsed = Number.parseInt(text, 10)
  if (Number.isNaN(parsed)) return emptyAsZero ? 0 : null
  return parsed
}

/**
 * @param {number} value
 * @param {{ min?: number, max?: number, allowNegative?: boolean }} [options]
 * @returns {number}
 */
export function clampValue(value, { min, max, allowNegative = false } = {}) {
  let result = value
  const floor = min ?? (allowNegative ? Number.NEGATIVE_INFINITY : 0)
  if (result < floor) result = floor
  if (max != null && result > max) result = max
  return result
}

/**
 * Logical displacement from center rest (positive = increment, negative = decrement).
 *
 * @param {number} centerOffsetPx - handle offset from center; negative = left, positive = right
 * @param {'left' | 'right'} controlPosition - which side the slide control is on relative to the input
 * @returns {number}
 */
export function signedDisplacementFromCenter(centerOffsetPx, controlPosition = 'right') {
  if (controlPosition === 'right') {
    return -centerOffsetPx
  }
  return centerOffsetPx
}

/**
 * @deprecated Use signedDisplacementFromCenter
 */
export function signedDisplacement(pointerDeltaPx, handlePosition) {
  return signedDisplacementFromCenter(pointerDeltaPx, handlePosition)
}

/**
 * @param {number} displacementPx - signed logical displacement
 * @param {typeof DEFAULT_RATE_CONFIG} [config]
 * @returns {number} steps per second (0 inside dead zone)
 */
export function displacementToStepRate(displacementPx, config = DEFAULT_RATE_CONFIG) {
  const magnitude = Math.abs(displacementPx)
  if (magnitude <= config.deadZonePx) return 0

  const effective = magnitude - config.deadZonePx
  const span = Math.max(1, config.maxDragPx - config.deadZonePx)
  const t = Math.min(1, effective / span)
  return config.minRate + (config.maxRate - config.minRate) * t * t
}

/**
 * @param {number} displacementPx
 * @param {number} deltaSeconds
 * @param {number} accumulator
 * @param {typeof DEFAULT_RATE_CONFIG} [config]
 * @returns {{ accumulator: number, steps: number }}
 */
export function accumulateDragSteps(displacementPx, deltaSeconds, accumulator, config) {
  const rate = displacementToStepRate(displacementPx, config)
  if (rate <= 0 || deltaSeconds <= 0) {
    return { accumulator, steps: 0 }
  }

  let next = accumulator + rate * deltaSeconds
  const steps = Math.floor(next)
  next -= steps
  return { accumulator: next, steps }
}

/**
 * @param {number} value
 * @param {number} signedSteps - positive increments, negative decrements
 * @param {{ min?: number, max?: number, allowNegative?: boolean }} clampOptions
 * @returns {number}
 */
export function applySignedSteps(value, signedSteps, clampOptions) {
  if (signedSteps === 0) return clampValue(value, clampOptions)
  const direction = Math.sign(signedSteps)
  let result = value
  for (let i = 0; i < Math.abs(signedSteps); i += 1) {
    result = clampValue(result + direction, clampOptions)
    if (direction > 0 && clampOptions.max != null && result >= clampOptions.max) break
    if (direction < 0 && result <= (clampOptions.min ?? (clampOptions.allowNegative ? Number.NEGATIVE_INFINITY : 0))) {
      break
    }
  }
  return result
}
