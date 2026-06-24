import type { Ref } from 'vue'

import {
  createLoadGatewayActiveRequestsRuntimeAction,
  createRefreshGatewayActiveRequestsRuntimeAction,
} from './gatewayActiveRequestsRuntimeController.ts'
import { createRefreshGatewayRealtimeDataRuntimeAction } from './gatewayRealtimeRefreshRuntimeController.ts'
import { createHandleGatewayVisibilityChangeAction } from './gatewayRuntimeController.ts'
import type {
  GatewayActiveRequest,
  GatewayLog,
  GatewayOverview,
  GatewayRoute,
  GatewayRouteGroup,
} from './types.ts'

export type AbortControllerLike = {
  signal: {
    aborted: boolean
  }
  abort: () => void
}

export type ControllerSlot<TController extends AbortControllerLike> = {
  replace: () => TController
  clearIfCurrent: (controller: TController) => boolean
}

type ActiveRequestsRefreshPlan = {
  shouldStart: true
  startOptions: {
    now: number
    visible: boolean
    enabled: boolean
  }
  loadSilent: boolean
} | {
  shouldStart: false
  startOptions: null
  loadSilent: boolean
}

type RealtimeNoticePlan = {
  notice: {
    tone: 'success' | 'error'
    message: string
  }
}

export type GatewayRealtimePageOptions<
  TController extends AbortControllerLike = AbortController,
> = {
  activeRequests: Ref<GatewayActiveRequest[]>
  overview: Ref<GatewayOverview | null>
  routes: Ref<GatewayRoute[]>
  priorityRoutes: Ref<GatewayRoute[]>
  routeGroups: Ref<GatewayRouteGroup[]>
  logs: Ref<GatewayLog[]>
  logsDrawer: {
    open: Ref<boolean>
    setLogs: (logs: GatewayLog[]) => void
  }
  includeDisabled: Ref<boolean>
  priorityDialog: {
    open: Ref<boolean>
  }
  loadActiveRequests: (options: Parameters<typeof createLoadGatewayActiveRequestsRuntimeAction<GatewayActiveRequest, TController>>[0] extends { loadActiveRequests: (options: infer TOptions) => Promise<void> } ? TOptions : never) => Promise<void>
  refreshRealtimeData: (options: Parameters<Parameters<typeof createRefreshGatewayRealtimeDataRuntimeAction<GatewayOverview, GatewayRoute, GatewayRoute, GatewayLog, GatewayRouteGroup, TController>>[0]['refreshRealtimeData']>[0]) => Promise<void>
  buildActiveRequestsRefreshPlan: (options: {
    now: number
    visible: boolean
    isMonitor: boolean
    silent: boolean
  }) => ActiveRequestsRefreshPlan
  startActiveRequestsRefresh: (options: { now: number; visible: boolean; enabled: boolean }) => boolean
  finishActiveRequestsRefresh: () => void
  startAutoRefresh: (options: { now: number; visible: boolean }) => boolean
  finishAutoRefresh: () => void
  setAutoRefreshError: (message: string | null, occurredAt: number | null) => void
  handleVisibilityRefresh: (options: {
    visible: boolean
    isMonitor: boolean
    refreshRealtimeData: () => void | Promise<void>
    refreshActiveRequests: (silent: true) => void | Promise<void>
  }) => void
  mounted: () => boolean
  activeRequestsControllerSlot: ControllerSlot<TController>
  autoRefreshControllerSlot: ControllerSlot<TController>
  requestActiveRequests: (options: { signal: TController['signal'] }) => Promise<GatewayActiveRequest[]>
  applyActiveRequestSnapshot: (snapshot: GatewayActiveRequest[]) => void
  requestOverview: (options: { signal: TController['signal'] }) => Promise<GatewayOverview>
  requestRoutes: (options: { includeDisabled: boolean; signal: TController['signal'] }) => Promise<GatewayRoute[]>
  requestLogs: (limit: number, options: { signal: TController['signal'] }) => Promise<GatewayLog[]>
  requestRouteGroups: (options: { signal: TController['signal'] }) => Promise<GatewayRouteGroup[]>
  normalizeRoute: (route: GatewayRoute) => GatewayRoute
  now: () => number
  isVisible: () => boolean
  isMonitor: () => boolean
  isAbortError: (error: unknown) => boolean
  showPlanNotice: (plan: RealtimeNoticePlan) => void
}

