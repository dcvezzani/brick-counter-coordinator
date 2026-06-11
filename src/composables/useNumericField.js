import { computed, ref, watch } from 'vue'
import { clampValue, parseNumericValue } from '@/lib/numeric-field'

/**
 * Shared v-model numeric field sync for swipe-style number inputs.
 *
 * @param {import('vue').Ref | object} props
 * @param {(event: string, ...args: unknown[]) => void} emit
 * @param {{ isLocked?: () => boolean }} [options]
 */
export function useNumericField(props, emit, { isLocked = () => false } = {}) {
  const inputText = ref('')
  const inputFocused = ref(false)

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

  function formatDisplayValue(value) {
    if (value == null) return ''
    return String(value)
  }

  function syncInputFromModel() {
    if (inputFocused.value || isLocked()) return
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

  function stepBy(delta) {
    if (props.disabled || isLocked()) return
    const base = parseNumericValue(inputText.value, { emptyAsZero: true }) ?? props.modelValue ?? 0
    const next = clampValue(base + delta, clampOptions.value)
    inputText.value = formatDisplayValue(next)
    commitValue(next)
  }

  watch(
    () => props.modelValue,
    () => {
      syncInputFromModel()
    },
    { immediate: true },
  )

  return {
    inputText,
    inputFocused,
    effectiveMin,
    clampOptions,
    numericValue,
    formatDisplayValue,
    syncInputFromModel,
    commitValue,
    onInputFocus,
    onInputBlur,
    onInputInput,
    stepBy,
  }
}
