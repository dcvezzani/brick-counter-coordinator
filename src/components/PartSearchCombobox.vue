<script setup>
import { ref, watch } from 'vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession } from '@/composables/useSession'

const props = defineProps({
  modelValue: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'select'])

const { searchParts } = useSession()
const query = ref(props.modelValue)
const results = ref([])

watch(
  () => props.modelValue,
  (value) => {
    query.value = value
  },
)

watch(query, (value) => {
  emit('update:modelValue', value)
  if (value.length >= 2) {
    results.value = searchParts(value)
  } else {
    results.value = []
  }
})

function pickPart(part) {
  query.value = part.partId
  emit('update:modelValue', part.partId)
  emit('select', part)
  results.value = []
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <Label for="part-search">Part number</Label>
    <Input
      id="part-search"
      v-model="query"
      placeholder="Search parts…"
      autocomplete="off"
      data-testid="part-search"
      class="min-h-11"
    />
    <ul
      v-if="results.length"
      class="rounded-md border bg-popover text-sm shadow-sm"
      data-testid="part-search-results"
    >
      <li v-for="part in results" :key="part.partId">
        <button
          type="button"
          class="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-accent"
          @click="pickPart(part)"
        >
          <span class="font-medium">{{ part.partId }}</span>
          <span class="text-xs text-muted-foreground">{{ part.name }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
