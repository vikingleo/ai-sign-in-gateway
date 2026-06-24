import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  createGatewayAutoRefreshTimerPlatform,
  createStartGatewayAutoRefreshTimersAction,
  createStopGatewayAutoRefreshTimersAction,
  startGatewayAutoRefreshTimers,
  stopGatewayAutoRefreshTimers,
} from '../src/gatewayAutoRefreshTimerController.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRuntimeActionsControllerPath = new URL(
  '../src/gatewayPageRuntimeActionsController.ts',
  import.meta.url,
)
const gatewayAutoRefreshPageControllerPath = new URL(
  '../src/gatewayAutoRefreshPageController.ts',
  import.meta.url,
)
const gatewayRealtimeOperationsPageControllerPath = new URL(
  '../src/gatewayRealtimeOperationsPageController.ts',
  import.meta.url,
)

test('starts gateway auto refresh timers after stopping existing timers', () => {
  const calls: string[] = []
  const intervalHandlers = new Map<number, () => void>()
  const timers = {
    autoRefreshTimer: 10,
    activeRequestRefreshTimer: 11,
  }
  let nextTimer = 100

  startGatewayAutoRefreshTimers({
    timers,
    isMonitor: true,
    routeRefreshMs: 180000,
    monitorRefreshMs: 30000,
    activeRequestRefreshMs: 1000,
    autoRefreshControllerSlot: {
      abortAndClear: () => calls.push('abort-auto'),
    },
    activeRequestsControllerSlot: {
      abortAndClear: () => calls.push('abort-active'),
    },
    setInterval: (handler, timeout) => {
      const timer = nextTimer
      nextTimer += 1
      intervalHandlers.set(timer, handler)
      calls.push(`set:${timeout}:${timer}`)
      return timer
    },
    clearInterval: (timer) => calls.push(`clear:${timer}`),
    refreshRealtimeData: () => {
      calls.push('realtime')
    },
    refreshActiveRequests: (silent) => {
      calls.push(`active:${silent}`)
    },
  })

  assert.deepEqual(calls, [
    'abort-auto',
    'abort-active',
    'clear:10',
    'clear:11',
    'set:30000:100',
    'set:1000:101',
  ])
  assert.deepEqual(timers, {
    autoRefreshTimer: 100,
    activeRequestRefreshTimer: 101,
  })

  intervalHandlers.get(100)?.()
  intervalHandlers.get(101)?.()
  assert.deepEqual(calls.slice(-2), ['realtime', 'active:true'])
})

test('starts only realtime refresh timers outside monitor', () => {
  const calls: string[] = []
  const timers = {
    autoRefreshTimer: null as number | null,
    activeRequestRefreshTimer: null as number | null,
  }

  startGatewayAutoRefreshTimers({
    timers,
    isMonitor: false,
    routeRefreshMs: 180000,
    monitorRefreshMs: 30000,
    activeRequestRefreshMs: 1000,
    autoRefreshControllerSlot: {
      abortAndClear: () => calls.push('abort-auto'),
    },
    activeRequestsControllerSlot: {
      abortAndClear: () => calls.push('abort-active'),
    },
    setInterval: (_handler, timeout) => {
      calls.push(`set:${timeout}`)
      return 20
    },
    clearInterval: (timer) => calls.push(`clear:${timer}`),
    refreshRealtimeData: () => {},
    refreshActiveRequests: () => {},
  })

  assert.deepEqual(calls, ['abort-auto', 'abort-active', 'set:180000'])
  assert.deepEqual(timers, {
    autoRefreshTimer: 20,
    activeRequestRefreshTimer: null,
  })
})

test('stops gateway auto refresh timers by aborting slots before clearing timers', () => {
  const calls: string[] = []
  const timers = {
    autoRefreshTimer: 10,
    activeRequestRefreshTimer: 11,
  }

  stopGatewayAutoRefreshTimers({
    timers,
    autoRefreshControllerSlot: {
      abortAndClear: () => calls.push('abort-auto'),
    },
    activeRequestsControllerSlot: {
      abortAndClear: () => calls.push('abort-active'),
    },
    clearInterval: (timer) => calls.push(`clear:${timer}`),
  })

  assert.deepEqual(calls, ['abort-auto', 'abort-active', 'clear:10', 'clear:11'])
  assert.deepEqual(timers, {
    autoRefreshTimer: null,
    activeRequestRefreshTimer: null,
  })
})

