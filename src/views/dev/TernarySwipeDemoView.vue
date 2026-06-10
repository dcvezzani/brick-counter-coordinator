<script setup>
import { ref } from 'vue'
import AppShell from '@/components/AppShell.vue'
import TernarySwipeControl from '@/components/TernarySwipeControl.vue'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'

const defaultValue = ref('')
const organizerValue = ref('pending')
const disabledValue = ref('moved_to_storage')
const disabled = ref(false)

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
          Temporary dev view for exercising drag, snap, tap, and hidden form input behavior.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Default labels</CardTitle>
          <CardDescription>
            Drag the thumb, tap track halves, or use arrow keys when the track is focused.
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
          <CardDescription>
            Same values planned for List lots organizer rows.
          </CardDescription>
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
          <CardTitle>Form submission</CardTitle>
          <CardDescription>
            Hidden input value is included when the form is submitted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form class="flex flex-col gap-4" data-testid="demo-form" @submit="onFormSubmit">
            <TernarySwipeControl
              v-model="organizerValue"
              name="pick_status"
              test-id="demo-form-control"
              neutral-value="pending"
              option1-value="moved_to_storage"
              option2-value="needs_new_location"
              option1-label="Moved"
              option2-label="New loc"
            />
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
