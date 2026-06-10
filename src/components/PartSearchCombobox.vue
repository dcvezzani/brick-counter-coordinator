<script setup>
import { computed, ref, watch } from 'vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession } from '@/composables/useSession'

const props = defineProps({
  modelValue: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'select'])

const { searchParts, resolvePartId, lookupPart } = useSession()
const query = ref(props.modelValue)
const results = ref([])

const resolvedPart = computed(() => lookupPart(query.value))

watch(
  () => props.modelValue,
  (value) => {
    query.value = value
  },
)

watch(query, (value) => {
  emit('update:modelValue', value)
  if (value.trim().length >= 2) {
    results.value = searchParts(value)
  } else {
    results.value = []
  }
})

function commitPartId() {
  const resolved = resolvePartId(query.value)
  if (!resolved) return
  query.value = resolved
  emit('update:modelValue', resolved)
  const part = lookupPart(resolved)
  if (part) emit('select', part)
  results.value = []
}

function pickPart(part) {
  query.value = part.partId
  emit('update:modelValue', part.partId)
  emit('select', part)
  results.value = []
}

function onBlur() {
  commitPartId()
}

function onKeydown(event) {
  if (event.key !== 'Enter') return
  event.preventDefault()
  if (results.value.length === 1) {
    pickPart(results.value[0])
    return
  }
  const exact = lookupPart(query.value)
  if (exact) {
    pickPart(exact)
    return
  }
  if (results.value.length > 0) {
    pickPart(results.value[0])
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <Label for="part-search">Part number
    <span
      v-if="resolvedPart"
      class="text-muted-foreground text-xs"
      data-testid="part-search-resolved"
    >
      {{ resolvedPart.name }}
    </span>
    </Label>
    <Input
      id="part-search"
      v-model="query"
      placeholder="Search parts…"
      autocomplete="off"
      data-testid="part-search"
      class="min-h-11"
      @blur="onBlur"
      @keydown="onKeydown"
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
          @mousedown.prevent
          @click="pickPart(part)"
        >
          <span class="font-medium">{{ part.partId }}</span>
          <span class="text-xs text-muted-foreground">{{ part.name }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
