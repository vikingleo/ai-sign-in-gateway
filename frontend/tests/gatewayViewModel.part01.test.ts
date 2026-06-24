import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildGatewayRouteFilters,
  buildRouteActivityFeed,
  buildGatewayMetricCards,
  buildGatewayStrategyCards,
  buildRoutePoolPreviewRoutes,
  buildUsageSummaryCards,
  filterGatewayLogs,
  filterGatewayRoutes,
  progressPercent,
  routeTotalBalanceSummary,
} from '../src/gatewayViewModel.ts'
import {
  buildGatewayUsageTodayRange,
  datetimeLocalToISOString,
  toDatetimeLocalValue,
} from '../src/gatewayUsageRangeModel.ts'
import type { GatewayIssueState } from '../src/gatewayViewConfig.ts'
import type { GatewayActiveRequest, GatewayLog, GatewayOverview, GatewayRoute, GatewayUsage } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageFoundationControllerPath = new URL('../src/gatewayPageFoundationController.ts', import.meta.url)
const gatewayPageRuntimeActionsControllerPath = new URL(
  '../src/gatewayPageRuntimeActionsController.ts',
  import.meta.url,
)
const gatewayPageRouteActionsControllerPath = new URL('../src/gatewayPageRouteActionsController.ts', import.meta.url)
const adminOperationsPageControllerPath = new URL('../src/gatewayAdminOperationsPageController.ts', import.meta.url)
const routeActionPageControllerPath = new URL('../src/gatewayRouteActionPageController.ts', import.meta.url)
const upstreamPageControllerPath = new URL('../src/gatewayUpstreamPageController.ts', import.meta.url)
const settingsPageControllerPath = new URL('../src/gatewaySettingsPageController.ts', import.meta.url)
const initialDataPageControllerPath = new URL('../src/gatewayInitialDataPageController.ts', import.meta.url)
const dataOperationsPageControllerPath = new URL(
  '../src/gatewayDataOperationsPageController.ts',
  import.meta.url,
)

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

test('GatewayView delegates notice execution through the notice controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const foundationControllerSource = await readFile(gatewayPageFoundationControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(pageControllerSource.includes("useGatewayPageFoundation"), "GatewayView delegates notice execution through the page foundation controller")
  assert.ok(foundationControllerSource.includes("createGatewayNoticeActions"), "GatewayView delegates notice execution through the notice controller should keep createGatewayNoticeActions in gateway page foundation controller")
  assert.ok(pageControllerSource.includes("showPlanNotice"), "GatewayView delegates notice execution through the notice controller should keep showPlanNotice in gateway page controller")
})

test('GatewayView delegates post-action data reloads through a runtime load action', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const routeActionsControllerSource = await readFile(gatewayPageRouteActionsControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(runtimeActionsControllerSource.includes("useGatewayRuntimeOperationsPageActions"), "GatewayView delegates post-action data reloads through a runtime load action should keep useGatewayRuntimeOperationsPageActions in gateway page runtime actions controller")
  assert.ok(routeActionsControllerSource.includes("reloadGatewayData: runtimeActions.reloadGatewayDataAfterAction"), "GatewayView delegates post-action data reloads through a runtime load action should keep reloadGatewayData: runtimeActions.reloadGatewayDataAfterAction in route actions controller")
})

