<script setup>
import { computed, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  lines: { type: Array, required: true },
})

const emit = defineEmits(['exclude', 'restore', 'bulk-exclude'])

const { colorName } = useSession()
const selected = ref([])
const tab = ref('included')

const includedLines = computed(() => props.lines.filter((l) => !l.excluded))
const excludedLines = computed(() => props.lines.filter((l) => l.excluded))

function toggleSelect(lineId, checked) {
  if (checked) {
    selected.value = [...selected.value, lineId]
  } else {
    selected.value = selected.value.filter((id) => id !== lineId)
  }
}

function bulkExclude() {
  emit('bulk-exclude', selected.value)
  selected.value = []
}
</script>

<template>
  <div class="flex flex-col gap-3" data-testid="part-out-import-table">
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-lg font-semibold">Part-out import</h2>
      <Button
        v-if="selected.length"
        size="sm"
        variant="outline"
        data-testid="bulk-exclude"
        @click="bulkExclude"
      >
        Exclude selected ({{ selected.length }})
      </Button>
    </div>

    <Tabs v-model="tab">
      <TabsList class="grid w-full grid-cols-2">
        <TabsTrigger value="included" data-testid="tab-included">
          Included ({{ includedLines.length }})
        </TabsTrigger>
        <TabsTrigger value="excluded" data-testid="tab-excluded">
          Excluded ({{ excludedLines.length }})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="included">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-10" />
              <TableHead>Part</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Cond</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="line in includedLines" :key="line.id">
              <TableCell>
                <Checkbox
                  :checked="selected.includes(line.id)"
                  @update:checked="(v) => toggleSelect(line.id, v)"
                />
              </TableCell>
              <TableCell>{{ line.partId }}</TableCell>
              <TableCell>{{ colorName(line.colorId) }}</TableCell>
              <TableCell>{{ line.condition }}</TableCell>
              <TableCell>{{ line.qtyExpected }}</TableCell>
              <TableCell class="text-xs text-muted-foreground">{{ line.remarks }}</TableCell>
              <TableCell>
                <Button size="sm" variant="ghost" @click="emit('exclude', line.id)">
                  Exclude
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TabsContent>

      <TabsContent value="excluded">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="line in excludedLines" :key="line.id">
              <TableCell>{{ line.partId }}</TableCell>
              <TableCell>{{ colorName(line.colorId) }}</TableCell>
              <TableCell>{{ line.qtyExpected }}</TableCell>
              <TableCell>
                <Badge variant="outline">{{ line.remarks }}</Badge>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" @click="emit('restore', line.id)">
                  Restore
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TabsContent>
    </Tabs>
  </div>
</template>
