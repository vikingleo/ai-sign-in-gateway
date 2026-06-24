import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { useGatewayRealtimeOperationsPageActions } from '../src/gatewayRealtimeOperationsPageController.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRuntimeActionsControllerPath = new URL(
  '../src/gatewayPageRuntimeActionsController.ts',
  import.meta.url,
)
const realtimeOperationsPageControllerPath = new URL('../src/gatewayRealtimeOperationsPageController.ts', import.meta.url)

function controllerSlot() {
  const controller = new AbortController()
  return {
    replace: () => controller,
    clearIfCurrent: () => true,
    abortAndClear: () => undefined,
  }
}

test('useGatewayRealtimeOperationsPageActions wires realtime and auto refresh page actions', async () => {
  const events: string[] = []
  let visible = false
  let monitor = false
  let now = 1000
  const activeRequests = { value: [] as string[] }
  const overview = { value: null as string | null }
  const routes = { value: [] as string[] }
  const priorityRoutes = { value: [] as string[] }
  const logs = { value: [] as string[] }
  const logsDrawer = {
    open: { value: false },
    setLogs: (nextLogs: string[]) => {
      events.push(`logs:${nextLogs.join(',')}`)
      logs.value = nextLogs
    },
  }
  const includeDisabled = { value: false }
  const priorityDialog = { open: { value: false } }
  const activeRequestsSlot = controllerSlot()
  const autoRefreshSlot = controllerSlot()
  const handlers = new Map<number, () => void>()
  let nextTimer = 100
  const timers = {
    autoRefreshTimer: null as number | null,
    activeRequestRefreshTimer: null as number | null,
  }

  const actions = useGatewayRealtimeOperationsPageActions({
    activeRequests,
    overview,
    routes,
    priorityRoutes,
    logs,
    logsDrawer,
    includeDisabled,
    priorityDialog,
    loadActiveRequests: async (options) => {
      events.push(`load-active:${options.silent}`)
      const snapshot = await options.requestActiveRequests({ signal: activeRequestsSlot.replace().signal })
      options.setActiveRequests(snapshot)
      options.applyActiveRequestSnapshot(snapshot)
    },
    refreshRealtimeData: async (options) => {
      events.push(`realtime:${options.now}:${options.visible}:${options.isMonitor}:${options.logsDrawerOpen}:${options.includeDisabled}`)
      const nextOverview = await options.requestOverview({ signal: autoRefreshSlot.replace().signal })
      const nextRoutes = await options.requestRoutes({ includeDisabled: options.includeDisabled, signal: autoRefreshSlot.replace().signal })
      const nextLogs = await options.requestLogs(50, { signal: autoRefreshSlot.replace().signal })
      options.setOverview(nextOverview)
      options.setRoutes(nextRoutes.map(options.normalizeRoute))
      options.setPriorityRoutes(nextRoutes.map(options.normalizeRoute))
      options.setLogs(nextLogs)
      await options.refreshActiveRequests(true)
    },
    buildActiveRequestsRefreshPlan: (options) => {
      events.push(`plan-active:${options.now}:${options.visible}:${options.isMonitor}:${options.silent}`)
      return options.visible && options.isMonitor
        ? {
            shouldStart: true,
            startOptions: {
              now: options.now,
              visible: options.visible,
              enabled: true,
            },
            loadSilent: options.silent,
          }
        : {
            shouldStart: false,
            startOptions: null,
            loadSilent: options.silent,
          }
    },
    startActiveRequestsRefresh: () => {
      events.push('start-active')
      return true
    },
    finishActiveRequestsRefresh: () => {
      events.push('finish-active')
    },
    startAutoRefreshRuntime: () => {
      events.push('start-realtime-runtime')
      return true
    },
    finishAutoRefresh: () => {
      events.push('finish-realtime')
    },
    handleVisibilityRefresh: (options) => {
      events.push(`visibility:${options.visible}:${options.isMonitor}`)
      if (options.visible) {
        void options.refreshRealtimeData()
      }
      if (options.visible && options.isMonitor) {
        void options.refreshActiveRequests(true)
      }
    },
    mounted: () => true,
    activeRequestsControllerSlot: activeRequestsSlot,
    autoRefreshControllerSlot: autoRefreshSlot,
    requestActiveRequests: async () => ['active-1'],
    applyActiveRequestSnapshot: (snapshot) => {
      events.push(`apply-active:${snapshot.join(',')}`)
      activeRequests.value = snapshot
    },
    requestOverview: async () => 'overview-1',
    requestRoutes: async () => ['route-1'],
    requestLogs: async () => ['log-1'],
    normalizeRoute: (route) => route.toUpperCase(),
    now: () => now,
    isVisible: () => visible,
    isMonitor: () => monitor,
    isAbortError: () => false,
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
    timerWindow: {
      setInterval(handler, timeout) {
        const timer = nextTimer
        nextTimer += 1
        handlers.set(timer, handler)
        events.push(`set:${timeout}:${timer}`)
        return timer
      },
      clearInterval(timer) {
        events.push(`clear:${timer}`)
      },
    },
    timers,
    routeRefreshMs: 180000,
    monitorRefreshMs: 30000,
    activeRequestRefreshMs: 1000,
  })

  await actions.loadActiveRequests()
  await actions.refreshActiveRequests(false)
  visible = true
  monitor = true
  now = 2000
  logsDrawer.open.value = true
  includeDisabled.value = true
  await actions.refreshActiveRequests()
  await actions.refreshRealtimeData()
  actions.handleVisibilityChange()
  actions.startAutoRefresh()
  handlers.get(100)?.()
  handlers.get(101)?.()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
  actions.stopAutoRefresh()

  assert.deepEqual(activeRequests.value, ['active-1'])
  assert.deepEqual(overview.value, 'overview-1')
  assert.deepEqual(routes.value, ['ROUTE-1'])
  assert.deepEqual(priorityRoutes.value, ['ROUTE-1'])
  assert.deepEqual(logs.value, ['log-1'])
  assert.deepEqual(timers, {
    autoRefreshTimer: null,
    activeRequestRefreshTimer: null,
  })
  assert.ok(events.includes('realtime:2000:true:true:true:true'))
  assert.ok(events.includes('visibility:true:true'))
  assert.ok(events.includes('set:30000:100'))
  assert.ok(events.includes('set:1000:101'))
  assert.ok(events.includes('clear:100'))
  assert.ok(events.includes('clear:101'))
})

test('GatewayView delegates realtime operation wiring to the realtime operations page controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRuntimeActions"), "GatewayView delegates realtime operation wiring to the page runtime actions controller should keep useGatewayPageRuntimeActions in gateway page controller")
  assert.ok(runtimeActionsControllerSource.includes("useGatewayRuntimeOperationsPageActions"), "GatewayView delegates realtime operation wiring to the realtime operations page controller should keep useGatewayRuntimeOperationsPageActions in gateway page runtime actions controller")
  assert.ok(runtimeActionsControllerSource.includes("handleVisibilityRefresh: state.gatewayRuntime.handleVisibilityRefresh"), "GatewayView delegates realtime operation wiring to the realtime operations page controller should keep handleVisibilityRefresh: state.gatewayRuntime.handleVisibilityRefresh in gateway page runtime actions controller")
})
