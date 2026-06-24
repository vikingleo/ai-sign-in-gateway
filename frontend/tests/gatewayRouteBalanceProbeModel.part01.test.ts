import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildGatewayRouteBalanceBatchStartPlan,
  buildGatewayRouteBalanceBatchUpdateErrorPlan,
  buildGatewayRouteBalanceNotice,
  buildGatewayRouteBalanceProbeCompletionPlan,
  buildGatewayRouteBalanceProbeRunPlan,
  buildGatewayRouteBalanceProbeStepPlan,
  buildGatewaySingleRouteBalanceProbeErrorPlan,
  buildGatewaySingleRouteBalanceProbeCompletionPlan,
  buildGatewaySingleRouteBalanceNotice,
  createGatewayRouteBalanceProgress,
  isGatewayRouteBalanceProbing,
  mergeGatewayRouteBalanceProbingIds,
  nextGatewayRouteBalanceProgress,
  normalizeGatewayRouteBalanceProbeIds,
  removeGatewayRouteBalanceProbingIds,
} from '../src/gatewayRouteBalanceProbeModel.ts'
import {
  buildManualGatewayRouteBalanceDialogDraft,
  buildManualGatewayRouteBalanceFailureNotice,
  buildManualGatewayRouteBalanceProbeErrorPlan,
  buildManualGatewayRouteBalanceProbeCompletionPlan,
  buildManualGatewayRouteBalanceProbeURLValidationPlan,
  buildManualGatewayRouteBalanceSuccessNotice,
  buildManualGatewayRouteBalanceSuccessState,
  normalizeManualGatewayRouteBalanceProbeURL,
  validateManualGatewayRouteBalanceProbeURL,
} from '../src/gatewayManualRouteBalanceProbeModel.ts'
import type { BalanceProbeResult, GatewayRoute } from '../src/types.ts'

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

function balanceResult(overrides: Partial<BalanceProbeResult>): BalanceProbeResult {
  return {
    site_id: 10,
    route_id: 1,
    ok: true,
    status_code: 200,
    latency_ms: 20,
    remaining: 12.5,
    unit: '$',
    base_url: 'https://api.example',
    message: '',
    checked_at: '2026-05-24T00:00:00Z',
    last_balance: 12.5,
    ...overrides,
  }
}

test('normalizes balance probe route ids by filtering invalid values and preserving first order', () => {
  assert.deepEqual(
    normalizeGatewayRouteBalanceProbeIds([3, 0, 3, Number.NaN, 5, -1, Number.POSITIVE_INFINITY, 2]),
    [3, 5, 2],
  )
})

test('builds balance update batch start plans from route ids and route probe state', () => {
  assert.deepEqual(buildGatewayRouteBalanceBatchStartPlan([4, 0, 4, Number.NaN, 2], false), {
    shouldStart: true,
    routeIds: [4, 2],
    errorMessage: null,
  })

  assert.deepEqual(buildGatewayRouteBalanceBatchStartPlan([4, 2], true), {
    shouldStart: false,
    routeIds: [],
    errorMessage: '路由探测仍在运行，请稍后再更新余额。',
    notice: {
      tone: 'error',
      message: '路由探测仍在运行，请稍后再更新余额。',
    },
  })

  assert.deepEqual(buildGatewayRouteBalanceBatchStartPlan([0, Number.NaN, -1], true), {
    shouldStart: false,
    routeIds: [],
    errorMessage: '当前没有可更新余额的网关路由。',
    notice: {
      tone: 'error',
      message: '当前没有可更新余额的网关路由。',
    },
  })
})

test('builds balance probe run plans with optional progress', () => {
  assert.deepEqual(buildGatewayRouteBalanceProbeRunPlan([3, 0, 3, 5], true), {
    shouldRun: true,
    routeIds: [3, 5],
    progress: { total: 2, done: 0, success: 0, failed: 0 },
    result: null,
  })

  assert.deepEqual(buildGatewayRouteBalanceProbeRunPlan([3, 5], false), {
    shouldRun: true,
    routeIds: [3, 5],
    progress: null,
    result: null,
  })

  assert.deepEqual(buildGatewayRouteBalanceProbeRunPlan([0, Number.NaN, -1], true), {
    shouldRun: false,
    routeIds: [],
    progress: null,
    result: { success: 0, failed: 0 },
  })
})

