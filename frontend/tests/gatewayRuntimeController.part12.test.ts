import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildGatewayActiveRequestsLoadErrorPlan,
  buildGatewayActiveRequestsLoadResultPlan,
  buildGatewayActiveRequestsRefreshPlan,
  buildGatewayAutoRefreshTimerPlan,
  buildGatewayInitialDataApplyPlan,
  buildGatewayInitialDataLoadErrorPlan,
  buildGatewayInitialDataLoadPlan,
  buildGatewayRealtimeRefreshApplyPlan,
  buildGatewayRealtimeRefreshPlan,
  buildGatewayUsageLoadErrorPlan,
  buildGatewayUsageLoadPlan,
  buildGatewayUsageLoadResultPlan,
  buildGatewayVisibilityRefreshPlan,
  createGatewayAbortControllerSlot,
  handleGatewayVisibilityRefresh,
  loadGatewayActiveRequests,
  loadGatewayData,
  loadGatewayUsage,
  refreshGatewayRealtimeData,
  useGatewayRuntimeController,
  useGatewayRuntimeState,
} from '../src/gatewayRuntimeController.ts'
import * as gatewayRuntimeController from '../src/gatewayRuntimeController.ts'
import * as gatewayInitialDataLoadController from '../src/gatewayInitialDataLoadController.ts'
import * as gatewayRuntimeLoadController from '../src/gatewayRuntimeLoadController.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRuntimeActionsControllerPath = new URL(
  '../src/gatewayPageRuntimeActionsController.ts',
  import.meta.url,
)
const gatewayPageRouteActionsControllerPath = new URL('../src/gatewayPageRouteActionsController.ts', import.meta.url)
const gatewayRouteMutationActionsControllerPath = new URL(
  '../src/gatewayRouteMutationActionsController.ts',
  import.meta.url,
)
const gatewayRuntimeControllerPath = new URL('../src/gatewayRuntimeController.ts', import.meta.url)
const gatewayRuntimeLoadControllerPath = new URL('../src/gatewayRuntimeLoadController.ts', import.meta.url)
const gatewayDataOperationsPageControllerPath = new URL(
  '../src/gatewayDataOperationsPageController.ts',
  import.meta.url,
)
const gatewayUsagePageControllerPath = new URL('../src/gatewayUsagePageController.ts', import.meta.url)
const gatewayRealtimePageControllerPath = new URL('../src/gatewayRealtimePageController.ts', import.meta.url)
const gatewayRealtimeOperationsPageControllerPath = new URL(
  '../src/gatewayRealtimeOperationsPageController.ts',
  import.meta.url,
)
const gatewayInitialDataPageControllerPath = new URL('../src/gatewayInitialDataPageController.ts', import.meta.url)

test('GatewayView delegates realtime refresh to the runtime controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRuntimeActions"), "GatewayView delegates realtime refresh to the page runtime actions controller should keep useGatewayPageRuntimeActions in gateway page controller")
  assert.ok(runtimeActionsControllerSource.includes("useGatewayRuntimeOperationsPageActions"), "GatewayView delegates realtime refresh to the runtime controller should keep useGatewayRuntimeOperationsPageActions in gateway page runtime actions controller")
  assert.ok(runtimeActionsControllerSource.includes("refreshRealtimeData: state.gatewayRuntime.refreshRealtimeData"), "GatewayView delegates realtime refresh to the runtime controller should keep refreshRealtimeData: state.gatewayRuntime.refreshRealtimeData in gateway page runtime actions controller")
})

test('GatewayView delegates active request refresh through the active requests runtime controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRuntimeActions"), "GatewayView delegates active request refresh through the page runtime actions controller should keep useGatewayPageRuntimeActions in gateway page controller")
  assert.ok(runtimeActionsControllerSource.includes("useGatewayRuntimeOperationsPageActions"), "GatewayView delegates active request refresh through the active requests runtime controller should keep useGatewayRuntimeOperationsPageActions in gateway page runtime actions controller")
  assert.ok(runtimeActionsControllerSource.includes("startActiveRequestsRefresh: state.gatewayRuntime.startActiveRequestsRefresh"), "GatewayView delegates active request refresh through the active requests runtime controller should keep startActiveRequestsRefresh: state.gatewayRuntime.startActiveRequestsRefresh in gateway page runtime actions controller")
})

