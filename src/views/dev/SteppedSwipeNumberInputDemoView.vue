<script setup>
import { reactive, ref } from 'vue'
import AppShell from '@/components/AppShell.vue'
import SteppedSwipeNumberInput from '@/components/SteppedSwipeNumberInput.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const defaultValue = ref(1)
const negativeValue = ref(0)
const cappedValue = ref(8)
const disabledValue = ref(3)
const disabled = ref(false)
const formValue = ref(4)
const lowValue = ref(7)
const leftIncrementValue = ref(0)
const downIncrementValue = ref(0)

const narrowExamples = [
  { id: 'full', label: 'Full width', class: 'w-full' },
  { id: 'sm', label: 'max-w-sm', class: 'w-full max-w-sm' },
  { id: '48', label: 'max-w-48 — table-cell-ish', class: 'w-full max-w-48' },
]

const narrowValues = reactive(
  Object.fromEntries(narrowExamples.map(({ id }) => [id, id === 'full' ? 2 : 0])),
)

const lastChange = ref(null)
const formPayload = ref(null)

function onChange(source, value) {
  lastChange.value = { source, value, at: new Date().toLocaleTimeString() }
}

function onFormSubmit(event) {
  formPayload.value = Object.fromEntries(new FormData(event.target))
}
</script>

<template>
  <AppShell>
    <div class="flex flex-col gap-6" data-testid="stepped-swipe-number-demo-view">
      <div>
        <h2 class="text-xl font-semibold">Stepped swipe number playground</h2>
        <p class="text-sm text-muted-foreground">
          Default axis: slide <strong>right</strong> or <strong>up</strong> to increment (±1 per
          horizontal slot, ±10 vertical). At rest the swipe zone shows plain <strong>+</strong> and
          <strong>−</strong>; while displaced, labels reflect distance from the rest origin (e.g.
          <strong>+3</strong> three slots toward increment). Moving back toward center reduces the
          shown amount to zero. Hold at any extreme for 1s to repeat. The <strong>+</strong> label
          always sits on the configured increment side (right/left, up/down). Axis props flip both
          drag direction and label placement.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Default (min 0)</CardTitle>
          <CardDescription>
            Default axis: + on the right, − on the left; +10 above when displaced.
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <SteppedSwipeNumberInput
            v-model="defaultValue"
            name="demo-default"
            test-id="demo-default"
            @change="onChange('default', $event)"
          />
          <p class="text-sm text-muted-foreground">
            Value:
            <code class="rounded bg-muted px-1 py-0.5">{{ defaultValue }}</code>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horizontal increment left</CardTitle>
          <CardDescription>
            <code>horizontal-increment-direction="left"</code> — slide left for +1; + label on the
            left.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SteppedSwipeNumberInput
            v-model="leftIncrementValue"
            name="demo-left-inc"
            test-id="demo-left-inc"
            horizontal-increment-direction="left"
            @change="onChange('left-inc', $event)"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vertical increment down</CardTitle>
          <CardDescription>
            <code>vertical-increment-direction="down"</code> — slide down for +10; +10 label on the
            bottom.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SteppedSwipeNumberInput
            v-model="downIncrementValue"
            name="demo-down-inc"
            test-id="demo-down-inc"
            vertical-increment-direction="down"
            @change="onChange('down-inc', $event)"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Floor rule demo (value 7, min 0)</CardTitle>
          <CardDescription>
            Drag down one vertical slot (−10) — value should become 0, not −3.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SteppedSwipeNumberInput
            v-model="lowValue"
            name="demo-floor"
            test-id="demo-floor"
            @change="onChange('floor', $event)"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allow negative</CardTitle>
        </CardHeader>
        <CardContent>
          <SteppedSwipeNumberInput
            v-model="negativeValue"
            name="demo-negative"
            test-id="demo-negative"
            allow-negative
            :min="-20"
            @change="onChange('negative', $event)"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Max cap (10)</CardTitle>
        </CardHeader>
        <CardContent>
          <SteppedSwipeNumberInput
            v-model="cappedValue"
            name="demo-capped"
            test-id="demo-capped"
            :max="10"
            @change="onChange('capped', $event)"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disabled</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <SteppedSwipeNumberInput
            v-model="disabledValue"
            name="demo-disabled"
            test-id="demo-disabled"
            :disabled="disabled"
          />
          <Button variant="outline" class="min-h-11 w-fit" @click="disabled = !disabled">
            Toggle disabled
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Narrow widths</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <div v-for="example in narrowExamples" :key="example.id" class="flex flex-col gap-2">
            <p class="text-sm font-medium">{{ example.label }}</p>
            <div :class="example.class">
              <SteppedSwipeNumberInput
                v-model="narrowValues[example.id]"
                :name="`demo-narrow-${example.id}`"
                :test-id="`demo-narrow-${example.id}`"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form submission</CardTitle>
          <CardDescription>Hidden input posts the numeric value.</CardDescription>
        </CardHeader>
        <CardContent>
          <form class="flex flex-col gap-4" data-testid="demo-form" @submit.prevent="onFormSubmit">
            <div class="w-full max-w-md">
              <SteppedSwipeNumberInput
                v-model="formValue"
                name="count"
                test-id="demo-form-control"
              />
            </div>
            <Button type="submit" class="min-h-11" data-testid="demo-form-submit">
              Submit form
            </Button>
            <p v-if="formPayload" class="text-sm" data-testid="demo-form-payload">
              Submitted:
              <code class="rounded bg-muted px-1 py-0.5">{{ JSON.stringify(formPayload) }}</code>
            </p>
          </form>
        </CardContent>
      </Card>

      <Card v-if="lastChange">
        <CardHeader>
          <CardTitle>Last change event</CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-sm" data-testid="demo-last-change">
            <span class="text-muted-foreground">{{ lastChange.source }}</span>
            →
            <code class="rounded bg-muted px-1 py-0.5">{{ lastChange.value }}</code>
            at {{ lastChange.at }}
          </p>
        </CardContent>
      </Card>
    </div>
  </AppShell>
</template>
