import { ref } from 'vue'

import {
  buildGatewayActiveRequestsLoadErrorPlan,
  buildGatewayActiveRequestsLoadResultPlan,
  createApplyGatewayActiveRequestSnapshotAction,
} from './gatewayActiveRequestsLoadModel.ts'
import {
  buildGatewayInitialDataApplyPlan,
  buildGatewayInitialDataLoadErrorPlan,
  buildGatewayInitialDataLoadPlan,
} from './gatewayInitialDataLoadModel.ts'
import {
  buildGatewayRealtimeRefreshApplyPlan,
  buildGatewayRealtimeRefreshPlan,
} from './gatewayRealtimeRefreshModel.ts'
import {
  buildGatewayUsageLoadErrorPlan,
  buildGatewayUsageLoadPlan,
  buildGatewayUsageLoadResultPlan,
} from './gatewayUsageLoadModel.ts'
import { loadGatewayData } from './gatewayInitialDataLoadController.ts'
import {
  loadGatewayActiveRequests,
  loadGatewayUsage,
  refreshGatewayRealtimeData,
} from './gatewayRuntimeLoadController.ts'

type RefreshStartOptions = {
  now: number
  visible: boolean
}

type ActiveRequestsRefreshStartOptions = RefreshStartOptions & {
  enabled: boolean
}

