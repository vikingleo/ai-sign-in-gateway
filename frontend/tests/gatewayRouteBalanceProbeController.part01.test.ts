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

test('opens manual balance dialog from latest route data', () => {
  const staleRoute = route({ id: 1, balance_probe_url: '/old-balance' })
  const latestRoute = route({ id: 1, balance_probe_url: '  /latest-balance  ' })
  const routes = ref<GatewayRoute[]>([latestRoute])
  const dialog = useGatewayRouteBalanceManualDialog({ routes })

  dialog.openDialog(staleRoute, '上一轮失败')

  assert.equal(dialog.open.value, true)
  assert.deepEqual(dialog.route.value, latestRoute)
  assert.equal(dialog.url.value, '/latest-balance')
  assert.equal(dialog.message.value, '上一轮失败')
})

test('updates manual balance dialog loading and close state', () => {
  const routes = ref<GatewayRoute[]>([])
  const dialog = useGatewayRouteBalanceManualDialog({ routes })

  dialog.setLoading(true)
  dialog.setFailureMessage('接口无余额字段')
  dialog.closeAfterSuccess()
  dialog.setLoading(false)

  assert.equal(dialog.open.value, false)
  assert.equal(dialog.loading.value, false)
  assert.equal(dialog.route.value, null)
  assert.equal(dialog.message.value, '')
})

test('starts balance probe batch state with progress and active route ids', () => {
  const probeState = useGatewayRouteBalanceProbeState()

  probeState.startBatch([1, 2, 2, 0])

  assert.equal(probeState.loading.value, true)
  assert.deepEqual(probeState.probingRouteIds.value, [1, 2])
  assert.deepEqual(probeState.progress.value, {
    total: 2,
    done: 0,
    success: 0,
    failed: 0,
  })
  assert.equal(probeState.progressPercent.value, 0)
})

test('advances balance probe batch progress and untracks completed routes', () => {
  const probeState = useGatewayRouteBalanceProbeState()
  probeState.startBatch([1, 2])

  probeState.finishBatchRoute(1, true)
  probeState.finishBatchRoute(2, false)

  assert.deepEqual(probeState.probingRouteIds.value, [])
  assert.deepEqual(probeState.progress.value, {
    total: 2,
    done: 2,
    success: 1,
    failed: 1,
  })
  assert.equal(probeState.progressPercent.value, 100)
})

test('keeps completed balance probe progress visible until scheduled cleanup', () => {
  let scheduled: (() => void) | null = null
  const probeState = useGatewayRouteBalanceProbeState({
    setTimeout(callback) {
      scheduled = callback
      return 1
    },
    clearTimeout() {},
  })
  probeState.startBatch([1])
  probeState.finishBatchRoute(1, true)

  probeState.finishBatch([1])

  assert.equal(probeState.loading.value, false)
  assert.equal(probeState.progress.value?.done, 1)
  assert.notEqual(scheduled, null)

  scheduled?.()

  assert.equal(probeState.progress.value, null)
})

test('tracks single balance probe state without changing batch progress', () => {
  const probeState = useGatewayRouteBalanceProbeState()

  probeState.trackRoute(7)
  probeState.trackRoute(7)
  probeState.untrackRoute(7)

  assert.equal(probeState.isRouteBalanceProbing(7), false)
  assert.equal(probeState.progress.value, null)
})

test('probeGatewayRouteBalances probes routes, applies results, refreshes overview, and reports progress', async () => {
  const events: string[] = []
  const progress = { value: null }

  const result = await probeGatewayRouteBalances({
    routeIds: [11, 12],
    requestBalance: async (routeId) => {
      events.push(`request:${routeId}`)
      if (routeId === 12) {
        throw new Error('balance timeout')
      }
      return balanceResult({ route_id: routeId, ok: true })
    },
    applyBalanceResult: (probeResult) => {
      events.push(`apply:${probeResult.route_id}:${probeResult.ok}`)
    },
    requestOverview: async () => {
      events.push('overview')
      return { route_count: 2 }
    },
    setOverview: () => {
      events.push('set-overview')
    },
    trackRoutes: (routeIds) => {
      events.push(`track:${routeIds.join(',')}`)
    },
    untrackRoutes: (routeIds) => {
      events.push(`untrack:${routeIds.join(',')}`)
    },
    notifyOverviewChanged: () => {
      events.push('notify')
    },
    showNotice: (notice) => {
      events.push(`notice:${notice.message}`)
    },
    progress,
    silent: false,
  })

  assert.deepEqual(result, { success: 1, failed: 1 })
  assert.deepEqual(progress.value, { total: 2, done: 2, success: 1, failed: 1 })
  assert.deepEqual(events, [
    'track:11,12',
    'request:11',
    'apply:11:true',
    'request:12',
    'overview',
    'set-overview',
    'notify',
    'notice:余额探测完成，成功 1 条，失败 1 条。',
    'untrack:11,12',
  ])
})

test('updateAllGatewayRouteBalances starts batch probes, refreshes summaries, and always finishes', async () => {
  const events: string[] = []
  const progress = { value: null }
  const routes = [route({ id: 21 }), route({ id: 22 })]

  await updateAllGatewayRouteBalances({
    routes,
    isRouteProbeRunning: false,
    startBatch: (routeIds) => {
      events.push(`start:${routeIds.join(',')}`)
    },
    finishBatch: (routeIds) => {
      events.push(`finish:${routeIds.join(',')}`)
    },
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
