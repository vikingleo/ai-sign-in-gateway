import {
  createGatewayAutoRefreshTimerPlatform,
  createStartGatewayAutoRefreshTimersAction,
  createStopGatewayAutoRefreshTimersAction,
  startGatewayAutoRefreshTimers,
  stopGatewayAutoRefreshTimers,
} from './gatewayAutoRefreshTimerController.ts'

export type AutoRefreshTimers = {
  autoRefreshTimer: number | null
  activeRequestRefreshTimer: number | null
}

export type AbortControllerSlot = {
  abortAndClear: () => void
}

export type GatewayAutoRefreshTimerWindow = {
  setInterval: (handler: () => void, timeout: number) => number
  clearInterval: (timer: number) => void
}

export type GatewayAutoRefreshPageOptions = {
  timerWindow: GatewayAutoRefreshTimerWindow
  timers: AutoRefreshTimers
  isMonitor: () => boolean
  routeRefreshMs: number
  monitorRefreshMs: number
  activeRequestRefreshMs: number
  autoRefreshControllerSlot: AbortControllerSlot
  activeRequestsControllerSlot: AbortControllerSlot
  refreshRealtimeData: () => void | Promise<void>
  refreshActiveRequests: (silent: true) => void | Promise<void>
}

export function useGatewayAutoRefreshPageActions({
  timerWindow,
  timers,
  isMonitor,
  routeRefreshMs,
  monitorRefreshMs,
  activeRequestRefreshMs,
  autoRefreshControllerSlot,
  activeRequestsControllerSlot,
  refreshRealtimeData,
  refreshActiveRequests,
}: GatewayAutoRefreshPageOptions) {
  const timerPlatform = createGatewayAutoRefreshTimerPlatform({
    timerWindow,
  })
  const startAutoRefresh = createStartGatewayAutoRefreshTimersAction({
    startTimers: startGatewayAutoRefreshTimers,
    timers,
    isMonitor,
    routeRefreshMs,
    monitorRefreshMs,
    activeRequestRefreshMs,
    autoRefreshControllerSlot,
    activeRequestsControllerSlot,
    setInterval: timerPlatform.setInterval,
    clearInterval: timerPlatform.clearInterval,
    refreshRealtimeData,
    refreshActiveRequests,
  })
  const stopAutoRefresh = createStopGatewayAutoRefreshTimersAction({
    stopTimers: stopGatewayAutoRefreshTimers,
    timers,
    autoRefreshControllerSlot,
    activeRequestsControllerSlot,
    clearInterval: timerPlatform.clearInterval,
  })

  return {
    startAutoRefresh,
    stopAutoRefresh,
  }
}
