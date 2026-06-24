import { computed, ref } from 'vue'

import {
  buildGatewayProbeBatchStartPlan,
  buildGatewayProbeCompletionPlan,
  buildGatewayProbeFailureResult,
  buildGatewayProbeStepPlan,
  createGatewayProbeProgress,
  buildGatewaySingleProbeCompletionPlan,
  buildGatewaySingleProbeErrorPlan,
  isGatewayRouteProbing,
  mergeGatewayProbingIds,
  nextGatewayProbeProgress,
  normalizeGatewayProbeRouteIds,
  removeGatewayProbingIds,
} from './gatewayRouteProbeModel.ts'
import { progressPercent, type RouteBatchProgress } from './gatewayViewModel.ts'
import type { GatewayRoute, GatewayRouteProbeResult } from './types.ts'

type TimeoutHandle = ReturnType<typeof globalThis.setTimeout>

type GatewayRouteProbeNotice = {
  tone: 'success' | 'error'
  message: string
}
type GatewayRouteProbeNoticePlan =
  | Extract<ReturnType<typeof buildGatewayProbeBatchStartPlan>, { notice: GatewayRouteProbeNotice }>
  | ReturnType<typeof buildGatewayProbeCompletionPlan>
  | ReturnType<typeof buildGatewaySingleProbeCompletionPlan>
  | ReturnType<typeof buildGatewaySingleProbeErrorPlan>

export type ProbeGatewayRouteBatchOptions = {
  routes: GatewayRoute[]
  requestProbeBatch: (routeIds: number[]) => Promise<GatewayRouteProbeResult[]>
  applyProbeResult: (result: GatewayRouteProbeResult) => void
  startBatch: (routeIds: number[]) => void
  finishBatchRoute: (routeId: number, ok: boolean) => void
  finishBatch: (routeIds: number[]) => void
  now: () => string
  showPlanNotice: (plan: GatewayRouteProbeNoticePlan) => void
}

export async function probeGatewayRouteBatch({
  routes,
  requestProbeBatch,
  applyProbeResult,
  startBatch,
  finishBatchRoute,
  finishBatch,
  now,
  showPlanNotice,
}: ProbeGatewayRouteBatchOptions) {
  const startPlan = buildGatewayProbeBatchStartPlan(routes.map((route) => route.id))
  if (!startPlan.shouldStart) {
    showPlanNotice(startPlan)
    return
  }
  const routeIds = startPlan.routeIds

  startBatch(routeIds)
  let failedResults: GatewayRouteProbeResult[] = []
  try {
    const results = await requestProbeBatch(routeIds)
    const resultByRouteId = new Map(results.map((result) => [result.id, result]))
    for (const routeId of routeIds) {
      const route = routes.find((item) => item.id === routeId)
      let result: GatewayRouteProbeResult = resultByRouteId.get(routeId) ?? buildGatewayProbeFailureResult({
        routeId,
        route,
        error: new Error('后端未返回该路由的探测结果'),
        checkedAt: now(),
      })
      try {
        applyProbeResult(result)
      } catch (err) {
        result = buildGatewayProbeFailureResult({
          routeId,
          route,
          error: err,
          checkedAt: now(),
        })
      }
      const stepPlan = buildGatewayProbeStepPlan({
        failedResults,
        result,
      })
      failedResults = stepPlan.failedResults
      finishBatchRoute(routeId, stepPlan.routeSucceeded)
    }
    showPlanNotice(buildGatewayProbeCompletionPlan(routeIds.length - failedResults.length, failedResults))
  } catch (err) {
    showPlanNotice(buildGatewaySingleProbeErrorPlan(err))
  } finally {
    finishBatch(routeIds)
  }
}

export type ProbeSingleGatewayRouteOptions = {
  route: GatewayRoute
  requestProbe: (routeId: number) => Promise<GatewayRouteProbeResult>
  applyProbeResult: (result: GatewayRouteProbeResult) => void
  trackRoute: (routeId: number) => void
  untrackRoute: (routeId: number) => void
  showNotice: (notice: GatewayRouteProbeNotice) => void
  showPlanNotice: (plan: GatewayRouteProbeNoticePlan) => void
}

type GatewayRouteProbeBatchState = Pick<ProbeGatewayRouteBatchOptions, 'startBatch' | 'finishBatchRoute' | 'finishBatch'>
type GatewayRouteSingleProbeState = Pick<ProbeSingleGatewayRouteOptions, 'trackRoute' | 'untrackRoute'>

export type ApplyGatewayProbeResultActionOptions = {
  getRoutes: () => GatewayRoute[]
  mergeProbeResult: (routes: GatewayRoute[], result: GatewayRouteProbeResult) => GatewayRoute[]
  setRoutes: (routes: GatewayRoute[]) => void
}

export type ProbeAllGatewayRoutesActionOptions =
  Omit<ProbeGatewayRouteBatchOptions, 'startBatch' | 'finishBatchRoute' | 'finishBatch'> & {
    probeState: GatewayRouteProbeBatchState
  }

export type CreateProbeAllGatewayRoutesActionOptions =
  Omit<ProbeAllGatewayRoutesActionOptions, 'routes'> & {
    getRoutes: () => GatewayRoute[]
  }

