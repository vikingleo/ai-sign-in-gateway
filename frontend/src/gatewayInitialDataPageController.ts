import type { Ref } from 'vue'

import { createLoadGatewayInitialDataRuntimeAction } from './gatewayInitialDataLoadController.ts'
import { createReloadGatewayDataAfterAction } from './gatewayRuntimeLoadController.ts'
import { buildGatewayInitialDataLoadErrorPlan } from './gatewayInitialDataLoadModel.ts'
import type {
  GatewayActiveRequest,
  GatewayLog,
  GatewayOverview,
  GatewayRoute,
  GatewayRouteGroup,
  GatewaySettingsData,
  GatewayUsage,
  SiteGroup,
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

export type GatewayUsageRequestRange = {
  start: string
  end: string
}

type InitialDataNoticePlan = Extract<ReturnType<typeof buildGatewayInitialDataLoadErrorPlan>, { showError: true }>

type LoadGatewayInitialDataOptions<TController extends AbortControllerLike = AbortController> = {
  isMonitor: boolean
  hasUsageSnapshot: boolean
  includeDisabled: boolean
  requestRange: GatewayUsageRequestRange
  currentUsage: () => GatewayUsage | null
  mounted: () => boolean
  controllerSlot: ControllerSlot<TController>
  setLoading: (loading: boolean) => void
  requestOverview: (options: { signal: TController['signal'] }) => Promise<GatewayOverview>
  requestSettings: (options: { signal: TController['signal'] }) => Promise<GatewaySettingsData>
  requestRoutes: (options: { includeDisabled: boolean; signal: TController['signal'] }) => Promise<GatewayRoute[]>
  requestLogs: (limit: number, options: { signal: TController['signal'] }) => Promise<GatewayLog[]>
  requestSiteGroups: (options: { signal: TController['signal'] }) => Promise<SiteGroup[]>
  requestRouteGroups: (options: { signal: TController['signal'] }) => Promise<GatewayRouteGroup[]>
  requestUsage: (options: GatewayUsageRequestRange & { signal: TController['signal'] }) => Promise<GatewayUsage>
  requestActiveRequests: (options: { signal: TController['signal'] }) => Promise<GatewayActiveRequest[]>
  normalizeRoute: (route: GatewayRoute) => GatewayRoute
  setOverview: (overview: GatewayOverview) => void
  setSettings: (settings: GatewaySettingsData) => void
  setPriorityRoutes: (routes: GatewayRoute[]) => void
  setRoutes: (routes: GatewayRoute[]) => void
  setLogs: (logs: GatewayLog[]) => void
  setSiteGroups: (groups: SiteGroup[]) => void
  setRouteGroups: (groups: GatewayRouteGroup[]) => void
  setUsage: (usage: GatewayUsage | null) => void
  setActiveRequests: (activeRequests: GatewayActiveRequest[]) => void
  applyActiveRequestSnapshot: (activeRequests: GatewayActiveRequest[]) => void
  showPlanNotice: (plan: InitialDataNoticePlan) => void
  isAbortError: (error: unknown) => boolean
}

export type GatewayInitialDataPageOptions<TController extends AbortControllerLike = AbortController> = {
  overview: Ref<GatewayOverview | null>
  routes: Ref<GatewayRoute[]>
  priorityRoutes: Ref<GatewayRoute[]>
  logs: Ref<GatewayLog[]>
  activeRequests: Ref<GatewayActiveRequest[]>
  gatewayUsage: Ref<GatewayUsage | null>
  siteGroups: Ref<SiteGroup[]>
  routeGroups: Ref<GatewayRouteGroup[]>
  includeDisabled: Ref<boolean>
  settingsDialog: {
    setSettings: (settings: GatewaySettingsData) => void
  }
  logsDrawer: {
    setLogs: (logs: GatewayLog[]) => void
  }
  loadData: (options: LoadGatewayInitialDataOptions<TController>) => Promise<void>
  isMonitor: () => boolean
  hasUsageSnapshot: () => boolean
  getRequestRange: () => GatewayUsageRequestRange
  mounted: () => boolean
  controllerSlot: ControllerSlot<TController>
  setLoading: (loading: boolean) => void
  requestOverview: (options: { signal: TController['signal'] }) => Promise<GatewayOverview>
  requestSettings: (options: { signal: TController['signal'] }) => Promise<GatewaySettingsData>
  requestRoutes: (options: { includeDisabled: boolean; signal: TController['signal'] }) => Promise<GatewayRoute[]>
  requestLogs: (limit: number, options: { signal: TController['signal'] }) => Promise<GatewayLog[]>
  requestSiteGroups: (options: { signal: TController['signal'] }) => Promise<SiteGroup[]>
  requestRouteGroups: (options: { signal: TController['signal'] }) => Promise<GatewayRouteGroup[]>
  requestUsage: (options: GatewayUsageRequestRange & { signal: TController['signal'] }) => Promise<GatewayUsage>
  requestActiveRequests: (options: { signal: TController['signal'] }) => Promise<GatewayActiveRequest[]>
  normalizeRoute: (route: GatewayRoute) => GatewayRoute
  applyActiveRequestSnapshot: (activeRequests: GatewayActiveRequest[]) => void
  showPlanNotice: (plan: InitialDataNoticePlan) => void
  isAbortError: (error: unknown) => boolean
}

export function useGatewayInitialDataPageActions<TController extends AbortControllerLike = AbortController>({
  overview,
  routes,
  priorityRoutes,
  activeRequests,
  gatewayUsage,
  siteGroups,
  routeGroups,
  includeDisabled,
  settingsDialog,
  logsDrawer,
  loadData: loadDataRuntime,
  isMonitor,
  hasUsageSnapshot,
  getRequestRange,
  mounted,
  controllerSlot,
  setLoading,
  requestOverview,
  requestSettings,
  requestRoutes,
  requestLogs,
  requestSiteGroups,
  requestRouteGroups,
  requestUsage,
  requestActiveRequests,
  normalizeRoute,
  applyActiveRequestSnapshot,
  showPlanNotice,
  isAbortError,
}: GatewayInitialDataPageOptions<TController>) {
  const loadData = createLoadGatewayInitialDataRuntimeAction<
    GatewayOverview,
    GatewaySettingsData,
    GatewayRoute,
    GatewayRoute,
    GatewayLog,
    SiteGroup,
    GatewayRouteGroup,
    GatewayUsage,
    GatewayActiveRequest,
    TController
  >({
    loadData: loadDataRuntime,
    isMonitor,
    hasUsageSnapshot,
    includeDisabled: () => includeDisabled.value,
    getRequestRange,
    currentUsage: () => gatewayUsage.value,
    mounted,
    controllerSlot,
    setLoading,
    requestOverview,
    requestSettings,
    requestRoutes,
    requestLogs,
    requestSiteGroups,
    requestRouteGroups,
    requestUsage,
    requestActiveRequests,
    normalizeRoute,
    setOverview: (overviewData) => {
      overview.value = overviewData
    },
    setSettings: settingsDialog.setSettings,
    setPriorityRoutes: (normalizedRoutes) => {
      priorityRoutes.value = normalizedRoutes
    },
    setRoutes: (normalizedRoutes) => {
      routes.value = normalizedRoutes
    },
    setLogs: (logData) => logsDrawer.setLogs(logData),
    setSiteGroups: (groups) => {
      siteGroups.value = groups
    },
    setRouteGroups: (groups) => {
      routeGroups.value = groups
    },
    setUsage: (usage) => {
      gatewayUsage.value = usage
    },
    setActiveRequests: (snapshot) => {
      activeRequests.value = snapshot
    },
    applyActiveRequestSnapshot,
    showPlanNotice,
    isAbortError,
  })
  const reloadGatewayDataAfterAction = createReloadGatewayDataAfterAction({
    loadData,
  })

  return {
    loadData,
    reloadGatewayDataAfterAction,
  }
}
