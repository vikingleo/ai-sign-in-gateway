import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildGatewayProbeBatchStartPlan,
  buildGatewayProbeCompletionPlan,
  buildGatewayProbeFailureResult,
  buildGatewayProbeNotice,
  buildGatewayProbeStepPlan,
  buildGatewaySingleProbeCompletionPlan,
  buildGatewaySingleProbeErrorPlan,
  buildGatewaySingleProbeNotice,
  createGatewayProbeProgress,
  isGatewayRouteProbing,
  mergeGatewayProbingIds,
  nextGatewayProbeProgress,
  normalizeGatewayProbeRouteIds,
  removeGatewayProbingIds,
} from '../src/gatewayRouteProbeModel.ts'
import type { GatewayRoute, GatewayRouteProbeResult } from '../src/types.ts'

function route(overrides: Partial<GatewayRoute>): GatewayRoute {
  return {
    id: 1,
    site_id: 10,
    site_name: '主站',
    site_name_snapshot: '',
    site_base_url_snapshot: '',
    base_url: 'https://api.example',
    request_base_url: 'https://proxy.example',
    request_base_urls: [],
    manual_request_base_urls: [],
    group_name: '',
    supported_models: ['gpt-4o'],
    key_name: '主 Key',
    key_fingerprint: 'abcdef',
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
    last_latency_ms: 88,
    success_rate: 0,
    last_status_code: 200,
    last_error: '',
    last_used_at: null,
    last_success_at: '2026-05-24T01:00:00Z',
    last_failure_at: null,
    circuit_open_until: null,
    ...overrides,
  }
}

test('builds a gateway probe failure result from an exception and route snapshot', () => {
  const failure = buildGatewayProbeFailureResult({
    routeId: 7,
    route: route({ id: 7 }),
    error: new Error('network timeout'),
    checkedAt: '2026-05-24T02:00:00Z',
  })

  assert.equal(failure.id, 7)
  assert.equal(failure.site_id, 10)
  assert.equal(failure.site_name, '主站 / 主 Key')
  assert.equal(failure.request_base_url, 'https://proxy.example')
  assert.equal(failure.key_name, '主 Key')
  assert.equal(failure.ok, false)
  assert.equal(failure.message, 'network timeout')
  assert.deepEqual(failure.supported_models, ['gpt-4o'])
  assert.equal(failure.last_status_code, 200)
  assert.equal(failure.last_error, '')
  assert.equal(failure.last_latency_ms, 88)
  assert.equal(failure.last_success_at, '2026-05-24T01:00:00Z')
  assert.equal(failure.checked_at, '2026-05-24T02:00:00Z')
})

test('falls back to route id and previous last error when route snapshot is missing', () => {
  const failure = buildGatewayProbeFailureResult({
    routeId: 9,
    route: undefined,
    error: 'bad gateway',
    checkedAt: '2026-05-24T03:00:00Z',
  })

  assert.equal(failure.site_id, 0)
  assert.equal(failure.site_name, 'Route #9')
  assert.equal(failure.key_name, '')
  assert.equal(failure.last_error, 'bad gateway')
  assert.deepEqual(failure.models, [])
  assert.deepEqual(failure.supported_models, [])
})

test('updates batch probe progress without mutating the previous object', () => {
  const progress = { total: 3, done: 1, success: 1, failed: 0 }
  const successProgress = nextGatewayProbeProgress(progress, true)
  const failedProgress = nextGatewayProbeProgress(successProgress, false)

  assert.deepEqual(progress, { total: 3, done: 1, success: 1, failed: 0 })
  assert.deepEqual(successProgress, { total: 3, done: 2, success: 2, failed: 0 })
  assert.deepEqual(failedProgress, { total: 3, done: 3, success: 2, failed: 1 })
})

test('builds batch probe step plans without mutating failure lists', () => {
  const failedResult = {
    id: 7,
    ok: false,
    site_name: '备用站',
    key_name: 'Key B',
    message: 'upstream 500',
  } as GatewayRouteProbeResult
  const previousFailures = [
    {
      id: 3,
      ok: false,
      site_name: '旧站',
      key_name: '',
      message: 'timeout',
    },
  ] as GatewayRouteProbeResult[]

  assert.deepEqual(buildGatewayProbeStepPlan({
    failedResults: previousFailures,
    result: { id: 5, ok: true } as GatewayRouteProbeResult,
  }), {
    failedResults: previousFailures,
    routeSucceeded: true,
  })
  assert.deepEqual(buildGatewayProbeStepPlan({
    failedResults: previousFailures,
    result: failedResult,
  }), {
    failedResults: [...previousFailures, failedResult],
    routeSucceeded: false,
  })
  assert.deepEqual(previousFailures, [{
    id: 3,
    ok: false,
    site_name: '旧站',
    key_name: '',
    message: 'timeout',
  }])
})

