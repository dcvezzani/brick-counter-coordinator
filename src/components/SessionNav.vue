<script setup>
import { RouterLink, useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

defineProps({
  sessionId: { type: String, required: true },
})

const route = useRoute()

const links = [
  { label: 'Home', path: 'home' },
  { label: 'Cups', path: 'cups', icon: 'cups' },
  { label: 'Lot', path: 'lot', icon: 'lot' },
  { label: 'Lots', path: 'lots', icon: 'lots' },
  { label: 'Reconcile', path: 'reconciliation', icon: 'reconcile' },
]

function linkTo(sessionId, segment) {
  if (segment === 'home') return '/'
  if (segment === 'lot') return `/session/${sessionId}/lot`
  if (segment === 'lots') return `/session/${sessionId}/lots?mode=organizer`
  return `/session/${sessionId}/${segment}`
}

function isActive(segment) {
  if (segment === 'home') return route.path === '/'
  if (segment === 'lot') return route.path.includes('/lot')
  if (segment === 'lots') return route.path.includes('/lots')
  return route.path.includes(`/${segment}`)
}
</script>

<template>
  <nav
    class="sticky bottom-0 border-t bg-card px-2 py-2"
    data-testid="session-nav"
    aria-label="Session navigation"
  >
    <div class="mx-auto flex max-w-lg items-center justify-around gap-1">
      <RouterLink
        v-for="link in links"
        :key="link.path"
        :to="linkTo(sessionId, link.path)"
        custom
        v-slot="{ navigate }"
      >
        <Button
          variant="ghost"
          size="sm"
          :data-testid="link.path === 'home' ? 'nav-home' : `nav-${link.path}`"
          :class="cn('min-h-11 min-w-16 flex-col gap-0.5 text-xs', isActive(link.path) && 'bg-accent')"
          @click="navigate"
        >
          {{ link.label }}
        </Button>
      </RouterLink>
    </div>
  </nav>
</template>
