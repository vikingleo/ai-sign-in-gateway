type RealtimeRefreshPlanOptions = {
  isMonitor: boolean
  logsDrawerOpen: boolean
}

type RealtimeRefreshApplyPlanOptions<InputRoute, OutputRoute> = {
  mounted: boolean
  aborted: boolean
  priorityDialogOpen: boolean
  routes: InputRoute[]
  normalizeRoute: (route: InputRoute) => OutputRoute
  refreshActiveRequests: boolean
}

type RealtimeRefreshApplyPlan<OutputRoute> = {
  shouldApply: true
  normalizedRoutes: OutputRoute[]
  updatePriorityRoutes: boolean
  refreshActiveRequests: boolean
} | {
  shouldApply: false
  normalizedRoutes: []
  updatePriorityRoutes: false
  refreshActiveRequests: false
}

export function buildGatewayRealtimeRefreshPlan({ isMonitor, logsDrawerOpen }: RealtimeRefreshPlanOptions) {
  return {
    loadLogs: isMonitor || logsDrawerOpen,
    refreshActiveRequests: isMonitor,
  }
}

export function buildGatewayRealtimeRefreshApplyPlan<InputRoute, OutputRoute>({
  mounted,
  aborted,
  priorityDialogOpen,
  routes,
  normalizeRoute,
  refreshActiveRequests,
}: RealtimeRefreshApplyPlanOptions<InputRoute, OutputRoute>): RealtimeRefreshApplyPlan<OutputRoute> {
  if (!mounted || aborted) {
    return {
      shouldApply: false,
      normalizedRoutes: [],
      updatePriorityRoutes: false,
      refreshActiveRequests: false,
    }
  }
  return {
    shouldApply: true,
    normalizedRoutes: routes.map(normalizeRoute),
    updatePriorityRoutes: !priorityDialogOpen,
    refreshActiveRequests,
  }
}
