<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import ColorPicker from '@/components/ColorPicker.vue'
import PartSearchCombobox from '@/components/PartSearchCombobox.vue'
import { useSession } from '@/composables/useSession'

const props = defineProps({
  sessionId: { type: String, required: true },
  lotId: { type: String, default: null },
})

const router = useRouter()
const { getLot, saveLot, getColorsForPart } = useSession()

const partId = ref('')
const colorId = ref(null)
const condition = ref('U')
const qty = ref(1)
const duplicateMessage = ref(null)
const colors = computed(() => getColorsForPart(partId.value))

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

function resetForAnother() {
  const keepPart = partId.value
  partId.value = keepPart
  colorId.value = null
  condition.value = 'U'
  qty.value = 1
  duplicateMessage.value = null
}

async function handleSave(addAnother = false) {
  duplicateMessage.value = null
  const result = saveLot(props.sessionId, {
    id: props.lotId,
    partId: partId.value,
    colorId: colorId.value,
    condition: condition.value,
    qty: Number(qty.value),
  })

  if (result.duplicate) {
    duplicateMessage.value = `Lot already exists — counted by ${result.existing.createdBy} (qty ${result.existing.qty})`
    return
  }

  if (addAnother) {
    resetForAnother()
    return
  }

  router.push(`/session/${props.sessionId}/cups`)
}
</script>

<template>
  <div class="flex flex-col gap-4" data-testid="lot-form">
    <PartSearchCombobox v-model="partId" />

    <div class="flex flex-col gap-2">
      <Label>Color</Label>
      <ColorPicker v-model="colorId" :colors="colors" />
    </div>

    <div class="flex flex-col gap-2">
      <Label>Condition</Label>
      <RadioGroup v-model="condition" class="flex gap-4">
        <div class="flex items-center gap-2">
          <RadioGroupItem id="cond-n" value="N" />
          <Label for="cond-n">New</Label>
        </div>
        <div class="flex items-center gap-2">
          <RadioGroupItem id="cond-u" value="U" />
          <Label for="cond-u">Used</Label>
        </div>
      </RadioGroup>
    </div>

    <div class="flex flex-col gap-2">
      <Label for="qty">Count</Label>
      <Input id="qty" v-model.number="qty" type="number" min="1" class="min-h-11" data-testid="lot-qty" />
    </div>

    <Alert v-if="duplicateMessage" variant="destructive" data-testid="duplicate-alert">
      <AlertTitle>Duplicate lot</AlertTitle>
      <AlertDescription>{{ duplicateMessage }}</AlertDescription>
    </Alert>

    <div class="flex flex-col gap-2">
      <Button class="min-h-11" data-testid="save-lot" @click="handleSave(false)">Save</Button>
      <Button
        variant="outline"
        class="min-h-11"
        data-testid="save-and-add-another"
        @click="handleSave(true)"
      >
        Save and Add Another
      </Button>
    </div>
  </div>
</template>
