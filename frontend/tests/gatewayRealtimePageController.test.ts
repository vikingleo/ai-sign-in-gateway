import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { useGatewayRealtimePageActions } from '../src/gatewayRealtimePageController.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRuntimeActionsControllerPath = new URL(
  '../src/gatewayPageRuntimeActionsController.ts',
  import.meta.url,
)
const realtimePageControllerPath = new URL('../src/gatewayRealtimePageController.ts', import.meta.url)
const realtimeOperationsPageControllerPath = new URL(
  '../src/gatewayRealtimeOperationsPageController.ts',
  import.meta.url,
)

function controllerSlot() {
  const controller = new AbortController()
  return {
    replace: () => controller,
    clearIfCurrent: () => true,
  }
}

test('useGatewayRealtimePageActions wires active request and realtime refresh actions', async () => {
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
  const loadDataSlot = controllerSlot()
  const activeRequestsSlot = controllerSlot()
  const autoRefreshSlot = controllerSlot()
  const actions = useGatewayRealtimePageActions({
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
    startAutoRefresh: () => {
      events.push('start-realtime')
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
  })

  await actions.loadActiveRequests()
  await actions.refreshActiveRequests(false)
  visible = true
  monitor = true
  now = 2000
  logsDrawer.open.value = true
  includeDisabled.value = true
  priorityDialog.open.value = true
  await actions.refreshActiveRequests()
  await actions.refreshRealtimeData()
  actions.handleVisibilityChange()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))

  assert.deepEqual(activeRequests.value, ['active-1'])
  assert.deepEqual(overview.value, 'overview-1')
  assert.deepEqual(routes.value, ['ROUTE-1'])
  assert.deepEqual(priorityRoutes.value, ['ROUTE-1'])
  assert.deepEqual(logs.value, ['log-1'])
  assert.deepEqual(events, [
    'load-active:false',
    'apply-active:active-1',
    'plan-active:1000:false:false:false',
    'plan-active:2000:true:true:true',
    'start-active',
    'load-active:true',
    'apply-active:active-1',
    'finish-active',
    'realtime:2000:true:true:true:true',
    'logs:log-1',
    'plan-active:2000:true:true:true',
    'start-active',
    'load-active:true',
    'apply-active:active-1',
    'finish-active',
    'visibility:true:true',
    'realtime:2000:true:true:true:true',
    'plan-active:2000:true:true:true',
    'start-active',
    'load-active:true',
    'apply-active:active-1',
    'finish-active',
    'logs:log-1',
    'plan-active:2000:true:true:true',
    'start-active',
    'load-active:true',
    'apply-active:active-1',
    'finish-active',
  ])
})

test('GatewayView delegates realtime page wiring to the page controller', async () => {
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const source = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')
  const controller = await readFile(realtimePageControllerPath, 'utf8')
  const operationsController = await readFile(realtimeOperationsPageControllerPath, 'utf8')
  const handler = source.slice(
    source.indexOf('useGatewayRuntimeOperationsPageActions({'),
    source.indexOf('\n  })'),
  )

  assert.match(operationsControllerSource, /useGatewayPageRuntimeActions\(\{/)
  assert.match(source, /import \{ useGatewayRuntimeOperationsPageActions \} from '(?:\.\.\/|\.\/)gatewayRuntimeOperationsPageController(?:\.ts)?'/)
  assert.doesNotMatch(pageControllerSource, /import \{ useGatewayRealtimePageActions \} from '(?:\.\.\/|\.\/)gatewayRealtimePageController(?:\.ts)?'/)
  assert.match(handler, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.match(handler, /activeRequests/)
  assert.match(handler, /overview/)
  assert.match(handler, /routes/)
  assert.match(handler, /priorityRoutes/)
  assert.match(handler, /logs/)
  assert.match(handler, /logsDrawer/)
  assert.match(handler, /includeDisabled/)
  assert.match(handler, /priorityDialog/)
  assert.match(handler, /requestActiveRequests: gatewayPageRequests\.getGatewayActiveRequests/)
  assert.match(handler, /applyActiveRequestSnapshot/)
  assert.match(handler, /requestOverview: gatewayPageRequests\.getGatewayOverview/)
  assert.match(handler, /requestRoutes: gatewayPageRequests\.getGatewayRoutes/)
  assert.match(handler, /requestLogs: gatewayPageRequests\.getGatewayLogs/)
  assert.match(handler, /showPlanNotice/)
  assert.match(operationsController, /useGatewayRealtimePageActions,[\s\S]*\} from '\.\/gatewayRealtimePageController\.ts'/)
  assert.match(operationsController, /const realtimeActions = useGatewayRealtimePageActions\(\{/)
  assert.match(operationsController, /startAutoRefresh: startAutoRefreshRuntime/)
  assert.doesNotMatch(pageControllerSource, /createLoadGatewayActiveRequestsRuntimeAction/)
  assert.doesNotMatch(pageControllerSource, /createRefreshGatewayActiveRequestsRuntimeAction/)
  assert.doesNotMatch(pageControllerSource, /createRefreshGatewayRealtimeDataRuntimeAction/)
  assert.doesNotMatch(pageControllerSource, /createHandleGatewayVisibilityChangeAction/)

  assert.match(controller, /createLoadGatewayActiveRequestsRuntimeAction/)
  assert.match(controller, /createRefreshGatewayActiveRequestsRuntimeAction/)
  assert.match(controller, /createRefreshGatewayRealtimeDataRuntimeAction/)
  assert.match(controller, /createHandleGatewayVisibilityChangeAction/)
})
