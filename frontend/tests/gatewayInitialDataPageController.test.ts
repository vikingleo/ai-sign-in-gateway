import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { useGatewayInitialDataPageActions } from '../src/gatewayInitialDataPageController.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRuntimeActionsControllerPath = new URL(
  '../src/gatewayPageRuntimeActionsController.ts',
  import.meta.url,
)
const initialDataPageControllerPath = new URL('../src/gatewayInitialDataPageController.ts', import.meta.url)
const dataOperationsPageControllerPath = new URL(
  '../src/gatewayDataOperationsPageController.ts',
  import.meta.url,
)

function controllerSlot() {
  const controller = new AbortController()
  return {
    replace: () => controller,
    clearIfCurrent: () => true,
  }
}

test('useGatewayInitialDataPageActions wires initial load and reload actions', async () => {
  const events: string[] = []
  let monitor = false
  let includeDisabled = false
  let usageSnapshot: string | null = null
  let requestRange = { start: '2026-05-27T00:00', end: '2026-05-27T23:59' }
  const overview = { value: null as string | null }
  const routes = { value: [] as string[] }
  const priorityRoutes = { value: [] as string[] }
  const logs = { value: [] as string[] }
  const activeRequests = { value: [] as string[] }
  const gatewayUsage = { value: null as string | null }
  const siteGroups = { value: [] as string[] }
  const includeDisabledRef = { value: false }
  const settingsDialog = {
    setSettings: (settings: string) => {
      events.push(`settings:${settings}`)
    },
  }
  const logsDrawer = {
    setLogs: (nextLogs: string[]) => {
      events.push(`logs:${nextLogs.join(',')}`)
      logs.value = nextLogs
    },
  }
  const loadDataControllerSlot = controllerSlot()

  const { loadData, reloadGatewayDataAfterAction } = useGatewayInitialDataPageActions({
    overview,
    routes,
    priorityRoutes,
    logs,
    activeRequests,
    gatewayUsage,
    siteGroups,
    includeDisabled: includeDisabledRef,
    settingsDialog,
    logsDrawer,
    loadData: async (options) => {
      events.push([
        'load',
        options.isMonitor,
        options.hasUsageSnapshot,
        options.includeDisabled,
        options.requestRange.start,
      ].join(':'))
      const nextOverview = await options.requestOverview({ signal: loadDataControllerSlot.replace().signal })
      const nextSettings = await options.requestSettings({ signal: loadDataControllerSlot.replace().signal })
      const nextRoutes = await options.requestRoutes({
        includeDisabled: options.includeDisabled,
        signal: loadDataControllerSlot.replace().signal,
      })
      const nextLogs = await options.requestLogs(50, { signal: loadDataControllerSlot.replace().signal })
      const nextGroups = await options.requestSiteGroups({ signal: loadDataControllerSlot.replace().signal })
      const nextUsage = await options.requestUsage({
        ...options.requestRange,
        signal: loadDataControllerSlot.replace().signal,
      })
      const nextActive = await options.requestActiveRequests({ signal: loadDataControllerSlot.replace().signal })
      options.setLoading(true)
      options.setOverview(nextOverview)
      options.setSettings(nextSettings)
      options.setRoutes(nextRoutes.map(options.normalizeRoute))
      options.setPriorityRoutes(nextRoutes.map(options.normalizeRoute))
      options.setLogs(nextLogs)
      options.setSiteGroups(nextGroups)
      options.setUsage(nextUsage)
      options.setActiveRequests(nextActive)
      options.applyActiveRequestSnapshot(nextActive)
      options.setLoading(false)
    },
    isMonitor: () => monitor,
    hasUsageSnapshot: () => Boolean(usageSnapshot),
    getRequestRange: () => requestRange,
    mounted: () => true,
    controllerSlot: loadDataControllerSlot,
    setLoading: (loading) => {
      events.push(`loading:${loading}`)
    },
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
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
    isAbortError: () => false,
  })

  await loadData()
  monitor = true
  includeDisabled = true
  includeDisabledRef.value = includeDisabled
  usageSnapshot = 'cached'
  requestRange = { start: '2026-05-28T00:00', end: '2026-05-28T23:59' }
  await reloadGatewayDataAfterAction()

  assert.deepEqual(overview.value, 'overview-1')
  assert.deepEqual(routes.value, ['ROUTE-1'])
  assert.deepEqual(priorityRoutes.value, ['ROUTE-1'])
  assert.deepEqual(logs.value, ['log-1'])
  assert.deepEqual(siteGroups.value, ['group-1'])
  assert.deepEqual(gatewayUsage.value, 'usage-1')
  assert.deepEqual(activeRequests.value, ['active-1'])
  assert.deepEqual(events, [
    'load:false:false:false:2026-05-27T00:00',
    'loading:true',
    'settings:settings-1',
    'logs:log-1',
    'apply-active:active-1',
    'loading:false',
    'load:true:true:true:2026-05-28T00:00',
    'loading:true',
    'settings:settings-1',
    'logs:log-1',
    'apply-active:active-1',
    'loading:false',
  ])
})

test('GatewayView delegates initial data page wiring to the page controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRuntimeActions"), "GatewayView delegates initial data page wiring to the page runtime actions controller should keep useGatewayPageRuntimeActions in gateway page controller")
  assert.ok(runtimeActionsControllerSource.includes("useGatewayRuntimeOperationsPageActions"), "GatewayView delegates initial data page wiring to the page runtime actions controller should keep useGatewayRuntimeOperationsPageActions in gateway page runtime actions controller")
  assert.ok(runtimeActionsControllerSource.includes("requestOverview: gatewayPageRequests.getGatewayOverview"), "GatewayView delegates initial data page wiring to the page runtime actions controller should keep requestOverview: gatewayPageRequests.getGatewayOverview in gateway page runtime actions controller")
})
