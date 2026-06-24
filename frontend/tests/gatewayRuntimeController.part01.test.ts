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

test('updates gateway runtime loading flags explicitly', () => {
  const runtime = useGatewayRuntimeState()

  runtime.setLoading(true)
  runtime.setUsageLoading(true)
  runtime.setAutoRefreshError('refresh failed', 1234)

  assert.equal(runtime.loading.value, true)
  assert.equal(runtime.usageLoading.value, true)
  assert.equal(runtime.lastAutoRefreshError.value, 'refresh failed')
  assert.equal(runtime.lastAutoRefreshErrorAt.value, 1234)

  runtime.setLoading(false)
  runtime.setUsageLoading(false)
  runtime.setAutoRefreshError(null, null)

  assert.equal(runtime.loading.value, false)
  assert.equal(runtime.usageLoading.value, false)
  assert.equal(runtime.lastAutoRefreshError.value, null)
  assert.equal(runtime.lastAutoRefreshErrorAt.value, null)
})

test('starts auto refresh only when visible, idle, and outside throttle window', () => {
  const runtime = useGatewayRuntimeState()

  assert.equal(runtime.startAutoRefresh({ now: 1000, visible: false }), false)
  assert.equal(runtime.autoRefreshing.value, false)

  assert.equal(runtime.startAutoRefresh({ now: 2000, visible: true }), true)
  assert.equal(runtime.autoRefreshing.value, true)
  assert.equal(runtime.startAutoRefresh({ now: 4000, visible: true }), false)

  runtime.finishAutoRefresh()

  assert.equal(runtime.startAutoRefresh({ now: 4200, visible: true }), true)
  runtime.finishAutoRefresh()
  assert.equal(runtime.startAutoRefresh({ now: 4300, visible: true }), false)
})

test('starts active request refresh only when enabled, visible, idle, and outside throttle window', () => {
  const runtime = useGatewayRuntimeState()

  assert.equal(runtime.startActiveRequestsRefresh({ now: 1000, visible: true, enabled: false }), false)
  assert.equal(runtime.startActiveRequestsRefresh({ now: 1000, visible: false, enabled: true }), false)

  assert.equal(runtime.startActiveRequestsRefresh({ now: 1000, visible: true, enabled: true }), true)
  assert.equal(runtime.activeRequestsRefreshing.value, true)
  assert.equal(runtime.startActiveRequestsRefresh({ now: 1700, visible: true, enabled: true }), false)

  runtime.finishActiveRequestsRefresh()

  assert.equal(runtime.startActiveRequestsRefresh({ now: 1800, visible: true, enabled: true }), true)
  runtime.finishActiveRequestsRefresh()
  assert.equal(runtime.startActiveRequestsRefresh({ now: 1900, visible: true, enabled: true }), false)
})

test('gateway abort controller slot replaces active controllers and only clears the current one', () => {
  const aborted: string[] = []
  let index = 0
  const slot = createGatewayAbortControllerSlot(() => {
    index += 1
    const id = `controller-${index}`
    return {
      signal: { id },
      abort: () => aborted.push(id),
    }
  })

  const first = slot.replace()
  assert.equal(slot.current, first)
  assert.deepEqual(aborted, [])

  const second = slot.replace()
  assert.equal(slot.current, second)
  assert.deepEqual(aborted, ['controller-1'])

  assert.equal(slot.clearIfCurrent(first), false)
  assert.equal(slot.current, second)

  assert.equal(slot.clearIfCurrent(second), true)
  assert.equal(slot.current, null)
})

test('gateway abort controller slot aborts and clears the active controller idempotently', () => {
  const aborted: string[] = []
  const slot = createGatewayAbortControllerSlot(() => ({
    signal: { id: 'active' },
    abort: () => aborted.push('active'),
  }))

  slot.replace()
  slot.abortAndClear()
  slot.abortAndClear()

  assert.equal(slot.current, null)
  assert.deepEqual(aborted, ['active'])
})

