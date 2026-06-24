import test from 'node:test'
import assert from 'node:assert/strict'

import { toggleGatewayRouteEnabled } from '../src/gatewayRouteToggleController.ts'
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

test('toggleGatewayRouteEnabled toggles a route, reports success, and reloads data', async () => {
  const events: string[] = []
  const requestRouteIds: number[] = []

  await toggleGatewayRouteEnabled({
    route: route({ id: 12, is_enabled: true }),
    requestToggle: async (routeId) => {
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

  assert.deepEqual(requestRouteIds, [12])
  assert.deepEqual(events, [
    'request:12',
    'notice:已禁用该路由。',
    'reload',
  ])
})

test('toggleGatewayRouteEnabled reports request errors without reloading data', async () => {
  const notices: string[] = []
  let reloadCount = 0

  await toggleGatewayRouteEnabled({
    route: route({ id: 14, is_enabled: false }),
    requestToggle: async () => {
      throw new Error('toggle timeout')
    },
    reloadGatewayData: async () => {
      reloadCount += 1
    },
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  assert.deepEqual(notices, ['toggle timeout'])
  assert.equal(reloadCount, 0)
})

test('toggleGatewayRouteEnabled preserves the existing success then reload error notice order', async () => {
  const notices: string[] = []

  await toggleGatewayRouteEnabled({
    route: route({ id: 15, is_enabled: false }),
    requestToggle: async () => {},
    reloadGatewayData: async () => {
      throw new Error('reload failed')
    },
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  assert.deepEqual(notices, ['已重新启用该路由。', 'reload failed'])
})
