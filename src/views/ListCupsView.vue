<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from '@/composables/useSession'

const route = useRoute()
const router = useRouter()
const sessionId = computed(() => route.params.sessionId)

const { getSession, getCups, getLots } = useSession()

const session = computed(() => getSession(sessionId.value))
const cups = computed(() => getCups(sessionId.value))

function openCup(cup) {
  const { lotCount } = cup
  if (lotCount === 0) {
    router.push(`/session/${sessionId.value}/lot?cupId=${cup.id}`)
  } else if (lotCount === 1) {
    const lots = getLots(sessionId.value, { cupId: cup.id })
    router.push(`/session/${sessionId.value}/lot/${lots[0].id}`)
  } else {
    router.push(`/session/${sessionId.value}/lots?mode=cup&cupId=${cup.id}`)
  }
}
</script>

<template>
  <AppShell>
    <div class="flex flex-col gap-4" data-testid="list-cups-view">
      <div>
        <h2 class="text-xl font-semibold">List cups</h2>
        <p class="text-sm text-muted-foreground">{{ session.name }}</p>
      </div>

      <div class="flex flex-col gap-3">
        <Card
          v-for="cup in cups"
          :key="cup.id"
          class="cursor-pointer transition-colors hover:bg-accent/50"
          :data-testid="`cup-${cup.id}`"
          @click="openCup(cup)"
        >
          <CardHeader class="pb-2">
            <CardTitle class="text-base">{{ cup.label }}</CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-sm text-muted-foreground">
              {{ cup.lotCount }} lot{{ cup.lotCount === 1 ? '' : 's' }}
            </p>
          </CardContent>
        </Card>
      </div>

      <Button
        variant="outline"
        class="min-h-11"
        data-testid="add-lot"
        @click="router.push(`/session/${sessionId}/lot`)"
      >
        Add new lot
      </Button>
    </div>
  </AppShell>
</template>
