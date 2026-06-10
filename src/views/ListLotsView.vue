<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import LotListTable from '@/components/LotListTable.vue'
import { Button } from '@/components/ui/button'
import { useSession } from '@/composables/useSession'

const route = useRoute()
const sessionId = computed(() => route.params.sessionId)
const mode = computed(() => route.query.mode || 'cup')
const cupId = computed(() => route.query.cupId || null)

const {
  getSession,
  getLots,
  getPickListItems,
  getReconciliation,
  updatePickListItem,
  completePickList,
  splitPickList,
  getCurrentWorker,
  workerName,
} = useSession()

const session = computed(() => getSession(sessionId.value))
const currentWorker = computed(() => getCurrentWorker())

const rows = computed(() => {
  if (mode.value === 'reconciliation') {
    return getReconciliation(sessionId.value).filter((r) => r.delta !== 0)
  }
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

function onStatusChange(row, status) {
  updatePickListItem(sessionId.value, row.pickItemId, status)
}

function markComplete() {
  const workerId = currentWorker.value?.id ?? session.value.workers[0]?.id
  completePickList(sessionId.value, workerId)
}

function runSplit() {
  splitPickList(sessionId.value)
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
            data-testid="split-pick-list"
            @click="runSplit"
          >
            Split list
          </Button>
          <Button v-if="mode === 'organizer'" size="sm" variant="outline" @click="printList">
            Print
          </Button>
        </div>
      </div>

      <LotListTable
        :session-id="sessionId"
        :rows="rows"
        :mode="mode"
        :show-actions="mode !== 'reconciliation' || true"
        @status-change="onStatusChange"
      />

      <Button
        v-if="mode === 'organizer'"
        class="min-h-11 print:hidden"
        data-testid="mark-complete"
        @click="markComplete"
      >
        Mark entire list complete
      </Button>
    </div>
  </AppShell>
</template>
