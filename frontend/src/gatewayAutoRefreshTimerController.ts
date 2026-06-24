import { buildGatewayAutoRefreshTimerPlan } from './gatewayRuntimeController.ts'

type AutoRefreshTimers = {
  autoRefreshTimer: number | null
  activeRequestRefreshTimer: number | null
}

type AbortControllerSlot = {
  abortAndClear: () => void
}

type GatewayAutoRefreshTimerWindow = {
  setInterval: (handler: () => void, timeout: number) => number
  clearInterval: (timer: number) => void
}

export type GatewayAutoRefreshTimerPlatformOptions = {
  timerWindow: GatewayAutoRefreshTimerWindow
}

type StopGatewayAutoRefreshTimersOptions = {
  timers: AutoRefreshTimers
  autoRefreshControllerSlot: AbortControllerSlot
  activeRequestsControllerSlot: AbortControllerSlot
  clearInterval: (timer: number) => void
}

type StartGatewayAutoRefreshTimersOptions = StopGatewayAutoRefreshTimersOptions & {
  isMonitor: boolean
  routeRefreshMs: number
  monitorRefreshMs: number
  activeRequestRefreshMs: number
  setInterval: (handler: () => void, timeout: number) => number
  refreshRealtimeData: () => void | Promise<void>
  refreshActiveRequests: (silent: true) => void | Promise<void>
}

type StartGatewayAutoRefreshTimersActionOptions = Omit<StartGatewayAutoRefreshTimersOptions, 'isMonitor'> & {
  startTimers: (options: StartGatewayAutoRefreshTimersOptions) => void
  isMonitor: () => boolean
}

type StopGatewayAutoRefreshTimersActionOptions = StopGatewayAutoRefreshTimersOptions & {
  stopTimers: (options: StopGatewayAutoRefreshTimersOptions) => void
}

export function createGatewayAutoRefreshTimerPlatform({
  timerWindow,
}: GatewayAutoRefreshTimerPlatformOptions) {
  return {
    setInterval: (handler: () => void, timeout: number) => timerWindow.setInterval(handler, timeout),
    clearInterval: (timer: number) => timerWindow.clearInterval(timer),
  }
}

export function createStartGatewayAutoRefreshTimersAction({
  startTimers,
  timers,
  isMonitor,
  routeRefreshMs,
  monitorRefreshMs,
  activeRequestRefreshMs,
  autoRefreshControllerSlot,
  activeRequestsControllerSlot,
  setInterval,
  clearInterval,
  refreshRealtimeData,
  refreshActiveRequests,
}: StartGatewayAutoRefreshTimersActionOptions) {
  return () =>
    startTimers({
      timers,
      isMonitor: isMonitor(),
      routeRefreshMs,
      monitorRefreshMs,
      activeRequestRefreshMs,
      autoRefreshControllerSlot,
      activeRequestsControllerSlot,
      setInterval,
      clearInterval,
      refreshRealtimeData,
      refreshActiveRequests,
    })
}

export function createStopGatewayAutoRefreshTimersAction({
  stopTimers,
  timers,
  autoRefreshControllerSlot,
  activeRequestsControllerSlot,
  clearInterval,
}: StopGatewayAutoRefreshTimersActionOptions) {
  return () =>
    stopTimers({
      timers,
      autoRefreshControllerSlot,
      activeRequestsControllerSlot,
      clearInterval,
    })
}

export function stopGatewayAutoRefreshTimers({
  timers,
  autoRefreshControllerSlot,
  activeRequestsControllerSlot,
  clearInterval,
}: StopGatewayAutoRefreshTimersOptions) {
  autoRefreshControllerSlot.abortAndClear()
  activeRequestsControllerSlot.abortAndClear()
  if (timers.autoRefreshTimer !== null) {
    clearInterval(timers.autoRefreshTimer)
    timers.autoRefreshTimer = null
  }
  if (timers.activeRequestRefreshTimer !== null) {
    clearInterval(timers.activeRequestRefreshTimer)
    timers.activeRequestRefreshTimer = null
  }
}

export function startGatewayAutoRefreshTimers({
  timers,
  isMonitor,
  routeRefreshMs,
  monitorRefreshMs,
  activeRequestRefreshMs,
  autoRefreshControllerSlot,
  activeRequestsControllerSlot,
  setInterval,
  clearInterval,
  refreshRealtimeData,
  refreshActiveRequests,
}: StartGatewayAutoRefreshTimersOptions) {
  stopGatewayAutoRefreshTimers({
    timers,
    autoRefreshControllerSlot,
    activeRequestsControllerSlot,
    clearInterval,
  })
  const timerPlan = buildGatewayAutoRefreshTimerPlan({
    isMonitor,
    routeRefreshMs,
    monitorRefreshMs,
    activeRequestRefreshMs,
  })
  timers.autoRefreshTimer = setInterval(() => {
    void refreshRealtimeData()
  }, timerPlan.realtimeRefreshMs)
  if (timerPlan.activeRequestRefreshMs !== null) {
    timers.activeRequestRefreshTimer = setInterval(() => {
      void refreshActiveRequests(true)
    }, timerPlan.activeRequestRefreshMs)
  }
}
