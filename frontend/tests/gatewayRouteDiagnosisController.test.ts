import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  createOpenGatewayRouteDiagnosisAction,
  loadGatewayRouteDiagnosis,
  useGatewayRouteDiagnosisDrawer,
} from '../src/gatewayRouteDiagnosisController.ts'
import type { GatewayRoute, GatewayRouteDiagnosis } from '../src/types.ts'

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

function diagnosis(overrides: Partial<GatewayRouteDiagnosis> = {}): GatewayRouteDiagnosis {
  const item = route({ id: 3 })
  return {
    id: 3,
    healthy: true,
    route_label: '主站 / Key',
    route: item,
    diagnostics: [],
    checked_at: '2026-05-25T00:00:00Z',
    active_count: 0,
    ...overrides,
  }
}

test('opens route diagnosis drawer and clears stale diagnosis', () => {
  const drawer = useGatewayRouteDiagnosisDrawer()
  drawer.setDiagnosis(diagnosis({ id: 2, route_label: '旧路由' }))

  drawer.openDrawer()

  assert.equal(drawer.open.value, true)
  assert.equal(drawer.diagnosis.value, null)
})

test('updates route diagnosis drawer loading and diagnosis state', () => {
  const drawer = useGatewayRouteDiagnosisDrawer()
  const result = diagnosis({ id: 4, route_label: '新路由' })

  drawer.setLoading(true)
  drawer.setDiagnosis(result)
  drawer.setLoading(false)

  assert.equal(drawer.loading.value, false)
  assert.deepEqual(drawer.diagnosis.value, result)
})

test('loads route diagnosis through injected drawer dependencies', async () => {
  const selectedRoute = route({ id: 12 })
  const result = diagnosis({ id: 12, route_label: '路由 12' })
  const openCalls: string[] = []
  const loadingValues: boolean[] = []
  const requestCalls: number[] = []
  let appliedDiagnosis: GatewayRouteDiagnosis | null = null

  await loadGatewayRouteDiagnosis({
    route: selectedRoute,
    requestDiagnosis: async (routeId) => {
      requestCalls.push(routeId)
      return result
    },
    openDrawer: () => openCalls.push('open'),
    setLoading: (loading) => loadingValues.push(loading),
    setDiagnosis: (value) => {
      appliedDiagnosis = value
    },
    showPlanNotice: () => {
      throw new Error('should not show notice on success')
    },
  })

  assert.deepEqual(openCalls, ['open'])
  assert.deepEqual(requestCalls, [12])
  assert.deepEqual(appliedDiagnosis, result)
  assert.deepEqual(loadingValues, [true, false])
})

test('loadGatewayRouteDiagnosis reports errors and resets loading', async () => {
  const loadingValues: boolean[] = []
  const notices: string[] = []

  await loadGatewayRouteDiagnosis({
    route: route({ id: 14 }),
    requestDiagnosis: async () => {
      throw new Error('diagnosis timeout')
    },
    openDrawer: () => {},
    setLoading: (loading) => loadingValues.push(loading),
    setDiagnosis: () => {
      throw new Error('should not set diagnosis on failure')
    },
    showPlanNotice: (plan) => notices.push(plan.notice.message),
  })

  assert.deepEqual(notices, ['diagnosis timeout'])
  assert.deepEqual(loadingValues, [true, false])
})

test('createOpenGatewayRouteDiagnosisAction assembles drawer dependencies without changing behavior', async () => {
  const selectedRoute = route({ id: 12 })
  const result = diagnosis({ id: 12, route_label: '路由 12' })
  const openCalls: string[] = []
  const loadingValues: boolean[] = []
  const requestCalls: number[] = []
  let appliedDiagnosis: GatewayRouteDiagnosis | null = null

  const openRouteDiagnosis = createOpenGatewayRouteDiagnosisAction({
    requestDiagnosis: async (routeId) => {
      requestCalls.push(routeId)
      return result
    },
    openDrawer: () => openCalls.push('open'),
    setLoading: (loading) => loadingValues.push(loading),
    setDiagnosis: (value) => {
      appliedDiagnosis = value
    },
    showPlanNotice: () => {
      throw new Error('should not show notice on success')
    },
  })

  await openRouteDiagnosis(selectedRoute)

  assert.deepEqual(openCalls, ['open'])
  assert.deepEqual(requestCalls, [12])
  assert.deepEqual(appliedDiagnosis, result)
  assert.deepEqual(loadingValues, [true, false])
})

test('GatewayView delegates route diagnosis loading through the route diagnosis controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const routeActionsControllerSource = await readFile(gatewayPageRouteActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRouteActions"), "GatewayView delegates route diagnosis loading through the route diagnosis controller should keep useGatewayPageRouteActions in gateway page controller")
  assert.ok(routeActionsControllerSource.includes("requestDiagnosis: gatewayPageRequests.diagnoseGatewayRoute"), "GatewayView delegates route diagnosis loading through the route diagnosis controller should keep requestDiagnosis: gatewayPageRequests.diagnoseGatewayRoute in route actions controller")
})
