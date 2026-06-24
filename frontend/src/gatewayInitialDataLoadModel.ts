type InitialDataLoadPlanOptions = {
  isMonitor: boolean
  hasUsageSnapshot: boolean
}

type InitialDataApplyPlanOptions<InputRoute, OutputRoute> = {
  mounted: boolean
  aborted: boolean
  routes: InputRoute[]
  normalizeRoute: (route: InputRoute) => OutputRoute
  applyActiveRequestSnapshot: boolean
}

type InitialDataApplyPlan<OutputRoute> = {
  shouldApply: true
  normalizedRoutes: OutputRoute[]
  applyActiveRequestSnapshot: boolean
} | {
  shouldApply: false
  normalizedRoutes: []
  applyActiveRequestSnapshot: false
}

type InitialDataLoadErrorPlanOptions = {
  aborted: boolean
  mounted: boolean
  errorMessage: string | null
}

type InitialDataLoadErrorPlan = {
  showError: true
  errorMessage: string
  notice: {
    tone: 'error'
    message: string
  }
} | {
  showError: false
  errorMessage: null
}

const gatewayInitialDataLoadFailureMessage = '网关数据加载失败'

export function buildGatewayInitialDataLoadPlan({ isMonitor, hasUsageSnapshot }: InitialDataLoadPlanOptions) {
  return {
    loadLogs: isMonitor,
    loadUsage: isMonitor && !hasUsageSnapshot,
    loadActiveRequests: isMonitor,
    applyActiveRequestSnapshot: isMonitor,
  }
}

export function buildGatewayInitialDataApplyPlan<InputRoute, OutputRoute>({
  mounted,
  aborted,
  routes,
  normalizeRoute,
  applyActiveRequestSnapshot,
}: InitialDataApplyPlanOptions<InputRoute, OutputRoute>): InitialDataApplyPlan<OutputRoute> {
  if (!mounted || aborted) {
    return {
      shouldApply: false,
      normalizedRoutes: [],
      applyActiveRequestSnapshot: false,
    }
  }
  return {
    shouldApply: true,
    normalizedRoutes: routes.map(normalizeRoute),
    applyActiveRequestSnapshot,
  }
}

export function buildGatewayInitialDataLoadErrorPlan({
  aborted,
  mounted,
  errorMessage,
}: InitialDataLoadErrorPlanOptions): InitialDataLoadErrorPlan {
  if (aborted || !mounted) {
    return {
      showError: false,
      errorMessage: null,
    }
  }
  const message = errorMessage ?? gatewayInitialDataLoadFailureMessage
  return {
    showError: true,
    errorMessage: message,
    notice: {
      tone: 'error',
      message,
    },
  }
}
