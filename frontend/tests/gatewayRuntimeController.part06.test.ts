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

test('createRefreshGatewayRealtimeDataRuntimeAction reads latest state and delegates through injected dependencies', async () => {
  let gatewayRealtimeRefreshRuntimeController: {
    createRefreshGatewayRealtimeDataRuntimeAction?: Function
  } = {}
  try {
    gatewayRealtimeRefreshRuntimeController = await import('../src/gatewayRealtimeRefreshRuntimeController.ts')
  } catch {
    gatewayRealtimeRefreshRuntimeController = {}
  }
  assert.equal(
    typeof gatewayRealtimeRefreshRuntimeController.createRefreshGatewayRealtimeDataRuntimeAction,
    'function',
    'createRefreshGatewayRealtimeDataRuntimeAction should be exported',
  )

  const controller = new AbortController()
  const controllerSlot = {
    replace: () => controller,
    clearIfCurrent: () => true,
  }
  const requestOverview = async () => 'overview'
  const requestRoutes = async () => ['route']
  const requestLogs = async () => ['log']
  const currentLogs = () => ['existing-log']
  const normalizeRoute = (route: string) => route.toUpperCase()
  const setOverview = () => {}
  const setRoutes = () => {}
  const setPriorityRoutes = () => {}
  const setLogs = () => {}
  const refreshActiveRequests = async () => {}
  const isAbortError = () => false
  let now = 1000
  let visible = false
  let monitor = false
  let logsOpen = false
  let includeDisabled = false
  let priorityOpen = false
  const calls: Array<{
    now: number
    visible: boolean
    isMonitor: boolean
    logsDrawerOpen: boolean
    includeDisabled: boolean
    priorityDialogOpen: boolean
  }> = []

  const refreshRealtimeData = gatewayRealtimeRefreshRuntimeController.createRefreshGatewayRealtimeDataRuntimeAction({
    refreshRealtimeData: async (options) => {
      assert.equal(options.mounted(), true)
      assert.equal(options.startAutoRefresh, startAutoRefresh)
      assert.equal(options.finishAutoRefresh, finishAutoRefresh)
      assert.equal(options.controllerSlot, controllerSlot)
      assert.equal(options.requestOverview, requestOverview)
      assert.equal(options.requestRoutes, requestRoutes)
      assert.equal(options.requestLogs, requestLogs)
      assert.equal(options.currentLogs, currentLogs)
      assert.equal(options.normalizeRoute, normalizeRoute)
      assert.equal(options.setOverview, setOverview)
      assert.equal(options.setRoutes, setRoutes)
      assert.equal(options.setPriorityRoutes, setPriorityRoutes)
      assert.equal(options.setLogs, setLogs)
      assert.equal(options.refreshActiveRequests, refreshActiveRequests)
      assert.equal(options.isAbortError, isAbortError)
      calls.push({
        now: options.now,
        visible: options.visible,
        isMonitor: options.isMonitor,
        logsDrawerOpen: options.logsDrawerOpen,
        includeDisabled: options.includeDisabled,
        priorityDialogOpen: options.priorityDialogOpen(),
      })
    },
    now: () => now,
    isVisible: () => visible,
    isMonitor: () => monitor,
    logsDrawerOpen: () => logsOpen,
    includeDisabled: () => includeDisabled,
    mounted: () => true,
    priorityDialogOpen: () => priorityOpen,
    startAutoRefresh,
    finishAutoRefresh,
    controllerSlot,
    requestOverview,
    requestRoutes,
    requestLogs,
    currentLogs,
    normalizeRoute,
    setOverview,
    setRoutes,
    setPriorityRoutes,
    setLogs,
    refreshActiveRequests,
    isAbortError,
  })

  function startAutoRefresh() {
    return true
  }

  function finishAutoRefresh() {}

  await refreshRealtimeData()
  now = 2000
  visible = true
  monitor = true
  logsOpen = true
  includeDisabled = true
  priorityOpen = true
  await refreshRealtimeData()

  assert.deepEqual(calls, [
    {
      now: 1000,
      visible: false,
      isMonitor: false,
      logsDrawerOpen: false,
      includeDisabled: false,
      priorityDialogOpen: false,
    },
    {
      now: 2000,
      visible: true,
      isMonitor: true,
      logsDrawerOpen: true,
      includeDisabled: true,
      priorityDialogOpen: true,
    },
  ])
})

test('GatewayView delegates post-action data reloads through the runtime load controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const routeActionsControllerSource = await readFile(gatewayPageRouteActionsControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(runtimeActionsControllerSource.includes("useGatewayRuntimeOperationsPageActions"), "GatewayView delegates post-action data reloads through the runtime load controller should keep useGatewayRuntimeOperationsPageActions in gateway page runtime actions controller")
  assert.ok(routeActionsControllerSource.includes("reloadGatewayData: runtimeActions.reloadGatewayDataAfterAction"), "GatewayView delegates post-action data reloads through the runtime load controller should keep reloadGatewayData: runtimeActions.reloadGatewayDataAfterAction in route actions controller")
})

test('builds realtime gateway refresh plans from monitor and log drawer state', () => {
  assert.deepEqual(buildGatewayRealtimeRefreshPlan({
    isMonitor: false,
    logsDrawerOpen: false,
  }), {
    loadLogs: false,
    refreshActiveRequests: false,
  })

  assert.deepEqual(buildGatewayRealtimeRefreshPlan({
    isMonitor: false,
    logsDrawerOpen: true,
  }), {
    loadLogs: true,
    refreshActiveRequests: false,
  })

  assert.deepEqual(buildGatewayRealtimeRefreshPlan({
    isMonitor: true,
    logsDrawerOpen: false,
  }), {
    loadLogs: true,
    refreshActiveRequests: true,
  })
})
