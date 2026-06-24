import test from 'node:test'
import assert from 'node:assert/strict'

import { resetGatewayRouteCircuitState } from '../src/gatewayRouteCircuitController.ts'
import type { GatewayRoute } from '../src/types.ts'

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
    circuit_state: 'open',
    consecutive_failures: 3,
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

test('resetGatewayRouteCircuitState resets a route circuit, reports success, and reloads data', async () => {
  const events: string[] = []
  const requestRouteIds: number[] = []

  await resetGatewayRouteCircuitState({
    route: route({ id: 21 }),
    requestReset: async (routeId) => {
      requestRouteIds.push(routeId)
      events.push(`request:${routeId}`)
    },
    reloadGatewayData: async () => {
      events.push('reload')
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(requestRouteIds, [21])
  assert.deepEqual(events, [
    'request:21',
    'notice:已重置该路由熔断状态。',
    'reload',
  ])
})

test('resetGatewayRouteCircuitState reports request errors without reloading data', async () => {
  const notices: string[] = []
  let reloadCount = 0

  await resetGatewayRouteCircuitState({
    route: route({ id: 22 }),
    requestReset: async () => {
      throw new Error('reset timeout')
    },
    reloadGatewayData: async () => {
      reloadCount += 1
    },
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  assert.deepEqual(notices, ['reset timeout'])
  assert.equal(reloadCount, 0)
})

test('resetGatewayRouteCircuitState preserves the existing success then reload error notice order', async () => {
  const notices: string[] = []

  await resetGatewayRouteCircuitState({
    route: route({ id: 23 }),
    requestReset: async () => {},
    reloadGatewayData: async () => {
      throw new Error('reload failed')
    },
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  assert.deepEqual(notices, ['已重置该路由熔断状态。', 'reload failed'])
})