test('merges and removes active balance probe route ids without mutating inputs', () => {
  const current = [1, 2]
  const next = mergeGatewayRouteBalanceProbingIds(current, [2, 3, 0, 3])

  assert.deepEqual(current, [1, 2])
  assert.deepEqual(next, [1, 2, 3])
  assert.deepEqual(removeGatewayRouteBalanceProbingIds(next, [2, 4]), [1, 3])
})

test('detects whether a gateway route balance is currently probing', () => {
  assert.equal(isGatewayRouteBalanceProbing([1, 5, 9], 5), true)
  assert.equal(isGatewayRouteBalanceProbing([1, 5, 9], 4), false)
})

test('builds and advances balance probe progress without mutating previous state', () => {
  const progress = createGatewayRouteBalanceProgress(3)
  const success = nextGatewayRouteBalanceProgress(progress, true)
  const failed = nextGatewayRouteBalanceProgress(success, false)

  assert.deepEqual(progress, { total: 3, done: 0, success: 0, failed: 0 })
  assert.deepEqual(success, { total: 3, done: 1, success: 1, failed: 0 })
  assert.deepEqual(failed, { total: 3, done: 2, success: 1, failed: 1 })
})

test('builds balance probe step plans for count and optional progress', () => {
  const count = { success: 1, failed: 1 }
  const progress = { total: 4, done: 2, success: 1, failed: 1 }

  assert.deepEqual(buildGatewayRouteBalanceProbeStepPlan({ count, progress, ok: true }), {
    count: { success: 2, failed: 1 },
    progress: { total: 4, done: 3, success: 2, failed: 1 },
  })
  assert.deepEqual(count, { success: 1, failed: 1 })
  assert.deepEqual(progress, { total: 4, done: 2, success: 1, failed: 1 })

  assert.deepEqual(buildGatewayRouteBalanceProbeStepPlan({ count, progress: null, ok: false }), {
    count: { success: 1, failed: 2 },
    progress: null,
  })
})

test('builds balance probe completion plans for overview notification and optional toast', () => {
  assert.deepEqual(buildGatewayRouteBalanceProbeCompletionPlan({
    count: { success: 2, failed: 0 },
    silent: false,
  }), {
    shouldNotifyOverviewChanged: true,
    notice: {
      tone: 'success',
      message: '余额探测完成，2 条全部读取成功。',
    },
  })
  assert.deepEqual(buildGatewayRouteBalanceProbeCompletionPlan({
    count: { success: 0, failed: 2 },
    silent: false,
  }), {
    shouldNotifyOverviewChanged: false,
    notice: {
      tone: 'error',
      message: '余额探测完成，成功 0 条，失败 2 条。',
    },
  })
  assert.deepEqual(buildGatewayRouteBalanceProbeCompletionPlan({
    count: { success: 1, failed: 1 },
    silent: true,
  }), {
    shouldNotifyOverviewChanged: true,
    notice: null,
  })
})

test('builds balance probe completion notices by action label', () => {
  assert.deepEqual(buildGatewayRouteBalanceNotice('余额探测', { success: 3, failed: 0 }), {
    tone: 'success',
    message: '余额探测完成，3 条全部读取成功。',
  })
  assert.deepEqual(buildGatewayRouteBalanceNotice('余额更新', { success: 2, failed: 1 }), {
    tone: 'error',
    message: '余额更新完成，成功 2 条，失败 1 条。',
  })
})

test('builds balance update batch error plans', () => {
  assert.deepEqual(buildGatewayRouteBalanceBatchUpdateErrorPlan(new Error('余额接口超时')), {
    notice: {
      tone: 'error',
      message: '余额接口超时',
    },
  })

  assert.deepEqual(buildGatewayRouteBalanceBatchUpdateErrorPlan('failed'), {
    notice: {
      tone: 'error',
      message: '余额更新失败',
    },
  })
})

test('builds single route balance probe notices with route and base url details', () => {
  const item = route({ site_name: '主站', key_name: '主 Key' })

  assert.deepEqual(
    buildGatewaySingleRouteBalanceNotice(item, balanceResult({ balance_display: '$12.50' })),
    {
      tone: 'success',
      message: '主站 / 主 Key 余额读取成功：$12.50（https://api.example）',
    },
  )
  assert.deepEqual(
    buildGatewaySingleRouteBalanceNotice(item, balanceResult({ ok: false, message: '接口无余额字段' })),
    {
      tone: 'error',
      message: '主站 / 主 Key 余额读取失败：接口无余额字段',
    },
  )
})
