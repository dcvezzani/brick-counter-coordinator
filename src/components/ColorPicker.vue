<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  colors: { type: Array, required: true },
  modelValue: { type: Number, default: null },
})

const emit = defineEmits(['update:modelValue'])

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>

<template>
  <div class="flex flex-wrap gap-2" data-testid="color-picker">
    <button
      v-for="color in colors"
      :key="color.id"
      type="button"
      :aria-label="color.name"
      :aria-pressed="selected === color.id"
      :class="
        cn(
          'size-11 rounded-full border-2 transition-all',
          selected === color.id ? 'border-primary ring-2 ring-primary/30' : 'border-border',
        )
      "
      :style="{ backgroundColor: color.hex }"
      @click="selected = color.id"
    />
  </div>
</template>
