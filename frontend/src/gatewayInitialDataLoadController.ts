import {
  buildGatewayInitialDataApplyPlan,
  buildGatewayInitialDataLoadErrorPlan,
  buildGatewayInitialDataLoadPlan,
} from './gatewayInitialDataLoadModel.ts'

type AbortControllerLike = {
  signal: {
    aborted: boolean
  }
  abort: () => void
}

type RuntimeControllerSlot<T extends AbortControllerLike> = {
  replace: () => T
  clearIfCurrent: (controller: T) => boolean
}

type GatewayUsageRequestRange = {
  start: string
  end: string
}

type LoadGatewayDataOptions<
  TOverview,
  TSettings,
  TInputRoute,
  TOutputRoute,
  TLog,
  TSiteGroup,
  TRouteGroup,
  TUsage,
  TActiveRequest,
  TController extends AbortControllerLike = AbortController,
> = {
  isMonitor: boolean
  hasUsageSnapshot: boolean
  includeDisabled: boolean
  requestRange: GatewayUsageRequestRange
  currentUsage: () => TUsage | null
  mounted: () => boolean
  controllerSlot: RuntimeControllerSlot<TController>
  setLoading: (loading: boolean) => void
  requestOverview: (options: { signal: TController['signal'] }) => Promise<TOverview>
  requestSettings: (options: { signal: TController['signal'] }) => Promise<TSettings>
  requestRoutes: (options: { includeDisabled: boolean; signal: TController['signal'] }) => Promise<TInputRoute[]>
  requestLogs: (limit: number, options: { signal: TController['signal'] }) => Promise<TLog[]>
  requestSiteGroups: (options: { signal: TController['signal'] }) => Promise<TSiteGroup[]>
  requestRouteGroups: (options: { signal: TController['signal'] }) => Promise<TRouteGroup[]>
  requestUsage: (options: GatewayUsageRequestRange & { signal: TController['signal'] }) => Promise<TUsage>
  requestActiveRequests: (options: { signal: TController['signal'] }) => Promise<TActiveRequest[]>
  normalizeRoute: (route: TInputRoute) => TOutputRoute
  setOverview: (overview: TOverview) => void
  setSettings: (settings: TSettings) => void
  setPriorityRoutes: (routes: TOutputRoute[]) => void
  setRoutes: (routes: TOutputRoute[]) => void
  setLogs: (logs: TLog[]) => void
  setSiteGroups: (groups: TSiteGroup[]) => void
  setRouteGroups: (groups: TRouteGroup[]) => void
  setUsage: (usage: TUsage | null) => void
  setActiveRequests: (activeRequests: TActiveRequest[]) => void
  applyActiveRequestSnapshot: (activeRequests: TActiveRequest[]) => void
  showPlanNotice: (plan: Extract<ReturnType<typeof buildGatewayInitialDataLoadErrorPlan>, { showError: true }>) => void
  isAbortError: (error: unknown) => boolean
}

type CreateLoadGatewayInitialDataRuntimeActionOptions<
  TOverview,
  TSettings,
  TInputRoute,
  TOutputRoute,
  TLog,
  TSiteGroup,
  TRouteGroup,
  TUsage,
  TActiveRequest,
  TController extends AbortControllerLike = AbortController,
> = Omit<
  LoadGatewayDataOptions<
    TOverview,
    TSettings,
    TInputRoute,
    TOutputRoute,
    TLog,
    TSiteGroup,
    TRouteGroup,
    TUsage,
    TActiveRequest,
    TController
  >,
  'isMonitor' | 'hasUsageSnapshot' | 'includeDisabled' | 'requestRange'
> & {
  loadData: (
    options: LoadGatewayDataOptions<
      TOverview,
      TSettings,
      TInputRoute,
      TOutputRoute,
      TLog,
      TSiteGroup,
      TRouteGroup,
      TUsage,
      TActiveRequest,
      TController
    >
  ) => Promise<void>
  isMonitor: () => boolean
  hasUsageSnapshot: () => boolean
  includeDisabled: () => boolean
  getRequestRange: () => GatewayUsageRequestRange
}

export function createLoadGatewayInitialDataRuntimeAction<
  TOverview,
  TSettings,
  TInputRoute,
  TOutputRoute,
  TLog,
  TSiteGroup,
  TRouteGroup,
  TUsage,
  TActiveRequest,
  TController extends AbortControllerLike = AbortController,
