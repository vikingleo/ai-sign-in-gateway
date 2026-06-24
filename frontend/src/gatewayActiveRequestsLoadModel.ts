type ActiveRequestsLoadResultPlanOptions = {
  mounted: boolean
  aborted: boolean
}

type ActiveRequestsLoadErrorPlanOptions = ActiveRequestsLoadResultPlanOptions & {
  silent: boolean
  errorMessage: string | null
}

type ActiveRequestsLoadErrorPlan = {
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

const gatewayActiveRequestsLoadFailureMessage = '网关实时请求加载失败'

export type ApplyGatewayActiveRequestSnapshotActionOptions<TRoute, TPriorityRoute, TOverview, TActiveRequest> = {
  getRoutes: () => TRoute[]
  getPriorityRoutes: () => TPriorityRoute[]
  getOverview: () => TOverview | null
  mergeSnapshot: (snapshot: {
    routes: TRoute[]
    priorityRoutes: TPriorityRoute[]
    overview: TOverview | null
    activeRequests: TActiveRequest[]
  }) => {
    routes: TRoute[]
    priorityRoutes: TPriorityRoute[]
    overview: TOverview | null
  }
  setRoutes: (routes: TRoute[]) => void
  setPriorityRoutes: (routes: TPriorityRoute[]) => void
  setOverview: (overview: TOverview | null) => void
}

export function createApplyGatewayActiveRequestSnapshotAction<TRoute, TPriorityRoute, TOverview, TActiveRequest>({
  getRoutes,
  getPriorityRoutes,
  getOverview,
  mergeSnapshot,
  setRoutes,
  setPriorityRoutes,
  setOverview,
}: ApplyGatewayActiveRequestSnapshotActionOptions<TRoute, TPriorityRoute, TOverview, TActiveRequest>) {
  return (activeRequests: TActiveRequest[]) => {
    const next = mergeSnapshot({
      routes: getRoutes(),
      priorityRoutes: getPriorityRoutes(),
      overview: getOverview(),
      activeRequests,
    })
    setRoutes(next.routes)
    setPriorityRoutes(next.priorityRoutes)
    setOverview(next.overview)
  }
}

export function buildGatewayActiveRequestsLoadResultPlan({
  mounted,
  aborted,
}: ActiveRequestsLoadResultPlanOptions) {
  return {
    applySnapshot: mounted && !aborted,
  }
}

export function buildGatewayActiveRequestsLoadErrorPlan({
  aborted,
  mounted,
  silent,
  errorMessage,
}: ActiveRequestsLoadErrorPlanOptions): ActiveRequestsLoadErrorPlan {
  if (aborted || !mounted || silent) {
    return {
      showError: false,
      errorMessage: null,
    }
  }
  const message = errorMessage || gatewayActiveRequestsLoadFailureMessage
  return {
    showError: true,
    errorMessage: message,
    notice: {
      tone: 'error',
      message,
    },
  }
}
