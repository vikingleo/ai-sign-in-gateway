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

test('builds gateway sync error plans', () => {
  assert.deepEqual(buildGatewaySyncErrorPlan(new Error('同步网关路由超时')), {
    notice: {
      tone: 'error',
      message: '同步网关路由超时',
    },
  })

  assert.deepEqual(buildGatewaySyncErrorPlan('failed'), {
    notice: {
      tone: 'error',
      message: '同步失败',
    },
  })
})

test('builds gateway sync success plans', () => {
  assert.deepEqual(buildGatewaySyncSuccessPlan({
    routeCount: 3,
    balanceSuccessCount: 2,
  }), {
    notice: {
      tone: 'success',
      message: '已同步 3 条网关路由，余额读取成功 2 条。',
    },
  })

  assert.deepEqual(buildGatewaySyncSuccessPlan({
    routeCount: 0,
    balanceSuccessCount: 0,
  }), {
    notice: {
      tone: 'success',
      message: '已同步 0 条网关路由，余额读取成功 0 条。',
    },
  })
})

test('builds disable-all routes error plans', () => {
  assert.deepEqual(buildGatewayDisableAllRoutesErrorPlan(new Error('批量禁用超时')), {
    notice: {
      tone: 'error',
      message: '批量禁用超时',
    },
  })

  assert.deepEqual(buildGatewayDisableAllRoutesErrorPlan('failed'), {
    notice: {
      tone: 'error',
      message: '禁用全部失败',
    },
  })
})

test('builds disable-all routes success plans from the disabled route count', () => {
  assert.deepEqual(buildGatewayDisableAllRoutesSuccessPlan({
    disabledCount: 5,
  }), {
    notice: {
      tone: 'success',
      message: '已禁用 5 条路由。',
    },
  })

  assert.deepEqual(buildGatewayDisableAllRoutesSuccessPlan({
    disabledCount: 0,
  }), {
    notice: {
      tone: 'success',
      message: '已禁用 0 条路由。',
    },
  })
})

test('builds enable-only route error plans', () => {
  assert.deepEqual(buildGatewayEnableOnlyRouteErrorPlan(new Error('仅启用路由超时')), {
    notice: {
      tone: 'error',
      message: '仅启用路由超时',
    },
  })

  assert.deepEqual(buildGatewayEnableOnlyRouteErrorPlan('failed'), {
    notice: {
      tone: 'error',
      message: '禁用其他失败',
    },
  })
})

test('builds enable-only route success plans', () => {
  assert.deepEqual(buildGatewayEnableOnlyRouteSuccessPlan(), {
    notice: {
      tone: 'success',
      message: '已仅启用该路由，其他路由已禁用。',
    },
  })
})

test('builds reset circuit error plans', () => {
  assert.deepEqual(buildGatewayResetCircuitErrorPlan(new Error('重置熔断超时')), {
    notice: {
      tone: 'error',
      message: '重置熔断超时',
    },
  })

  assert.deepEqual(buildGatewayResetCircuitErrorPlan('failed'), {
    notice: {
      tone: 'error',
      message: '重置失败',
    },
  })
})

test('builds reset circuit success plans', () => {
  assert.deepEqual(buildGatewayResetCircuitSuccessPlan(), {
    notice: {
      tone: 'success',
      message: '已重置该路由熔断状态。',
    },
  })
})

test('builds route summary refresh error plans', () => {
  assert.deepEqual(buildGatewayRouteSummaryRefreshErrorPlan(new Error('路由摘要接口超时')), {
    notice: {
      tone: 'error',
      message: '路由摘要接口超时',
    },
  })

  assert.deepEqual(buildGatewayRouteSummaryRefreshErrorPlan('failed'), {
    notice: {
      tone: 'error',
      message: '路由摘要刷新失败',
    },
  })
})
