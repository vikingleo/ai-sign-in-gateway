import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { ref } from 'vue'

import { useGatewayRouteOperationsPageActions } from '../src/gatewayRouteOperationsPageController.ts'
import type { GatewayLog, GatewayRoute, GatewayRouteDiagnosis, GatewayRouteUpdatePayload } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
const routeOperationsPageControllerPath = new URL('../src/gatewayRouteOperationsPageController.ts', import.meta.url)
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
    key_fingerprint: 'fp-main',
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

test('useGatewayRouteOperationsPageActions wires route operation domains through existing page controllers', async () => {
  const events: string[] = []
  const firstRoute = route({ id: 11, route_priority: 1, supported_models: ['old-model'] })
  const secondRoute = route({ id: 12, route_priority: 2 })
  const routes = ref([firstRoute, secondRoute])
  const priorityRoutes = ref([firstRoute, secondRoute])
  const priorityRoute = ref<GatewayRoute | null>(null)
  const priorityInsertIndex = ref<number | undefined>(undefined)
  const routeModelsDialogRoute = ref<GatewayRoute | null>(null)
  const routeModelsDialogValue = ref<unknown>([])
  const routeModelsDialogRequestURLs = ref<unknown>('')

  const actions = useGatewayRouteOperationsPageActions({
    routes,
    priorityRoutes,
    priorityRoute,
    priorityInsertIndex,
    requestRoutes: async () => {
      events.push('priority-load')
      return [firstRoute, secondRoute]
    },
    requestReorder: async (payload) => {
      events.push(`priority-reorder:${payload.mode}`)
      return [route({ ...firstRoute, route_priority: 2 }), route({ ...secondRoute, route_priority: 1 })]
    },
    normalizeRoute: (targetRoute) => targetRoute,
    openPriorityDialog: (targetRoute, currentRoutes) => {
      events.push(`priority-open:${targetRoute.id}:${currentRoutes.length}`)
      priorityRoute.value = targetRoute
    },
    setPriorityDialogLoading: (loading) => events.push(`priority-loading:${loading}`),
    setPriorityRoutes: (nextRoutes) => {
      priorityRoutes.value = nextRoutes
    },
    selectPriorityRoute: (targetRoute) => {
      priorityRoute.value = targetRoute
    },
    clearPriorityInsertIndex: () => {
      priorityInsertIndex.value = undefined
      events.push('priority-clear-index')
    },
    applyReorderedRoutes: (nextRoutes) => {
      routes.value = nextRoutes
      priorityRoutes.value = nextRoutes
    },
    showNotice: (notice) => events.push(`notice:${notice.message}`),
    showPlanNotice: (plan) => events.push(`plan:${plan.notice.message}`),
    confirmWindow: {
      confirm: (message) => {
        events.push(`confirm:${message}`)
        return true
      },
    },
    requestToggle: async (routeId) => {
      events.push(`toggle:${routeId}`)
      return { id: routeId, is_enabled: false, circuit_state: 'closed' }
    },
    requestDisableAll: async () => {
      events.push('disable-all')
      return { status: 'ok', disabled_count: 2 }
    },
    requestEnableOnly: async (routeId) => {
      events.push(`enable-only:${routeId}`)
      return { status: 'ok', enabled_route_id: routeId }
    },
    requestReset: async (routeId) => {
      events.push(`reset:${routeId}`)
      return { id: routeId, is_enabled: true, circuit_state: 'closed' }
    },
    reloadGatewayData: async () => events.push('reload'),
    routeLabel: (targetRoute) => `route-${targetRoute.id}`,
    routeTypeLabel: (routeType) => routeType.toUpperCase(),
    routePathLabel: (routePath) => routePath || 'default',
    requestUpdateRoute: async (routeId, payload: GatewayRouteUpdatePayload) => {
      events.push(`update:${routeId}:${payload.route_type ?? payload.route_path ?? 'models'}`)
      const current = routes.value.find((item) => item.id === routeId)
      assert.ok(current)
      return route({ ...current, ...payload })
    },
    openRouteModelsDialog: (targetRoute) => {
      events.push(`models-open:${targetRoute.id}`)
      routeModelsDialogRoute.value = targetRoute
      routeModelsDialogValue.value = [...targetRoute.supported_models]
      routeModelsDialogRequestURLs.value = ''
    },
    setRouteModelsDialogSaving: (saving) => events.push(`models-saving:${saving}`),
    closeRouteModelsDialogAfterSuccess: () => events.push('models-close'),
    requestDiagnosis: async (routeId) => {
      events.push(`diagnosis:${routeId}`)
      return {
        id: routeId,
        healthy: true,
        route_label: `route-${routeId}`,
        route: route({ id: routeId }),
        diagnostics: [],
        checked_at: '2026-05-27T00:00:00Z',
        active_count: 0,
      } as GatewayRouteDiagnosis
    },
    openDiagnosisDrawer: () => events.push('diagnosis-open'),
    setDiagnosisLoading: (loading) => events.push(`diagnosis-loading:${loading}`),
    setDiagnosis: (diagnosis) => events.push(`diagnosis-set:${diagnosis.id}`),
    requestLogs: async (routeId, limit) => {
      events.push(`logs:${routeId}:${limit}`)
      return [{ id: 91, route_id: routeId }] as GatewayLog[]
    },
    openLogsDrawer: (targetRoute) => events.push(`logs-open:${targetRoute.id}`),
    setLogsLoading: (loading) => events.push(`logs-loading:${loading}`),
    setLogs: (logs) => events.push(`logs-set:${logs.length}`),
    clearLogs: () => events.push('logs-clear'),
  })

  await actions.openPriorityDialog(firstRoute)
  priorityInsertIndex.value = 1
  await actions.handlePriorityMove()
  await actions.handleToggle(firstRoute)
  await actions.handleRouteTypeSelect(firstRoute, 'gpt')
  await actions.openRouteDiagnosis(firstRoute)
  await actions.openRouteLogs(secondRoute)

  assert.deepEqual(events, [
    'priority-open:11:2',
    'priority-loading:true',
    'priority-load',
    'priority-loading:false',
    'priority-loading:true',
    'priority-reorder:move',
    'plan:优先级已更新。',
    'priority-loading:false',
    'toggle:11',
    'plan:已禁用该路由。',
    'reload',
    'update:11:gpt',
    'plan:route-11 已切换为 GPT。',
    'diagnosis-open',
    'diagnosis-loading:true',
    'diagnosis:11',
    'diagnosis-set:11',
    'diagnosis-loading:false',
    'logs-open:12',
    'logs-loading:true',
    'logs:12:120',
    'logs-set:1',
    'logs-loading:false',
  ])
})

test('GatewayView delegates route operation wiring through the management operations controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRouteActions"), "GatewayView delegates route operation wiring through the management operations controller should keep useGatewayPageRouteActions in gateway page controller")
  assert.ok(shellBindingsControllerSource.includes("handleToggle: routeActions.handleToggle"), "GatewayView delegates route operation wiring through the management operations controller should keep handleToggle: routeActions.handleToggle in gateway page controller")
})
