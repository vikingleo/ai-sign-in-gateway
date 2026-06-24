import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { ref } from 'vue'

import { useGatewayRouteManagementOperationsPageActions } from '../src/gatewayRouteManagementOperationsPageController.ts'
import type {
  BalanceProbeResult,
  GatewayLog,
  GatewayOverview,
  GatewayRoute,
  GatewayRouteDiagnosis,
  GatewayRouteProbeResult,
  GatewayRouteUpdatePayload,
} from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
const routeManagementOperationsPageControllerPath = new URL(
  '../src/gatewayRouteManagementOperationsPageController.ts',
  import.meta.url,
)

function route(overrides: Partial<GatewayRoute> = {}): GatewayRoute {
  return {
    id: 1,
    site_id: 10,
    site_name: '主站',
    site_name_snapshot: '',
    site_base_url_snapshot: '',
    base_url: 'https://api.example.com',
    request_base_url: 'https://api.example.com',
    request_base_urls: [],
    manual_request_base_urls: [],
    group_name: '',
    supported_models: [],
    key_name: 'main',
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

function probeResult(routeId: number): GatewayRouteProbeResult {
  return {
    id: routeId,
    site_id: 10,
    site_name: '主站',
    request_base_url: 'https://api.example.com',
    key_name: 'main',
    key_fingerprint: '',
    ok: true,
    status_code: 200,
    latency_ms: 42,
    message: '',
    models: [],
    supported_models: [],
    last_status_code: 200,
    last_error: '',
    last_latency_ms: 42,
    last_success_at: '2026-05-27T00:00:00Z',
    last_failure_at: null,
    checked_at: '2026-05-27T00:00:00Z',
  }
}

test('useGatewayRouteManagementOperationsPageActions wires route probe and route operation domains', async () => {
  const events: string[] = []
  const firstRoute = route({ id: 11, route_priority: 1 })
  const secondRoute = route({ id: 12, route_priority: 2 })
  const routes = ref([firstRoute, secondRoute])
  const priorityRoutes = ref([firstRoute, secondRoute])
  const priorityRoute = ref<GatewayRoute | null>(null)
  const priorityInsertIndex = ref<number | undefined>(undefined)
  const routeModelsDialogRoute = ref<GatewayRoute | null>(null)
  const routeModelsDialogValue = ref<unknown>([])
  const routeModelsDialogRequestURLs = ref<unknown>('')

  const actions = useGatewayRouteManagementOperationsPageActions({
    routes,
    overview: ref<GatewayOverview | null>(null),
    probeLoading: ref(false),
    balanceProbeAllProgress: ref(null),
    balanceProbeManualRoute: ref(null),
    balanceProbeManualURL: ref(''),
    routeProbeState: {
      startBatch: () => undefined,
      finishBatchRoute: () => undefined,
      finishBatch: () => undefined,
      trackRoute: (routeId) => events.push(`probe-track:${routeId}`),
      untrackRoute: (routeId) => events.push(`probe-untrack:${routeId}`),
    },
    routeBalanceProbeState: {
      trackRoutes: () => undefined,
      untrackRoutes: () => undefined,
      startBatch: () => undefined,
      finishBatch: () => undefined,
      trackRoute: () => undefined,
      untrackRoute: () => undefined,
    },
    requestProbeBatch: async (routeIds) => {
      events.push(`probe-batch:${routeIds.join(',')}`)
      return routeIds.map((routeId) => probeResult(routeId))
    },
    requestProbe: async (routeId) => {
      events.push(`probe:${routeId}`)
      return probeResult(routeId)
    },
    requestBalance: async (routeId) => ({ route_id: routeId, ok: true }) as BalanceProbeResult,
    requestOverview: async () => ({ total_routes: 2 }) as GatewayOverview,
    applyProbeResult: (result) => events.push(`apply-probe:${result.id}`),
    applyBalanceResult: () => undefined,
    refreshRouteSummaries: async () => events.push('summaries'),
    notifyOverviewChanged: () => events.push('overview-changed'),
    openManualDialog: () => undefined,
    setManualDialogLoading: () => undefined,
    closeManualDialogAfterSuccess: () => undefined,
    setManualFailureMessage: () => undefined,
    now: () => '2026-05-27T00:00:00Z',
    showNotice: (notice) => events.push(`notice:${notice.message}`),
    showPlanNotice: (plan) => events.push(`plan:${plan.notice.message}`),
    priorityRoutes,
    priorityRoute,
    priorityInsertIndex,
    requestRoutes: async () => [firstRoute, secondRoute],
    requestReorder: async () => [firstRoute, secondRoute],
    normalizeRoute: (targetRoute) => targetRoute,
    openPriorityDialog: () => undefined,
    setPriorityDialogLoading: () => undefined,
    setPriorityRoutes: () => undefined,
    selectPriorityRoute: () => undefined,
    clearPriorityInsertIndex: () => undefined,
    applyReorderedRoutes: () => undefined,
    confirmWindow: { confirm: () => true },
    requestToggle: async (routeId) => {
      events.push(`toggle:${routeId}`)
      return { id: routeId, is_enabled: false, circuit_state: 'closed' }
    },
    requestDisableAll: async () => ({ status: 'ok', disabled_count: 2 }),
    requestEnableOnly: async (routeId) => ({ status: 'ok', enabled_route_id: routeId }),
    requestReset: async (routeId) => ({ id: routeId, is_enabled: true, circuit_state: 'closed' }),
    reloadGatewayData: async () => events.push('reload'),
    routeLabel: (targetRoute) => `route-${targetRoute.id}`,
    routeTypeLabel: (routeType) => routeType.toUpperCase(),
    routePathLabel: (routePath) => routePath || 'default',
    routeModelsDialogRoute,
    routeModelsDialogValue,
    routeModelsDialogRequestURLs,
    requestUpdateRoute: async (routeId, payload: GatewayRouteUpdatePayload) => route({ id: routeId, ...payload }),
    openRouteModelsDialog: () => undefined,
    setRouteModelsDialogSaving: () => undefined,
    closeRouteModelsDialogAfterSuccess: () => undefined,
    requestDiagnosis: async (routeId) => ({ id: routeId }) as GatewayRouteDiagnosis,
    openDiagnosisDrawer: () => undefined,
    setDiagnosisLoading: () => undefined,
    setDiagnosis: () => undefined,
    requestLogs: async (routeId) => [{ id: 1, route_id: routeId }] as GatewayLog[],
    openLogsDrawer: () => undefined,
    setLogsLoading: () => undefined,
    setLogs: () => undefined,
    clearLogs: () => undefined,
  })

  await actions.handleProbeRoute(firstRoute)
  await actions.handleToggle(secondRoute)

  assert.deepEqual(events, [
    'probe-track:11',
    'probe:11',
    'apply-probe:11',
    'notice:主站 / main 探测成功，42 ms。',
    'probe-untrack:11',
    'toggle:12',
    'plan:已禁用该路由。',
    'reload',
  ])
})

test('GatewayView delegates route management operations through the aggregate controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRouteActions"), "GatewayView delegates route management operations through the aggregate controller should keep useGatewayPageRouteActions in gateway page controller")
  assert.ok(shellBindingsControllerSource.includes("routeActions.handleProbeAll"), "GatewayView delegates route management operations through the aggregate controller should keep routeActions.handleProbeAll in gateway page controller")
})
