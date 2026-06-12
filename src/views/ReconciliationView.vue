<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import LotListTable from '@/components/LotListTable.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSession } from '@/composables/useSession'

const route = useRoute()
const sessionId = computed(() => route.params.sessionId)

const {
  getSession,
  getReconciliation,
  resolveReconciliation,
  exportReconciliationXml,
  canExportReconciliation,
  exportBlockReason,
} = useSession()

const session = computed(() => getSession(sessionId.value))
const allRows = computed(() => getReconciliation(sessionId.value))
const openDiscrepancies = computed(() =>
  allRows.value.filter((r) => r.delta !== 0 && !r.resolved),
)
const matchedRows = computed(() => allRows.value.filter((r) => r.delta === 0))
const showMatched = ref(false)
const showExport = ref(false)
const exportResult = ref(null)

const exportEnabled = computed(() => canExportReconciliation(sessionId.value))
const exportHint = computed(() => {
  const reason = exportBlockReason(sessionId.value)
  if (reason === 'discrepancies') return 'Resolve all discrepancies before exporting.'
  if (reason === 'organize') return 'Complete organizer lists before exporting.'
  if (reason === 'phase') return 'Export is available during the organizing phase.'
  return ''
})

function resolve(row) {
  resolveReconciliation(sessionId.value, row.lineId)
}

function reconciled() {
  if (!exportEnabled.value) return
  exportResult.value = exportReconciliationXml(sessionId.value)
  showExport.value = true
}

function downloadXml() {
  const blob = new Blob([exportResult.value.xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${session.value.setNumber}-bulk-update.xml`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <AppShell>
    <div class="flex flex-col gap-4" data-testid="reconciliation-view">
      <div>
        <h2 class="text-xl font-semibold">Part-out reconciliation</h2>
        <p class="text-sm text-muted-foreground">
          Compare session counts to included part-out lines.
        </p>
      </div>

      <Alert v-if="openDiscrepancies.length">
        <AlertDescription>
          {{ openDiscrepancies.length }} discrepanc{{ openDiscrepancies.length === 1 ? 'y' : 'ies' }}
          found
        </AlertDescription>
      </Alert>

      <LotListTable
        :session-id="sessionId"
        :rows="openDiscrepancies"
        mode="reconciliation"
        @resolve="resolve"
      />

      <Button
        v-if="matchedRows.length"
        variant="link"
        class="h-auto justify-start p-0"
        data-testid="reconciliation-matched-toggle"
        @click="showMatched = !showMatched"
      >
        {{ showMatched ? 'Hide matched lines' : `View matched lines (${matchedRows.length})` }}
      </Button>

      <LotListTable
        v-if="showMatched && matchedRows.length"
        :session-id="sessionId"
        :rows="matchedRows"
        mode="reconciliation"
        :show-actions="false"
      />

      <p
        v-if="exportHint"
        class="text-sm text-muted-foreground"
        data-testid="reconciliation-export-hint"
      >
        {{ exportHint }}
      </p>

      <Button
        class="min-h-11"
        data-testid="reconciled"
        :disabled="!exportEnabled"
        @click="reconciled"
      >
        Reconciled — export XML
      </Button>
    </div>

    <Dialog v-model:open="showExport">
      <DialogContent data-testid="export-dialog">
        <DialogHeader>
          <DialogTitle>Bulk update XML ready</DialogTitle>
          <DialogDescription>
            Download the XML and paste it into Bricklink bulk update validation.
          </DialogDescription>
        </DialogHeader>
        <div class="flex flex-col gap-2">
          <Button data-testid="export-download" @click="downloadXml">Download XML</Button>
          <Button
            variant="outline"
            as="a"
            data-testid="export-validation-link"
            :href="exportResult?.validationUrl"
            target="_blank"
          >
            Open Bricklink validation page
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </AppShell>
</template>
