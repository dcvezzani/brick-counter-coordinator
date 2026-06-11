<script setup>
import { reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import TernarySwipeControl from '@/components/TernarySwipeControl.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

const route = useRoute()

const PICK_STATUS_VALUES = new Set(['pending', 'moved_to_storage', 'needs_new_location'])

function pickStatusFromQuery() {
  const value = route.query.pick_status
  return typeof value === 'string' && PICK_STATUS_VALUES.has(value) ? value : 'pending'
}

const defaultValue = ref('')
const organizerValue = ref(pickStatusFromQuery())
const formValue = ref(pickStatusFromQuery())
const disabledValue = ref('moved_to_storage')
const disabled = ref(false)

const narrowExamples = [
  { id: 'full', label: 'Full width (parent default)', class: 'w-full' },
  { id: 'sm', label: 'max-w-sm (24rem)', class: 'w-full max-w-sm' },
  { id: 'xs', label: 'max-w-xs (20rem)', class: 'w-full max-w-xs' },
  { id: '48', label: 'max-w-48 (12rem) — table-cell-ish', class: 'w-full max-w-48' },
  { id: '40', label: 'max-w-40 (10rem) — very narrow', class: 'w-full max-w-40' },
]

const heightExamples = [
  { id: 'default', label: 'Default — min-h-11 (2.75rem / 44px)', trackClass: '' },
  { id: 'h9', label: 'min-h-9 (2.25rem / 36px)', trackClass: 'min-h-9' },
  { id: 'h8', label: 'min-h-8 (2rem / 32px)', trackClass: 'min-h-8' },
  { id: 'h7', label: 'min-h-7 (1.75rem / 28px)', trackClass: 'min-h-7' },
  { id: 'fixed-h8', label: 'Fixed h-8 — no min-height growth', trackClass: 'h-8 min-h-0' },
  { id: 'fixed-h6', label: 'Fixed h-6 (1.5rem / 24px) — very short', trackClass: 'h-6 min-h-0' },
]

const narrowValues = reactive(
  Object.fromEntries(narrowExamples.map(({ id }) => [id, pickStatusFromQuery()])),
)
const heightValues = reactive(
  Object.fromEntries(heightExamples.map(({ id }) => [id, pickStatusFromQuery()])),
)

watch(
  () => route.query.pick_status,
  () => {
    const value = pickStatusFromQuery()
    organizerValue.value = value
    formValue.value = value
  },
)

const lastChange = ref(null)
const formPayload = ref(null)

function onDefaultChange(value) {
  lastChange.value = { source: 'default', value, at: new Date().toLocaleTimeString() }
}

function onOrganizerChange(value) {
  lastChange.value = { source: 'organizer', value, at: new Date().toLocaleTimeString() }
}

function onFormSubmit(event) {
  const data = Object.fromEntries(new FormData(event.target))
  formPayload.value = data
}
</script>

<template>
  <AppShell>
    <div class="flex flex-col gap-6" data-testid="ternary-swipe-demo-view">
      <div>
        <h2 class="text-xl font-semibold">Ternary swipe playground</h2>
        <p class="text-sm text-muted-foreground">
          Two-option swipe control with a trailing X segment — same layout pattern as the segmented
          control.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Default labels</CardTitle>
          <CardDescription>
            Drag the thumb, tap a segment, use arrow keys when focused, or tap/drop on the X to
            clear selection.
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <TernarySwipeControl
            v-model="defaultValue"
            name="demo-default"
            test-id="demo-default"
            @change="onDefaultChange"
          />
          <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt class="text-muted-foreground">v-model</dt>
            <dd data-testid="demo-default-value">{{ defaultValue || '(empty)' }}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organizer pick-list preset</CardTitle>
          <CardDescription> Same values planned for List lots organizer rows. </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <TernarySwipeControl
            v-model="organizerValue"
            name="demo-organizer"
            test-id="demo-organizer"
            neutral-value="pending"
            option1-value="moved_to_storage"
            option2-value="needs_new_location"
            option1-label="Moved"
            option2-label="New loc"
            @change="onOrganizerChange"
          />
          <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt class="text-muted-foreground">v-model</dt>
            <dd data-testid="demo-organizer-value">{{ organizerValue }}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disabled</CardTitle>
          <CardDescription>Toggle disabled to verify the control is inert.</CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <input
              id="demo-disabled-toggle"
              v-model="disabled"
              type="checkbox"
              class="size-4 rounded border"
            />
            <Label for="demo-disabled-toggle">Disabled</Label>
          </div>
          <TernarySwipeControl
            v-model="disabledValue"
            name="demo-disabled"
            test-id="demo-disabled"
            neutral-value="pending"
            option1-value="moved_to_storage"
            option2-value="needs_new_location"
            option1-label="Moved"
            option2-label="New loc"
            :disabled="disabled"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Narrow widths</CardTitle>
          <CardDescription>
            Constrain a wrapper around the control — the component is
            <code class="rounded bg-muted px-1 py-0.5">w-full</code>
            and fills its parent. Set
            <code class="rounded bg-muted px-1 py-0.5">max-w-*</code>
            on the parent, not on TernarySwipeControl itself. Try
            <code class="rounded bg-muted px-1 py-0.5">?pick_status=pending</code>
            (or
            <code class="rounded bg-muted px-1 py-0.5">moved_to_storage</code>
            /
            <code class="rounded bg-muted px-1 py-0.5">needs_new_location</code>
            ) to seed the organizer and form examples only; width/height rows keep independent
            state.
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-6">
          <div
            v-for="example in narrowExamples"
            :key="example.id"
            class="flex flex-col gap-2"
            :data-testid="`demo-narrow-${example.id}`"
          >
            <p class="text-sm text-muted-foreground">{{ example.label }}</p>
            <div :class="example.class">
              <TernarySwipeControl
                v-model="narrowValues[example.id]"
                :name="`demo-narrow-${example.id}`"
                :test-id="`demo-narrow-${example.id}`"
                neutral-value="pending"
                option1-value="moved_to_storage"
                option2-value="needs_new_location"
                option1-label="Moved"
                option2-label="New loc"
              />
            </div>
            <p class="text-xs text-muted-foreground">value: {{ narrowValues[example.id] }}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Varying heights</CardTitle>
          <CardDescription>
            Default track height is
            <code class="rounded bg-muted px-1 py-0.5">min-h-11</code>
            for touch targets. Pass
            <code class="rounded bg-muted px-1 py-0.5">track-class</code>
            to shorten the control (e.g. compact table rows). Examples use
            <code class="rounded bg-muted px-1 py-0.5">max-w-xs</code>
            width.
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-6">
          <div
            v-for="example in heightExamples"
            :key="example.id"
            class="flex flex-col gap-2"
            :data-testid="`demo-height-${example.id}`"
          >
            <p class="text-sm text-muted-foreground">{{ example.label }}</p>
            <div class="w-full max-w-xs">
              <TernarySwipeControl
                v-model="heightValues[example.id]"
                :name="`demo-height-${example.id}`"
                :test-id="`demo-height-${example.id}`"
                :track-class="example.trackClass"
                neutral-value="pending"
                option1-value="moved_to_storage"
                option2-value="needs_new_location"
                option1-label="Moved"
                option2-label="New loc"
              />
            </div>
            <p class="text-xs text-muted-foreground">value: {{ heightValues[example.id] }}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form submission</CardTitle>
          <CardDescription>
            Hidden input value is included when the form is submitted. Current
            <code class="rounded bg-muted px-1 py-0.5">pick_status</code>: {{ formValue }}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form class="flex flex-col gap-4" data-testid="demo-form" @submit="onFormSubmit">
            <div class="w-full max-w-xs">
              <TernarySwipeControl
                v-model="formValue"
                name="pick_status"
                test-id="demo-form-control"
                neutral-value="pending"
                option1-value="moved_to_storage"
                option2-value="needs_new_location"
                option1-label="Moved"
                option2-label="New loc"
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
            <code class="rounded bg-muted px-1 py-0.5">{{ lastChange.value || '(empty)' }}</code>
            at {{ lastChange.at }}
          </p>
        </CardContent>
      </Card>
    </div>
  </AppShell>
</template>
