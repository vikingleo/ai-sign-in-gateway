import test from 'node:test'
import assert from 'node:assert/strict'

import { enableOnlyGatewayRouteWithConfirmation } from '../src/gatewayRouteEnableOnlyController.ts'
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

test('enableOnlyGatewayRouteWithConfirmation stops when confirmation is rejected', async () => {
  let requestCount = 0
  let reloadCount = 0
  const notices: string[] = []

  await enableOnlyGatewayRouteWithConfirmation({
    route: route({ id: 31 }),
    confirmEnableOnly: () => false,
    requestEnableOnly: async () => {
      requestCount += 1
    },
    reloadGatewayData: async () => {
      reloadCount += 1
    },
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  assert.equal(requestCount, 0)
  assert.equal(reloadCount, 0)
  assert.deepEqual(notices, [])
})

test('enableOnlyGatewayRouteWithConfirmation enables one route, reports success, and reloads data', async () => {
  const targetRoute = route({ id: 32 })
  const events: string[] = []
  const requestRouteIds: number[] = []

  await enableOnlyGatewayRouteWithConfirmation({
    route: targetRoute,
    confirmEnableOnly: (routeArg) => {
      assert.equal(routeArg, targetRoute)
      events.push('confirm')
      return true
    },
    requestEnableOnly: async (routeId) => {
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

  assert.deepEqual(requestRouteIds, [32])
  assert.deepEqual(events, [
    'confirm',
    'request:32',
    'notice:已仅启用该路由，其他路由已禁用。',
    'reload',
  ])
})

test('enableOnlyGatewayRouteWithConfirmation reports request errors without reloading data', async () => {
  const notices: string[] = []
  let reloadCount = 0

  await enableOnlyGatewayRouteWithConfirmation({
    route: route({ id: 33 }),
    confirmEnableOnly: () => true,
    requestEnableOnly: async () => {
      throw new Error('enable only timeout')
    },
    reloadGatewayData: async () => {
      reloadCount += 1
    },
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  assert.deepEqual(notices, ['enable only timeout'])
  assert.equal(reloadCount, 0)
})

test('enableOnlyGatewayRouteWithConfirmation preserves the existing success then reload error notice order', async () => {
  const notices: string[] = []

  await enableOnlyGatewayRouteWithConfirmation({
    route: route({ id: 34 }),
    confirmEnableOnly: () => true,
    requestEnableOnly: async () => {},
    reloadGatewayData: async () => {
      throw new Error('reload failed')
    },
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  assert.deepEqual(notices, ['已仅启用该路由，其他路由已禁用。', 'reload failed'])
})