test('createGatewayAutoRefreshTimerPlatform delegates scheduling to the injected window boundary', () => {
  const calls: string[] = []
  const handlers = new Map<number, () => void>()
  const platform = createGatewayAutoRefreshTimerPlatform({
    timerWindow: {
      setInterval(handler: () => void, timeout: number) {
        calls.push(`set:${timeout}`)
        handlers.set(77, handler)
        return 77
      },
      clearInterval(timer: number) {
        calls.push(`clear:${timer}`)
      },
    },
  })

  const timer = platform.setInterval(() => {
    calls.push('tick')
  }, 30000)
  handlers.get(timer)?.()
  platform.clearInterval(timer)

  assert.deepEqual(calls, ['set:30000', 'tick', 'clear:77'])
})

test('auto refresh timer actions read latest monitor state and delegate through injected dependencies', () => {
  const calls: string[] = []
  const timers = {
    autoRefreshTimer: null as number | null,
    activeRequestRefreshTimer: null as number | null,
  }
  const autoRefreshControllerSlot = {
    abortAndClear: () => calls.push('abort-auto'),
  }
  const activeRequestsControllerSlot = {
    abortAndClear: () => calls.push('abort-active'),
  }
  const setInterval = () => 10
  const clearInterval = () => {}
  const refreshRealtimeData = () => {}
  const refreshActiveRequests = async () => {}
  let monitor = false

  assert.equal(
    typeof createStartGatewayAutoRefreshTimersAction,
    'function',
    'createStartGatewayAutoRefreshTimersAction should be exported',
  )
  assert.equal(
    typeof createStopGatewayAutoRefreshTimersAction,
    'function',
    'createStopGatewayAutoRefreshTimersAction should be exported',
  )

  const startAutoRefresh = createStartGatewayAutoRefreshTimersAction({
    startTimers: (options) => {
      assert.equal(options.timers, timers)
      assert.equal(options.routeRefreshMs, 180000)
      assert.equal(options.monitorRefreshMs, 30000)
      assert.equal(options.activeRequestRefreshMs, 1000)
      assert.equal(options.autoRefreshControllerSlot, autoRefreshControllerSlot)
      assert.equal(options.activeRequestsControllerSlot, activeRequestsControllerSlot)
      assert.equal(options.setInterval, setInterval)
      assert.equal(options.clearInterval, clearInterval)
      assert.equal(options.refreshRealtimeData, refreshRealtimeData)
      assert.equal(options.refreshActiveRequests, refreshActiveRequests)
      calls.push(`start:${options.isMonitor}`)
    },
    timers,
    isMonitor: () => monitor,
    routeRefreshMs: 180000,
    monitorRefreshMs: 30000,
    activeRequestRefreshMs: 1000,
    autoRefreshControllerSlot,
    activeRequestsControllerSlot,
    setInterval,
    clearInterval,
    refreshRealtimeData,
    refreshActiveRequests,
  })

  const stopAutoRefresh = createStopGatewayAutoRefreshTimersAction({
    stopTimers: (options) => {
      assert.equal(options.timers, timers)
      assert.equal(options.autoRefreshControllerSlot, autoRefreshControllerSlot)
      assert.equal(options.activeRequestsControllerSlot, activeRequestsControllerSlot)
      assert.equal(options.clearInterval, clearInterval)
      calls.push('stop')
    },
    timers,
    autoRefreshControllerSlot,
    activeRequestsControllerSlot,
    clearInterval,
  })

  startAutoRefresh()
  monitor = true
  startAutoRefresh()
  stopAutoRefresh()

  assert.deepEqual(calls, ['start:false', 'start:true', 'stop'])
})

test('GatewayView delegates auto refresh timer side effects through the timer controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRuntimeActions"), "GatewayView delegates auto refresh timer side effects through the page runtime actions controller should keep useGatewayPageRuntimeActions in gateway page controller")
  assert.ok(runtimeActionsControllerSource.includes("useGatewayRuntimeOperationsPageActions"), "GatewayView delegates auto refresh timer side effects through the page runtime actions controller should keep useGatewayRuntimeOperationsPageActions in gateway page runtime actions controller")
  assert.ok(runtimeActionsControllerSource.includes("timerWindow: gatewayPagePlatform.timerWindow"), "GatewayView delegates auto refresh timer side effects through the timer controller should keep timerWindow: gatewayPagePlatform.timerWindow in gateway page runtime actions controller")
})
