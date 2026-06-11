<script setup>
/** @import { PickerOption } from '@/lib/filterable-picker' */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { appConfig } from '@/lib/app-config'
import { defaultPrefixFilter, findPickerOption } from '@/lib/filterable-picker'

const props = defineProps({
  /** Selected option value (string, number, or null/empty for none). */
  modelValue: { type: [String, Number, null], default: null },
  /** Full option list used for display lookup and default filtering. */
  options: {
    type: /** @type {import('vue').PropType<PickerOption[]>} */ (Array),
    default: () => [],
  },
  /** Optional custom filter: `(query, options) => filteredOptions`. */
  filterOptions: {
    type: /** @type {import('vue').PropType<(query: string, options: PickerOption[]) => PickerOption[]>} */ (
      Function
    ),
    default: null,
  },
  disabled: { type: Boolean, default: false },
  allowNone: { type: Boolean, default: false },
  noneLabel: { type: String, default: 'None' },
  /** Trigger label when nothing is selected. */
  placeholder: { type: String, default: 'Select…' },
  /** Trigger label when disabled because options are empty. */
  emptyPlaceholder: { type: String, default: 'No options available' },
  filterPlaceholder: { type: String, default: 'Filter…' },
  emptyFilterMessage: { type: String, default: 'No matches for' },
  debounceMs: { type: Number, default: appConfig.picker.debounceMs },
  /** Minimum filter length before options are shown (0 = show immediately). */
  minFilterChars: { type: Number, default: 0 },
  /** Hint when filter is shorter than minFilterChars; `{n}` replaced with the count. */
  minFilterCharsHint: { type: String, default: 'Type at least {n} characters to search' },
  /** Prefix for data-testid attributes (e.g. `color-picker` → `color-picker-trigger`). */
  testId: { type: String, default: 'filterable-picker' },
})

const emit = defineEmits(['update:modelValue', 'select', 'close', 'tabForward', 'tabBackward'])

const open = ref(false)
const filterQuery = ref('')
const debouncedQuery = ref('')
const rootRef = ref(null)
const triggerRef = ref(null)

let debounceTimer = null
/** True when pointerdown started while the panel was already open (click-to-close). */
let panelOpenBeforePointerDown = false

watch(filterQuery, (value) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = value
  }, props.debounceMs)
})

onBeforeUnmount(() => {
  clearTimeout(debounceTimer)
})

const selectedOption = computed(() => findPickerOption(props.options, props.modelValue))

const filteredOptions = computed(() => {
  if (props.filterOptions) {
    return props.filterOptions(debouncedQuery.value, props.options)
  }
  return defaultPrefixFilter(props.options, debouncedQuery.value)
})

const queryMeetsMinLength = computed(
  () => debouncedQuery.value.trim().length >= props.minFilterChars,
)

const showMinCharsHint = computed(() => props.minFilterChars > 0 && !queryMeetsMinLength.value)

const minCharsHintText = computed(() =>
  props.minFilterCharsHint.replace('{n}', String(props.minFilterChars)),
)

const visibleOptions = computed(() => {
  if (props.minFilterChars > 0 && !queryMeetsMinLength.value) return []
  return filteredOptions.value
})

const highlightedValue = computed(() => visibleOptions.value[0]?.value ?? null)

const isEmpty = computed(() => props.options.length === 0)

const isDisabled = computed(() => props.disabled || isEmpty.value)

const triggerLabel = computed(() => {
  if (selectedOption.value) return selectedOption.value.label
  if (isEmpty.value) return props.emptyPlaceholder
  return props.placeholder
})

function focusFilterInput() {
  nextTick(() => {
    rootRef.value?.querySelector(`[data-testid="${props.testId}-filter"]`)?.focus()
  })
}

function openPanel() {
  if (isDisabled.value) return
  if (!open.value) {
    open.value = true
    filterQuery.value = ''
    debouncedQuery.value = ''
  }
  focusFilterInput()
}

function closePanel({ fromSelection = false } = {}) {
  if (!open.value) return
  const query = filterQuery.value
  open.value = false
  filterQuery.value = ''
  debouncedQuery.value = ''
  emit('close', { filterQuery: query, fromSelection })
}

function onTriggerFocus() {
  openPanel()
}

