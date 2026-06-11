<script setup>
import { reactive, ref } from 'vue'
import AppShell from '@/components/AppShell.vue'
import SwipeNumberInput from '@/components/SwipeNumberInput.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const defaultValue = ref(1)
const leftHandleValue = ref(5)
const negativeValue = ref(0)
const cappedValue = ref(8)
const disabledValue = ref(3)
const disabled = ref(false)
const formValue = ref(4)

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
    <div class="flex flex-col gap-6" data-testid="swipe-number-demo-view">
      <div>
        <h2 class="text-xl font-semibold">Swipe number playground</h2>
        <p class="text-sm text-muted-foreground">
          Tap the field for the native number keypad. Drag the center handle toward
          <strong>+</strong> to count up or toward <strong>−</strong> to count down — farther from
          center counts faster. Release to snap the handle home.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Default (handle right, min 0)</CardTitle>
          <CardDescription>
            Number field on the left; slide the center handle toward + or − on the right.
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <SwipeNumberInput
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
          <CardTitle>Slide control on the left</CardTitle>
          <CardDescription>+ sits next to the number; − on the outer edge.</CardDescription>
        </CardHeader>
        <CardContent>
          <SwipeNumberInput
            v-model="leftHandleValue"
            name="demo-left"
            test-id="demo-left"
            handle-position="left"
            @change="onChange('left', $event)"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allow negative</CardTitle>
        </CardHeader>
        <CardContent>
          <SwipeNumberInput
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
          <SwipeNumberInput
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
          <SwipeNumberInput
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
              <SwipeNumberInput
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
              <SwipeNumberInput v-model="formValue" name="count" test-id="demo-form-control" />
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
