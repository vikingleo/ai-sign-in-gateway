import type { Ref } from 'vue'

import { useDebouncedTask } from './composables/useDebouncedTask.ts'
import { createRefreshGatewayManuallyAction } from './gatewayManualRefreshController.ts'
import { createRefreshGatewayRouteSummariesAction } from './gatewayRouteSummaryController.ts'
import type { GatewayRoute, SiteSummary } from './types.ts'

type RouteSummaryNoticePlan = {
  notice: {
    tone: 'success' | 'error'
    message: string
  }
}

type GatewayRouteSummaryPageOptions = {
  routes: Ref<GatewayRoute[]>
  requestSummaries: (payload: { site_ids: number[] }) => Promise<SiteSummary[]>
  setRoutes: (routes: GatewayRoute[]) => void
  createScheduledTask?: (task: () => Promise<void>) => { schedule: () => void }
  showPlanNotice: (plan: RouteSummaryNoticePlan) => void
}

type GatewayManualRefreshPageOptions = {
  routes: Ref<GatewayRoute[]>
  loadGatewayData: () => Promise<void>
  probeRouteBalances: (routeIds: number[], options: { silent: true }) => Promise<{ success: number }>
  refreshRouteSummaries: () => Promise<void>
}

export function useGatewayRouteSummaryPageActions({
  routes,
  requestSummaries,
  setRoutes,
  createScheduledTask = useDebouncedTask,
  showPlanNotice,
}: GatewayRouteSummaryPageOptions) {
  const refreshRouteSummaries = createRefreshGatewayRouteSummariesAction({
    getRoutes: () => routes.value,
    requestSummaries,
    setRoutes,
    showPlanNotice,
  })
  const { schedule: scheduleRouteSummaryRefresh } = createScheduledTask(refreshRouteSummaries)

  return {
    refreshRouteSummaries,
    scheduleRouteSummaryRefresh,
  }
}

export function useGatewayManualRefreshPageActions({
  routes,
  loadGatewayData,
  probeRouteBalances,
  refreshRouteSummaries,
}: GatewayManualRefreshPageOptions) {
  const handleRefresh = createRefreshGatewayManuallyAction({
    getRoutes: () => routes.value,
    loadGatewayData,
    probeRouteBalances,
    refreshRouteSummaries,
  })

  return {
    handleRefresh,
  }
}