function onTriggerPointerDown() {
  panelOpenBeforePointerDown = open.value
}

function onTriggerClick() {
  if (isDisabled.value) return
  if (panelOpenBeforePointerDown) {
    closePanel()
    return
  }
  if (!open.value) {
    openPanel()
  }
}

function selectNone() {
  emit('update:modelValue', null)
  emit('select', null)
  closePanel({ fromSelection: true })
}

function selectOption(option) {
  emit('update:modelValue', option.value)
  emit('select', option.data ?? option)
  closePanel({ fromSelection: true })
}

function selectHighlighted() {
  const first = visibleOptions.value[0]
  if (first) selectOption(first)
}

function onFilterKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    selectHighlighted()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closePanel()
  } else if (event.key === 'Tab') {
    event.preventDefault()
    closePanel()
    if (event.shiftKey) {
      emit('tabBackward')
    } else {
      emit('tabForward')
    }
  }
}

function onRootFocusOut(event) {
  const root = rootRef.value
  if (!root || root.contains(event.relatedTarget)) return
  closePanel()
}

function isSelected(option) {
  return props.modelValue === option.value
}

function focusTrigger() {
  triggerRef.value?.focus()
}

function focusFilter() {
  openPanel()
}

defineExpose({ focusTrigger, focusFilter })
</script>

<template>
  <div ref="rootRef" class="relative" :data-testid="testId" @focusout="onRootFocusOut">
    <button
      ref="triggerRef"
      type="button"
      :data-testid="`${testId}-trigger`"
      :disabled="isDisabled"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :class="
        cn(
          'border-input bg-background flex min-h-11 w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        )
      "
      @focus="onTriggerFocus"
      @pointerdown="onTriggerPointerDown"
      @click="onTriggerClick"
    >
      <slot name="trigger-leading" :selected="selectedOption" />
      <span :class="cn('min-w-0 flex-1 truncate', !selectedOption && 'text-muted-foreground')">
        <slot name="trigger-label" :selected="selectedOption" :label="triggerLabel">
          {{ triggerLabel }}
        </slot>
      </span>
    </button>

    <div
      v-if="open"
      class="border-input bg-popover absolute top-full left-0 z-50 mt-1 w-full rounded-md border p-2 shadow-md"
      :data-testid="`${testId}-panel`"
      role="listbox"
      @mousedown.stop
      @click.stop
      @pointerdown.stop
    >
      <Input
        v-model="filterQuery"
        :placeholder="filterPlaceholder"
        autocomplete="off"
        :data-testid="`${testId}-filter`"
        class="min-h-9"
        @keydown="onFilterKeydown"
      />

      <div
        class="mt-1.5 max-h-40 overflow-y-auto rounded-sm border border-border/60"
        :data-testid="`${testId}-list`"
      >
        <button
          v-if="allowNone"
          type="button"
          role="option"
          :aria-selected="modelValue == null"
          :data-testid="`${testId}-none`"
          class="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent"
          @mousedown.prevent
          @click="selectNone"
        >
          <slot name="none-leading" />
          <span>{{ noneLabel }}</span>
        </button>

        <button
          v-for="option in visibleOptions"
          :key="option.value"
          type="button"
          role="option"
          :aria-selected="isSelected(option)"
          :data-testid="`${testId}-option-${option.value}`"
          :class="
            cn(
              'flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent',
              highlightedValue === option.value && 'bg-accent',
            )
          "
          @mousedown.prevent
          @click="selectOption(option)"
        >
          <slot name="option-leading" :option="option" />
          <span class="min-w-0 flex-1">
            <slot name="option-label" :option="option">
              {{ option.label }}
            </slot>
          </span>
        </button>

        <p
          v-if="showMinCharsHint"
          class="text-muted-foreground px-2 py-2 text-sm"
          :data-testid="`${testId}-min-chars`"
        >
          {{ minCharsHintText }}
        </p>

        <p
          v-else-if="queryMeetsMinLength && debouncedQuery && visibleOptions.length === 0"
          class="text-muted-foreground px-2 py-2 text-sm"
          :data-testid="`${testId}-empty`"
        >
          {{ emptyFilterMessage }} “{{ debouncedQuery }}”
        </p>
      </div>
    </div>
  </div>
</template>
