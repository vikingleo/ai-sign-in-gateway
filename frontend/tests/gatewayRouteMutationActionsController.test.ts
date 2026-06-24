import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { ref } from 'vue'

import { useGatewayRouteMutationActions } from '../src/gatewayRouteMutationActionsController.ts'
import type { BalanceProbeResult, GatewayActiveRequest, GatewayOverview, GatewayRoute, GatewayRouteProbeResult } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageViewStateControllerPath = new URL('../src/gatewayPageViewStateController.ts', import.meta.url)
const gatewayPageRuntimeActionsControllerPath = new URL(
  '../src/gatewayPageRuntimeActionsController.ts',
  import.meta.url,
)
const mutationActionsControllerPath = new URL('../src/gatewayRouteMutationActionsController.ts', import.meta.url)

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

function overview(overrides: Partial<GatewayOverview> = {}): GatewayOverview {
  return {
    total_routes: 2,
    healthy_routes: 2,
    open_circuit_routes: 0,
    half_open_routes: 0,
    disabled_routes: 0,
    total_balance_display: null,
    quantified_balance_site_count: 0,
    active_concurrency: 0,
    max_concurrency_all_time: 0,
    max_concurrency_today: 0,
    request_count_24h: 0,
    success_rate_24h: 0,
    avg_latency_ms_24h: null,
    usage_cost_24h: {
      input_cost: 0,
      cached_cost: 0,
      output_cost: 0,
      total_cost: 0,
      upstream_cost: 0,
      prompt_tokens: 0,
      cached_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      known_requests: 0,
      unknown_requests: 0,
      upstream_requests: 0,
      currency: 'USD',
      window_seconds: 86400,
      top_models: [],
    },
    strategy_breakdown_24h: [],
    route_strategy: 'round_robin',
    failure_threshold: 3,
    cooldown_seconds: 180,
    request_timeout: 60,
    max_attempts: 0,
    failure_retry_mode: 'retryable',
    route_concurrency_limit: 5,
    concurrency_transfer_strategy: 'limit_only',
    concurrency_overflow_strategy: 'latency_first',
    ...overrides,
  }
}

test('useGatewayRouteMutationActions applies route mutation results to page refs', () => {
  const enabledRoute = route({ id: 1, site_id: 10, is_enabled: true })
  const disabledRoute = route({ id: 2, site_id: 11, is_enabled: false })
  const routes = ref([enabledRoute, disabledRoute])
  const priorityRoutes = ref([enabledRoute, disabledRoute])
  const overviewRef = ref<GatewayOverview | null>(overview({ active_concurrency: 0 }))
  const includeDisabled = ref(false)

  const {
    applyActiveRequestSnapshot,
    applyProbeResult,
    applyRouteBalanceResult,
    applyReorderedRoutes,
  } = useGatewayRouteMutationActions({
    routes,
    priorityRoutes,
    overview: overviewRef,
    includeDisabled,
  })

  applyActiveRequestSnapshot([
    { route_id: 1 },
    { route_id: 1 },
    { route_id: 2 },
  ] as GatewayActiveRequest[])

  assert.deepEqual(routes.value.map((item) => item.active_concurrency), [2, 1])
  assert.deepEqual(priorityRoutes.value.map((item) => item.active_concurrency), [2, 1])
  assert.equal(overviewRef.value?.active_concurrency, 3)

  applyProbeResult({
    id: 1,
    site_id: 10,
    site_name: '主站',
    key_name: 'main',
    key_fingerprint: 'fp-main',
    ok: false,
    status_code: 502,
    latency_ms: 340,
    message: 'upstream failed',
    models: ['gpt-4.1'],
    supported_models: ['gpt-4.1'],
    last_status_code: 502,
    last_error: 'upstream failed',
    last_latency_ms: 340,
    last_success_at: null,
    last_failure_at: '2026-05-27T10:00:00Z',
    checked_at: '2026-05-27T10:00:00Z',
  } satisfies GatewayRouteProbeResult)

  assert.equal(routes.value[0].last_status_code, 502)
  assert.equal(routes.value[0].last_error, 'upstream failed')
  assert.deepEqual(routes.value[0].supported_models, ['gpt-4.1'])

  applyRouteBalanceResult({
    site_id: 10,
    route_id: 1,
    ok: true,
    status_code: 200,
    latency_ms: 120,
    remaining: 18.5,
    unit: 'USD',
    base_url: 'https://api.example.com',
    balance_probe_url: 'https://api.example.com/balance',
    message: 'ok',
    checked_at: '2026-05-27T10:01:00Z',
    last_balance: null,
    balance_display: '$18.50',
  } satisfies BalanceProbeResult)

  assert.equal(routes.value[0].last_balance, 18.5)
  assert.equal(routes.value[0].balance_display, '$18.50')
  assert.equal(routes.value[0].balance_probe_url, 'https://api.example.com/balance')

  applyReorderedRoutes([disabledRoute, enabledRoute])
  assert.deepEqual(priorityRoutes.value.map((item) => item.id), [2, 1])
  assert.deepEqual(routes.value.map((item) => item.id), [1])

  includeDisabled.value = true
  applyReorderedRoutes([disabledRoute, enabledRoute])
  assert.deepEqual(priorityRoutes.value.map((item) => item.id), [2, 1])
  assert.deepEqual(routes.value.map((item) => item.id), [2, 1])
})

test('GatewayView delegates route mutation action wiring to the page controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const viewStateControllerSource = await readFile(gatewayPageViewStateControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(pageControllerSource.includes("useGatewayPageViewState"), "GatewayView delegates route mutation action wiring through the page view state controller should keep useGatewayPageViewState in gateway page controller")
  assert.ok(viewStateControllerSource.includes("useGatewayRouteMutationActions"), "GatewayView delegates route mutation action wiring to the page view state controller should keep useGatewayRouteMutationActions in gateway page view state controller")
  assert.ok(runtimeActionsControllerSource.includes("applyActiveRequestSnapshot: routeMutationActions.applyActiveRequestSnapshot"), "GatewayView delegates route mutation action wiring to the page runtime actions controller should keep applyActiveRequestSnapshot: routeMutationActions.applyActiveRequestSnapshot in gateway page runtime actions controller")
})
