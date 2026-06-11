<script setup>
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import ColorPicker from '@/components/ColorPicker.vue'
import PartSearchCombobox from '@/components/PartSearchCombobox.vue'
import SwipeNumberInput from '@/components/SwipeNumberInput.vue'
import { useSession } from '@/composables/useSession'
import {
  persistLotConditionChoice,
  resolveDefaultLotCondition,
} from '@/lib/lot-entry-defaults'

const props = defineProps({
  sessionId: { type: String, required: true },
  lotId: { type: String, default: null },
})

const router = useRouter()
const { getSession, getLot, saveLot, getColorsForPart, resolvePartId } = useSession()

const partSearchRef = useTemplateRef('partSearchRef')
const colorPickerRef = useTemplateRef('colorPickerRef')

const partId = ref('')
const colorId = ref(null)
/** @type {import('vue').Ref<'U' | 'N'>} */
const condition = ref('U')
const qty = ref(1)
const duplicateMessage = ref(null)
const colors = computed(() => getColorsForPart(partId.value))

function applyDefaultCondition() {
  condition.value = resolveDefaultLotCondition(props.sessionId, getSession(props.sessionId))
}

watch(
  () => props.lotId,
  (id) => {
    if (!id) return
    const lot = getLot(props.sessionId, id)
    if (lot) {
      partId.value = lot.partId
      colorId.value = lot.colorId
      condition.value = lot.condition
      qty.value = lot.qty
    }
  },
  { immediate: true },
)

watch(partId, (next, prev) => {
  if (prev != null && prev !== '' && next !== prev) {
    colorId.value = null
  }
})

function resetForAnother() {
  const keepPart = partId.value
  partId.value = keepPart
  colorId.value = null
  applyDefaultCondition()
  qty.value = 1
  duplicateMessage.value = null
}

function resetForNew() {
  partId.value = ''
  colorId.value = null
  applyDefaultCondition()
  qty.value = 1
  duplicateMessage.value = null
}

async function handleSave(addAnother = false) {
  duplicateMessage.value = null
  const result = saveLot(props.sessionId, {
    id: props.lotId,
    partId: resolvePartId(partId.value),
    colorId: colorId.value,
    condition: condition.value,
    qty: Number(qty.value),
  })

  if (result.duplicate) {
    duplicateMessage.value = `Lot already exists — counted by ${result.existing.createdBy} (qty ${result.existing.qty})`
    return
  }

  persistLotConditionChoice(
    props.sessionId,
    getSession(props.sessionId),
    condition.value,
  )

  if (addAnother) {
    resetForAnother()
    await nextTick()
    colorPickerRef.value?.focus()
    return
  }

  if (props.lotId) {
    await router.replace(`/session/${props.sessionId}/lot`)
  }
  resetForNew()
  await nextTick()
  partSearchRef.value?.focus()
}

onMounted(async () => {
  if (!props.lotId) {
    applyDefaultCondition()
    await nextTick()
    partSearchRef.value?.focus()
  }
})
</script>

<template>
  <div class="flex flex-col gap-4" data-testid="lot-form">
    <PartSearchCombobox ref="partSearchRef" v-model="partId" />

    <div class="flex flex-col gap-2">
      <Label>Color</Label>
      <ColorPicker ref="colorPickerRef" v-model="colorId" :colors="colors" />
    </div>

    <div class="flex flex-col gap-2">
      <Label>Condition</Label>
      <RadioGroup v-model="condition" class="flex gap-4">
        <div class="flex items-center gap-2">
          <RadioGroupItem id="cond-n" value="N" data-testid="cond-n" />
          <Label for="cond-n">New</Label>
        </div>
        <div class="flex items-center gap-2">
          <RadioGroupItem id="cond-u" value="U" data-testid="cond-u" />
          <Label for="cond-u">Used</Label>
        </div>
      </RadioGroup>
    </div>

    <div class="flex flex-col gap-2">
      <Label>Count</Label>
      <SwipeNumberInput
        v-model="qty"
        name="qty"
        :min="0"
        test-id="lot-qty"
      />
    </div>

    <Alert v-if="duplicateMessage" variant="destructive" data-testid="duplicate-alert">
      <AlertTitle>Duplicate lot</AlertTitle>
      <AlertDescription>{{ duplicateMessage }}</AlertDescription>
    </Alert>

    <div class="flex flex-row gap-2">
      <Button class="min-h-11 min-w-0 flex-1" data-testid="save-lot" @click="handleSave(false)">
        Save
      </Button>
      <Button
        variant="outline"
        class="min-h-11 min-w-0 flex-1"
        data-testid="save-and-add-another"
        @click="handleSave(true)"
      >
        Save and Add Another
      </Button>
    </div>
  </div>
</template>
