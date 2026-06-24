import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  createSyncGatewayRoutesWithBalancesAction,
  syncGatewayRoutesWithBalances,
} from '../src/gatewaySyncController.ts'
import type { GatewayRoute } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageAdminActionsControllerPath = new URL(
  '../src/gatewayPageAdminActionsController.ts',
  import.meta.url,
)
const adminOperationsPageControllerPath = new URL('../src/gatewayAdminOperationsPageController.ts', import.meta.url)
const upstreamPageControllerPath = new URL('../src/gatewayUpstreamPageController.ts', import.meta.url)

function route(id: number): GatewayRoute {
  return {
    id,
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
  }
}

test('syncGatewayRoutesWithBalances syncs routes, reloads data, probes balances, and reports success', async () => {
  const events: string[] = []
  const routes = [route(11), route(12)]
  const probedIds: number[][] = []

  await syncGatewayRoutesWithBalances({
    getRoutes: () => routes,
    requestSync: async () => {
      events.push('sync')
      return { route_count: 2 }
    },
    reloadGatewayData: async () => {
      events.push('reload')
    },
    probeRouteBalances: async (routeIds, options) => {
      probedIds.push(routeIds)
      events.push(`probe:${options.silent}`)
      return { success: 1 }
    },
    setLoading: (value) => {
      events.push(`loading:${value}`)
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(probedIds, [[11, 12]])
  assert.deepEqual(events, [
    'loading:true',
    'sync',
    'reload',
    'probe:true',
    'notice:已同步 2 条网关路由，余额读取成功 1 条。',
    'loading:false',
  ])
})

test('syncGatewayRoutesWithBalances uses fresh routes after reload', async () => {
  const events: string[] = []
  let routes = [route(11)]
  const probedIds: number[][] = []

  await syncGatewayRoutesWithBalances({
    getRoutes: () => routes,
    requestSync: async () => {
      events.push('sync')
      return { route_count: 2 }
    },
    reloadGatewayData: async () => {
      events.push('reload')
      routes = [route(11), route(12)] // Simulate new route added during sync
    },
    probeRouteBalances: async (routeIds, options) => {
      probedIds.push(routeIds)
      events.push(`probe:${options.silent}`)
      return { success: 2 }
    },
    setLoading: () => {},
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(probedIds, [[11, 12]], 'Should use the updated routes list after reload')
  assert.ok(events.includes('notice:已同步 2 条网关路由，余额读取成功 2 条。'))
})

test('syncGatewayRoutesWithBalances reports sync errors without reload or balance probes', async () => {
  const events: string[] = []

  await syncGatewayRoutesWithBalances({
    getRoutes: () => [route(13)],
    requestSync: async () => {
      events.push('sync')
      throw new Error('同步超时')
    },
    reloadGatewayData: async () => {
      events.push('reload')
    },
    probeRouteBalances: async () => {
      events.push('probe')
      return { success: 0 }
    },
    setLoading: (value) => {
      events.push(`loading:${value}`)
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(events, [
    'loading:true',
    'sync',
    'notice:同步超时',
    'loading:false',
  ])
})

test('syncGatewayRoutesWithBalances preserves the existing reload failure notice behavior', async () => {
  const notices: string[] = []

  await syncGatewayRoutesWithBalances({
    getRoutes: () => [route(14)],
    requestSync: async () => ({ route_count: 1 }),
    reloadGatewayData: async () => {
      throw new Error('reload failed')
    },
    probeRouteBalances: async () => {
      throw new Error('probe should not run')
    },
    setLoading: () => {},
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  assert.deepEqual(notices, ['reload failed'])
})

test('createSyncGatewayRoutesWithBalancesAction reads latest routes when invoked', async () => {
  const events: string[] = []
  const probedIds: number[][] = []
  let currentRoutes = [route(21)]

  const action = createSyncGatewayRoutesWithBalancesAction({
    getRoutes: () => currentRoutes,
    requestSync: async () => {
      events.push('sync')
      return { route_count: currentRoutes.length }
    },
    reloadGatewayData: async () => {
      events.push('reload')
    },
    probeRouteBalances: async (routeIds, options) => {
      probedIds.push(routeIds)
      events.push(`probe:${options.silent}`)
      return { success: routeIds.length }
    },
    setLoading: (loading) => {
      events.push(`loading:${loading}`)
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  await action()
  currentRoutes = [route(22), route(23)]
  await action()

  assert.deepEqual(probedIds, [[21], [22, 23]])
  assert.deepEqual(events, [
    'loading:true',
    'sync',
    'reload',
    'probe:true',
    'notice:已同步 1 条网关路由，余额读取成功 1 条。',
    'loading:false',
    'loading:true',
    'sync',
    'reload',
    'probe:true',
    'notice:已同步 2 条网关路由，余额读取成功 2 条。',
    'loading:false',
  ])
})

test('GatewayView delegates gateway sync through the sync controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const pageAdminActionsControllerSource = await readFile(gatewayPageAdminActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageAdminActions"), "GatewayView delegates gateway sync through the page admin actions controller should keep useGatewayPageAdminActions in gateway page controller")
  assert.ok(pageAdminActionsControllerSource.includes("useGatewayAdminOperationsPageActions"), "GatewayView delegates gateway sync through the sync controller should keep useGatewayAdminOperationsPageActions in gateway page admin actions controller")
  assert.ok(pageAdminActionsControllerSource.includes("requestSync: gatewayPageRequests.syncGatewayRoutes"), "GatewayView delegates gateway sync through the sync controller should keep requestSync: gatewayPageRequests.syncGatewayRoutes in gateway page admin actions controller")
})
