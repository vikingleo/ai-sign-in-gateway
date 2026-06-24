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

test('builds single route balance probe completion plans for notification and manual retry', () => {
  const item = route({ site_name: '主站', key_name: '主 Key' })

  assert.deepEqual(
    buildGatewaySingleRouteBalanceProbeCompletionPlan(item, balanceResult({ balance_display: '$12.50' })),
    {
      shouldNotifyOverviewChanged: true,
      notice: {
        tone: 'success',
        message: '主站 / 主 Key 余额读取成功：$12.50（https://api.example）',
      },
      shouldOpenManualDialog: false,
      manualDialogMessage: '',
    },
  )
  assert.deepEqual(
    buildGatewaySingleRouteBalanceProbeCompletionPlan(item, balanceResult({ ok: false, message: '接口无余额字段' })),
    {
      shouldNotifyOverviewChanged: false,
      notice: {
        tone: 'error',
        message: '主站 / 主 Key 余额读取失败：接口无余额字段',
      },
      shouldOpenManualDialog: true,
      manualDialogMessage: '接口无余额字段',
    },
  )
})

test('builds single route balance probe error plans from thrown values', () => {
  assert.deepEqual(buildGatewaySingleRouteBalanceProbeErrorPlan(new Error('network timeout')), {
    notice: {
      tone: 'error',
      message: 'network timeout',
    },
  })
  assert.deepEqual(buildGatewaySingleRouteBalanceProbeErrorPlan('bad gateway'), {
    notice: {
      tone: 'error',
      message: '余额读取失败',
    },
  })
})

test('builds manual balance dialog drafts from latest route data', () => {
  const staleRoute = route({ id: 1, balance_probe_url: '/old-balance' })
  const latestRoute = route({ id: 1, balance_probe_url: '  /latest-balance  ' })
  const draft = buildManualGatewayRouteBalanceDialogDraft(staleRoute, [latestRoute], '上一轮失败')

  assert.equal(draft.route, latestRoute)
  assert.equal(draft.url, '/latest-balance')
  assert.equal(draft.message, '上一轮失败')
})

test('validates manual balance probe url drafts', () => {
  assert.equal(normalizeManualGatewayRouteBalanceProbeURL('  /balance  '), '/balance')
  assert.equal(normalizeManualGatewayRouteBalanceProbeURL('   '), '')
  assert.equal(validateManualGatewayRouteBalanceProbeURL(''), '请填写余额探测接口地址。')
  assert.equal(
    validateManualGatewayRouteBalanceProbeURL('balance'),
    '探测接口地址需要是完整 URL，或以 / 开头的相对路径。',
  )
  assert.equal(validateManualGatewayRouteBalanceProbeURL('/balance'), '')
  assert.equal(validateManualGatewayRouteBalanceProbeURL('https://api.example/balance'), '')
})

test('builds manual balance probe url validation notice plans', () => {
  assert.deepEqual(buildManualGatewayRouteBalanceProbeURLValidationPlan(''), {
    isValid: false,
    validationMessage: '请填写余额探测接口地址。',
    notice: {
      tone: 'error',
      message: '请填写余额探测接口地址。',
    },
  })

  assert.deepEqual(buildManualGatewayRouteBalanceProbeURLValidationPlan('balance'), {
    isValid: false,
    validationMessage: '探测接口地址需要是完整 URL，或以 / 开头的相对路径。',
    notice: {
      tone: 'error',
      message: '探测接口地址需要是完整 URL，或以 / 开头的相对路径。',
    },
  })

  assert.deepEqual(buildManualGatewayRouteBalanceProbeURLValidationPlan('/balance'), {
    isValid: true,
    validationMessage: '',
    notice: null,
  })
})

test('builds manual balance probe notices and success close state', () => {
  const item = route({ site_name: '主站', key_name: '主 Key' })
  const result = balanceResult({ balance_display: '$12.50' })

  assert.equal(
    buildManualGatewayRouteBalanceSuccessNotice(item, result),
    '主站 / 主 Key 余额读取成功：$12.50。',
  )
  assert.equal(
    buildManualGatewayRouteBalanceFailureNotice(item, '接口无余额字段'),
    '主站 / 主 Key 余额读取失败：接口无余额字段',
  )
  assert.deepEqual(buildManualGatewayRouteBalanceSuccessState(), {
    open: false,
    route: null,
    message: '',
  })
})

test('builds manual balance probe completion plans for dialog and notification state', () => {
  const item = route({ site_name: '主站', key_name: '主 Key' })

  assert.deepEqual(
    buildManualGatewayRouteBalanceProbeCompletionPlan(item, balanceResult({ balance_display: '$12.50' })),
    {
      shouldNotifyOverviewChanged: true,
      notice: {
        tone: 'success',
        message: '主站 / 主 Key 余额读取成功：$12.50。',
      },
      shouldCloseDialog: true,
      failureMessage: '',
    },
  )
  assert.deepEqual(
    buildManualGatewayRouteBalanceProbeCompletionPlan(item, balanceResult({ ok: false, message: '接口无余额字段' })),
    {
      shouldNotifyOverviewChanged: false,
      notice: {
        tone: 'error',
        message: '主站 / 主 Key 余额读取失败：接口无余额字段',
      },
      shouldCloseDialog: false,
      failureMessage: '接口无余额字段',
    },
  )
})

test('builds manual balance probe error plans from thrown values', () => {
  assert.deepEqual(buildManualGatewayRouteBalanceProbeErrorPlan(new Error('network timeout')), {
    notice: {
      tone: 'error',
      message: 'network timeout',
    },
    failureMessage: 'network timeout',
  })
  assert.deepEqual(buildManualGatewayRouteBalanceProbeErrorPlan('bad gateway'), {
    notice: {
      tone: 'error',
      message: '余额读取失败',
    },
    failureMessage: '余额读取失败',
  })
})
