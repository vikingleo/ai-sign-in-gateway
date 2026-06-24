import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  createProbeGatewayRouteBalancesAction,
  createUpdateAllGatewayRouteBalancesAction,
} from '../src/gatewayRouteBalanceProbeRuntimeController.ts'
import type { BalanceProbeResult, GatewayRoute } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRouteActionsControllerPath = new URL('../src/gatewayPageRouteActionsController.ts', import.meta.url)
const routeProbePageControllerPath = new URL('../src/gatewayRouteProbePageController.ts', import.meta.url)

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
    checked_at: '2026-05-26T00:00:00Z',
    last_balance: 12.5,
    ...overrides,
  }
}

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

test('createProbeGatewayRouteBalancesAction assembles runtime balance dependencies without changing behavior', async () => {
  const events: string[] = []
  const progress = { value: null }
  const probeRouteBalances = createProbeGatewayRouteBalancesAction({
    requestBalance: async (routeId) => {
      events.push(`request:${routeId}`)
      return balanceResult({ route_id: routeId, ok: true })
    },
    applyBalanceResult: (probeResult) => {
      events.push(`apply:${probeResult.route_id}:${probeResult.ok}`)
    },
    requestOverview: async () => {
      events.push('overview')
      return { route_count: 1 }
    },
    setOverview: (overview) => {
      events.push(`set-overview:${overview.route_count}`)
    },
    probeState: {
      trackRoutes: (routeIds) => {
        events.push(`track:${routeIds.join(',')}`)
      },
      untrackRoutes: (routeIds) => {
        events.push(`untrack:${routeIds.join(',')}`)
      },
    },
    notifyOverviewChanged: () => {
      events.push('notify')
    },
    showNotice: (notice) => {
      events.push(`notice:${notice.message}`)
    },
  })

  const result = await probeRouteBalances([51], { progress, silent: false })

  assert.deepEqual(result, { success: 1, failed: 0 })
  assert.deepEqual(progress.value, { total: 1, done: 1, success: 1, failed: 0 })
  assert.deepEqual(events, [
    'track:51',
    'request:51',
    'apply:51:true',
    'overview',
    'set-overview:1',
    'notify',
    'notice:余额探测完成，1 条全部读取成功。',
    'untrack:51',
  ])
})

test('createUpdateAllGatewayRouteBalancesAction reads latest routes and probe loading when invoked', async () => {
  const events: string[] = []
  const progress = { value: null }
  let currentRoutes = [route({ id: 61 }), route({ id: 62 })]
  let routeProbeRunning = false
  const handleUpdateAllBalances = createUpdateAllGatewayRouteBalancesAction({
    getRoutes: () => currentRoutes,
    isRouteProbeRunning: () => routeProbeRunning,
    probeState: {
      startBatch: (routeIds) => {
        events.push(`start:${routeIds.join(',')}`)
      },
      finishBatch: (routeIds) => {
        events.push(`finish:${routeIds.join(',')}`)
      },
    },
    probeRouteBalances: async (routeIds, options) => {
      events.push(`probe:${routeIds.join(',')}:${options.silent}:${options.progress === progress}`)
      return { success: routeIds.length, failed: 0 }
    },
    progress,
    refreshRouteSummaries: async () => {
      events.push('refresh-summaries')
    },
    showNotice: (notice) => {
      events.push(`notice:${notice.message}`)
    },
    showPlanNotice: (plan) => {
      events.push(`plan:${plan.notice.message}`)
    },
  })

  await handleUpdateAllBalances()
  currentRoutes = [route({ id: 63 })]
  routeProbeRunning = true
  await handleUpdateAllBalances()

  assert.deepEqual(events, [
    'start:61,62',
    'probe:61,62:true:true',
    'refresh-summaries',
    'notice:余额更新完成，2 条全部读取成功。',
    'finish:61,62',
    'plan:路由探测仍在运行，请稍后再更新余额。',
  ])
})

test('GatewayView creates route balance runtime helpers through the balance runtime controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const routeActionsControllerSource = await readFile(gatewayPageRouteActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRouteActions"), "GatewayView creates route balance runtime helpers through the balance runtime controller should keep useGatewayPageRouteActions in gateway page controller")
  assert.ok(routeActionsControllerSource.includes("requestBalance: gatewayPageRequests.probeGatewayRouteBalance"), "GatewayView creates route balance runtime helpers through the balance runtime controller should keep requestBalance: gatewayPageRequests.probeGatewayRouteBalance in route actions controller")
})
