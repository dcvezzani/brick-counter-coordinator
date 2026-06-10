<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { colorSwatch, filterColors, getColorById } from '@/lib/bricklink-colors'

const props = defineProps({
  colors: { type: Array, default: () => [] },
  modelValue: { type: Number, default: null },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const filterQuery = ref('')
const debouncedQuery = ref('')
const rootRef = ref(null)

let debounceTimer = null

watch(filterQuery, (value) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = value
  }, 150)
})

onBeforeUnmount(() => {
  clearTimeout(debounceTimer)
})

const selectedColor = computed(() =>
  props.modelValue != null ? getColorById(props.colors, props.modelValue) : null,
)

const filteredColors = computed(() => filterColors(props.colors, debouncedQuery.value))

const highlightedColorId = computed(() => filteredColors.value[0]?.id ?? null)

const isDisabled = computed(() => props.disabled || props.colors.length === 0)

function togglePanel() {
  if (isDisabled.value) return
  if (open.value) {
    closePanel()
    return
  }
  open.value = true
  filterQuery.value = ''
  debouncedQuery.value = ''
  nextTick(() => {
    rootRef.value?.querySelector('[data-testid="color-picker-filter"]')?.focus()
  })
}

function closePanel() {
  open.value = false
  filterQuery.value = ''
  debouncedQuery.value = ''
}

function selectNone() {
  emit('update:modelValue', null)
  closePanel()
}

function selectColor(color) {
  emit('update:modelValue', color.id)
  closePanel()
}

function selectHighlighted() {
  const first = filteredColors.value[0]
  if (first) selectColor(first)
}

function onFilterKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    selectHighlighted()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closePanel()
  }
}

function onRootFocusOut(event) {
  const root = rootRef.value
  if (!root || root.contains(event.relatedTarget)) return
  closePanel()
}
</script>

<template>
  <div
    ref="rootRef"
    class="relative"
    data-testid="color-picker"
    @focusout="onRootFocusOut"
  >
    <button
      type="button"
      data-testid="color-picker-trigger"
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
      @click="togglePanel"
    >
      <span
        data-testid="color-picker-trigger-swatch"
        :class="
          cn(
            'size-5 shrink-0 rounded-sm border border-border',
            !selectedColor && 'border-dashed bg-background',
          )
        "
        :style="selectedColor ? { backgroundColor: colorSwatch(selectedColor) } : undefined"
      />
      <span :class="cn('truncate', !selectedColor && 'text-muted-foreground')">
        {{
          selectedColor
            ? `${selectedColor.name} (${selectedColor.id})`
            : colors.length
              ? 'Select color'
              : 'Select a part first'
        }}
      </span>
    </button>

    <div
      v-if="open"
      class="border-input bg-popover absolute top-full left-0 z-50 mt-1 w-full rounded-md border p-2 shadow-md"
      data-testid="color-picker-panel"
      role="listbox"
      @mousedown.stop
      @click.stop
      @pointerdown.stop
    >
      <Input
        v-model="filterQuery"
        placeholder="Filter colors"
        autocomplete="off"
        data-testid="color-picker-filter"
        class="min-h-9"
        @keydown="onFilterKeydown"
      />

      <div
        class="mt-1.5 max-h-40 overflow-y-auto rounded-sm border border-border/60"
        data-testid="color-picker-list"
      >
        <button
          type="button"
          role="option"
          :aria-selected="modelValue == null"
          data-testid="color-picker-none"
          class="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent"
          @mousedown.prevent
          @click="selectNone"
        >
          <span class="size-4 shrink-0 rounded-sm border border-dashed border-border bg-background" />
          None
        </button>

        <button
          v-for="color in filteredColors"
          :key="color.id"
          type="button"
          role="option"
          :aria-selected="modelValue === color.id"
          :data-testid="`color-option-${color.id}`"
          :class="
            cn(
              'flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent',
              highlightedColorId === color.id && 'bg-accent',
            )
          "
          @mousedown.prevent
          @click="selectColor(color)"
        >
          <span
            class="size-4 shrink-0 rounded-sm border border-border"
            :style="{ backgroundColor: colorSwatch(color) }"
          />
          {{ color.name }} ({{ color.id }})
        </button>

        <p
          v-if="debouncedQuery && filteredColors.length === 0"
          class="text-muted-foreground px-2 py-2 text-sm"
          data-testid="color-picker-empty"
        >
          No colors match “{{ debouncedQuery }}”
        </p>
      </div>
    </div>
  </div>
</template>
