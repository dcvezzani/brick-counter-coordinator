<script setup>
import { computed, ref } from 'vue'
import { cn } from '@/lib/utils'
import { colorSwatch } from '@/lib/bricklink-colors'
import FilterablePicker from '@/components/FilterablePicker.vue'

const props = defineProps({
  colors: { type: Array, default: () => [] },
  modelValue: { type: Number, default: null },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const pickerRef = ref(null)

const colorOptions = computed(() =>
  props.colors.map((color) => ({
    value: color.id,
    label: `${color.name} (${color.id})`,
    data: color,
  })),
)

const isDisabled = computed(() => props.disabled || props.colors.length === 0)

function onUpdate(value) {
  emit('update:modelValue', value)
}

function focus() {
  pickerRef.value?.focusTrigger()
}

defineExpose({ focus })
</script>

<template>
  <FilterablePicker
    ref="pickerRef"
    :model-value="modelValue"
    :options="colorOptions"
    :disabled="isDisabled"
    allow-none
    placeholder="Select color"
    empty-placeholder="Select a part first"
    filter-placeholder="Filter colors"
    empty-filter-message="No colors match"
    test-id="color-picker"
    @update:model-value="onUpdate"
  >
    <template #trigger-leading="{ selected }">
      <span
        data-testid="color-picker-trigger-swatch"
        :class="
          cn(
            'size-5 shrink-0 rounded-sm border border-border',
            !selected && 'border-dashed bg-background',
          )
        "
        :style="
          selected?.data ? { backgroundColor: colorSwatch(selected.data) } : undefined
        "
      />
    </template>

    <template #none-leading>
      <span class="size-4 shrink-0 rounded-sm border border-dashed border-border bg-background" />
    </template>

    <template #option-leading="{ option }">
      <span
        class="size-4 shrink-0 rounded-sm border border-border"
        :style="{ backgroundColor: colorSwatch(option.data) }"
      />
    </template>
  </FilterablePicker>
</template>