function overview(overrides: Partial<GatewayOverview>): GatewayOverview {
  return {
    total_routes: 3,
    healthy_routes: 2,
    open_circuit_routes: 1,
    half_open_routes: 0,
    disabled_routes: 0,
    total_balance_display: null,
    quantified_balance_site_count: 0,
    active_concurrency: 4,
    max_concurrency_all_time: 8,
    max_concurrency_today: 5,
    request_count_24h: 1234,
    success_rate_24h: 98.5,
    avg_latency_ms_24h: null,
    usage_cost_24h: {
      input_cost: 0,
      cached_cost: 0,
      output_cost: 0,
      total_cost: 0.001,
      upstream_cost: 0,
      prompt_tokens: 0,
      cached_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      known_requests: 3,
      unknown_requests: 1,
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

function activeRequest(overrides: Partial<GatewayActiveRequest>): GatewayActiveRequest {
  return {
    id: 'active-1',
    request_id: 'req-active-1',
    route_id: 1,
    site_id: 10,
    route_label: '活动路由',
    site_name: '主站',
    key_name: '主 Key',
    key_fingerprint: 'abcdef',
    group_name: '生产',
    target_path: '/v1/responses',
    request_url: '/v1/responses',
    method: 'POST',
    route_strategy: 'priority',
    attempt_index: 1,
    is_stream: true,
    route_type: 'codex',
    requested_model: 'gpt-4o',
    actual_model: '',
    request_base_url: 'https://api.example',
    active_concurrency: 2,
    started_at: '2026-05-24T10:00:00Z',
    elapsed_ms: 1500,
    ...overrides,
  }
}

function gatewayLog(overrides: Partial<GatewayLog>): GatewayLog {
  return {
    id: 1,
    request_id: 'req-log-1',
    route_id: 1,
    route_label: '完成路由',
    site_id: 10,
    site_name: '主站',
    key_name: '主 Key',
    key_fingerprint: 'abcdef',
    group_name: '生产',
    route_type: 'codex',
    target_path: '/v1/responses',
    request_url: '/v1/responses',
    user_agent: 'codex',
    method: 'POST',
    route_strategy: 'priority',
    attempt_index: 1,
    status_code: 200,
    success: true,
    latency_ms: 120,
    prompt_tokens: null,
    cached_input_tokens: null,
    completion_tokens: null,
    total_tokens: null,
    usage_cost: null,
    model: 'gpt-4o',
    requested_model: 'gpt-4o',
    actual_model: 'gpt-4o',
    circuit_state_before: 'closed',
    failure_reason: null,
    is_stream: false,
    created_at: '2026-05-24T10:01:00Z',
    ...overrides,
  }
}

test('builds gateway metric cards from overview and route balances', () => {
  const routes = [
    route({ id: 1, last_balance: 12, balance_unit: 'USD' }),
    route({ id: 2, last_balance: 8, balance_display: '8 RMB' }),
    route({ id: 3, last_balance: null, balance_unit: 'EUR' }),
  ]

  const balanceSummary = routeTotalBalanceSummary(routes)
  const cards = buildGatewayMetricCards(overview({}), balanceSummary)

  assert.equal(balanceSummary, '$12 / ¥8')
  assert.deepEqual(cards.map((card) => card.value), ['$12 / ¥8', '1,234', '98.5%', '4', '5', '8', '$0.001000'])
  assert.equal(cards.at(-1)?.tone, 'warning')
})

test('sorts route pool preview and strategy cards by current signal strength', () => {
  const preview = buildRoutePoolPreviewRoutes([
    route({ id: 1, active_concurrency: 1, request_count: 10, route_priority: 1 }),
    route({ id: 2, active_concurrency: 3, request_count: 1, route_priority: 3 }),
    route({ id: 3, active_concurrency: 3, request_count: 2, route_priority: 2 }),
  ])
  const strategyCards = buildGatewayStrategyCards([
    { route_strategy: 'priority', request_count: 20, success_rate: 100, avg_latency_ms: null, stream_request_count: 0, stream_success_rate: 0, avg_stream_ttfb_ms: null },
    { route_strategy: 'smart', request_count: 5, success_rate: 100, avg_latency_ms: null, stream_request_count: 0, stream_success_rate: 0, avg_stream_ttfb_ms: null },
  ])

  assert.deepEqual(preview.map((item) => item.id), [3, 2, 1])
  assert.equal(strategyCards[0].title, '优先级优先')
  assert.equal(strategyCards[0].width, '100%')
  assert.equal(strategyCards[1].width, '25%')
})

test('builds route activity feed from active requests before recent logs with a size limit', () => {
  const activeRequests = Array.from({ length: 5 }, (_, index) =>
    activeRequest({ id: `active-${index + 1}`, route_label: `活动 ${index + 1}` }),
  )
  const logs = Array.from({ length: 10 }, (_, index) =>
    gatewayLog({ id: index + 1, route_label: `完成 ${index + 1}` }),
  )
  const feed = buildRouteActivityFeed(activeRequests, logs)

  assert.equal(feed.length, 12)
  assert.deepEqual(feed.slice(0, 5).map((item) => item.kind), ['active', 'active', 'active', 'active', 'active'])
  assert.deepEqual(feed.slice(5).map((item) => item.kind), Array(7).fill('completed'))
  assert.equal(feed[0].label, '活动 1')
  assert.equal(feed[11].label, '完成 7')
})
