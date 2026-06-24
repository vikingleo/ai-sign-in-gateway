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

test('updateAllGatewayRouteBalances reports start validation without probing', async () => {
  const events: string[] = []

  await updateAllGatewayRouteBalances({
    routes: [],
    isRouteProbeRunning: false,
    startBatch: () => {
      events.push('start')
    },
    finishBatch: () => {
      events.push('finish')
    },
    probeRouteBalances: async () => {
      events.push('probe')
      return { success: 0, failed: 0 }
    },
    progress: { value: null },
    refreshRouteSummaries: async () => {
      events.push('refresh')
    },
    showNotice: (notice) => {
      events.push(`notice:${notice.message}`)
    },
    showPlanNotice: (plan) => {
      events.push(`plan:${plan.notice.message}`)
    },
  })

  assert.deepEqual(events, ['plan:当前没有可更新余额的网关路由。'])
})

test('updateAllGatewayRouteBalancesAction assembles batch balance dependencies without changing behavior', async () => {
  const events: string[] = []
  const progress = { value: null }
  const routes = [route({ id: 21 }), route({ id: 22 })]
  const probeState = {
    startBatch: (routeIds: number[]) => {
      events.push(`start:${routeIds.join(',')}`)
    },
    finishBatch: (routeIds: number[]) => {
      events.push(`finish:${routeIds.join(',')}`)
    },
  }

  await updateAllGatewayRouteBalancesAction({
    routes,
    isRouteProbeRunning: false,
    probeState,
    probeRouteBalances: async (routeIds, options) => {
      events.push(`probe:${routeIds.join(',')}:${options.silent}:${options.progress === progress}`)
      return { success: 2, failed: 0 }
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

  assert.deepEqual(events, [
    'start:21,22',
    'probe:21,22:true:true',
    'refresh-summaries',
    'notice:余额更新完成，2 条全部读取成功。',
    'finish:21,22',
  ])
})

test('probeSingleGatewayRouteBalance handles failed balance results and opens manual retry', async () => {
  const events: string[] = []
  const item = route({ id: 31, site_name: '主站', key_name: '主 Key' })

  await probeSingleGatewayRouteBalance({
    route: item,
    requestBalance: async (routeId) => {
      events.push(`request:${routeId}`)
      return balanceResult({ route_id: routeId, ok: false, message: '接口无余额字段' })
    },
    applyBalanceResult: (probeResult) => {
      events.push(`apply:${probeResult.route_id}:${probeResult.ok}`)
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
    trackRoute: (routeId) => {
      events.push(`track:${routeId}`)
    },
    untrackRoute: (routeId) => {
      events.push(`untrack:${routeId}`)
    },
    showNotice: (notice) => {
      events.push(`notice:${notice.message}`)
    },
    showPlanNotice: (plan) => {
      events.push(`plan:${plan.notice.message}`)
    },
  })

  assert.deepEqual(events, [
    'track:31',
    'request:31',
    'apply:31:false',
    'refresh-summaries',
    'notice:主站 / 主 Key 余额读取失败：接口无余额字段',
    'manual:31:接口无余额字段',
    'untrack:31',
  ])
})

test('probeGatewayRouteBalanceAction assembles single balance dependencies without changing behavior', async () => {
  const events: string[] = []
  const item = route({ id: 31, site_name: '主站', key_name: '主 Key' })
  const probeState = {
    trackRoute: (routeId: number) => {
      events.push(`track:${routeId}`)
    },
    untrackRoute: (routeId: number) => {
      events.push(`untrack:${routeId}`)
    },
  }

  await probeGatewayRouteBalanceAction({
    route: item,
    requestBalance: async (routeId) => {
      events.push(`request:${routeId}`)
      return balanceResult({ route_id: routeId, ok: false, message: '接口无余额字段' })
    },
    applyBalanceResult: (probeResult) => {
      events.push(`apply:${probeResult.route_id}:${probeResult.ok}`)
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
    probeState,
    showNotice: (notice) => {
      events.push(`notice:${notice.message}`)
    },
    showPlanNotice: (plan) => {
      events.push(`plan:${plan.notice.message}`)
    },
  })

  assert.deepEqual(events, [
    'track:31',
    'request:31',
    'apply:31:false',
    'refresh-summaries',
    'notice:主站 / 主 Key 余额读取失败：接口无余额字段',
    'manual:31:接口无余额字段',
    'untrack:31',
  ])
})