test('normalizes and tracks active gateway probe route ids without mutating inputs', () => {
  assert.deepEqual(
    normalizeGatewayProbeRouteIds([4, 0, 4, Number.NaN, 2, -1, Number.POSITIVE_INFINITY, 3]),
    [4, 2, 3],
  )

  const current = [1, 2]
  const merged = mergeGatewayProbingIds(current, [2, 5, 0, 5])
  assert.deepEqual(current, [1, 2])
  assert.deepEqual(merged, [1, 2, 5])
  assert.deepEqual(removeGatewayProbingIds(merged, [2, 9]), [1, 5])
})

test('builds batch probe start plans from route ids', () => {
  assert.deepEqual(buildGatewayProbeBatchStartPlan([4, 0, 4, Number.NaN, 2]), {
    shouldStart: true,
    routeIds: [4, 2],
    errorMessage: null,
  })

  assert.deepEqual(buildGatewayProbeBatchStartPlan([0, Number.NaN, -1]), {
    shouldStart: false,
    routeIds: [],
    errorMessage: '当前没有可探测的网关路由。',
    notice: {
      tone: 'error',
      message: '当前没有可探测的网关路由。',
    },
  })
})

test('detects whether a gateway route is currently probing', () => {
  assert.equal(isGatewayRouteProbing([1, 4, 9], 4), true)
  assert.equal(isGatewayRouteProbing([1, 4, 9], 3), false)
})

test('creates batch probe progress state from route count', () => {
  assert.deepEqual(createGatewayProbeProgress(4), {
    total: 4,
    done: 0,
    success: 0,
    failed: 0,
  })
})

test('builds batch probe completion notices with a failure sample', () => {
  const failures = [
    { site_name: '主站', key_name: 'Key A' },
    { site_name: '备用站', key_name: '' },
    { site_name: '第三站', key_name: 'Key C' },
  ] as GatewayRouteProbeResult[]

  assert.deepEqual(buildGatewayProbeNotice(3, []), {
    tone: 'success',
    message: '路由探测完成，3 条全部可用。',
  })
  assert.deepEqual(buildGatewayProbeNotice(2, failures), {
    tone: 'error',
    message: '路由探测完成，成功 2 条，失败 3 条：主站 / Key A，备用站',
  })
})

test('builds batch probe completion plans from progress and failure results', () => {
  const failures = [
    { site_name: '主站', key_name: 'Key A' },
    { site_name: '备用站', key_name: '' },
    { site_name: '第三站', key_name: 'Key C' },
  ] as GatewayRouteProbeResult[]

  assert.deepEqual(buildGatewayProbeCompletionPlan(3, []), {
    notice: {
      tone: 'success',
      message: '路由探测完成，3 条全部可用。',
    },
  })
  assert.deepEqual(buildGatewayProbeCompletionPlan(2, failures), {
    notice: {
      tone: 'error',
      message: '路由探测完成，成功 2 条，失败 3 条：主站 / Key A，备用站',
    },
  })
})

test('builds single route probe success and failure notices', () => {
  const item = route({ site_name: '主站', key_name: '主 Key' })

  assert.deepEqual(buildGatewaySingleProbeNotice(item, {
    ok: true,
    latency_ms: 123,
  } as GatewayRouteProbeResult), {
    tone: 'success',
    message: '主站 / 主 Key 探测成功，123 ms。',
  })
  assert.deepEqual(buildGatewaySingleProbeNotice(item, {
    ok: false,
    message: 'upstream 401',
  } as GatewayRouteProbeResult), {
    tone: 'error',
    message: '主站 / 主 Key 探测失败：upstream 401',
  })
})

test('builds single route probe completion plans from probe results', () => {
  const item = route({ site_name: '主站', key_name: '主 Key' })

  assert.deepEqual(buildGatewaySingleProbeCompletionPlan(item, {
    ok: true,
    latency_ms: 123,
  } as GatewayRouteProbeResult), {
    notice: {
      tone: 'success',
      message: '主站 / 主 Key 探测成功，123 ms。',
    },
  })
  assert.deepEqual(buildGatewaySingleProbeCompletionPlan(item, {
    ok: false,
    message: 'upstream 401',
  } as GatewayRouteProbeResult), {
    notice: {
      tone: 'error',
      message: '主站 / 主 Key 探测失败：upstream 401',
    },
  })
})

test('builds single route probe error plans from thrown values', () => {
  assert.deepEqual(buildGatewaySingleProbeErrorPlan(new Error('network timeout')), {
    notice: {
      tone: 'error',
      message: 'network timeout',
    },
  })
  assert.deepEqual(buildGatewaySingleProbeErrorPlan('bad gateway'), {
    notice: {
      tone: 'error',
      message: '路由探测失败',
    },
  })
})