export function useGatewayRealtimePageActions<TController extends AbortControllerLike = AbortController>({
  activeRequests,
  overview,
  routes,
  priorityRoutes,
  routeGroups,
  logs,
  logsDrawer,
  includeDisabled,
  priorityDialog,
  loadActiveRequests: loadActiveRequestsRuntime,
  refreshRealtimeData: refreshRealtimeDataRuntime,
  buildActiveRequestsRefreshPlan,
  startActiveRequestsRefresh,
  finishActiveRequestsRefresh,
  startAutoRefresh,
  finishAutoRefresh,
  setAutoRefreshError,
  handleVisibilityRefresh,
  mounted,
  activeRequestsControllerSlot,
  autoRefreshControllerSlot,
  requestActiveRequests,
  applyActiveRequestSnapshot,
  requestOverview,
  requestRoutes,
  requestLogs,
  requestRouteGroups,
  normalizeRoute,
  now,
  isVisible,
  isMonitor,
  isAbortError,
  showPlanNotice,
}: GatewayRealtimePageOptions<TController>) {
  const loadActiveRequests = createLoadGatewayActiveRequestsRuntimeAction<GatewayActiveRequest, TController>({
    loadActiveRequests: loadActiveRequestsRuntime,
    mounted,
    controllerSlot: activeRequestsControllerSlot,
    requestActiveRequests,
    setActiveRequests: (snapshot) => {
      activeRequests.value = snapshot
    },
    applyActiveRequestSnapshot,
    showPlanNotice,
  })
  const refreshActiveRequests = createRefreshGatewayActiveRequestsRuntimeAction({
    buildActiveRequestsRefreshPlan,
    startActiveRequestsRefresh,
    finishActiveRequestsRefresh,
    loadActiveRequests,
    now,
    isVisible,
    isMonitor,
  })
  const refreshRealtimeData = createRefreshGatewayRealtimeDataRuntimeAction<
    GatewayOverview,
    GatewayRoute,
    GatewayRoute,
    GatewayLog,
    GatewayRouteGroup,
    TController
  >({
    refreshRealtimeData: refreshRealtimeDataRuntime,
    now,
    isVisible,
    isMonitor,
    logsDrawerOpen: () => logsDrawer.open.value,
    includeDisabled: () => includeDisabled.value,
    mounted,
    priorityDialogOpen: () => priorityDialog.open.value,
    startAutoRefresh,
    finishAutoRefresh,
    controllerSlot: autoRefreshControllerSlot,
    requestOverview,
    requestRoutes,
    requestLogs,
    requestRouteGroups,
    currentLogs: () => logs.value,
    normalizeRoute,
    setOverview: (overviewData) => {
      overview.value = overviewData
    },
    setRoutes: (normalizedRoutes) => {
      routes.value = normalizedRoutes
    },
    setPriorityRoutes: (normalizedRoutes) => {
      priorityRoutes.value = normalizedRoutes
    },
    setLogs: (logData) => logsDrawer.setLogs(logData),
    setRouteGroups: (groups) => {
      routeGroups.value = groups
    },
    setAutoRefreshError,
    refreshActiveRequests,
    isAbortError,
  })
  const handleVisibilityChange = createHandleGatewayVisibilityChangeAction({
    isVisible,
    isMonitor,
    handleVisibilityRefresh,
    refreshRealtimeData,
    refreshActiveRequests,
  })

  return {
    loadActiveRequests,
    refreshActiveRequests,
    refreshRealtimeData,
    handleVisibilityChange,
  }
}
