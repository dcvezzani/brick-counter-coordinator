<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ListChecks, Printer, Users } from '@lucide/vue'
import AppShell from '@/components/AppShell.vue'
import LotListTable from '@/components/LotListTable.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSession } from '@/composables/useSession'

const route = useRoute()
const sessionId = computed(() => route.params.sessionId)
const mode = computed(() => route.query.mode || 'cup')
const cupId = computed(() => route.query.cupId || null)

const {
  getSession,
  getLots,
  getPickListItems,
  updatePickListItem,
  completePickList,
  splitPickList,
  deleteLot,
  getCurrentWorker,
  colorName,
  canDeclareReadyToImport,
  declareReadyToImport,
} = useSession()

const session = computed(() => getSession(sessionId.value))
const currentWorker = computed(() => getCurrentWorker())

const lotToDelete = ref(null)
const deleteDialogOpen = ref(false)

const rows = computed(() => {
  if (mode.value === 'organizer') {
    const workerId = currentWorker.value?.id ?? session.value.workers[0]?.id
    const items = getPickListItems(sessionId.value, workerId)
    const lots = getLots(sessionId.value)
    return items.map((item) => {
      const lot = lots.find((l) => l.id === item.lotId)
      return {
        ...lot,
        pickStatus: item.status,
        pickItemId: item.id,
      }
    })
  }
  return getLots(sessionId.value, { cupId: cupId.value })
})

const deleteDialogDescription = computed(() => {
  if (!lotToDelete.value) return ''
  const partId = lotToDelete.value.partId ?? 'Unknown part'
  const color = colorName(lotToDelete.value.colorId)
  return `Remove lot ${partId} / ${color} from this session? This cannot be undone.`
})

function onStatusChange(row, status) {
  updatePickListItem(sessionId.value, row.pickItemId, status)
}

function requestDelete(row) {
  lotToDelete.value = row
  deleteDialogOpen.value = true
}

function confirmDelete() {
  if (!lotToDelete.value) return
  const lotId = lotToDelete.value.lotId ?? lotToDelete.value.id
  deleteLot(sessionId.value, lotId)
  lotToDelete.value = null
  deleteDialogOpen.value = false
}

function cancelDelete() {
  lotToDelete.value = null
  deleteDialogOpen.value = false
}

function markComplete() {
  const workerId = currentWorker.value?.id ?? session.value.workers[0]?.id
  completePickList(sessionId.value, workerId)
}

function runSplit() {
  splitPickList(sessionId.value)
}

const declareImportEnabled = computed(() => canDeclareReadyToImport(sessionId.value))

function onDeclareReadyToImport() {
  declareReadyToImport(sessionId.value)
}

function printList() {
  window.print()
}
</script>

<template>
  <AppShell>
    <div class="flex flex-col gap-4 print:block" data-testid="list-lots-view">
      <div class="flex items-center justify-between gap-2 print:hidden">
        <div>
          <h2 class="text-xl font-semibold">List lots</h2>
          <p class="text-sm text-muted-foreground">
            Mode: <span data-testid="lots-mode">{{ mode }}</span>
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            v-if="mode === 'organizer' && !session.pickListSplit"
            size="sm"
            class="inline-flex items-center gap-2"
            data-testid="split-pick-list"
            @click="runSplit"
          >
            <Users class="size-4 shrink-0" />
            Split list
          </Button>
          <Button
            v-if="mode === 'organizer'"
            size="sm"
            variant="outline"
            class="inline-flex items-center gap-2"
            @click="printList"
          >
            <Printer class="size-4 shrink-0" />
            Print
          </Button>
        </div>
      </div>

      <LotListTable
        :session-id="sessionId"
        :rows="rows"
        :mode="mode"
        :show-actions="true"
        @status-change="onStatusChange"
        @delete="requestDelete"
      />

      <Button
        v-if="mode === 'organizer'"
        class="inline-flex min-h-11 items-center gap-2 print:hidden"
        data-testid="mark-complete"
        @click="markComplete"
      >
        <ListChecks class="size-4 shrink-0" />
        Mark entire list complete
      </Button>

      <Button
        v-if="mode === 'organizer' && session.phase === 'organizing'"
        class="inline-flex min-h-11 items-center gap-2 print:hidden"
        data-testid="declare-ready-import"
        :disabled="!declareImportEnabled"
        @click="onDeclareReadyToImport"
      >
        Declare ready to import
      </Button>

      <Dialog v-model:open="deleteDialogOpen">
        <DialogContent data-testid="delete-lot-dialog">
          <DialogHeader>
            <DialogTitle>Delete lot?</DialogTitle>
            <DialogDescription>{{ deleteDialogDescription }}</DialogDescription>
          </DialogHeader>
          <DialogFooter class="gap-2 sm:gap-0">
            <Button variant="outline" data-testid="delete-lot-cancel" @click="cancelDelete">
              Cancel
            </Button>
            <Button variant="destructive" data-testid="delete-lot-confirm" @click="confirmDelete">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </AppShell>
</template>