test('createApplyGatewayActiveRequestSnapshotAction merges active snapshots through injected state', () => {
  assert.equal(
    typeof gatewayRuntimeController.createApplyGatewayActiveRequestSnapshotAction,
    'function',
    'createApplyGatewayActiveRequestSnapshotAction should be exported',
  )

  const currentRoutes = ['route']
  const currentPriorityRoutes = ['priority']
  const currentOverview = { active_concurrency: 0 }
  const activeRequests = ['active']
  const merged = {
    routes: ['route-active'],
    priorityRoutes: ['priority-active'],
    overview: { active_concurrency: 1 },
  }
  const events: string[] = []

  const applyActiveRequestSnapshot = gatewayRuntimeController.createApplyGatewayActiveRequestSnapshotAction({
    getRoutes: () => {
      events.push('get-routes')
      return currentRoutes
    },
    getPriorityRoutes: () => {
      events.push('get-priority-routes')
      return currentPriorityRoutes
    },
    getOverview: () => {
      events.push('get-overview')
      return currentOverview
    },
    mergeSnapshot: (snapshot) => {
      events.push([
        'merge',
        snapshot.routes === currentRoutes,
        snapshot.priorityRoutes === currentPriorityRoutes,
        snapshot.overview === currentOverview,
        snapshot.activeRequests === activeRequests,
      ].join(':'))
      return merged
    },
    setRoutes: (routes) => {
      events.push(`set-routes:${routes === merged.routes}`)
    },
    setPriorityRoutes: (routes) => {
      events.push(`set-priority-routes:${routes === merged.priorityRoutes}`)
    },
    setOverview: (overview) => {
      events.push(`set-overview:${overview === merged.overview}`)
    },
  })

  applyActiveRequestSnapshot(activeRequests)

  assert.deepEqual(events, [
    'get-routes',
    'get-priority-routes',
    'get-overview',
    'merge:true:true:true:true',
    'set-routes:true',
    'set-priority-routes:true',
    'set-overview:true',
  ])
})

test('gateway runtime controller keeps load helpers behind a dedicated runtime load module', async () => {
  const source = await readFile(gatewayRuntimeControllerPath, 'utf8')

  assert.match(source, /from '\.\/gatewayRuntimeLoadController\.ts'/)
  assert.doesNotMatch(source, /export async function loadGatewayActiveRequests/)
  assert.doesNotMatch(source, /export async function loadGatewayUsage/)
  assert.doesNotMatch(source, /export async function refreshGatewayRealtimeData/)
})

test('gateway initial data loading stays behind its own runtime controller module', async () => {
  const runtimeSource = await readFile(gatewayRuntimeControllerPath, 'utf8')
  const loadSource = await readFile(gatewayRuntimeLoadControllerPath, 'utf8')

  assert.match(runtimeSource, /from '\.\/gatewayInitialDataLoadController\.ts'/)
  assert.doesNotMatch(loadSource, /export async function loadGatewayData/)
})

test('builds initial gateway data load plans from monitor state and cached usage', () => {
  assert.deepEqual(buildGatewayInitialDataLoadPlan({
    isMonitor: false,
    hasUsageSnapshot: false,
  }), {
    loadLogs: false,
    loadUsage: false,
    loadActiveRequests: false,
    applyActiveRequestSnapshot: false,
  })

  assert.deepEqual(buildGatewayInitialDataLoadPlan({
    isMonitor: true,
    hasUsageSnapshot: false,
  }), {
    loadLogs: true,
    loadUsage: true,
    loadActiveRequests: true,
    applyActiveRequestSnapshot: true,
  })

  assert.deepEqual(buildGatewayInitialDataLoadPlan({
    isMonitor: true,
    hasUsageSnapshot: true,
  }), {
    loadLogs: true,
    loadUsage: false,
    loadActiveRequests: true,
    applyActiveRequestSnapshot: true,
  })
})