export type ProbeGatewayRouteActionOptions =
  Omit<ProbeSingleGatewayRouteOptions, 'trackRoute' | 'untrackRoute'> & {
    probeState: GatewayRouteSingleProbeState
  }

export function createProbeAllGatewayRoutesAction({
  getRoutes,
  ...options
}: CreateProbeAllGatewayRoutesActionOptions) {
  return () =>
    probeAllGatewayRoutesAction({
      ...options,
      routes: getRoutes(),
    })
}

export function createApplyGatewayProbeResultAction({
  getRoutes,
  mergeProbeResult,
  setRoutes,
}: ApplyGatewayProbeResultActionOptions) {
  return (result: GatewayRouteProbeResult) => {
    setRoutes(mergeProbeResult(getRoutes(), result))
  }
}

export function createProbeGatewayRouteAction(options: Omit<ProbeGatewayRouteActionOptions, 'route'>) {
  return (route: GatewayRoute) => probeGatewayRouteAction({ ...options, route })
}

export async function probeAllGatewayRoutesAction({
  probeState,
  ...options
}: ProbeAllGatewayRoutesActionOptions) {
  await probeGatewayRouteBatch({
    ...options,
    startBatch: probeState.startBatch,
    finishBatchRoute: probeState.finishBatchRoute,
    finishBatch: probeState.finishBatch,
  })
}

export async function probeGatewayRouteAction({
  probeState,
  ...options
}: ProbeGatewayRouteActionOptions) {
  await probeSingleGatewayRoute({
    ...options,
    trackRoute: probeState.trackRoute,
    untrackRoute: probeState.untrackRoute,
  })
}

export async function probeSingleGatewayRoute({
  route,
  requestProbe,
  applyProbeResult,
  trackRoute,
  untrackRoute,
  showNotice,
  showPlanNotice,
}: ProbeSingleGatewayRouteOptions) {
  trackRoute(route.id)
  try {
    const result = await requestProbe(route.id)
    applyProbeResult(result)
    const completionPlan = buildGatewaySingleProbeCompletionPlan(route, result)
    showNotice(completionPlan.notice)
  } catch (err) {
    showPlanNotice(buildGatewaySingleProbeErrorPlan(err))
  } finally {
    untrackRoute(route.id)
  }
}

type GatewayRouteProbeStateOptions = {
  clearDelayMs?: number
  setTimeout?: (callback: () => void, delay: number) => TimeoutHandle
  clearTimeout?: (handle: TimeoutHandle) => void
}

export function useGatewayRouteProbeState(options: GatewayRouteProbeStateOptions = {}) {
  const loading = ref(false)
  const probingRouteIds = ref<number[]>([])
  const progress = ref<RouteBatchProgress | null>(null)
  const clearDelayMs = options.clearDelayMs ?? 1600
  const setTimer = options.setTimeout ?? globalThis.setTimeout.bind(globalThis)
  const clearTimer = options.clearTimeout ?? globalThis.clearTimeout.bind(globalThis)
  let progressClearTimer: TimeoutHandle | null = null

  const progressPercentValue = computed(() => progressPercent(progress.value))

  function clearProgressTimer() {
    if (progressClearTimer === null) {
      return
    }
    clearTimer(progressClearTimer)
    progressClearTimer = null
  }

  function trackRoute(routeId: number) {
    probingRouteIds.value = mergeGatewayProbingIds(probingRouteIds.value, [routeId])
  }

  function untrackRoute(routeId: number) {
    probingRouteIds.value = removeGatewayProbingIds(probingRouteIds.value, [routeId])
  }

  function startBatch(routeIds: number[]) {
    const ids = normalizeGatewayProbeRouteIds(routeIds)
    clearProgressTimer()
    loading.value = true
    progress.value = createGatewayProbeProgress(ids.length)
    probingRouteIds.value = mergeGatewayProbingIds(probingRouteIds.value, ids)
  }

  function finishBatchRoute(routeId: number, ok: boolean) {
    if (progress.value) {
      progress.value = nextGatewayProbeProgress(progress.value, ok)
    }
    untrackRoute(routeId)
  }

  function finishBatch(routeIds: number[]) {
    loading.value = false
    probingRouteIds.value = removeGatewayProbingIds(probingRouteIds.value, routeIds)
    clearProgressTimer()
    progressClearTimer = setTimer(() => {
      progressClearTimer = null
      if (!loading.value) {
        progress.value = null
      }
    }, clearDelayMs)
  }

  function isRouteProbing(routeId: number) {
    return isGatewayRouteProbing(probingRouteIds.value, routeId)
  }

  function dispose() {
    clearProgressTimer()
    loading.value = false
    probingRouteIds.value = []
    progress.value = null
  }

  return {
    loading,
    probingRouteIds,
    progress,
    progressPercent: progressPercentValue,
    startBatch,
    finishBatchRoute,
    finishBatch,
    trackRoute,
    untrackRoute,
    isRouteProbing,
    dispose,
  }
}

export type GatewayRouteProbeState = ReturnType<typeof useGatewayRouteProbeState>
