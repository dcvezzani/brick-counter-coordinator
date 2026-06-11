<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useSession } from '@/composables/useSession'

const router = useRouter()
const { createSession, setCurrentWorker } = useSession()

const setNumber = ref('70404-1')
const pricing = ref('stock')
const condition = ref('mixed')
const overwrite = ref('consolidate')

function submit() {
  const displayName = sessionStorage.getItem('workerDisplayName') || 'Session Lead'
  const { session, worker } = createSession({
    setNumber: setNumber.value,
    name: `${setNumber.value} part-out`,
    displayName,
    partOutOptions: {
      pricing: pricing.value,
      condition: condition.value,
      overwrite: overwrite.value === 'overwrite',
    },
  })
  setCurrentWorker(worker)
  router.push(`/session/${session.id}/import`)
}
</script>

<template>
  <AppShell>
    <div class="flex flex-col gap-6" data-testid="new-session-view">
      <div>
        <h2 class="text-xl font-semibold">New session</h2>
        <p class="text-sm text-muted-foreground">
          Set number and Bricklink part-out options. Server fetch is simulated in storyboard.
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <Label for="set-number">Set number</Label>
        <Input
          id="set-number"
          v-model="setNumber"
          placeholder="70404-1"
          class="min-h-11"
          data-testid="set-number"
        />
      </div>

      <div class="flex flex-col gap-2">
        <Label>Pricing basis</Label>
        <RadioGroup v-model="pricing" class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <RadioGroupItem id="price-stock" value="stock" />
            <Label for="price-stock">Stock guide</Label>
          </div>
          <div class="flex items-center gap-2">
            <RadioGroupItem id="price-last6" value="last6" />
            <Label for="price-last6">Last 6 months sales</Label>
          </div>
        </RadioGroup>
      </div>

      <div class="flex flex-col gap-2">
        <Label>Condition mix</Label>
        <RadioGroup v-model="condition" class="flex gap-4">
          <div class="flex items-center gap-2">
            <RadioGroupItem id="cond-new" value="new" />
            <Label for="cond-new">New</Label>
          </div>
          <div class="flex items-center gap-2">
            <RadioGroupItem id="cond-used" value="used" />
            <Label for="cond-used">Used</Label>
          </div>
          <div class="flex items-center gap-2">
            <RadioGroupItem id="cond-mixed" value="mixed" />
            <Label for="cond-mixed">Mixed</Label>
          </div>
        </RadioGroup>
      </div>

      <div class="flex flex-col gap-2">
        <Label>Existing lots</Label>
        <RadioGroup v-model="overwrite" class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <RadioGroupItem id="opt-consolidate" value="consolidate" />
            <Label for="opt-consolidate">Consolidate with existing</Label>
          </div>
          <div class="flex items-center gap-2">
            <RadioGroupItem id="opt-overwrite" value="overwrite" />
            <Label for="opt-overwrite">Overwrite existing</Label>
          </div>
        </RadioGroup>
      </div>

      <Button class="min-h-11" data-testid="submit-new-session" @click="submit">
        Create session & fetch part-out
      </Button>
    </div>
  </AppShell>
</template>
