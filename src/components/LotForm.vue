<script setup>
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import ColorPicker from '@/components/ColorPicker.vue'
import PartSearchCombobox from '@/components/PartSearchCombobox.vue'
import SteppedSwipeNumberInput from '@/components/SteppedSwipeNumberInput.vue'
import { useSession } from '@/composables/useSession'
import { appConfig } from '@/lib/app-config'
import { resolveDefaultLotCondition } from '@/lib/lot-entry-defaults'

const props = defineProps({
  sessionId: { type: String, required: true },
  lotId: { type: String, default: null },
})

const router = useRouter()
const { getSession, getLot, saveLot, getColorsForPart, resolvePartId } = useSession()

const partSearchRef = useTemplateRef('partSearchRef')
const colorPickerRef = useTemplateRef('colorPickerRef')
const qtyInputRef = useTemplateRef('qtyInputRef')

const partId = ref('')
const colorId = ref(null)
const qty = ref(appConfig.lotEntry.defaultQty)
const showDuplicateConfirm = ref(false)
/** @type {import('vue').Ref<{ createdBy: string, qty: number, enteredQty: number } | null>} */
const pendingDuplicate = ref(null)
const pendingAddAnother = ref(false)

const colors = computed(() => getColorsForPart(partId.value))

const sessionCondition = computed(() =>
  resolveDefaultLotCondition(props.sessionId, getSession(props.sessionId)),
)

const conditionLabel = computed(() => (sessionCondition.value === 'N' ? 'New' : 'Used'))

watch(
  () => props.lotId,
  (id) => {
    if (!id) return
    const lot = getLot(props.sessionId, id)
    if (lot) {
      partId.value = lot.partId
      colorId.value = lot.colorId
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
  qty.value = appConfig.lotEntry.defaultQty
}

function resetForNew() {
  partId.value = ''
  colorId.value = null
  qty.value = appConfig.lotEntry.defaultQty
}

function buildPayload(mergeDuplicate = false) {
  return {
    id: props.lotId,
    partId: resolvePartId(partId.value),
    colorId: colorId.value,
    condition: sessionCondition.value,
    qty: Number(qty.value),
    mergeDuplicate,
  }
}

async function completeSaveSuccess(addAnother) {
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

async function handleSave(addAnother = false) {
  showDuplicateConfirm.value = false
  pendingDuplicate.value = null

  const result = saveLot(props.sessionId, buildPayload())

  if (result.duplicate) {
    pendingDuplicate.value = {
      ...result.existing,
      enteredQty: Number(qty.value),
    }
    pendingAddAnother.value = addAnother
    showDuplicateConfirm.value = true
    return
  }

  await completeSaveSuccess(addAnother)
}

async function confirmDuplicateMerge() {
  const addAnother = pendingAddAnother.value
  saveLot(props.sessionId, buildPayload(true))
  showDuplicateConfirm.value = false
  pendingDuplicate.value = null
  await completeSaveSuccess(addAnother)
}

function cancelDuplicateMerge() {
  showDuplicateConfirm.value = false
  pendingDuplicate.value = null
}

function focusPartField() {
  partSearchRef.value?.focus()
}

function focusColorField() {
  colorPickerRef.value?.focus()
}

function focusCountField() {
  qtyInputRef.value?.focus()
}

onMounted(async () => {
  if (!props.lotId) {
    await nextTick()
    partSearchRef.value?.focus()
  }
})
</script>

<template>
  <div class="flex flex-col gap-4" data-testid="lot-form">
    <PartSearchCombobox
      ref="partSearchRef"
      v-model="partId"
      @tab-forward="focusColorField"
      @tab-backward="focusPartField"
    />

    <div class="flex flex-col gap-2">
      <Label>Color</Label>
      <ColorPicker
        ref="colorPickerRef"
        v-model="colorId"
        :colors="colors"
        @tab-forward="focusCountField"
        @tab-backward="focusPartField"
      />
    </div>

    <p class="text-sm" tabindex="-1" data-testid="lot-condition">Condition: {{ conditionLabel }}</p>

    <div class="flex flex-col gap-2">
      <Label>Count</Label>
      <SteppedSwipeNumberInput
        ref="qtyInputRef"
        v-model="qty"
        name="qty"
        :min="appConfig.lotEntry.countMin"
        test-id="lot-qty"
        @tab-backward="focusColorField"
      />
    </div>

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

    <Dialog v-model:open="showDuplicateConfirm">
      <DialogContent data-testid="duplicate-confirm-dialog">
        <DialogHeader>
          <DialogTitle>Duplicate lot</DialogTitle>
          <DialogDescription>
            Already counted by {{ pendingDuplicate?.createdBy ?? 'Unknown' }} (qty
            {{ pendingDuplicate?.qty ?? 0 }}). Add {{ pendingDuplicate?.enteredQty ?? 0 }} more?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="flex flex-row gap-2 sm:justify-end">
          <Button variant="outline" data-testid="duplicate-cancel" @click="cancelDuplicateMerge">
            Cancel
          </Button>
          <Button data-testid="duplicate-confirm" @click="confirmDuplicateMerge">Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
