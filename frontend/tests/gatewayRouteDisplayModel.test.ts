import test from 'node:test'
import assert from 'node:assert/strict'

import {
  asGatewayLog,
  activeRequestMeta,
  activeRequestRouteLabel,
  buildGatewayActivityCopyErrorPlan,
  buildGatewayActivityCopySuccessPlan,
  gatewayLogRowKey,
  logModelMeta,
  logRequestLabel,
  logRouteLabel,
  normalizeGatewayActivityCopyUrl,
  requestMethodColor,
} from '../src/gatewayActivityDisplayModel.ts'
import {
  asGatewayRoute,
  formatLatency,
  formatUSD,
  gatewayRouteRowKey,
  loadRouteLabel,
  normalizeRoutePath,
  routeBalanceUnit,
  routeIssueLabels,
  routePathLabel,
  routeRequestBaseList,
  routeRequestBasePreview,
} from '../src/gatewayRouteDisplayModel.ts'
import type { GatewayActiveRequest, GatewayLog, GatewayRoute } from '../src/types.ts'

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
    route_type: 'codex',
    route_path: '',
    key_fingerprint: '',
    key_name: '',
    group_name: '',
    is_enabled: true,
    is_enabled_manual: true,
    has_api_key: true,
    site_missing: false,
    supported_models: [],
    route_priority: 1,
    weight: 1,
    active_concurrency: 0,
    success_rate: 0,
    request_count: 0,
    failure_count: 0,
    consecutive_failures: 0,
    circuit_state: 'closed',
    cooldown_until: null,
    last_error: '',
    last_failure_at: null,
    last_success_at: null,
    last_used_at: null,
    last_latency_ms: null,
    avg_latency_ms: null,
    ewma_latency_ms: null,
    last_balance: null,
    balance_display: '',
    balance_unit: '',
    package_unit: '',
    balance_probe_url: '',
    ...overrides,
  }
}

test('formats gateway route balance, path and request base preview', () => {
  const item = route({
    balance_display: '12 RMB',
    route_path: 'responses',
    request_base_urls: ['https://a.example', 'https://b.example'],
    manual_request_base_urls: ['https://manual.example', 'https://a.example'],
  })

  assert.equal(routeBalanceUnit(item), '¥')
  assert.equal(routePathLabel(item.route_path), '/v1/responses')
  assert.equal(normalizeRoutePath('unknown'), '')
  assert.deepEqual(routeRequestBaseList(item), ['https://manual.example', 'https://a.example', 'https://b.example', 'https://api.example'])
  assert.equal(routeRequestBasePreview(item), 'https://manual.example -> https://a.example 等 4 个')
})

test('casts gateway table records and reads stable row keys', () => {
  const routeRecord = route({ id: 42 })
  const logRecord = { id: 99 } as GatewayLog

  assert.equal(asGatewayRoute(routeRecord), routeRecord)
  assert.equal(gatewayRouteRowKey(routeRecord), 42)
  assert.equal(asGatewayLog(logRecord), logRecord)
  assert.equal(gatewayLogRowKey(logRecord), 99)
})

test('builds gateway route labels and issue markers', () => {
  const item = route({
    site_name: '',
    site_name_snapshot: '快照站点',
    key_name: '主 Key',
    has_api_key: false,
    is_enabled: false,
    is_enabled_manual: true,
    site_missing: true,
  })

  assert.equal(loadRouteLabel(item), '快照站点 / 主 Key')
  assert.deepEqual(routeIssueLabels(item), ['站点已删除', '缺少 API Key', '手动禁用'])
  assert.equal(formatLatency(null), '暂无')
  assert.equal(formatLatency(128), '128 ms')
  assert.equal(formatUSD(0.001), '$0.001000')
})

test('formats gateway log and active request labels', () => {
  const log = {
    id: 1,
    route_id: 5,
    site_id: 9,
    site_name: '',
    route_label: '',
    key_name: 'Key A',
    key_fingerprint: 'abcdef1234567890',
    model: 'gpt-4o',
    requested_model: '',
    actual_model: 'gpt-4o-mini',
    method: 'post',
    request_url: '',
    target_path: '/v1/responses',
  } as GatewayLog
  const active = {
    route_id: 6,
    site_id: 7,
    site_name: '活跃站点',
    route_label: '',
    key_name: 'Key B',
    key_fingerprint: '1234567890abcdef',
    request_base_url: 'https://base.example',
    request_url: '/v1/chat/completions',
  } as GatewayActiveRequest

  assert.equal(logRouteLabel(log), '#5 / 站点 #9 / Key A')
  assert.equal(logModelMeta(log), '请求 gpt-4o / 命中 gpt-4o-mini')
  assert.equal(logRequestLabel(log), 'post /v1/responses')
  assert.equal(requestMethodColor('PATCH'), 'orange')
  assert.equal(activeRequestRouteLabel(active), '#6 / 活跃站点 / Key B')
  assert.deepEqual(activeRequestMeta(active), ['Route #6', '站点 #7', 'Key 123456...cdef', 'https://base.example'])
})

test('normalizes gateway activity request urls before copying', () => {
  assert.equal(normalizeGatewayActivityCopyUrl('  /v1/responses  '), '/v1/responses')
  assert.equal(normalizeGatewayActivityCopyUrl('   '), '')
})

test('builds gateway activity copy error plans', () => {
  assert.deepEqual(buildGatewayActivityCopyErrorPlan(), {
    notice: {
      tone: 'error',
      message: '复制失败，请手动复制。',
    },
  })
})

test('builds gateway activity copy success plans', () => {
  assert.deepEqual(buildGatewayActivityCopySuccessPlan(), {
    notice: {
      tone: 'success',
      message: '请求 URL 已复制。',
    },
  })
})