test('builds gateway auto refresh timer plans from the active section', () => {
  assert.deepEqual(buildGatewayAutoRefreshTimerPlan({
    isMonitor: false,
    routeRefreshMs: 180000,
    monitorRefreshMs: 30000,
    activeRequestRefreshMs: 1000,
  }), {
    realtimeRefreshMs: 180000,
    activeRequestRefreshMs: null,
  })

  assert.deepEqual(buildGatewayAutoRefreshTimerPlan({
    isMonitor: true,
    routeRefreshMs: 180000,
    monitorRefreshMs: 30000,
    activeRequestRefreshMs: 1000,
  }), {
    realtimeRefreshMs: 30000,
    activeRequestRefreshMs: 1000,
  })
})

test('builds gateway visibility refresh plans without reading document state', () => {
  assert.deepEqual(buildGatewayVisibilityRefreshPlan({
    visible: false,
    isMonitor: true,
  }), {
    refreshRealtimeData: false,
    refreshActiveRequests: false,
  })

  assert.deepEqual(buildGatewayVisibilityRefreshPlan({
    visible: true,
    isMonitor: false,
  }), {
    refreshRealtimeData: true,
    refreshActiveRequests: false,
  })

  assert.deepEqual(buildGatewayVisibilityRefreshPlan({
    visible: true,
    isMonitor: true,
  }), {
    refreshRealtimeData: true,
    refreshActiveRequests: true,
  })
})

test('handles gateway visibility refreshes while visible on monitor', () => {
  const calls: string[] = []

  handleGatewayVisibilityRefresh({
    visible: true,
    isMonitor: true,
    refreshRealtimeData: () => {
      calls.push('realtime')
    },
    refreshActiveRequests: (silent) => {
      calls.push(`active:${silent}`)
    },
  })

  assert.deepEqual(calls, ['realtime', 'active:true'])
})

test('handles gateway visibility refreshes outside monitor', () => {
  const calls: string[] = []

  handleGatewayVisibilityRefresh({
    visible: true,
    isMonitor: false,
    refreshRealtimeData: () => {
      calls.push('realtime')
    },
    refreshActiveRequests: (silent) => {
      calls.push(`active:${silent}`)
    },
  })

  assert.deepEqual(calls, ['realtime'])
})

test('skips gateway visibility refreshes while hidden', () => {
  const calls: string[] = []

  handleGatewayVisibilityRefresh({
    visible: false,
    isMonitor: true,
    refreshRealtimeData: () => {
      calls.push('realtime')
    },
    refreshActiveRequests: (silent) => {
      calls.push(`active:${silent}`)
    },
  })

  assert.deepEqual(calls, [])
})

test('createHandleGatewayVisibilityChangeAction reads latest visibility and monitor state', () => {
  assert.equal(
    typeof gatewayRuntimeController.createHandleGatewayVisibilityChangeAction,
    'function',
    'createHandleGatewayVisibilityChangeAction should be exported',
  )

  let visible = false
  let monitor = false
  const calls: string[] = []
  const handleVisibilityChange = gatewayRuntimeController.createHandleGatewayVisibilityChangeAction({
    isVisible: () => {
      calls.push(`visible:${visible}`)
      return visible
    },
    isMonitor: () => {
      calls.push(`monitor:${monitor}`)
      return monitor
    },
    handleVisibilityRefresh: (options) => {
      calls.push(`handle:${options.visible}:${options.isMonitor}`)
      options.refreshRealtimeData()
      options.refreshActiveRequests(true)
    },
    refreshRealtimeData: () => {
      calls.push('realtime')
    },
    refreshActiveRequests: (silent) => {
      calls.push(`active:${silent}`)
    },
  })

  handleVisibilityChange()
  visible = true
  monitor = true
  handleVisibilityChange()

  assert.deepEqual(calls, [
    'visible:false',
    'monitor:false',
    'handle:false:false',
    'realtime',
    'active:true',
    'visible:true',
    'monitor:true',
    'handle:true:true',
    'realtime',
    'active:true',
  ])
})

test('GatewayView delegates visibility refreshes through the runtime controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRuntimeActions"), "GatewayView delegates visibility refreshes through the page runtime actions controller should keep useGatewayPageRuntimeActions in gateway page controller")
  assert.ok(runtimeActionsControllerSource.includes("useGatewayRuntimeOperationsPageActions"), "GatewayView delegates visibility refreshes through the runtime controller should keep useGatewayRuntimeOperationsPageActions in gateway page runtime actions controller")
  assert.ok(runtimeActionsControllerSource.includes("handleVisibilityRefresh: state.gatewayRuntime.handleVisibilityRefresh"), "GatewayView delegates visibility refreshes through the runtime controller should keep handleVisibilityRefresh: state.gatewayRuntime.handleVisibilityRefresh in gateway page runtime actions controller")
})
