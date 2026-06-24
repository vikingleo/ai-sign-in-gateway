import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { useGatewayRouteInspectionPageActions } from '../src/gatewayRouteInspectionPageController.ts'
import type { GatewayLog, GatewayRoute, GatewayRouteDiagnosis } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRouteActionsControllerPath = new URL('../src/gatewayPageRouteActionsController.ts', import.meta.url)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
const routeInspectionPageControllerPath = new URL('../src/gatewayRouteInspectionPageController.ts', import.meta.url)
const routeOperationsPageControllerPath = new URL('../src/gatewayRouteOperationsPageController.ts', import.meta.url)

function route(overrides: Partial<GatewayRoute> = {}): GatewayRoute {
  return {
    id: 1,
    site_id: 10,
    site_name: '主站',
    site_name_snapshot: '',
    site_base_url_snapshot: '',
    base_url: 'https://api.example.com',
    request_base_url: '',
    request_base_urls: [],
    manual_request_base_urls: [],
    group_name: '',
    supported_models: [],
    key_name: '主 Key',
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
  const item = route({ id: 51 })
  return {
    id: 51,
    healthy: true,
    route_label: '主站 / 主 Key',
    route: item,
    diagnostics: [],
    checked_at: '2026-05-27T00:00:00Z',
    active_count: 0,
    ...overrides,
  }
}

function log(overrides: Partial<GatewayLog> = {}): GatewayLog {
  return {
    id: 61,
    created_at: '2026-05-27T00:00:00Z',
    route_id: 52,
    site_id: 10,
    site_name: '主站',
    route_label: '主站 / 主 Key',
    key_name: '主 Key',
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

test('useGatewayRouteInspectionPageActions wires diagnosis and route log actions', async () => {
  const events: string[] = []
  const loadedDiagnosis = diagnosis({ id: 51, route_label: '诊断路由' })
  const loadedLogs = [log({ id: 62, route_id: 52 })]
  const actions = useGatewayRouteInspectionPageActions({
    requestDiagnosis: async (routeId) => {
      events.push(`diagnosis-request:${routeId}`)
      return loadedDiagnosis
    },
    openDiagnosisDrawer: () => {
      events.push('diagnosis-open')
    },
    setDiagnosisLoading: (loading) => {
      events.push(`diagnosis-loading:${loading}`)
    },
    setDiagnosis: (value) => {
      events.push(`diagnosis-set:${value.id}`)
    },
    requestLogs: async (routeId, limit) => {
      events.push(`logs-request:${routeId}:${limit}`)
      return loadedLogs
    },
    openLogsDrawer: (selectedRoute) => {
      events.push(`logs-open:${selectedRoute.id}`)
    },
    setLogsLoading: (loading) => {
      events.push(`logs-loading:${loading}`)
    },
    setLogs: (logs) => {
      events.push(`logs-set:${logs.length}`)
    },
    clearLogs: () => {
      events.push('logs-clear')
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  await actions.openRouteDiagnosis(route({ id: 51 }))
  await actions.openRouteLogs(route({ id: 52 }))

  assert.deepEqual(events, [
    'diagnosis-open',
    'diagnosis-loading:true',
    'diagnosis-request:51',
    'diagnosis-set:51',
    'diagnosis-loading:false',
    'logs-open:52',
    'logs-loading:true',
    'logs-request:52:120',
    'logs-set:1',
    'logs-loading:false',
  ])
})

test('route operations page controller delegates route inspection page wiring to the inspection controller', async () => {
  const source = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const routeActionsControllerSource = await readFile(gatewayPageRouteActionsControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')
  const controller = await readFile(routeInspectionPageControllerPath, 'utf8')
  const operationsController = await readFile(routeOperationsPageControllerPath, 'utf8')

  assert.doesNotMatch(source, /from '(?:\.\.\/|\.\/)gatewayRouteInspectionPageController(?:\.ts)?'/)
  assert.match(operationsControllerSource, /import \{ useGatewayPageRouteActions \} from '(?:\.\.\/|\.\/)gatewayPageRouteActionsController(?:\.ts)?'/)
  assert.match(operationsControllerSource, /\brouteActions\s*=\s*useGatewayPageRouteActions\(\{/)
  assert.match(routeActionsControllerSource, /return useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.match(shellBindingsControllerSource, /openRouteDiagnosis: routeActions\.openRouteDiagnosis/)
  assert.match(shellBindingsControllerSource, /openRouteLogs: routeActions\.openRouteLogs/)
  assert.match(routeActionsControllerSource, /requestDiagnosis: gatewayPageRequests\.diagnoseGatewayRoute/)
  assert.match(routeActionsControllerSource, /openDiagnosisDrawer: state\.routeDiagnosisDrawer\.openDrawer/)
  assert.match(routeActionsControllerSource, /setDiagnosisLoading: state\.routeDiagnosisDrawer\.setLoading/)
  assert.match(routeActionsControllerSource, /setDiagnosis: state\.routeDiagnosisDrawer\.setDiagnosis/)
  assert.match(routeActionsControllerSource, /requestLogs: gatewayPageRequests\.getGatewayRouteLogs/)
  assert.match(routeActionsControllerSource, /openLogsDrawer: state\.routeLogsDrawer\.openDrawer/)
  assert.match(routeActionsControllerSource, /setLogsLoading: state\.routeLogsDrawer\.setLoading/)
  assert.match(routeActionsControllerSource, /setLogs: state\.routeLogsDrawer\.setLogs/)
  assert.match(routeActionsControllerSource, /clearLogs: state\.routeLogsDrawer\.clearLogs/)
  assert.doesNotMatch(source, /createOpenGatewayRouteDiagnosisAction/)
  assert.doesNotMatch(source, /createOpenGatewayRouteLogsAction/)

  assert.match(operationsController, /import \{ useGatewayRouteInspectionPageActions \} from '\.\/gatewayRouteInspectionPageController\.ts'/)
  assert.match(operationsController, /const routeInspectionActions = useGatewayRouteInspectionPageActions\(options\)/)
  assert.match(controller, /createOpenGatewayRouteDiagnosisAction/)
  assert.match(controller, /createOpenGatewayRouteLogsAction/)
})
