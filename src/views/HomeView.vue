<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSession } from '@/composables/useSession'

const router = useRouter()
const { listSessions, joinSession, setCurrentWorker } = useSession()
const isDev = import.meta.env.DEV

const displayName = ref('')
const error = ref(null)
const showSessions = ref(false)
const sessions = ref([])

function openExisting() {
  error.value = null
  if (!displayName.value.trim()) {
    error.value = 'Enter your display name first'
    return
  }
  sessions.value = listSessions()
  showSessions.value = true
}

function selectSession(sessionId) {
  try {
    const worker = joinSession(sessionId, displayName.value.trim())
    setCurrentWorker(worker)
    showSessions.value = false
    router.push(`/session/${sessionId}/cups`)
  } catch (e) {
    if (e.code === 'DUPLICATE_NAME') {
      error.value = 'That name is already taken in this session — pick another name.'
    } else {
      error.value = e.message
    }
  }
}

function createNew() {
  error.value = null
  if (!displayName.value.trim()) {
    error.value = 'Enter your display name first'
    return
  }
  sessionStorage.setItem('workerDisplayName', displayName.value.trim())
  router.push('/session/new')
}
</script>

<template>
  <AppShell>
    <div class="flex flex-col gap-6" data-testid="home-view">
      <div>
        <h2 class="text-xl font-semibold">Welcome</h2>
        <p class="text-sm text-muted-foreground">
          Enter your name, then create or join a counting session.
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <Label for="display-name">Display name</Label>
        <Input
          id="display-name"
          v-model="displayName"
          placeholder="Your name"
          class="min-h-11"
          data-testid="display-name"
        />
      </div>

      <Alert v-if="error" variant="destructive">
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>

      <div class="flex flex-col gap-2">
        <Button class="min-h-11" data-testid="create-session" @click="createNew">
          Create new session
        </Button>
        <Button
          variant="outline"
          class="min-h-11"
          data-testid="enter-existing"
          @click="openExisting"
        >
          Enter existing session
        </Button>
        <Button
          v-if="isDev"
          variant="ghost"
          class="min-h-11"
          data-testid="dev-ternary-swipe"
          @click="router.push('/dev/ternary-swipe')"
        >
          Dev: Ternary swipe playground
        </Button>
        <Button
          v-if="isDev"
          variant="ghost"
          class="min-h-11"
          data-testid="dev-segmented-swipe"
          @click="router.push('/dev/segmented-swipe')"
        >
          Dev: Segmented swipe playground
        </Button>
      </div>
    </div>

    <Dialog v-model:open="showSessions">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open sessions</DialogTitle>
          <DialogDescription>Select a session to join as {{ displayName }}</DialogDescription>
        </DialogHeader>
        <ul class="flex flex-col gap-2">
          <li v-for="session in sessions" :key="session.id">
            <Button
              variant="outline"
              class="h-auto min-h-11 w-full justify-start py-3"
              :data-testid="`session-${session.id}`"
              @click="selectSession(session.id)"
            >
              <div class="flex flex-col items-start gap-0.5 text-left">
                <span class="font-medium">{{ session.name }}</span>
                <span class="text-xs text-muted-foreground">
                  {{ session.setNumber }} · {{ session.phase }} · {{ session.workerCount }} workers
                </span>
              </div>
            </Button>
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  </AppShell>
</template>