type ActiveRequestsRefreshPlanOptions = RefreshStartOptions & {
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

type AutoRefreshTimerPlanOptions = {
  isMonitor: boolean
  routeRefreshMs: number
  monitorRefreshMs: number
  activeRequestRefreshMs: number
}

type VisibilityRefreshPlanOptions = {
  visible: boolean
  isMonitor: boolean
}

type VisibilityRefreshOptions = VisibilityRefreshPlanOptions & {
  refreshRealtimeData: () => void | Promise<void>
  refreshActiveRequests: (silent: true) => void | Promise<void>
}

type AbortControllerLike = {
  signal: {
    aborted: boolean
  }
  abort: () => void
}

export function buildGatewayAutoRefreshTimerPlan({
  isMonitor,
  routeRefreshMs,
  monitorRefreshMs,
  activeRequestRefreshMs,
}: AutoRefreshTimerPlanOptions) {
  return {
    realtimeRefreshMs: isMonitor ? monitorRefreshMs : routeRefreshMs,
    activeRequestRefreshMs: isMonitor ? activeRequestRefreshMs : null,
  }
}

export function buildGatewayActiveRequestsRefreshPlan({
  isMonitor,
  visible,
  now,
  silent,
}: ActiveRequestsRefreshPlanOptions): ActiveRequestsRefreshPlan {
  if (!isMonitor || !visible) {
    return {
      shouldStart: false,
      startOptions: null,
      loadSilent: silent,
    }
  }
  return {
    shouldStart: true,
    startOptions: {
      now,
      visible,
      enabled: true,
    },
    loadSilent: silent,
  }
}

export function buildGatewayVisibilityRefreshPlan({ visible, isMonitor }: VisibilityRefreshPlanOptions) {
  return {
    refreshRealtimeData: visible,
    refreshActiveRequests: visible && isMonitor,
  }
}

export function handleGatewayVisibilityRefresh({
  visible,
  isMonitor,
  refreshRealtimeData,
  refreshActiveRequests,
}: VisibilityRefreshOptions) {
  const visibilityPlan = buildGatewayVisibilityRefreshPlan({ visible, isMonitor })
  if (visibilityPlan.refreshRealtimeData) {
    void refreshRealtimeData()
  }
  if (visibilityPlan.refreshActiveRequests) {
    void refreshActiveRequests(true)
  }
}

export function createHandleGatewayVisibilityChangeAction({
  isVisible,
  isMonitor,
  handleVisibilityRefresh,
  refreshRealtimeData,
  refreshActiveRequests,
}: {
  isVisible: () => boolean
  isMonitor: () => boolean
  handleVisibilityRefresh: typeof handleGatewayVisibilityRefresh
  refreshRealtimeData: () => void | Promise<void>
  refreshActiveRequests: (silent: true) => void | Promise<void>
}) {
  return () =>
    handleVisibilityRefresh({
      visible: isVisible(),
      isMonitor: isMonitor(),
      refreshRealtimeData,
      refreshActiveRequests,
    })
}

export function createGatewayAbortControllerSlot<T extends AbortControllerLike = AbortController>(
  createController: () => T = () => new AbortController() as unknown as T,
) {
  let current: T | null = null

  return {
    get current() {
      return current
    },
    replace() {
      current?.abort()
      current = createController()
      return current
    },
    clearIfCurrent(controller: T) {
      if (current !== controller) {
        return false
      }
      current = null
      return true
    },
    abortAndClear() {
      current?.abort()
      current = null
    },
  }
}

export function useGatewayRuntimeState() {
  const loading = ref(false)
  const usageLoading = ref(false)
  const autoRefreshing = ref(false)
  const activeRequestsRefreshing = ref(false)
  const lastAutoRefreshError = ref<string | null>(null)
  const lastAutoRefreshErrorAt = ref<number | null>(null)
  let lastAutoRefreshAt = 0
  let lastActiveRequestRefreshAt = 0

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setUsageLoading(value: boolean) {
    usageLoading.value = value
  }

  function startAutoRefresh({ now, visible }: RefreshStartOptions) {
    if (autoRefreshing.value || !visible) {
      return false
    }
    if (now - lastAutoRefreshAt < 1800) {
      return false
    }
    lastAutoRefreshAt = now
    autoRefreshing.value = true
    return true
  }

  function finishAutoRefresh() {
    autoRefreshing.value = false
  }

  function startActiveRequestsRefresh({ now, visible, enabled }: ActiveRequestsRefreshStartOptions) {
    if (!enabled || activeRequestsRefreshing.value || !visible) {
      return false
    }
    if (now - lastActiveRequestRefreshAt < 500) {
      return false
    }
    lastActiveRequestRefreshAt = now
    activeRequestsRefreshing.value = true
    return true
  }

  function finishActiveRequestsRefresh() {
    activeRequestsRefreshing.value = false
  }

  function setAutoRefreshError(message: string | null, occurredAt: number | null) {
    lastAutoRefreshError.value = message
    lastAutoRefreshErrorAt.value = message ? occurredAt : null
  }

  return {
    loading,
    usageLoading,
    autoRefreshing,
    activeRequestsRefreshing,
    lastAutoRefreshError,
    lastAutoRefreshErrorAt,
    setLoading,
    setUsageLoading,
    startAutoRefresh,
    finishAutoRefresh,
    startActiveRequestsRefresh,
    finishActiveRequestsRefresh,
    setAutoRefreshError,
  }
}

export type GatewayRuntimeState = ReturnType<typeof useGatewayRuntimeState>

export function useGatewayRuntimeController() {
  const runtime = useGatewayRuntimeState()

  return {
    ...runtime,
    loadDataControllerSlot: createGatewayAbortControllerSlot(),
    autoRefreshControllerSlot: createGatewayAbortControllerSlot(),
    activeRequestsControllerSlot: createGatewayAbortControllerSlot(),
    gatewayUsageControllerSlot: createGatewayAbortControllerSlot(),
    buildAutoRefreshTimerPlan: buildGatewayAutoRefreshTimerPlan,
    buildActiveRequestsLoadErrorPlan: buildGatewayActiveRequestsLoadErrorPlan,
    buildActiveRequestsLoadResultPlan: buildGatewayActiveRequestsLoadResultPlan,
    buildActiveRequestsRefreshPlan: buildGatewayActiveRequestsRefreshPlan,
    buildInitialDataApplyPlan: buildGatewayInitialDataApplyPlan,
    buildInitialDataLoadErrorPlan: buildGatewayInitialDataLoadErrorPlan,
    buildInitialDataLoadPlan: buildGatewayInitialDataLoadPlan,
    buildRealtimeRefreshApplyPlan: buildGatewayRealtimeRefreshApplyPlan,
    buildRealtimeRefreshPlan: buildGatewayRealtimeRefreshPlan,
    buildUsageLoadErrorPlan: buildGatewayUsageLoadErrorPlan,
    buildUsageLoadPlan: buildGatewayUsageLoadPlan,
    buildUsageLoadResultPlan: buildGatewayUsageLoadResultPlan,
    buildVisibilityRefreshPlan: buildGatewayVisibilityRefreshPlan,
    handleVisibilityRefresh: handleGatewayVisibilityRefresh,
    loadActiveRequests: loadGatewayActiveRequests,
    loadData: loadGatewayData,
    loadUsage: loadGatewayUsage,
    refreshRealtimeData: refreshGatewayRealtimeData,
  }
}

export type GatewayRuntimeController = ReturnType<typeof useGatewayRuntimeController>

export {
  buildGatewayActiveRequestsLoadErrorPlan,
  buildGatewayActiveRequestsLoadResultPlan,
  createApplyGatewayActiveRequestSnapshotAction,
  buildGatewayInitialDataApplyPlan,
  buildGatewayInitialDataLoadErrorPlan,
  buildGatewayInitialDataLoadPlan,
  buildGatewayRealtimeRefreshApplyPlan,
  buildGatewayRealtimeRefreshPlan,
  buildGatewayUsageLoadErrorPlan,
  buildGatewayUsageLoadPlan,
  buildGatewayUsageLoadResultPlan,
  loadGatewayActiveRequests,
  loadGatewayData,
  loadGatewayUsage,
  refreshGatewayRealtimeData,
}
