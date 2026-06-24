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

test('createLoadGatewayInitialDataRuntimeAction reads latest state and delegates through injected dependencies', async () => {
  assert.equal(
    typeof gatewayInitialDataLoadController.createLoadGatewayInitialDataRuntimeAction,
    'function',
    'createLoadGatewayInitialDataRuntimeAction should be exported',
  )

  const controller = new AbortController()
  const controllerSlot = {
    replace: () => controller,
    clearIfCurrent: () => true,
  }
  const requestOverview = async () => 'overview'
  const requestSettings = async () => 'settings'
  const requestRoutes = async () => ['route']
  const requestLogs = async () => ['log']
  const requestSiteGroups = async () => ['group']
  const requestUsage = async () => 'usage'
  const requestActiveRequests = async () => ['active']
  const currentUsage = () => usageSnapshot
  const normalizeRoute = (route: string) => route.toUpperCase()
  const setLoading = () => {}
  const setOverview = () => {}
  const setSettings = () => {}
  const setPriorityRoutes = () => {}
  const setRoutes = () => {}
  const setLogs = () => {}
  const setSiteGroups = () => {}
  const setUsage = () => {}
  const setActiveRequests = () => {}
  const applyActiveRequestSnapshot = () => {}
  const showPlanNotice = () => {}
  const isAbortError = () => false
  let monitor = false
  let usageSnapshot: string | null = null
  let includeDisabled = false
  let requestRange = {
    start: '2026-05-26T00:00',
    end: '2026-05-26T23:59',
  }
  const calls: Array<{
    isMonitor: boolean
    hasUsageSnapshot: boolean
    includeDisabled: boolean
    requestRange: {
      start: string
      end: string
    }
  }> = []

  const loadData = gatewayInitialDataLoadController.createLoadGatewayInitialDataRuntimeAction({
    loadData: async (options) => {
      assert.equal(options.currentUsage, currentUsage)
      assert.equal(options.mounted(), true)
      assert.equal(options.controllerSlot, controllerSlot)
      assert.equal(options.setLoading, setLoading)
      assert.equal(options.requestOverview, requestOverview)
      assert.equal(options.requestSettings, requestSettings)
      assert.equal(options.requestRoutes, requestRoutes)
      assert.equal(options.requestLogs, requestLogs)
      assert.equal(options.requestSiteGroups, requestSiteGroups)
      assert.equal(options.requestUsage, requestUsage)
      assert.equal(options.requestActiveRequests, requestActiveRequests)
      assert.equal(options.normalizeRoute, normalizeRoute)
      assert.equal(options.setOverview, setOverview)
      assert.equal(options.setSettings, setSettings)
      assert.equal(options.setPriorityRoutes, setPriorityRoutes)
      assert.equal(options.setRoutes, setRoutes)
      assert.equal(options.setLogs, setLogs)
      assert.equal(options.setSiteGroups, setSiteGroups)
      assert.equal(options.setUsage, setUsage)
      assert.equal(options.setActiveRequests, setActiveRequests)
      assert.equal(options.applyActiveRequestSnapshot, applyActiveRequestSnapshot)
      assert.equal(options.showPlanNotice, showPlanNotice)
      assert.equal(options.isAbortError, isAbortError)
      calls.push({
        isMonitor: options.isMonitor,
        hasUsageSnapshot: options.hasUsageSnapshot,
        includeDisabled: options.includeDisabled,
        requestRange: options.requestRange,
      })
    },
    isMonitor: () => monitor,
    hasUsageSnapshot: () => Boolean(usageSnapshot),
    includeDisabled: () => includeDisabled,
    getRequestRange: () => requestRange,
    currentUsage,
    mounted: () => true,
    controllerSlot,
    setLoading,
    requestOverview,
    requestSettings,
    requestRoutes,
    requestLogs,
    requestSiteGroups,
    requestUsage,
    requestActiveRequests,
    normalizeRoute,
    setOverview,
    setSettings,
    setPriorityRoutes,
    setRoutes,
    setLogs,
    setSiteGroups,
    setUsage,
    setActiveRequests,
    applyActiveRequestSnapshot,
    showPlanNotice,
    isAbortError,
  })

  await loadData()
  monitor = true
  usageSnapshot = 'cached-usage'
  includeDisabled = true
  requestRange = {
    start: '2026-05-27T00:00',
    end: '2026-05-27T23:59',
  }
  await loadData()

  assert.deepEqual(calls, [
    {
      isMonitor: false,
      hasUsageSnapshot: false,
      includeDisabled: false,
      requestRange: {
        start: '2026-05-26T00:00',
        end: '2026-05-26T23:59',
      },
    },
    {
      isMonitor: true,
      hasUsageSnapshot: true,
      includeDisabled: true,
      requestRange: {
        start: '2026-05-27T00:00',
        end: '2026-05-27T23:59',
      },
    },
  ])
})

test('GatewayView delegates initial data loading through the runtime controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRuntimeActions"), "GatewayView delegates initial data loading through the page runtime actions controller should keep useGatewayPageRuntimeActions in gateway page controller")
  assert.ok(runtimeActionsControllerSource.includes("useGatewayRuntimeOperationsPageActions"), "GatewayView delegates initial data loading through the runtime controller should keep useGatewayRuntimeOperationsPageActions in gateway page runtime actions controller")
  assert.ok(runtimeActionsControllerSource.includes("loadData: state.gatewayRuntime.loadData"), "GatewayView delegates initial data loading through the runtime controller should keep loadData: state.gatewayRuntime.loadData in gateway page runtime actions controller")
})

test('createReloadGatewayDataAfterAction delegates to the injected data loader', async () => {
  assert.equal(
    typeof gatewayRuntimeLoadController.createReloadGatewayDataAfterAction,
    'function',
    'createReloadGatewayDataAfterAction should be exported',
  )

  const calls: string[] = []
  const reloadGatewayData = gatewayRuntimeLoadController.createReloadGatewayDataAfterAction({
    loadData: async () => {
      calls.push('load-data')
    },
  })

  await reloadGatewayData()
  await reloadGatewayData()

  assert.deepEqual(calls, ['load-data', 'load-data'])
})
