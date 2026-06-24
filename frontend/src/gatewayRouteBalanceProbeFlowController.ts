import {
  buildGatewayRouteBalanceBatchStartPlan,
  buildGatewayRouteBalanceBatchUpdateErrorPlan,
  buildGatewayRouteBalanceNotice,
  buildGatewayRouteBalanceProbeCompletionPlan,
  buildGatewayRouteBalanceProbeRunPlan,
  buildGatewayRouteBalanceProbeStepPlan,
  buildGatewaySingleRouteBalanceProbeCompletionPlan,
  buildGatewaySingleRouteBalanceProbeErrorPlan,
} from './gatewayRouteBalanceProbeModel.ts'
import {
  buildManualGatewayRouteBalanceProbeCompletionPlan,
  buildManualGatewayRouteBalanceProbeErrorPlan,
  buildManualGatewayRouteBalanceProbeURLValidationPlan,
  normalizeManualGatewayRouteBalanceProbeURL,
} from './gatewayManualRouteBalanceProbeModel.ts'
import type { RouteBatchProgress } from './gatewayViewModel.ts'
import type { BalanceProbeResult, GatewayOverview, GatewayRoute } from './types.ts'

type GatewayBalanceProbeCount = { success: number; failed: number }

type GatewayRouteBalanceNotice = {
  tone: 'success' | 'error'
  message: string
}

type GatewayRouteBalanceNoticePlan = { notice: GatewayRouteBalanceNotice }

export type ProbeGatewayRouteBalancesRuntimeOptions = {
  silent?: boolean
  progress?: { value: RouteBatchProgress | null }
}

type BalanceRequest = (
  routeId: number,
  payload?: { balance_probe_url?: string },
) => Promise<BalanceProbeResult>

export type ProbeGatewayRouteBalancesOptions = ProbeGatewayRouteBalancesRuntimeOptions & {
  routeIds: number[]
  requestBalance: BalanceRequest
  applyBalanceResult: (result: BalanceProbeResult) => void
  requestOverview: () => Promise<GatewayOverview>
  setOverview: (overview: GatewayOverview) => void
  trackRoutes: (routeIds: number[]) => void
  untrackRoutes: (routeIds: number[]) => void
  notifyOverviewChanged: () => void
  showNotice: (notice: GatewayRouteBalanceNotice) => void
}

export async function probeGatewayRouteBalances({
  routeIds,
  requestBalance,
  applyBalanceResult,
  requestOverview,
  setOverview,
  trackRoutes,
  untrackRoutes,
  notifyOverviewChanged,
  showNotice,
  progress,
  silent = false,
}: ProbeGatewayRouteBalancesOptions): Promise<GatewayBalanceProbeCount> {
  const runPlan = buildGatewayRouteBalanceProbeRunPlan(routeIds, Boolean(progress))
  if (!runPlan.shouldRun) {
    return runPlan.result
  }
  const ids = runPlan.routeIds
  trackRoutes(ids)
  if (progress) {
    progress.value = runPlan.progress
  }
  let count = { success: 0, failed: 0 }
  try {
    for (const routeId of ids) {
      let ok = false
      try {
        const result = await requestBalance(routeId)
        applyBalanceResult(result)
        ok = result.ok
      } catch {
        ok = false
      } finally {
        const stepPlan = buildGatewayRouteBalanceProbeStepPlan({
          count,
          progress: progress?.value ?? null,
          ok,
        })
        count = stepPlan.count
        if (progress && stepPlan.progress) {
          progress.value = stepPlan.progress
        }
      }
    }
    const completionPlan = buildGatewayRouteBalanceProbeCompletionPlan({ count, silent })
    try {
      setOverview(await requestOverview())
      if (completionPlan.shouldNotifyOverviewChanged) {
        notifyOverviewChanged()
      }
    } catch {
      // 余额已写入路由，概览统计刷新失败不阻断当前操作。
    }
    if (completionPlan.notice) {
      showNotice(completionPlan.notice)
    }
    return count
  } finally {
    untrackRoutes(ids)
  }
}

export type UpdateAllGatewayRouteBalancesOptions = {
  routes: GatewayRoute[]
  isRouteProbeRunning: boolean
  startBatch: (routeIds: number[]) => void
  finishBatch: (routeIds: number[]) => void
  probeRouteBalances: (
    routeIds: number[],
    options: Required<Pick<ProbeGatewayRouteBalancesRuntimeOptions, 'progress' | 'silent'>>,
  ) => Promise<GatewayBalanceProbeCount>
  progress: { value: RouteBatchProgress | null }
  refreshRouteSummaries: () => Promise<void>
  showNotice: (notice: GatewayRouteBalanceNotice) => void
  showPlanNotice: (plan: GatewayRouteBalanceNoticePlan) => void
}

export async function updateAllGatewayRouteBalances({
  routes,
  isRouteProbeRunning,
  startBatch,
  finishBatch,
  probeRouteBalances,
  progress,
  refreshRouteSummaries,
  showNotice,
  showPlanNotice,
}: UpdateAllGatewayRouteBalancesOptions) {
  const startPlan = buildGatewayRouteBalanceBatchStartPlan(routes.map((route) => route.id), isRouteProbeRunning)
  if (!startPlan.shouldStart) {
    showPlanNotice(startPlan)
    return
  }
  const routeIds = startPlan.routeIds
  startBatch(routeIds)
  try {
    const result = await probeRouteBalances(routeIds, { silent: true, progress })
    await refreshRouteSummaries()
    showNotice(buildGatewayRouteBalanceNotice('余额更新', result))
  } catch (err) {
    showPlanNotice(buildGatewayRouteBalanceBatchUpdateErrorPlan(err))
  } finally {
    finishBatch(routeIds)
  }
}

