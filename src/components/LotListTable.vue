<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Archive,
  CheckCircle,
  MapPin,
  Pencil,
  Trash2,
} from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSession } from '@/composables/useSession'

const props = defineProps({
  sessionId: { type: String, required: true },
  rows: { type: Array, required: true },
  mode: { type: String, default: 'cup' },
  showActions: { type: Boolean, default: true },
})

const emit = defineEmits(['status-change', 'resolve', 'delete'])

const router = useRouter()
const { colorName } = useSession()

const statusLabel = {
  pending: 'Pending',
  moved_to_storage: 'Moved to storage',
  needs_new_location: 'Needs new location',
}

function openLot(row) {
  const lotId = row.lotId ?? row.id
  router.push(`/session/${props.sessionId}/lot/${lotId}`)
}

function requestDelete(row) {
  emit('delete', row)
}

const title = computed(() => {
  if (props.mode === 'organizer') return 'Organizer pick list'
  if (props.mode === 'reconciliation') return 'Discrepancies'
  return 'Lots in cup'
})
</script>

<template>
  <div class="flex flex-col gap-3" data-testid="lot-list-table">
    <h2 class="text-lg font-semibold">{{ title }}</h2>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Part</TableHead>
          <TableHead>Color</TableHead>
          <TableHead v-if="mode === 'reconciliation'">Expected</TableHead>
          <TableHead v-if="mode === 'reconciliation'">Counted</TableHead>
          <TableHead v-else>Qty</TableHead>
          <TableHead v-if="mode === 'organizer'">Status</TableHead>
          <TableHead v-if="showActions">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in rows" :key="row.id ?? row.lineId">
          <TableCell class="font-medium">{{ row.partId }}</TableCell>
          <TableCell>{{ colorName(row.colorId) }}</TableCell>
          <TableCell v-if="mode === 'reconciliation'">{{ row.qtyExpected }}</TableCell>
          <TableCell v-if="mode === 'reconciliation'">{{ row.qtyCounted }}</TableCell>
          <TableCell v-else>{{ row.qty }}</TableCell>
          <TableCell v-if="mode === 'organizer'">
            <Badge :variant="row.status === 'pending' ? 'outline' : 'secondary'">
              {{ statusLabel[row.pickStatus ?? row.status] ?? row.status }}
            </Badge>
          </TableCell>
          <TableCell v-if="showActions">
            <div class="flex flex-wrap gap-1">
              <Button
                v-if="mode !== 'reconciliation'"
                size="sm"
                variant="outline"
                class="inline-flex items-center gap-2"
                data-testid="lot-edit"
                @click="openLot(row)"
              >
                <Pencil class="size-4 shrink-0" />
                Edit
              </Button>
              <Button
                v-if="mode !== 'reconciliation'"
                size="sm"
                variant="outline"
                class="inline-flex items-center gap-2"
                data-testid="lot-delete"
                @click="requestDelete(row)"
              >
                <Trash2 class="size-4 shrink-0" />
                Delete
              </Button>
              <template v-if="mode === 'organizer'">
                <Button
                  size="sm"
                  variant="outline"
                  class="inline-flex items-center gap-2"
                  @click="emit('status-change', row, 'moved_to_storage')"
                >
                  <Archive class="size-4 shrink-0" />
                  Moved
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  class="inline-flex items-center gap-2"
                  @click="emit('status-change', row, 'needs_new_location')"
                >
                  <MapPin class="size-4 shrink-0" />
                  New loc
                </Button>
              </template>
              <Button
                v-if="mode === 'reconciliation' && !row.resolved"
                size="sm"
                variant="outline"
                class="inline-flex items-center gap-2"
                @click="emit('resolve', row)"
              >
                <CheckCircle class="size-4 shrink-0" />
                Resolve
              </Button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
