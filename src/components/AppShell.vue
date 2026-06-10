<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Badge } from '@/components/ui/badge'
import SessionNav from '@/components/SessionNav.vue'
import { useSession } from '@/composables/useSession'

const route = useRoute()
const { isFixtureMode, storyboardBadge } = useSession()

const sessionId = computed(() => route.params.sessionId)
const showNav = computed(() => Boolean(sessionId.value))
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-background">
    <header class="border-b bg-card px-4 py-3">
      <div class="mx-auto flex max-w-lg items-center justify-between gap-2">
        <div class="flex flex-col gap-1">
          <h1 class="text-base font-semibold">Brick Counter</h1>
          <p v-if="isFixtureMode" class="text-xs text-muted-foreground">
            {{ storyboardBadge }}
          </p>
        </div>
        <Badge v-if="isFixtureMode" variant="secondary" data-testid="storyboard-badge">
          Storyboard
        </Badge>
      </div>
    </header>

    <main class="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-4">
      <slot />
    </main>

    <SessionNav v-if="showNav" :session-id="sessionId" />
  </div>
</template>
