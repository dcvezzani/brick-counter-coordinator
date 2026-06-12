import { computed } from 'vue'
import { useFixtureSession } from '@/composables/useFixtureSession'

const useFixtures = import.meta.env.VITE_USE_FIXTURES !== 'false'

export function useSession() {
  const fixture = useFixtureSession()

  const isFixtureMode = computed(() => useFixtures || fixture.isFixtureMode)

  return {
    isFixtureMode,
    storyboardBadge: fixture.storyboardBadge,
    listSessions: fixture.listSessions,
    getSession: fixture.getSession,
    createSession: fixture.createSession,
    joinSession: fixture.joinSession,
    setCurrentWorker: fixture.setCurrentWorker,
    getCurrentWorker: fixture.getCurrentWorker,
    getPartOutLines: fixture.getPartOutLines,
    setPartOutLineExcluded: fixture.setPartOutLineExcluded,
    bulkExcludePartOutLines: fixture.bulkExcludePartOutLines,
    confirmPartOut: fixture.confirmPartOut,
    getCups: fixture.getCups,
    getLots: fixture.getLots,
    getLot: fixture.getLot,
    saveLot: fixture.saveLot,
    deleteLot: fixture.deleteLot,
    splitPickList: fixture.splitPickList,
    getPickListItems: fixture.getPickListItems,
    updatePickListItem: fixture.updatePickListItem,
    completePickList: fixture.completePickList,
    getReconciliation: fixture.getReconciliation,
    resolveReconciliation: fixture.resolveReconciliation,
    exportReconciliationXml: fixture.exportReconciliationXml,
    canExportReconciliation: fixture.canExportReconciliation,
    exportBlockReason: fixture.exportBlockReason,
    searchParts: fixture.searchParts,
    resolvePartId: fixture.resolvePartId,
    lookupPart: fixture.lookupPart,
    getColorsForPart: fixture.getColorsForPart,
    workerName: fixture.workerName,
    colorName: fixture.colorName,
    colorHex: fixture.colorHex,
    resetDemoSession: fixture.resetDemoSession,
    DEMO_SESSION_ID: fixture.DEMO_SESSION_ID,
  }
}
