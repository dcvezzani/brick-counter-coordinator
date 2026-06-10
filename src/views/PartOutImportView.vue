<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import PartOutImportTable from '@/components/PartOutImportTable.vue'
import { Button } from '@/components/ui/button'
import { useSession } from '@/composables/useSession'

const route = useRoute()
const router = useRouter()
const sessionId = computed(() => route.params.sessionId)

const {
  getSession,
  getPartOutLines,
  setPartOutLineExcluded,
  bulkExcludePartOutLines,
  confirmPartOut,
} = useSession()

const session = computed(() => getSession(sessionId.value))
const lines = computed(() => getPartOutLines(sessionId.value))

function exclude(lineId) {
  setPartOutLineExcluded(sessionId.value, lineId, true)
}

function restore(lineId) {
  setPartOutLineExcluded(sessionId.value, lineId, false)
}

function bulkExclude(lineIds) {
  bulkExcludePartOutLines(sessionId.value, lineIds)
}

function confirm() {
  confirmPartOut(sessionId.value)
  router.push(`/session/${sessionId.value}/cups`)
}
</script>

<template>
  <AppShell>
    <div class="flex flex-col gap-4" data-testid="part-out-import-view">
      <div>
        <h2 class="text-xl font-semibold">{{ session.name }}</h2>
        <p class="text-sm text-muted-foreground">
          Curate the fetched part-out list before counting begins.
        </p>
      </div>

      <PartOutImportTable
        :session-id="sessionId"
        :lines="lines"
        @exclude="exclude"
        @restore="restore"
        @bulk-exclude="bulkExclude"
      />

      <Button class="min-h-11" data-testid="confirm-import" @click="confirm">
        Confirm & begin counting
      </Button>
    </div>
  </AppShell>
</template>
