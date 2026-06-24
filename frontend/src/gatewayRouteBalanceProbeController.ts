import { computed, ref, type Ref } from 'vue'

import {
  createGatewayRouteBalanceProgress,
  isGatewayRouteBalanceProbing,
  mergeGatewayRouteBalanceProbingIds,
  nextGatewayRouteBalanceProgress,
  normalizeGatewayRouteBalanceProbeIds,
  removeGatewayRouteBalanceProbingIds,
} from './gatewayRouteBalanceProbeModel.ts'
import {
  buildManualGatewayRouteBalanceDialogDraft,
  buildManualGatewayRouteBalanceSuccessState,
} from './gatewayManualRouteBalanceProbeModel.ts'
import { progressPercent, type RouteBatchProgress } from './gatewayViewModel.ts'
import type { BalanceProbeResult, GatewayRoute } from './types.ts'

export type ApplyGatewayRouteBalanceResultActionOptions = {
  getRoutes: () => GatewayRoute[]
  mergeBalanceResult: (routes: GatewayRoute[], result: BalanceProbeResult) => GatewayRoute[]
  setRoutes: (routes: GatewayRoute[]) => void
}

type ManualDialogOptions = {
  routes: Ref<GatewayRoute[]>
}

export function useGatewayRouteBalanceManualDialog({ routes }: ManualDialogOptions) {
  const open = ref(false)
  const loading = ref(false)
  const route = ref<GatewayRoute | null>(null)
  const url = ref('')
  const message = ref('')

  function openDialog(selectedRoute: GatewayRoute, failureMessage = '') {
    const draft = buildManualGatewayRouteBalanceDialogDraft(selectedRoute, routes.value, failureMessage)
    route.value = draft.route
    url.value = draft.url
    message.value = draft.message
    open.value = true
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setFailureMessage(value: string) {
    message.value = value
  }

  function closeAfterSuccess() {
    const nextState = buildManualGatewayRouteBalanceSuccessState()
    open.value = nextState.open
    route.value = nextState.route
    message.value = nextState.message
  }

  return {
    open,
    loading,
    route,
    url,
    message,
    openDialog,
    setLoading,
    setFailureMessage,
    closeAfterSuccess,
  }
}

export type GatewayRouteBalanceManualDialog = ReturnType<typeof useGatewayRouteBalanceManualDialog>

export function createApplyGatewayRouteBalanceResultAction({
  getRoutes,
  mergeBalanceResult,
  setRoutes,
}: ApplyGatewayRouteBalanceResultActionOptions) {
  return (result: BalanceProbeResult) => {
    setRoutes(mergeBalanceResult(getRoutes(), result))
  }
}

type TimeoutHandle = ReturnType<typeof globalThis.setTimeout>

type BalanceProbeStateOptions = {
  clearDelayMs?: number
  setTimeout?: (callback: () => void, delay: number) => TimeoutHandle
  clearTimeout?: (handle: TimeoutHandle) => void
}

export function useGatewayRouteBalanceProbeState(options: BalanceProbeStateOptions = {}) {
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

  function trackRoutes(routeIds: number[]) {
    probingRouteIds.value = mergeGatewayRouteBalanceProbingIds(probingRouteIds.value, routeIds)
  }

  function untrackRoutes(routeIds: number[]) {
    probingRouteIds.value = removeGatewayRouteBalanceProbingIds(probingRouteIds.value, routeIds)
  }

  function trackRoute(routeId: number) {
    trackRoutes([routeId])
  }

  function untrackRoute(routeId: number) {
    untrackRoutes([routeId])
  }

  function startBatch(routeIds: number[]) {
    const ids = normalizeGatewayRouteBalanceProbeIds(routeIds)
    clearProgressTimer()
    loading.value = true
    progress.value = createGatewayRouteBalanceProgress(ids.length)
    trackRoutes(ids)
  }

  function finishBatchRoute(routeId: number, ok: boolean) {
    if (progress.value) {
      progress.value = nextGatewayRouteBalanceProgress(progress.value, ok)
    }
    untrackRoute(routeId)
  }

  function finishBatch(routeIds: number[]) {
    loading.value = false
    untrackRoutes(routeIds)
    clearProgressTimer()
    progressClearTimer = setTimer(() => {
      progressClearTimer = null
      if (!loading.value) {
        progress.value = null
      }
    }, clearDelayMs)
  }

  function isRouteBalanceProbing(routeId: number) {
    return isGatewayRouteBalanceProbing(probingRouteIds.value, routeId)
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
    trackRoutes,
    untrackRoutes,
    trackRoute,
    untrackRoute,
    isRouteBalanceProbing,
    dispose,
  }
}

export type GatewayRouteBalanceProbeState = ReturnType<typeof useGatewayRouteBalanceProbeState>