type GatewayRouteBalanceBatchState = Pick<UpdateAllGatewayRouteBalancesOptions, 'startBatch' | 'finishBatch'>

export type UpdateAllGatewayRouteBalancesActionOptions =
  Omit<UpdateAllGatewayRouteBalancesOptions, 'startBatch' | 'finishBatch'> & { probeState: GatewayRouteBalanceBatchState }

export function updateAllGatewayRouteBalancesAction({ probeState, ...options }: UpdateAllGatewayRouteBalancesActionOptions) {
  return updateAllGatewayRouteBalances({
    ...options,
    startBatch: probeState.startBatch,
    finishBatch: probeState.finishBatch,
  })
}

export type ProbeSingleGatewayRouteBalanceOptions = {
  route: GatewayRoute
  requestBalance: BalanceRequest
  applyBalanceResult: (result: BalanceProbeResult) => void
  refreshRouteSummaries: () => Promise<void>
  notifyOverviewChanged: () => void
  openManualDialog: (route: GatewayRoute, message: string) => void
  trackRoute: (routeId: number) => void
  untrackRoute: (routeId: number) => void
  showNotice: (notice: GatewayRouteBalanceNotice) => void
  showPlanNotice: (plan: GatewayRouteBalanceNoticePlan) => void
}

export async function probeSingleGatewayRouteBalance({
  route,
  requestBalance,
  applyBalanceResult,
  refreshRouteSummaries,
  notifyOverviewChanged,
  openManualDialog,
  trackRoute,
  untrackRoute,
  showNotice,
  showPlanNotice,
}: ProbeSingleGatewayRouteBalanceOptions) {
  trackRoute(route.id)
  try {
    const result = await requestBalance(route.id)
    applyBalanceResult(result)
    await refreshRouteSummaries()
    const completionPlan = buildGatewaySingleRouteBalanceProbeCompletionPlan(route, result)
    if (completionPlan.shouldNotifyOverviewChanged) {
      notifyOverviewChanged()
    }
    showNotice(completionPlan.notice)
    if (completionPlan.shouldOpenManualDialog) {
      openManualDialog(route, completionPlan.manualDialogMessage)
    }
  } catch (err) {
    showPlanNotice(buildGatewaySingleRouteBalanceProbeErrorPlan(err))
  } finally {
    untrackRoute(route.id)
  }
}

type GatewayRouteBalanceSingleState = Pick<ProbeSingleGatewayRouteBalanceOptions, 'trackRoute' | 'untrackRoute'>

export type ProbeGatewayRouteBalanceActionOptions =
  Omit<ProbeSingleGatewayRouteBalanceOptions, 'trackRoute' | 'untrackRoute'> & { probeState: GatewayRouteBalanceSingleState }

export function createProbeGatewayRouteBalanceAction(options: Omit<ProbeGatewayRouteBalanceActionOptions, 'route'>) {
  return (route: GatewayRoute) => probeGatewayRouteBalanceAction({ ...options, route })
}

export function probeGatewayRouteBalanceAction({ probeState, ...options }: ProbeGatewayRouteBalanceActionOptions) {
  return probeSingleGatewayRouteBalance({
    ...options,
    trackRoute: probeState.trackRoute,
    untrackRoute: probeState.untrackRoute,
  })
}

export type ProbeManualGatewayRouteBalanceOptions = {
  route: GatewayRoute | null
  balanceProbeURL: string
  requestBalance: BalanceRequest
  applyBalanceResult: (result: BalanceProbeResult) => void
  refreshRouteSummaries: () => Promise<void>
  notifyOverviewChanged: () => void
  setLoading: (loading: boolean) => void
  trackRoute: (routeId: number) => void
  untrackRoute: (routeId: number) => void
  closeAfterSuccess: () => void
  setFailureMessage: (message: string) => void
  showPlanNotice: (plan: GatewayRouteBalanceNoticePlan) => void
}

export async function probeManualGatewayRouteBalance({
  route,
  balanceProbeURL,
  requestBalance,
  applyBalanceResult,
  refreshRouteSummaries,
  notifyOverviewChanged,
  setLoading,
  trackRoute,
  untrackRoute,
  closeAfterSuccess,
  setFailureMessage,
  showPlanNotice,
}: ProbeManualGatewayRouteBalanceOptions) {
  const normalizedURL = normalizeManualGatewayRouteBalanceProbeURL(balanceProbeURL)
  if (!route) {
    return
  }
  const validationPlan = buildManualGatewayRouteBalanceProbeURLValidationPlan(normalizedURL)
  if (!validationPlan.isValid) {
    if (validationPlan.notice) {
      showPlanNotice({ notice: validationPlan.notice })
    }
    return
  }
  setLoading(true)
  trackRoute(route.id)
  try {
    const result = await requestBalance(route.id, { balance_probe_url: normalizedURL })
    applyBalanceResult(result)
    await refreshRouteSummaries()
    const completionPlan = buildManualGatewayRouteBalanceProbeCompletionPlan(route, result)
    if (completionPlan.shouldNotifyOverviewChanged) {
      notifyOverviewChanged()
    }
    showPlanNotice(completionPlan)
    if (completionPlan.shouldCloseDialog) {
      closeAfterSuccess()
      return
    }
    setFailureMessage(completionPlan.failureMessage)
  } catch (err) {
    const errorPlan = buildManualGatewayRouteBalanceProbeErrorPlan(err)
    setFailureMessage(errorPlan.failureMessage)
    showPlanNotice(errorPlan)
  } finally {
    setLoading(false)
    untrackRoute(route.id)
  }
}
