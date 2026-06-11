<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import LotForm from '@/components/LotForm.vue'

const route = useRoute()
const sessionId = computed(() => route.params.sessionId)
const lotId = computed(() => route.params.lotId ?? null)
</script>

<template>
  <AppShell>
    <div class="lot-form-view max-w-[390px]" data-testid="lot-form-view">
      <h2 class="mb-4 text-xl font-semibold">Lot entry</h2>
      <LotForm :session-id="sessionId" :lot-id="lotId" />
    </div>
  </AppShell>
</template>

<style scoped>
.lot-form-view {
  box-sizing: border-box;
  max-height: 100dvh;
  padding: 0.5em;
  overflow-y: auto;
}
</style>
