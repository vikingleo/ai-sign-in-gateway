import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { useGatewayDataOperationsPageActions } from '../src/gatewayDataOperationsPageController.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRuntimeActionsControllerPath = new URL(
  '../src/gatewayPageRuntimeActionsController.ts',
  import.meta.url,
)
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

test('useGatewayDataOperationsPageActions wires initial data and usage page actions', async () => {
  const events: string[] = []
  const overview = { value: null as string | null }
  const routes = { value: [] as string[] }
  const priorityRoutes = { value: [] as string[] }
  const logs = { value: [] as string[] }
  const activeRequests = { value: [] as string[] }
  const gatewayUsage = { value: null as string | null }
  const siteGroups = { value: [] as string[] }
  const includeDisabled = { value: false }
  const loadDataControllerSlot = controllerSlot()
  const gatewayUsageControllerSlot = controllerSlot()
  let monitor = false
  let requestRange = { start: '2026-05-27T00:00', end: '2026-05-27T23:59' }

  const actions = useGatewayDataOperationsPageActions({
    overview,
    routes,
    priorityRoutes,
    logs,
    activeRequests,
    gatewayUsage,
    siteGroups,
    includeDisabled,
    settingsDialog: {
      setSettings: (settings: string) => {
        events.push(`settings:${settings}`)
      },
    },
    logsDrawer: {
      setLogs: (nextLogs: string[]) => {
        events.push(`logs:${nextLogs.join(',')}`)
        logs.value = nextLogs
      },
    },
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
      const nextActive = await options.requestActiveRequests({ signal: loadDataControllerSlot.replace().signal })
      options.setActiveRequests(nextActive)
      options.applyActiveRequestSnapshot(nextActive)
    },
    isMonitor: () => monitor,
    hasUsageSnapshot: () => Boolean(gatewayUsage.value),
    getRequestRange: () => requestRange,
    mounted: () => true,
    loadDataControllerSlot,
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
      events.push(`plan:${plan.notice.message}`)
    },
    isAbortError: () => false,
    loadUsage: async (options) => {
      events.push(`usage:${options.isMonitor}:${options.requestRange.start}`)
      options.setUsage('usage-query')
    },
    gatewayUsageControllerSlot,
    setUsageLoading: (loading) => {
      events.push(`usage-loading:${loading}`)
    },
    resetToToday: () => {
      events.push('reset-today')
    },
    showNotice: (notice) => {
      events.push(`notice:${notice.message}`)
    },
  })

  await actions.loadData()
  monitor = true
  requestRange = { start: '2026-05-28T00:00', end: '2026-05-28T23:59' }
  await actions.reloadGatewayDataAfterAction()
  await actions.handleUsageQuery()
  await actions.handleUsageToday()

  assert.deepEqual(overview.value, 'overview-1')
  assert.deepEqual(routes.value, ['ROUTE-1'])
  assert.deepEqual(priorityRoutes.value, ['ROUTE-1'])
  assert.deepEqual(logs.value, ['log-1'])
  assert.deepEqual(siteGroups.value, ['group-1'])
  assert.deepEqual(activeRequests.value, ['active-1'])
  assert.equal(gatewayUsage.value, 'usage-query')
  assert.deepEqual(events, [
    'load:false:2026-05-27T00:00',
    'settings:settings-1',
    'logs:log-1',
    'apply-active:active-1',
    'load:true:2026-05-28T00:00',
    'settings:settings-1',
    'logs:log-1',
    'apply-active:active-1',
    'usage:true:2026-05-28T00:00',
    'reset-today',
    'usage:true:2026-05-28T00:00',
  ])
})

test('GatewayView delegates data operation wiring to the data operations page controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRuntimeActions"), "GatewayView delegates data operation wiring to the page runtime actions controller should keep useGatewayPageRuntimeActions in gateway page controller")
  assert.ok(runtimeActionsControllerSource.includes("useGatewayRuntimeOperationsPageActions"), "GatewayView delegates data operation wiring to the data operations page controller should keep useGatewayRuntimeOperationsPageActions in gateway page runtime actions controller")
  assert.ok(runtimeActionsControllerSource.includes("requestUsage: gatewayPageRequests.getGatewayUsage"), "GatewayView delegates data operation wiring to the data operations page controller should keep requestUsage: gatewayPageRequests.getGatewayUsage in gateway page runtime actions controller")
})
