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
import { normalizeDisplayName } from '@/lib/display-name'
import { sessionPhaseLabel } from '@/lib/session-phase-labels'
import { sessionRouteForPhase } from '@/lib/session-phase-routing'

const router = useRouter()
const { listSessions, joinSession, setCurrentWorker, getSession } = useSession()
const isDev = import.meta.env.DEV

const displayName = ref('')
const pageError = ref(null)
const dialogError = ref(null)
const showSessions = ref(false)
const sessions = ref([])

function persistWorkerSession(worker, sessionId) {
  const normalized = normalizeDisplayName(worker.displayName)
  sessionStorage.setItem('workerDisplayName', normalized)
  sessionStorage.setItem('currentSessionId', sessionId)
  sessionStorage.setItem('currentWorkerId', worker.id)
}

function openExisting() {
  pageError.value = null
  dialogError.value = null
  if (!normalizeDisplayName(displayName.value)) {
    pageError.value = 'Enter your display name first'
    return
  }
  sessions.value = listSessions().filter((s) => s.phase !== 'closed')
  showSessions.value = true
}

function selectSession(sessionId) {
  dialogError.value = null
  try {
    const worker = joinSession(sessionId, displayName.value)
    setCurrentWorker(worker)
    persistWorkerSession(worker, sessionId)
    const session = getSession(sessionId)
    if (session?.phase === 'closed') {
      dialogError.value = 'That session is closed.'
      return
    }
    showSessions.value = false
    router.push(sessionRouteForPhase(sessionId, session?.phase))
  } catch (e) {
    if (e.code === 'DUPLICATE_NAME') {
      dialogError.value =
        'That name is already taken in this session — pick another name.'
    } else {
      dialogError.value = e.message
    }
  }
}

function createNew() {
  pageError.value = null
  const normalized = normalizeDisplayName(displayName.value)
  if (!normalized) {
    pageError.value = 'Enter your display name first'
    return
  }
  sessionStorage.setItem('workerDisplayName', normalized)
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

      <Alert v-if="pageError" variant="destructive">
        <AlertDescription>{{ pageError }}</AlertDescription>
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
        <Button
          v-if="isDev"
          variant="ghost"
          class="min-h-11"
          data-testid="dev-swipe-number"
          @click="router.push('/dev/swipe-number')"
        >
          Dev: Swipe number playground
        </Button>
        <Button
          v-if="isDev"
          variant="ghost"
          class="min-h-11"
          data-testid="dev-stepped-swipe-number"
          @click="router.push('/dev/stepped-swipe-number')"
        >
          Dev: Stepped swipe number playground
        </Button>
      </div>
    </div>

    <Dialog v-model:open="showSessions">
      <DialogContent data-testid="open-sessions-dialog">
        <DialogHeader>
          <DialogTitle>Open sessions</DialogTitle>
          <DialogDescription>
            Select a session to join as {{ normalizeDisplayName(displayName) || displayName }}
          </DialogDescription>
        </DialogHeader>

        <Alert v-if="dialogError" variant="destructive">
          <AlertDescription>{{ dialogError }}</AlertDescription>
        </Alert>

        <p
          v-if="sessions.length === 0"
          class="text-sm text-muted-foreground"
          data-testid="open-sessions-empty"
        >
          No open sessions right now
        </p>

        <ul v-else class="flex flex-col gap-2">
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
                  {{ session.setNumber }} · {{ sessionPhaseLabel(session.phase) }} ·
                  {{ session.workerCount }} workers
                </span>
              </div>
            </Button>
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  </AppShell>
</template>
