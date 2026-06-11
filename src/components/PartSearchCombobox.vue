<script setup>
import { computed, ref } from 'vue'
import { Label } from '@/components/ui/label'
import FilterablePicker from '@/components/FilterablePicker.vue'
import { useSession } from '@/composables/useSession'

const props = defineProps({
  modelValue: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'select'])

const pickerRef = ref(null)
const { searchParts, resolvePartId, lookupPart } = useSession()

const partOptions = computed(() =>
  searchParts('').map((part) => ({
    value: part.partId,
    label: part.partId,
    data: part,
  })),
)

const resolvedPart = computed(() => lookupPart(props.modelValue))

function filterPartOptions(query) {
  return searchParts(query.trim()).map((part) => ({
    value: part.partId,
    label: part.partId,
    data: part,
  }))
}

function onUpdate(value) {
  if (value == null) {
    emit('update:modelValue', '')
    return
  }
  emit('update:modelValue', resolvePartId(String(value)))
}

function onSelect(option) {
  if (!option) return
  const part = option.data ?? option
  emit('select', part)
}

function onClose({ filterQuery, fromSelection }) {
  if (fromSelection) return
  const raw = filterQuery?.trim() || props.modelValue
  const resolved = resolvePartId(raw)
  if (!resolved) return
  emit('update:modelValue', resolved)
  const part = lookupPart(resolved)
  if (part) emit('select', part)
}

function focus() {
  pickerRef.value?.focusTrigger()
}

defineExpose({ focus })
</script>

<template>
  <div class="flex flex-col gap-2">
    <Label>
      Part number
      <span
        v-if="resolvedPart"
        class="text-muted-foreground text-xs"
        data-testid="part-search-resolved"
      >
        {{ resolvedPart.name }}
      </span>
    </Label>
    <FilterablePicker
      ref="pickerRef"
      :model-value="modelValue || null"
      :options="partOptions"
      :filter-options="filterPartOptions"
      :min-filter-chars="2"
      placeholder="Search parts…"
      filter-placeholder="Filter parts"
      empty-filter-message="No parts match"
      test-id="part-search"
      @update:model-value="onUpdate"
      @select="onSelect"
      @close="onClose"
    >
      <template #option-label="{ option }">
        <span class="block font-medium">{{ option.data.partId }}</span>
        <span class="text-muted-foreground block text-xs">{{ option.data.name }}</span>
      </template>
    </FilterablePicker>
  </div>
</template>
