type RefreshStartOptions = {
  now: number
  visible: boolean
}

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

type RefreshGatewayRealtimeDataOptions<
  TOverview,
  TInputRoute,
  TOutputRoute,
  TLog,
  TRouteGroup,
  TController extends AbortControllerLike = AbortController,
> = {
  now: number
  visible: boolean
  isMonitor: boolean
  logsDrawerOpen: boolean
  includeDisabled: boolean
  mounted: () => boolean
  priorityDialogOpen: () => boolean
  startAutoRefresh: (options: RefreshStartOptions) => boolean
  finishAutoRefresh: () => void
  controllerSlot: RuntimeControllerSlot<TController>
  requestOverview: (options: { signal: TController['signal'] }) => Promise<TOverview>
  requestRoutes: (options: { includeDisabled: boolean; signal: TController['signal'] }) => Promise<TInputRoute[]>
  requestLogs: (limit: number, options: { signal: TController['signal'] }) => Promise<TLog[]>
  requestRouteGroups: (options: { signal: TController['signal'] }) => Promise<TRouteGroup[]>
  currentLogs: () => TLog[]
  normalizeRoute: (route: TInputRoute) => TOutputRoute
  setOverview: (overview: TOverview) => void
  setRoutes: (routes: TOutputRoute[]) => void
  setPriorityRoutes: (routes: TOutputRoute[]) => void
  setLogs: (logs: TLog[]) => void
  setRouteGroups: (groups: TRouteGroup[]) => void
  setAutoRefreshError: (message: string | null, occurredAt: number | null) => void
  refreshActiveRequests: (silent: true) => Promise<void>
  isAbortError: (error: unknown) => boolean
}

type CreateRefreshGatewayRealtimeDataRuntimeActionOptions<
  TOverview,
  TInputRoute,
  TOutputRoute,
  TLog,
  TRouteGroup,
  TController extends AbortControllerLike = AbortController,
> = Omit<
  RefreshGatewayRealtimeDataOptions<TOverview, TInputRoute, TOutputRoute, TLog, TRouteGroup, TController>,
  'now' | 'visible' | 'isMonitor' | 'logsDrawerOpen' | 'includeDisabled'
> & {
  refreshRealtimeData: (
    options: RefreshGatewayRealtimeDataOptions<TOverview, TInputRoute, TOutputRoute, TLog, TRouteGroup, TController>
  ) => Promise<void>
  now: () => number
  isVisible: () => boolean
  isMonitor: () => boolean
  logsDrawerOpen: () => boolean
  includeDisabled: () => boolean
}

export function createRefreshGatewayRealtimeDataRuntimeAction<
  TOverview,
  TInputRoute,
  TOutputRoute,
  TLog,
  TRouteGroup,
  TController extends AbortControllerLike = AbortController,
>({
  refreshRealtimeData,
  now,
  isVisible,
  isMonitor,
  logsDrawerOpen,
  includeDisabled,
  mounted,
  priorityDialogOpen,
  startAutoRefresh,
  finishAutoRefresh,
  controllerSlot,
  requestOverview,
  requestRoutes,
  requestLogs,
  requestRouteGroups,
  currentLogs,
  normalizeRoute,
  setOverview,
  setRoutes,
  setPriorityRoutes,
  setLogs,
  setRouteGroups,
  setAutoRefreshError,
  refreshActiveRequests,
  isAbortError,
}: CreateRefreshGatewayRealtimeDataRuntimeActionOptions<TOverview, TInputRoute, TOutputRoute, TLog, TRouteGroup, TController>) {
  return () =>
    refreshRealtimeData({
      now: now(),
      visible: isVisible(),
      isMonitor: isMonitor(),
      logsDrawerOpen: logsDrawerOpen(),
      includeDisabled: includeDisabled(),
      mounted,
      priorityDialogOpen,
      startAutoRefresh,
      finishAutoRefresh,
      controllerSlot,
      requestOverview,
      requestRoutes,
      requestLogs,
      requestRouteGroups,
      currentLogs,
      normalizeRoute,
      setOverview,
      setRoutes,
      setPriorityRoutes,
      setLogs,
      setRouteGroups,
      setAutoRefreshError,
      refreshActiveRequests,
      isAbortError,
    })
}
