import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { useGatewayRuntimeOperationsPageActions } from '../src/gatewayRuntimeOperationsPageController.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRuntimeActionsControllerPath = new URL(
  '../src/gatewayPageRuntimeActionsController.ts',
  import.meta.url,
)
const runtimeOperationsPageControllerPath = new URL(
  '../src/gatewayRuntimeOperationsPageController.ts',
  import.meta.url,
)

function controllerSlot() {
  const controller = new AbortController()
  return {
    replace: () => controller,
    clearIfCurrent: () => true,
    abortAndClear: () => undefined,
  }
}

test('useGatewayRuntimeOperationsPageActions wires data and realtime operation domains', async () => {
  const events: string[] = []
  const overview = { value: null as string | null }
  const routes = { value: [] as string[] }
  const priorityRoutes = { value: [] as string[] }
  const logs = { value: [] as string[] }
  const activeRequests = { value: [] as string[] }
  const gatewayUsage = { value: null as string | null }
  const siteGroups = { value: [] as string[] }
  const includeDisabled = { value: false }
  const logsDrawer = {
    open: { value: false },
    setLogs: (nextLogs: string[]) => {
      events.push(`logs:${nextLogs.join(',')}`)
      logs.value = nextLogs
    },
  }
  const loadDataControllerSlot = controllerSlot()
  const gatewayUsageControllerSlot = controllerSlot()
  const activeRequestsControllerSlot = controllerSlot()
  const autoRefreshControllerSlot = controllerSlot()

  const actions = useGatewayRuntimeOperationsPageActions({
    overview,
    routes,
    priorityRoutes,
    logs,
    activeRequests,
    gatewayUsage,
    siteGroups,
    includeDisabled,
    settingsDialog: {
      setSettings: (settings: string) => events.push(`settings:${settings}`),
    },
    logsDrawer,
    loadData: async (options) => {
      events.push(`load:${options.isMonitor}:${options.requestRange.start}`)
      options.setOverview(await options.requestOverview({ signal: loadDataControllerSlot.replace().signal }))
      options.setSettings(await options.requestSettings({ signal: loadDataControllerSlot.replace().signal }))
      const nextRoutes = await options.requestRoutes({
        includeDisabled: options.includeDisabled,
        signal: loadDataControllerSlot.replace().signal,
      })
      options.setRoutes(nextRoutes.map(options.normalizeRoute))
      options.setPriorityRoutes(nextRoutes.map(options.normalizeRoute))
      options.setLogs(await options.requestLogs(50, { signal: loadDataControllerSlot.replace().signal }))
      options.setSiteGroups(await options.requestSiteGroups({ signal: loadDataControllerSlot.replace().signal }))
      options.setUsage(await options.requestUsage({
        ...options.requestRange,
        signal: loadDataControllerSlot.replace().signal,
      }))
      const snapshot = await options.requestActiveRequests({ signal: loadDataControllerSlot.replace().signal })
      options.setActiveRequests(snapshot)
      options.applyActiveRequestSnapshot(snapshot)
    },
    isMonitor: () => true,
    hasUsageSnapshot: () => Boolean(gatewayUsage.value),
    getRequestRange: () => ({ start: '2026-05-27T00:00', end: '2026-05-27T23:59' }),
    mounted: () => true,
    loadDataControllerSlot,
    setLoading: (loading) => events.push(`loading:${loading}`),
    requestOverview: async () => 'overview-1',
    requestSettings: async () => 'settings-1',
    requestRoutes: async () => ['route-1'],
    requestLogs: async () => ['log-1'],
    requestSiteGroups: async () => ['group-1'],
    requestUsage: async () => 'usage-1',
    requestActiveRequests: async () => ['active-1'],
    normalizeRoute: (route) => route.toUpperCase(),
    applyActiveRequestSnapshot: (snapshot) => {
      events.push(`apply-active:${snapshot.join(',')}`)
      activeRequests.value = snapshot
    },
    showPlanNotice: (plan) => events.push(`plan:${plan.notice.message}`),
    isAbortError: () => false,
    loadUsage: async (options) => {
      events.push(`usage:${options.requestRange.start}`)
      options.setUsage('usage-query')
    },
    gatewayUsageControllerSlot,
    setUsageLoading: (loading) => events.push(`usage-loading:${loading}`),
    resetToToday: () => events.push('reset-today'),
    showNotice: (notice) => events.push(`notice:${notice.message}`),
    priorityDialog: { open: { value: false } },
    loadActiveRequests: async (options) => {
      events.push(`load-active:${options.silent}`)
      const snapshot = await options.requestActiveRequests({
        signal: activeRequestsControllerSlot.replace().signal,
      })
      options.setActiveRequests(snapshot)
      options.applyActiveRequestSnapshot(snapshot)
    },
    refreshRealtimeData: async (options) => {
      events.push(`realtime:${options.visible}:${options.isMonitor}`)
      options.setOverview(await options.requestOverview({ signal: autoRefreshControllerSlot.replace().signal }))
      const nextRoutes = await options.requestRoutes({
        includeDisabled: options.includeDisabled,
        signal: autoRefreshControllerSlot.replace().signal,
      })
      options.setRoutes(nextRoutes.map(options.normalizeRoute))
      options.setPriorityRoutes(nextRoutes.map(options.normalizeRoute))
      options.setLogs(await options.requestLogs(50, { signal: autoRefreshControllerSlot.replace().signal }))
    },
    buildActiveRequestsRefreshPlan: (options) => ({
      shouldStart: options.visible && options.isMonitor,
      startOptions: options.visible && options.isMonitor
        ? { now: options.now, visible: options.visible, enabled: true }
        : null,
      loadSilent: options.silent,
    }),
    startActiveRequestsRefresh: () => {
      events.push('start-active')
      return true
    },
    finishActiveRequestsRefresh: () => events.push('finish-active'),
    startAutoRefreshRuntime: () => {
      events.push('start-realtime-runtime')
      return true
    },
    finishAutoRefresh: () => events.push('finish-realtime'),
    handleVisibilityRefresh: (options) => {
      events.push(`visibility:${options.visible}:${options.isMonitor}`)
      void options.refreshRealtimeData()
      void options.refreshActiveRequests(true)
    },
    activeRequestsControllerSlot,
    autoRefreshControllerSlot,
    now: () => 1000,
    isVisible: () => true,
    timerWindow: {
      setInterval: () => 1,
      clearInterval: () => undefined,
    },
    timers: {
      autoRefreshTimer: null,
      activeRequestRefreshTimer: null,
    },
    routeRefreshMs: 180000,
    monitorRefreshMs: 30000,
    activeRequestRefreshMs: 1000,
  })

  await actions.loadData()
  await actions.handleUsageToday()
  await actions.refreshActiveRequests(false)
  actions.handleVisibilityChange()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))

  assert.deepEqual(overview.value, 'overview-1')
  assert.deepEqual(routes.value, ['ROUTE-1'])
  assert.deepEqual(priorityRoutes.value, ['ROUTE-1'])
  assert.deepEqual(logs.value, ['log-1'])
  assert.deepEqual(siteGroups.value, ['group-1'])
  assert.deepEqual(activeRequests.value, ['active-1'])
  assert.equal(gatewayUsage.value, 'usage-query')
  assert.ok(events.includes('load:true:2026-05-27T00:00'))
  assert.ok(events.includes('reset-today'))
  assert.ok(events.includes('load-active:false'))
  assert.ok(events.includes('visibility:true:true'))
  assert.ok(events.includes('realtime:true:true'))
})

test('GatewayView delegates runtime operation wiring to the runtime operations page controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRuntimeActions"), "GatewayView delegates runtime operation wiring to the page runtime actions controller should keep useGatewayPageRuntimeActions in gateway page controller")
  assert.ok(runtimeActionsControllerSource.includes("useGatewayRuntimeOperationsPageActions"), "GatewayView delegates runtime operation wiring to the runtime operations page controller should keep useGatewayRuntimeOperationsPageActions in gateway page runtime actions controller")
  assert.ok(runtimeActionsControllerSource.includes("startAutoRefreshRuntime: state.gatewayRuntime.startAutoRefresh"), "GatewayView delegates runtime operation wiring to the runtime operations page controller should keep startAutoRefreshRuntime: state.gatewayRuntime.startAutoRefresh in gateway page runtime actions controller")
})
