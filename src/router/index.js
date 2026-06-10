import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import NewSessionView from '@/views/NewSessionView.vue'
import PartOutImportView from '@/views/PartOutImportView.vue'
import LotFormView from '@/views/LotFormView.vue'
import ListCupsView from '@/views/ListCupsView.vue'
import ListLotsView from '@/views/ListLotsView.vue'
import ReconciliationView from '@/views/ReconciliationView.vue'
import TernarySwipeDemoView from '@/views/dev/TernarySwipeDemoView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/session/new', name: 'new-session', component: NewSessionView },
    {
      path: '/session/:sessionId/import',
      name: 'part-out-import',
      component: PartOutImportView,
    },
    {
      path: '/session/:sessionId/cups',
      name: 'list-cups',
      component: ListCupsView,
    },
    {
      path: '/session/:sessionId/lot/:lotId?',
      name: 'lot-form',
      component: LotFormView,
    },
    {
      path: '/session/:sessionId/lots',
      name: 'list-lots',
      component: ListLotsView,
    },
    {
      path: '/session/:sessionId/reconciliation',
      name: 'reconciliation',
      component: ReconciliationView,
    },
    {
      path: '/sessions',
      name: 'sessions',
      redirect: '/',
    },
    {
      path: '/dev/ternary-swipe',
      name: 'dev-ternary-swipe',
      component: TernarySwipeDemoView,
    },
  ],
})

export default router
