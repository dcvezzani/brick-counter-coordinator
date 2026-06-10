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
} = useSession()

const session = computed(() => getSession(sessionId.value))
const allRows = computed(() => getReconciliation(sessionId.value))
const mismatches = computed(() => allRows.value.filter((r) => r.delta !== 0))
const showExport = ref(false)
const exportResult = ref(null)

function resolve(row) {
  resolveReconciliation(sessionId.value, row.lineId)
}

function reconciled() {
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

      <Alert v-if="mismatches.length">
        <AlertDescription>
          {{ mismatches.length }} discrepanc{{ mismatches.length === 1 ? 'y' : 'ies' }} found
        </AlertDescription>
      </Alert>

      <LotListTable
        :session-id="sessionId"
        :rows="mismatches.length ? mismatches : allRows"
        mode="reconciliation"
        @resolve="resolve"
      />

      <Button class="min-h-11" data-testid="reconciled" @click="reconciled">
        Reconciled — export XML
      </Button>
    </div>

    <Dialog v-model:open="showExport">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk update XML ready</DialogTitle>
          <DialogDescription>
            Download the XML and paste it into Bricklink bulk update validation.
          </DialogDescription>
        </DialogHeader>
        <div class="flex flex-col gap-2">
          <Button @click="downloadXml">Download XML</Button>
          <Button variant="outline" as="a" :href="exportResult?.validationUrl" target="_blank">
            Open Bricklink validation page
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </AppShell>
</template>
