import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  createOpenGatewayRouteLogsAction,
  loadGatewayRouteLogs,
  useGatewayRouteLogsDrawer,
} from '../src/gatewayRouteLogsController.ts'
import type { GatewayLog, GatewayRoute } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRouteActionsControllerPath = new URL('../src/gatewayPageRouteActionsController.ts', import.meta.url)
const routeInspectionPageControllerPath = new URL(
  '../src/gatewayRouteInspectionPageController.ts',
  import.meta.url,
)
const routeOperationsPageControllerPath = new URL('../src/gatewayRouteOperationsPageController.ts', import.meta.url)

function route(overrides: Partial<GatewayRoute>): GatewayRoute {
  return {
    id: 1,
    site_id: 10,
    site_name: '主站',
    site_name_snapshot: '',
    site_base_url_snapshot: '',
    base_url: 'https://api.example',
    request_base_url: '',
    request_base_urls: [],
    manual_request_base_urls: [],
    group_name: '',
    supported_models: [],
    key_name: '',
    key_fingerprint: '',
    key_source: 'credential',
    route_type: 'codex',
    route_path: '',
    route_priority: 1,
    weight: 1,
    is_enabled: true,
    circuit_state: 'closed',
    consecutive_failures: 0,
    active_concurrency: 0,
    request_count: 0,
    success_count: 0,
    failure_count: 0,
    avg_latency_ms: null,
    ewma_latency_ms: null,
    last_latency_ms: null,
    success_rate: 0,
    last_status_code: null,
    last_error: '',
    last_used_at: null,
    last_success_at: null,
    last_failure_at: null,
    circuit_open_until: null,
    ...overrides,
  }
}

function log(overrides: Partial<GatewayLog>): GatewayLog {
  return {
    id: 1,
    created_at: '2026-05-25T00:00:00Z',
    route_id: 1,
    site_id: 10,
    site_name: '主站',
    route_label: '主站 / Key',
    key_name: 'Key',
    key_fingerprint: '',
    method: 'POST',
    request_url: '/v1/responses',
    target_path: '/v1/responses',
    model: '',
    requested_model: '',
    actual_model: '',
    user_agent: '',
    status_code: 200,
    success: true,
    failure_reason: '',
    latency_ms: 120,
    is_stream: false,
    attempt_index: 1,
    ...overrides,
  } as GatewayLog
}

test('opens route logs drawer without clearing previous logs', () => {
  const drawer = useGatewayRouteLogsDrawer()
  const previousLogs = [log({ id: 7, request_url: '/old' })]
  drawer.logs.value = previousLogs
  drawer.search.value = '失败'

  drawer.openDrawer(route({ id: 2 }))

  assert.equal(drawer.open.value, true)
  assert.equal(drawer.search.value, '')
  assert.equal(drawer.route.value?.id, 2)
  assert.deepEqual(drawer.logs.value, previousLogs)
})

test('updates route logs drawer loading and log result state', () => {
  const drawer = useGatewayRouteLogsDrawer()
  const logs = [log({ id: 8, request_url: '/new' })]

  drawer.setLoading(true)
  drawer.setLogs(logs)
  drawer.clearLogs()
  drawer.setLoading(false)

  assert.equal(drawer.loading.value, false)
  assert.deepEqual(drawer.logs.value, [])
})

test('loads route logs through injected drawer dependencies', async () => {
  const selectedRoute = route({ id: 12 })
  const loadedLogs = [log({ id: 20, request_url: '/v1/chat/completions' })]
  const openedRouteIds: number[] = []
  const loadingValues: boolean[] = []
  const requestCalls: Array<{ routeId: number; limit: number }> = []
  let appliedLogs: GatewayLog[] = []

  await loadGatewayRouteLogs({
    route: selectedRoute,
    requestLogs: async (routeId, limit) => {
      requestCalls.push({ routeId, limit })
      return loadedLogs
    },
    openDrawer: (openedRoute) => openedRouteIds.push(openedRoute.id),
    setLoading: (loading) => loadingValues.push(loading),
    setLogs: (logs) => {
      appliedLogs = logs
    },
    clearLogs: () => {
      throw new Error('should not clear logs on success')
    },
    showPlanNotice: () => {
      throw new Error('should not show notice on success')
    },
  })

  assert.deepEqual(openedRouteIds, [12])
  assert.deepEqual(requestCalls, [{ routeId: 12, limit: 120 }])
  assert.deepEqual(appliedLogs, loadedLogs)
  assert.deepEqual(loadingValues, [true, false])
})

test('loadGatewayRouteLogs reports errors, clears logs, and resets loading', async () => {
  const loadingValues: boolean[] = []
  const notices: string[] = []
  let clearCount = 0

  await loadGatewayRouteLogs({
    route: route({ id: 14 }),
    requestLogs: async () => {
      throw new Error('route logs timeout')
    },
    openDrawer: () => {},
    setLoading: (loading) => loadingValues.push(loading),
    setLogs: () => {
      throw new Error('should not set logs on failure')
    },
    clearLogs: () => {
      clearCount += 1
    },
    showPlanNotice: (plan) => notices.push(plan.notice.message),
  })

  assert.deepEqual(notices, ['route logs timeout'])
  assert.equal(clearCount, 1)
  assert.deepEqual(loadingValues, [true, false])
})

test('createOpenGatewayRouteLogsAction binds runtime dependencies once', async () => {
  const selectedRoute = route({ id: 31 })
  const loadedLogs = [log({ id: 32, route_id: 31, request_url: '/v1/models' })]
  const openedRouteIds: number[] = []
  const requestCalls: Array<{ routeId: number; limit: number }> = []
  let appliedLogs: GatewayLog[] = []

  const openRouteLogs = createOpenGatewayRouteLogsAction({
    requestLogs: async (routeId, limit) => {
      requestCalls.push({ routeId, limit })
      return loadedLogs
    },
    openDrawer: (openedRoute) => openedRouteIds.push(openedRoute.id),
    setLoading: () => {},
    setLogs: (logs) => {
      appliedLogs = logs
    },
    clearLogs: () => {
      throw new Error('should not clear logs on success')
    },
    showPlanNotice: () => {
      throw new Error('should not show notice on success')
    },
  })

  await openRouteLogs(selectedRoute)

  assert.deepEqual(openedRouteIds, [31])
  assert.deepEqual(requestCalls, [{ routeId: 31, limit: 120 }])
  assert.deepEqual(appliedLogs, loadedLogs)
})

test('GatewayView delegates route log loading through the route logs controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const routeActionsControllerSource = await readFile(gatewayPageRouteActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRouteActions"), "GatewayView delegates route log loading through the route logs controller should keep useGatewayPageRouteActions in gateway page controller")
  assert.ok(routeActionsControllerSource.includes("requestLogs: gatewayPageRequests.getGatewayRouteLogs"), "GatewayView delegates route log loading through the route logs controller should keep requestLogs: gatewayPageRequests.getGatewayRouteLogs in route actions controller")
})
