import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { ref } from 'vue'

import { useGatewayRouteProbePageActions } from '../src/gatewayRouteProbePageController.ts'
import type { BalanceProbeResult, GatewayOverview, GatewayRoute, GatewayRouteProbeResult } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const pageRefreshActionsControllerPath = new URL('../src/gatewayPageRefreshActionsController.ts', import.meta.url)
const routeProbePageControllerPath = new URL('../src/gatewayRouteProbePageController.ts', import.meta.url)
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

function probeResult(overrides: Partial<GatewayRouteProbeResult> = {}): GatewayRouteProbeResult {
  return {
    id: 1,
    site_id: 10,
    site_name: '主站',
    request_base_url: 'https://api.example.com',
    key_name: '主 Key',
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
    last_success_at: '2026-05-26T00:00:00Z',
    last_failure_at: null,
    checked_at: '2026-05-26T00:00:00Z',
    ...overrides,
  }
}

function balanceResult(overrides: Partial<BalanceProbeResult> = {}): BalanceProbeResult {
  return {
    site_id: 10,
    route_id: 1,
    ok: true,
    status_code: 200,
    latency_ms: 20,
    remaining: 12.5,
    unit: '$',
    base_url: 'https://api.example.com',
    message: '',
    checked_at: '2026-05-26T00:00:00Z',
    last_balance: 12.5,
    ...overrides,
  }
}

test('useGatewayRouteProbePageActions wires route probe and balance probe dependencies', async () => {
  const events: string[] = []
  const routes = ref([route({ id: 41 }), route({ id: 42 })])
  const overview = ref<GatewayOverview | null>(null)
  const balanceProgress = ref(null)
  const manualRoute = ref<GatewayRoute | null>(route({ id: 43 }))
  const manualURL = ref('/dashboard/billing')
  const routeProbeState = {
    startBatch: (routeIds: number[]) => {
      events.push(`probe-start:${routeIds.join(',')}`)
    },
    finishBatchRoute: (routeId: number, ok: boolean) => {
      events.push(`probe-finish-route:${routeId}:${ok}`)
    },
    finishBatch: (routeIds: number[]) => {
      events.push(`probe-finish:${routeIds.join(',')}`)
    },
    trackRoute: (routeId: number) => {
      events.push(`probe-track:${routeId}`)
    },
    untrackRoute: (routeId: number) => {
      events.push(`probe-untrack:${routeId}`)
    },
  }
  const routeBalanceProbeState = {
    trackRoutes: (routeIds: number[]) => {
      events.push(`balance-track-routes:${routeIds.join(',')}`)
    },
    untrackRoutes: (routeIds: number[]) => {
      events.push(`balance-untrack-routes:${routeIds.join(',')}`)
    },
    startBatch: (routeIds: number[]) => {
      events.push(`balance-start:${routeIds.join(',')}`)
    },
    finishBatch: (routeIds: number[]) => {
      events.push(`balance-finish:${routeIds.join(',')}`)
    },
    trackRoute: (routeId: number) => {
      events.push(`balance-track:${routeId}`)
    },
    untrackRoute: (routeId: number) => {
      events.push(`balance-untrack:${routeId}`)
    },
  }

  const actions = useGatewayRouteProbePageActions({
    routes,
    overview,
    probeLoading: ref(false),
    balanceProbeAllProgress: balanceProgress,
    balanceProbeManualRoute: manualRoute,
    balanceProbeManualURL: manualURL,
    routeProbeState,
    routeBalanceProbeState,
    requestProbeBatch: async (routeIds) => {
      events.push(`request-probe-batch:${routeIds.join(',')}`)
      return routeIds.map((routeId) => probeResult({ id: routeId }))
    },
    requestProbe: async (routeId) => {
      events.push(`request-probe:${routeId}`)
      return probeResult({ id: routeId })
    },
    requestBalance: async (routeId, payload) => {
      events.push(`request-balance:${routeId}:${payload?.balance_probe_url ?? ''}`)
      return balanceResult({ route_id: routeId })
    },
    requestOverview: async () => {
      events.push('request-overview')
      return { total_routes: 2 } as GatewayOverview
    },
    applyProbeResult: (result) => {
      events.push(`apply-probe:${result.id}`)
    },
    applyBalanceResult: (result) => {
      events.push(`apply-balance:${result.route_id}`)
    },
    refreshRouteSummaries: async () => {
      events.push('refresh-summaries')
    },
    notifyOverviewChanged: () => {
      events.push('notify-overview')
    },
    openManualDialog: (targetRoute, message) => {
      events.push(`open-manual:${targetRoute.id}:${message}`)
    },
    setManualDialogLoading: (loading) => {
      events.push(`manual-loading:${loading}`)
    },
    closeManualDialogAfterSuccess: () => {
      events.push('manual-close')
    },
    setManualFailureMessage: (message) => {
      events.push(`manual-failure:${message}`)
    },
    now: () => '2026-05-26T00:00:00Z',
    showNotice: (notice) => {
      events.push(`notice:${notice.message}`)
    },
    showPlanNotice: (plan) => {
      events.push(`plan:${plan.notice.message}`)
    },
  })

  await actions.handleProbeAll()
  await actions.handleUpdateAllBalances()
  await actions.handleProbeRoute(route({ id: 44 }))
  await actions.handleProbeRouteBalance(route({ id: 45 }))
  await actions.submitManualRouteBalanceProbe()

  assert.equal(overview.value?.total_routes, 2)
  assert.deepEqual(balanceProgress.value, { total: 2, done: 2, success: 2, failed: 0 })
  assert.deepEqual(events, [
    'probe-start:41,42',
    'request-probe-batch:41,42',
    'apply-probe:41',
    'probe-finish-route:41:true',
    'apply-probe:42',
    'probe-finish-route:42:true',
    'plan:路由探测完成，2 条全部可用。',
    'probe-finish:41,42',
    'balance-start:41,42',
    'balance-track-routes:41,42',
    'request-balance:41:',
    'apply-balance:41',
    'request-balance:42:',
    'apply-balance:42',
    'request-overview',
    'notify-overview',
    'balance-untrack-routes:41,42',
    'refresh-summaries',
    'notice:余额更新完成，2 条全部读取成功。',
    'balance-finish:41,42',
    'probe-track:44',
    'request-probe:44',
    'apply-probe:44',
    'notice:主站 / 主 Key 探测成功，42 ms。',
    'probe-untrack:44',
    'balance-track:45',
    'request-balance:45:',
    'apply-balance:45',
    'refresh-summaries',
    'notify-overview',
    'notice:主站 / 主 Key 余额读取成功：$12.5（https://api.example.com）',
    'balance-untrack:45',
    'manual-loading:true',
    'balance-track:43',
    'request-balance:43:/dashboard/billing',
    'apply-balance:43',
    'refresh-summaries',
    'notify-overview',
    'plan:主站 / 主 Key 余额读取成功：$12.5。',
    'manual-close',
    'manual-loading:false',
    'balance-untrack:43',
  ])
})

test('GatewayView delegates route probe page wiring through the management operations controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const pageRefreshActionsControllerSource = await readFile(pageRefreshActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRouteActions"), "GatewayView delegates route probe page wiring through the management operations controller should keep useGatewayPageRouteActions in gateway page controller")
  assert.ok(pageRefreshActionsControllerSource.includes("probeRouteBalances: (routeIds, options) => getRouteActions().probeRouteBalances(routeIds, options)"), "GatewayView delegates route probe page wiring through the page refresh actions controller should keep probeRouteBalances in gateway page refresh actions controller")
})