>({
  loadData,
  isMonitor,
  hasUsageSnapshot,
  includeDisabled,
  getRequestRange,
  currentUsage,
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
  setOverview,
  setSettings,
  setPriorityRoutes,
  setRoutes,
  setLogs,
  setSiteGroups,
  setRouteGroups,
  setUsage,
  setActiveRequests,
  applyActiveRequestSnapshot,
  showPlanNotice,
  isAbortError,
}: CreateLoadGatewayInitialDataRuntimeActionOptions<
  TOverview,
  TSettings,
  TInputRoute,
  TOutputRoute,
  TLog,
  TSiteGroup,
  TRouteGroup,
  TUsage,
  TActiveRequest,
  TController
>) {
  return () =>
    loadData({
      isMonitor: isMonitor(),
      hasUsageSnapshot: hasUsageSnapshot(),
      includeDisabled: includeDisabled(),
      requestRange: getRequestRange(),
      currentUsage,
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
      setOverview,
      setSettings,
      setPriorityRoutes,
      setRoutes,
      setLogs,
      setSiteGroups,
      setRouteGroups,
      setUsage,
      setActiveRequests,
      applyActiveRequestSnapshot,
      showPlanNotice,
      isAbortError,
    })
}

export async function loadGatewayData<
  TOverview,
  TSettings,
  TInputRoute,
  TOutputRoute,
  TLog,
  TSiteGroup,
  TRouteGroup,
  TUsage,
  TActiveRequest,
  TController extends AbortControllerLike = AbortController,
>({
  isMonitor,
  hasUsageSnapshot,
  includeDisabled,
  requestRange,
  currentUsage,
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
  setOverview,
  setSettings,
  setPriorityRoutes,
  setRoutes,
  setLogs,
  setSiteGroups,
  setRouteGroups,
  setUsage,
  setActiveRequests,
  applyActiveRequestSnapshot,
  showPlanNotice,
  isAbortError,
}: LoadGatewayDataOptions<
  TOverview,
  TSettings,
  TInputRoute,
  TOutputRoute,
  TLog,
  TSiteGroup,
  TRouteGroup,
  TUsage,
  TActiveRequest,
  TController
>) {
  const controller = controllerSlot.replace()
  setLoading(true)
  try {
    const loadPlan = buildGatewayInitialDataLoadPlan({ isMonitor, hasUsageSnapshot })
    const [overviewData, settingsData, routeData, logData, groupData, usageData, activeRequestData] = await Promise.all([
      requestOverview({ signal: controller.signal }),
      requestSettings({ signal: controller.signal }),
      requestRoutes({ includeDisabled, signal: controller.signal }),
      loadPlan.loadLogs ? requestLogs(80, { signal: controller.signal }) : Promise.resolve([] as TLog[]),
      Promise.all([
        requestSiteGroups({ signal: controller.signal }),
        requestRouteGroups({ signal: controller.signal }),
      ]),
      loadPlan.loadUsage ? requestUsage({
        ...requestRange,
        signal: controller.signal,
      }) : Promise.resolve(currentUsage()),
      loadPlan.loadActiveRequests ? requestActiveRequests({ signal: controller.signal }) : Promise.resolve([] as TActiveRequest[]),
    ])
    const applyPlan = buildGatewayInitialDataApplyPlan({
      mounted: mounted(),
      aborted: controller.signal.aborted,
      routes: routeData,
      normalizeRoute,
      applyActiveRequestSnapshot: loadPlan.applyActiveRequestSnapshot,
    })
    if (!applyPlan.shouldApply) {
      return
    }
    setOverview(overviewData)
    setSettings(settingsData)
    setPriorityRoutes(applyPlan.normalizedRoutes)
    setRoutes(applyPlan.normalizedRoutes)
    setLogs(logData)
    setSiteGroups(groupData[0])
    setRouteGroups(groupData[1])
    setUsage(usageData)
    setActiveRequests(activeRequestData)
    if (applyPlan.applyActiveRequestSnapshot) {
      applyActiveRequestSnapshot(activeRequestData)
    }
  } catch (err) {
    const errorPlan = buildGatewayInitialDataLoadErrorPlan({
      aborted: isAbortError(err),
      mounted: mounted(),
      errorMessage: err instanceof Error ? err.message : null,
    })
    if (errorPlan.showError) {
      showPlanNotice(errorPlan)
    }
  } finally {
    controllerSlot.clearIfCurrent(controller)
    if (mounted()) {
      setLoading(false)
    }
  }
}
