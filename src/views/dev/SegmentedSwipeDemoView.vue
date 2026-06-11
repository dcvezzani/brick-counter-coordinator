<script setup>
import { reactive, ref } from 'vue'
import AppShell from '@/components/AppShell.vue'
import SegmentedSwipeControl from '@/components/SegmentedSwipeControl.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const mockupOptions = [
  { value: 'moved', label: 'Moved' },
  { value: 'new_loc', label: 'New Loc' },
  { value: 'trashed', label: 'Trashed' },
]

const fiveOptions = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
  { value: 'd', label: 'Delta' },
  { value: 'e', label: 'Echo' },
]

const mockupValue = ref('')
const fiveValue = ref('c')
const noNeutralValue = ref('moved')
const formValue = ref('')
const disabledValue = ref('new_loc')
const disabled = ref(false)

const narrowExamples = [
  { id: 'full', label: 'Full width', class: 'w-full' },
  { id: 'sm', label: 'max-w-sm', class: 'w-full max-w-sm' },
  { id: '48', label: 'max-w-48 — table-cell-ish', class: 'w-full max-w-48' },
]

const narrowValues = reactive(Object.fromEntries(narrowExamples.map(({ id }) => [id, ''])))

const lastChange = ref(null)
const formPayload = ref(null)

function onMockupChange(value) {
  lastChange.value = { source: 'mockup', value, at: new Date().toLocaleTimeString() }
}

function onFormSubmit(event) {
  formPayload.value = Object.fromEntries(new FormData(event.target))
}
</script>

<template>
  <AppShell>
    <div class="flex flex-col gap-6" data-testid="segmented-swipe-demo-view">
      <div>
        <h2 class="text-xl font-semibold">Segmented swipe playground</h2>
        <p class="text-sm text-muted-foreground">
          N-option swipe control with equal segment labels and a trailing X segment to clear
          selection.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Three-option mockup (Moved / New Loc / Trashed)</CardTitle>
          <CardDescription>
            Drag the thumb across segments, tap a segment, use arrow keys when focused, or tap or
            drop on the red X to return to None.
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <SegmentedSwipeControl
            v-model="mockupValue"
            name="demo-mockup"
            test-id="demo-mockup"
            neutral-value="none"
            :options="mockupOptions"
            @change="onMockupChange"
          />
          <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt class="text-muted-foreground">v-model</dt>
            <dd data-testid="demo-mockup-value">{{ mockupValue || 'none' }}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Five options</CardTitle>
          <CardDescription>
            Same interaction with more segments — practical limit is a handful of short labels.
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <SegmentedSwipeControl
            v-model="fiveValue"
            name="demo-five"
            test-id="demo-five"
            :options="fiveOptions"
          />
          <p class="text-sm text-muted-foreground">value: {{ fiveValue }}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>No neutral (always one selected)</CardTitle>
          <CardDescription>
            <code class="rounded bg-muted px-1 py-0.5">allow-neutral="false"</code>
            hides the X segment and keeps one option always selected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SegmentedSwipeControl
            v-model="noNeutralValue"
            name="demo-no-neutral"
            test-id="demo-no-neutral"
            :allow-neutral="false"
            :options="mockupOptions"
          />
          <p class="mt-3 text-sm text-muted-foreground">value: {{ noNeutralValue }}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disabled toggle</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <Button
            variant="outline"
            class="min-h-11 self-start"
            data-testid="demo-disabled-toggle"
            @click="disabled = !disabled"
          >
            {{ disabled ? 'Enable' : 'Disable' }} control
          </Button>
          <SegmentedSwipeControl
            v-model="disabledValue"
            name="demo-disabled"
            test-id="demo-disabled"
            :disabled="disabled"
            :options="mockupOptions"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Narrow widths</CardTitle>
          <CardDescription>
            Width constraints on the parent — labels truncate when space is tight.
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <div v-for="example in narrowExamples" :key="example.id" class="flex flex-col gap-2">
            <p class="text-sm font-medium">{{ example.label }}</p>
            <div :class="example.class">
              <SegmentedSwipeControl
                v-model="narrowValues[example.id]"
                :name="`demo-narrow-${example.id}`"
                :test-id="`demo-narrow-${example.id}`"
                :options="mockupOptions"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form submission</CardTitle>
          <CardDescription>
            Hidden input posts the committed value. Neutral maps to
            <code class="rounded bg-muted px-1 py-0.5">none</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form class="flex flex-col gap-4" data-testid="demo-form" @submit.prevent="onFormSubmit">
            <div class="w-full max-w-md">
              <SegmentedSwipeControl
                v-model="formValue"
                name="disposition"
                test-id="demo-form-control"
                neutral-value="none"
                :options="mockupOptions"
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
            <code class="rounded bg-muted px-1 py-0.5">{{ lastChange.value || 'none' }}</code>
            at {{ lastChange.at }}
          </p>
        </CardContent>
      </Card>
    </div>
  </AppShell>
</template>
