import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyGatewaySiteSummaries,
  buildGatewayDisableAllRoutesErrorPlan,
  buildGatewayDisableAllRoutesSuccessPlan,
  buildGatewayEnableOnlyRouteErrorPlan,
  buildGatewayEnableOnlyRouteSuccessPlan,
  buildGatewayResetCircuitErrorPlan,
  buildGatewayResetCircuitSuccessPlan,
  buildGatewayRouteSummaryRefreshErrorPlan,
  buildGatewaySyncErrorPlan,
  buildGatewaySyncSuccessPlan,
  buildGatewayRouteToggleErrorPlan,
  buildGatewayRouteToggleSuccessPlan,
  buildGatewayRouteSummaryRefreshPlan,
  mergeActiveRequestSnapshot,
  mergeGatewayProbeResult,
  mergeGatewayRouteBalanceResult,
  mergeGatewaySiteSummary,
  replaceReorderedGatewayRoutes,
} from '../src/gatewayRouteStateModel.ts'
import type { BalanceProbeResult, GatewayActiveRequest, GatewayOverview, GatewayRoute, GatewayRouteProbeResult, SiteSummary } from '../src/types.ts'

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

test('merges active request snapshot into route lists and overview concurrency', () => {
  const state = mergeActiveRequestSnapshot({
    routes: [route({ id: 1 }), route({ id: 2, active_concurrency: 9 })],
    priorityRoutes: [route({ id: 1 }), route({ id: 2 })],
    overview: overview({ active_concurrency: 0 }),
    activeRequests: [
      { route_id: 1 },
      { route_id: 1 },
      { route_id: 2 },
    ] as GatewayActiveRequest[],
  })

  assert.deepEqual(state.routes.map((item) => item.active_concurrency), [2, 1])
  assert.deepEqual(state.priorityRoutes.map((item) => item.active_concurrency), [2, 1])
  assert.equal(state.overview?.active_concurrency, 3)
})

test('merges site summary fields by site id without mutating other routes', () => {
  const routes = [
    route({ id: 1, site_id: 10, package_display: '' }),
    route({ id: 2, site_id: 11, package_display: '' }),
  ]
  const next = mergeGatewaySiteSummary(routes, {
    site_id: 10,
    package_remaining: 8,
    package_total: 10,
    package_used: 2,
    package_unit: 'USD',
    package_display: '$8 / $10',
    checkin_status: 'ok',
  } as SiteSummary)

  assert.equal(next[0].package_display, '$8 / $10')
  assert.equal(next[0].package_unit, '$')
  assert.equal(next[0].checkin_status, 'ok')
  assert.equal(next[1], routes[1])
})

test('builds route summary refresh plans from unique site ids', () => {
  assert.deepEqual(buildGatewayRouteSummaryRefreshPlan([]), {
    shouldRefresh: false,
    siteIds: [],
  })

  assert.deepEqual(buildGatewayRouteSummaryRefreshPlan([
    route({ id: 1, site_id: 10 }),
    route({ id: 2, site_id: 11 }),
    route({ id: 3, site_id: 10 }),
  ]), {
    shouldRefresh: true,
    siteIds: [10, 11],
  })
})

test('applies gateway site summaries in response order without mutating input routes', () => {
  const routes = [
    route({ id: 1, site_id: 10, package_display: '' }),
    route({ id: 2, site_id: 11, package_display: '' }),
    route({ id: 3, site_id: 12, package_display: '' }),
  ]
  const next = applyGatewaySiteSummaries(routes, [
    {
      site_id: 11,
      package_remaining: 4,
      package_total: 10,
      package_used: 6,
      package_unit: 'USD',
      package_display: '$4 / $10',
      checkin_status: 'ok',
    },
    {
      site_id: 10,
      package_remaining: 8,
      package_total: 10,
      package_used: 2,
      package_unit: 'CNY',
      package_display: '¥8 / ¥10',
      checkin_status: 'failed',
    },
  ] as SiteSummary[])

  assert.equal(next[0].package_display, '¥8 / ¥10')
  assert.equal(next[0].package_unit, '¥')
  assert.equal(next[0].checkin_status, 'failed')
  assert.equal(next[1].package_display, '$4 / $10')
  assert.equal(next[1].package_unit, '$')
  assert.equal(next[2], routes[2])
  assert.equal(routes[0].package_display, '')
  assert.equal(routes[1].package_display, '')
})

test('merges gateway probe result using supported model fallbacks', () => {
  const next = mergeGatewayProbeResult([
    route({ id: 1, supported_models: ['old'], model_probe_message: '旧消息' }),
  ], {
    id: 1,
    supported_models: undefined,
    models: ['gpt-4o', 'claude-3'],
    last_status_code: 200,
    last_error: '',
    last_latency_ms: 123,
    last_success_at: '2026-05-24T01:00:00Z',
    last_failure_at: null,
    model_probe_status: 'success',
    checked_at: '2026-05-24T01:00:02Z',
    message: 'ok',
  } as GatewayRouteProbeResult)

  assert.deepEqual(next[0].supported_models, ['gpt-4o', 'claude-3'])
  assert.equal(next[0].last_latency_ms, 123)
  assert.equal(next[0].model_probe_status, 'success')
  assert.equal(next[0].model_probe_message, 'ok')
  assert.equal(next[0].model_probe_updated_at, '2026-05-24T01:00:02Z')
})

test('merges route balance result and replaces reordered route lists', () => {
  const routes = [
    route({ id: 1, last_balance: 1, balance_unit: 'USD' }),
    route({ id: 2, is_enabled: false, last_balance: 2 }),
  ]
  const balanced = mergeGatewayRouteBalanceResult(routes, {
    route_id: 1,
    remaining: 6,
    last_balance: null,
    unit: 'RMB',
    balance_probe_url: '/dashboard/billing',
  } as BalanceProbeResult)
  const reordered = replaceReorderedGatewayRoutes(routes.slice().reverse(), false)

  assert.equal(balanced[0].last_balance, 6)
  assert.equal(balanced[0].balance_display, '¥6')
  assert.equal(balanced[0].balance_unit, '¥')
  assert.equal(balanced[0].balance_probe_url, '/dashboard/billing')
  assert.deepEqual(reordered.priorityRoutes.map((item) => item.id), [2, 1])
  assert.deepEqual(reordered.routes.map((item) => item.id), [1])
})

test('builds route toggle error plans', () => {
  assert.deepEqual(buildGatewayRouteToggleErrorPlan(new Error('启用状态更新超时')), {
    notice: {
      tone: 'error',
      message: '启用状态更新超时',
    },
  })

  assert.deepEqual(buildGatewayRouteToggleErrorPlan('failed'), {
    notice: {
      tone: 'error',
      message: '切换失败',
    },
  })
})

test('builds route toggle success plans from the previous enabled state', () => {
  assert.deepEqual(buildGatewayRouteToggleSuccessPlan({
    wasEnabled: true,
  }), {
    notice: {
      tone: 'success',
      message: '已禁用该路由。',
    },
  })

  assert.deepEqual(buildGatewayRouteToggleSuccessPlan({
    wasEnabled: false,
  }), {
    notice: {
      tone: 'success',
      message: '已重新启用该路由。',
    },
  })
})
