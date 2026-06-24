import { buildGatewayActiveRequestsLoadErrorPlan } from './gatewayActiveRequestsLoadModel.ts'

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

type LoadGatewayActiveRequestsOptions<TSnapshot, TController extends AbortControllerLike = AbortController> = {
  silent: boolean
  mounted: () => boolean
  controllerSlot: RuntimeControllerSlot<TController>
  requestActiveRequests: (options: { signal: TController['signal'] }) => Promise<TSnapshot[]>
  setActiveRequests: (snapshot: TSnapshot[]) => void
  applyActiveRequestSnapshot: (snapshot: TSnapshot[]) => void
  showPlanNotice: (plan: Extract<ReturnType<typeof buildGatewayActiveRequestsLoadErrorPlan>, { showError: true }>) => void
}

type ActiveRequestsRefreshStartOptions = {
  now: number
  visible: boolean
  enabled: boolean
}

type ActiveRequestsRefreshPlanOptions = {
  now: number
  visible: boolean
  isMonitor: boolean
  silent: boolean
}

type ActiveRequestsRefreshPlan = {
  shouldStart: true
  startOptions: ActiveRequestsRefreshStartOptions
  loadSilent: boolean
} | {
  shouldStart: false
  startOptions: null
  loadSilent: boolean
}

type RefreshGatewayActiveRequestsRuntimeActionOptions = {
  buildActiveRequestsRefreshPlan: (options: ActiveRequestsRefreshPlanOptions) => ActiveRequestsRefreshPlan
  startActiveRequestsRefresh: (options: ActiveRequestsRefreshStartOptions) => boolean
  finishActiveRequestsRefresh: () => void
  loadActiveRequests: (silent: boolean) => Promise<void>
  now: () => number
  isVisible: () => boolean
  isMonitor: () => boolean
}

export function createLoadGatewayActiveRequestsRuntimeAction<
  TSnapshot,
  TController extends AbortControllerLike = AbortController,
>(
  options: Omit<LoadGatewayActiveRequestsOptions<TSnapshot, TController>, 'silent'> & {
    loadActiveRequests: (options: LoadGatewayActiveRequestsOptions<TSnapshot, TController>) => Promise<void>
  },
) {
  return (silent = false) =>
    options.loadActiveRequests({
      ...options,
      silent,
    })
}

export function createRefreshGatewayActiveRequestsRuntimeAction({
  buildActiveRequestsRefreshPlan,
  startActiveRequestsRefresh,
  finishActiveRequestsRefresh,
  loadActiveRequests,
  now,
  isVisible,
  isMonitor,
}: RefreshGatewayActiveRequestsRuntimeActionOptions) {
  return async (silent = true) => {
    const refreshPlan = buildActiveRequestsRefreshPlan({
      now: now(),
      visible: isVisible(),
      isMonitor: isMonitor(),
      silent,
    })
    if (!refreshPlan.shouldStart) {
      return
    }
    if (!startActiveRequestsRefresh(refreshPlan.startOptions)) {
      return
    }
    try {
      await loadActiveRequests(refreshPlan.loadSilent)
    } finally {
      finishActiveRequestsRefresh()
    }
  }
}
