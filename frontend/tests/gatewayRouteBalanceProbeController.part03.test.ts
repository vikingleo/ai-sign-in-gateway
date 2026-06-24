import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { ref } from 'vue'

import {
  createProbeGatewayRouteBalanceAction,
  probeGatewayRouteBalances,
  probeGatewayRouteBalanceAction,
  probeManualGatewayRouteBalance,
  probeSingleGatewayRouteBalance,
  updateAllGatewayRouteBalances,
  updateAllGatewayRouteBalancesAction,
} from '../src/gatewayRouteBalanceProbeFlowController.ts'
import {
  useGatewayRouteBalanceManualDialog,
  useGatewayRouteBalanceProbeState,
} from '../src/gatewayRouteBalanceProbeController.ts'
import * as gatewayRouteBalanceProbeController from '../src/gatewayRouteBalanceProbeController.ts'
import type { BalanceProbeResult, GatewayRoute } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRouteActionsControllerPath = new URL('../src/gatewayPageRouteActionsController.ts', import.meta.url)
const routeProbePageControllerPath = new URL('../src/gatewayRouteProbePageController.ts', import.meta.url)
const gatewayRouteMutationActionsControllerPath = new URL(
  '../src/gatewayRouteMutationActionsController.ts',
  import.meta.url,
)

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
    checked_at: '2026-05-26T00:00:00Z',
    last_balance: 12.5,
    ...overrides,
  }
}

test('createProbeGatewayRouteBalanceAction forwards selected routes through the balance controller', async () => {
  const events: string[] = []
  const action = createProbeGatewayRouteBalanceAction({
    requestBalance: async (routeId) => {
      events.push(`request:${routeId}`)
      return balanceResult({ route_id: routeId, ok: true, balance_display: '$12.50' })
    },
    applyBalanceResult: (probeResult) => {
      events.push(`apply:${probeResult.route_id}`)
    },
    refreshRouteSummaries: async () => {
      events.push('refresh-summaries')
    },
    notifyOverviewChanged: () => {
      events.push('notify')
    },
    openManualDialog: (routeValue, message) => {
      events.push(`manual:${routeValue.id}:${message}`)
    },
    probeState: {
      trackRoute: (routeId: number) => {
        events.push(`track:${routeId}`)
      },
      untrackRoute: (routeId: number) => {
        events.push(`untrack:${routeId}`)
      },
    },
    showNotice: (notice) => {
      events.push(`notice:${notice.message}`)
    },
    showPlanNotice: (plan) => {
      events.push(`plan:${plan.notice.message}`)
    },
  })

  await action(route({ id: 31, site_name: '主站', key_name: '主 Key' }))
  await action(route({ id: 32, site_name: '备站', key_name: '备 Key' }))

  assert.deepEqual(events, [
    'track:31',
    'request:31',
    'apply:31',
    'refresh-summaries',
    'notify',
    'notice:主站 / 主 Key 余额读取成功：$12.50（https://api.example）',
    'untrack:31',
    'track:32',
    'request:32',
    'apply:32',
    'refresh-summaries',
    'notify',
    'notice:备站 / 备 Key 余额读取成功：$12.50（https://api.example）',
    'untrack:32',
  ])
})

test('probeManualGatewayRouteBalance validates urls and handles successful manual probes', async () => {
  const events: string[] = []
  const item = route({ id: 41, site_name: '主站', key_name: '主 Key' })

  await probeManualGatewayRouteBalance({
    route: item,
    balanceProbeURL: '  /balance  ',
    requestBalance: async (routeId, payload) => {
      events.push(`request:${routeId}:${payload.balance_probe_url}`)
      return balanceResult({ route_id: routeId, balance_display: '$12.50' })
    },
    applyBalanceResult: (probeResult) => {
      events.push(`apply:${probeResult.route_id}`)
    },
    refreshRouteSummaries: async () => {
      events.push('refresh-summaries')
    },
    notifyOverviewChanged: () => {
      events.push('notify')
    },
    setLoading: (loading) => {
      events.push(`loading:${loading}`)
    },
    trackRoute: (routeId) => {
      events.push(`track:${routeId}`)
    },
    untrackRoute: (routeId) => {
      events.push(`untrack:${routeId}`)
    },
    closeAfterSuccess: () => {
      events.push('close')
    },
    setFailureMessage: (message) => {
      events.push(`failure:${message}`)
    },
    showPlanNotice: (plan) => {
      events.push(`plan:${plan.notice.message}`)
    },
  })

  assert.deepEqual(events, [
    'loading:true',
    'track:41',
    'request:41:/balance',
    'apply:41',
    'refresh-summaries',
    'notify',
    'plan:主站 / 主 Key 余额读取成功：$12.50。',
    'close',
    'loading:false',
    'untrack:41',
  ])
})

test('probeManualGatewayRouteBalance reports invalid urls before touching loading state', async () => {
  const events: string[] = []

  await probeManualGatewayRouteBalance({
    route: route({ id: 42 }),
    balanceProbeURL: 'balance',
    requestBalance: async () => {
      events.push('request')
      return balanceResult({})
    },
    applyBalanceResult: () => {
      events.push('apply')
    },
    refreshRouteSummaries: async () => {
      events.push('refresh')
    },
    notifyOverviewChanged: () => {
      events.push('notify')
    },
    setLoading: (loading) => {
      events.push(`loading:${loading}`)
    },
    trackRoute: (routeId) => {
      events.push(`track:${routeId}`)
    },
    untrackRoute: (routeId) => {
      events.push(`untrack:${routeId}`)
    },
    closeAfterSuccess: () => {
      events.push('close')
    },
    setFailureMessage: (message) => {
      events.push(`failure:${message}`)
    },
    showPlanNotice: (plan) => {
      events.push(`plan:${plan.notice.message}`)
    },
  })

  assert.deepEqual(events, ['plan:探测接口地址需要是完整 URL，或以 / 开头的相对路径。'])
})

test('createApplyGatewayRouteBalanceResultAction merges balance results through injected state', () => {
  assert.equal(
    typeof gatewayRouteBalanceProbeController.createApplyGatewayRouteBalanceResultAction,
    'function',
    'createApplyGatewayRouteBalanceResultAction should be exported',
  )

  const originalRoutes = [route({ id: 61, balance_display: '$1.00' })]
  const mergedRoutes = [route({ id: 61, balance_display: '$8.00' })]
  const probeResult = balanceResult({ route_id: 61, remaining: 8 })
  const events: string[] = []

  const applyBalanceResult = gatewayRouteBalanceProbeController.createApplyGatewayRouteBalanceResultAction({
    getRoutes: () => {
      events.push('get-routes')
      return originalRoutes
    },
    mergeBalanceResult: (routes, result) => {
      events.push(`merge:${routes === originalRoutes}:${result === probeResult}`)
      return mergedRoutes
    },
    setRoutes: (routes) => {
      events.push(`set:${routes === mergedRoutes}`)
    },
  })

  applyBalanceResult(probeResult)

  assert.deepEqual(events, ['get-routes', 'merge:true:true', 'set:true'])
})
