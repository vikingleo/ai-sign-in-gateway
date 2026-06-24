import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { useGatewayAutoRefreshPageActions } from '../src/gatewayAutoRefreshPageController.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRuntimeActionsControllerPath = new URL(
  '../src/gatewayPageRuntimeActionsController.ts',
  import.meta.url,
)
const gatewayPagePlatformControllerPath = new URL('../src/gatewayPagePlatformController.ts', import.meta.url)
const pageControllerPath = new URL('../src/gatewayAutoRefreshPageController.ts', import.meta.url)
const realtimeOperationsPageControllerPath = new URL(
  '../src/gatewayRealtimeOperationsPageController.ts',
  import.meta.url,
)

test('useGatewayAutoRefreshPageActions wires timer platform and start stop actions', () => {
  const calls: string[] = []
  const handlers = new Map<number, () => void>()
  let nextTimer = 100
  let monitor = false
  const timers = {
    autoRefreshTimer: 10,
    activeRequestRefreshTimer: 11,
  }

  const { startAutoRefresh, stopAutoRefresh } = useGatewayAutoRefreshPageActions({
    timerWindow: {
      setInterval(handler, timeout) {
        const timer = nextTimer
        nextTimer += 1
        handlers.set(timer, handler)
        calls.push(`set:${timeout}:${timer}`)
        return timer
      },
      clearInterval(timer) {
        calls.push(`clear:${timer}`)
      },
    },
    timers,
    isMonitor: () => monitor,
    routeRefreshMs: 180000,
    monitorRefreshMs: 30000,
    activeRequestRefreshMs: 1000,
    autoRefreshControllerSlot: {
      abortAndClear: () => calls.push('abort-auto'),
    },
    activeRequestsControllerSlot: {
      abortAndClear: () => calls.push('abort-active'),
    },
    refreshRealtimeData: () => {
      calls.push('realtime')
    },
    refreshActiveRequests: (silent) => {
      calls.push(`active:${silent}`)
    },
  })

  startAutoRefresh()
  monitor = true
  startAutoRefresh()
  handlers.get(102)?.()
  handlers.get(103)?.()
  stopAutoRefresh()

  assert.deepEqual(calls, [
    'abort-auto',
    'abort-active',
    'clear:10',
    'clear:11',
    'set:180000:100',
    'abort-auto',
    'abort-active',
    'clear:100',
    'set:30000:101',
    'set:1000:102',
    'active:true',
    'abort-auto',
    'abort-active',
    'clear:101',
    'clear:102',
  ])
  assert.deepEqual(timers, {
    autoRefreshTimer: null,
    activeRequestRefreshTimer: null,
  })
})

test('GatewayView delegates auto refresh page wiring to the page controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRuntimeActions"), "GatewayView delegates auto refresh page wiring to the page controller should keep useGatewayPageRuntimeActions in gateway page controller")
  assert.ok(runtimeActionsControllerSource.includes("useGatewayRuntimeOperationsPageActions"), "GatewayView delegates auto refresh page wiring to the page runtime actions controller should keep useGatewayRuntimeOperationsPageActions in gateway page runtime actions controller")
  assert.ok(runtimeActionsControllerSource.includes("startAutoRefreshRuntime: state.gatewayRuntime.startAutoRefresh"), "GatewayView delegates auto refresh page wiring to the page runtime actions controller should keep startAutoRefreshRuntime: state.gatewayRuntime.startAutoRefresh in gateway page runtime actions controller")
})
