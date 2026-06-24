import type { ComputedRef } from 'vue'

import type { GatewayNoticeActions } from './gatewayNoticeController.ts'
import type { GatewayPageDisplayHelpers } from './gatewayPageDisplayHelpersController.ts'
import type { GatewayPagePlatform } from './gatewayPagePlatformController.ts'
import type { GatewayPageRequests } from './gatewayPageRequestsController.ts'
import type { GatewayPageState } from './gatewayPageStateController.ts'
import type { GatewayRouteMutationActions } from './gatewayRouteMutationActionsController.ts'
import { useGatewayRuntimeOperationsPageActions } from './gatewayRuntimeOperationsPageController.ts'

type GatewayPageRuntimeActionsOptions = {
  state: GatewayPageState
  gatewayPageRequests: GatewayPageRequests
  gatewayPageDisplayHelpers: GatewayPageDisplayHelpers
  gatewayPagePlatform: GatewayPagePlatform
  routeMutationActions: GatewayRouteMutationActions
  isGatewayMonitor: ComputedRef<boolean>
  mounted: () => boolean
  nowMs: () => number
  showNotice: GatewayNoticeActions['showNotice']
  showPlanNotice: GatewayNoticeActions['showPlanNotice']
}

export function useGatewayPageRuntimeActions({
  state,
  gatewayPageRequests,
  gatewayPageDisplayHelpers,
  gatewayPagePlatform,
  routeMutationActions,
  isGatewayMonitor,
  mounted,
  nowMs,
  showNotice,
  showPlanNotice,
}: GatewayPageRuntimeActionsOptions) {
  return useGatewayRuntimeOperationsPageActions({
    overview: state.overview,
    routes: state.routes,
    priorityRoutes: state.priorityRoutes,
    logs: state.logs,
    activeRequests: state.activeRequests,
    gatewayUsage: state.gatewayUsage,
    siteGroups: state.siteGroups,
    routeGroups: state.routeGroups,
    includeDisabled: state.includeDisabled,
    settingsDialog: state.settingsDialog,
    logsDrawer: state.logsDrawer,
    loadData: state.gatewayRuntime.loadData,
    isMonitor: () => isGatewayMonitor.value,
    hasUsageSnapshot: () => Boolean(state.gatewayUsage.value),
    getRequestRange: state.usageRangeState.toRequestRange,
    mounted,
    loadDataControllerSlot: state.gatewayRuntime.loadDataControllerSlot,
    setLoading: state.gatewayRuntime.setLoading,
    requestOverview: gatewayPageRequests.getGatewayOverview,
    requestSettings: gatewayPageRequests.getGatewaySettings,
    requestRoutes: gatewayPageRequests.getGatewayRoutes,
    requestLogs: gatewayPageRequests.getGatewayLogs,
    requestSiteGroups: gatewayPageRequests.getSiteGroups,
    requestRouteGroups: gatewayPageRequests.getGatewayRouteGroups,
    requestUsage: gatewayPageRequests.getGatewayUsage,
    requestActiveRequests: gatewayPageRequests.getGatewayActiveRequests,
    normalizeRoute: gatewayPageDisplayHelpers.normalizeGatewayRoute,
    applyActiveRequestSnapshot: routeMutationActions.applyActiveRequestSnapshot,
    showPlanNotice,
    isAbortError: gatewayPageRequests.isAbortError,
    loadUsage: state.gatewayRuntime.loadUsage,
    gatewayUsageControllerSlot: state.gatewayRuntime.gatewayUsageControllerSlot,
    setUsageLoading: state.gatewayRuntime.setUsageLoading,
    resetToToday: state.usageRangeState.resetToToday,
    showNotice,
    priorityDialog: state.priorityDialog,
    loadActiveRequests: state.gatewayRuntime.loadActiveRequests,
    refreshRealtimeData: state.gatewayRuntime.refreshRealtimeData,
    buildActiveRequestsRefreshPlan: state.gatewayRuntime.buildActiveRequestsRefreshPlan,
    startActiveRequestsRefresh: state.gatewayRuntime.startActiveRequestsRefresh,
    finishActiveRequestsRefresh: state.gatewayRuntime.finishActiveRequestsRefresh,
    startAutoRefreshRuntime: state.gatewayRuntime.startAutoRefresh,
    finishAutoRefresh: state.gatewayRuntime.finishAutoRefresh,
    setAutoRefreshError: state.gatewayRuntime.setAutoRefreshError,
    handleVisibilityRefresh: state.gatewayRuntime.handleVisibilityRefresh,
    activeRequestsControllerSlot: state.gatewayRuntime.activeRequestsControllerSlot,
    autoRefreshControllerSlot: state.gatewayRuntime.autoRefreshControllerSlot,
    now: nowMs,
    isVisible: gatewayPagePlatform.visibility.isVisible,
    timerWindow: gatewayPagePlatform.timerWindow,
    timers: state.autoRefreshTimers,
    routeRefreshMs: state.gatewayRouteAutoRefreshMs,
    monitorRefreshMs: state.gatewayMonitorAutoRefreshMs,
    activeRequestRefreshMs: state.gatewayActiveRequestRefreshMs,
  })
}
