import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import * as gatewayRouteProbeController from '../src/gatewayRouteProbeController.ts'

import {
  createProbeAllGatewayRoutesAction,
  createProbeGatewayRouteAction,
  probeAllGatewayRoutesAction,
  probeGatewayRouteBatch,
  probeGatewayRouteAction,
  probeSingleGatewayRoute,
  useGatewayRouteProbeState,
} from '../src/gatewayRouteProbeController.ts'
import type { GatewayRoute, GatewayRouteProbeResult } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
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

test('starts route probe batch state with progress and active route ids', () => {
  const probeState = useGatewayRouteProbeState()

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

test('advances route probe batch progress and untracks completed routes', () => {
  const probeState = useGatewayRouteProbeState()
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

test('keeps completed route probe progress visible until scheduled cleanup', () => {
  let scheduled: (() => void) | null = null
  const probeState = useGatewayRouteProbeState({
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

test('tracks single route probe state without changing batch progress', () => {
  const probeState = useGatewayRouteProbeState()

  probeState.trackRoute(7)
  probeState.trackRoute(7)
  probeState.untrackRoute(7)

  assert.equal(probeState.isRouteProbing(7), false)
  assert.equal(probeState.progress.value, null)
})

test('createApplyGatewayProbeResultAction merges probe results through injected state', () => {
  assert.equal(
    typeof gatewayRouteProbeController.createApplyGatewayProbeResultAction,
    'function',
    'createApplyGatewayProbeResultAction should be exported',
  )
  const originalRoutes = [route({ id: 7, last_error: 'old error' })]
  const mergedRoutes = [route({ id: 7, last_error: '' })]
  const appliedSources: GatewayRoute[][] = []
  const appliedResults: GatewayRouteProbeResult[] = []
  let currentRoutes = originalRoutes
  let nextRoutes: GatewayRoute[] = []
  const probeResult = {
    id: 7,
    ok: true,
    latency_ms: 42,
    message: '',
  } as GatewayRouteProbeResult

  const applyProbeResult = gatewayRouteProbeController.createApplyGatewayProbeResultAction({
    getRoutes: () => currentRoutes,
    mergeProbeResult: (routes, result) => {
      appliedSources.push(routes)
      appliedResults.push(result)
      return mergedRoutes
    },
    setRoutes: (routes) => {
      nextRoutes = routes
    },
  })

  applyProbeResult(probeResult)

  assert.deepEqual(appliedSources, [originalRoutes])
  assert.deepEqual(appliedResults, [probeResult])
  assert.deepEqual(nextRoutes, mergedRoutes)
})

test('probeSingleGatewayRoute tracks a route, applies the probe result, and reports completion', async () => {
  const events: string[] = []
  const item = route({ id: 17, site_name: '主站', key_name: '主 Key' })
  const result = {
    id: 17,
    ok: true,
    latency_ms: 123,
    message: '',
  } as GatewayRouteProbeResult

  await probeSingleGatewayRoute({
    route: item,
    requestProbe: async (routeId) => {
      events.push(`request:${routeId}`)
      return result
    },
    applyProbeResult: (probeResult) => {
      events.push(`apply:${probeResult.id}`)
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
    'track:17',
    'request:17',
    'apply:17',
    'notice:主站 / 主 Key 探测成功，123 ms。',
    'untrack:17',
  ])
})

test('probeSingleGatewayRoute reports probe errors and always untracks the route', async () => {
  const events: string[] = []
  const item = route({ id: 18 })

  await probeSingleGatewayRoute({
    route: item,
    requestProbe: async () => {
      events.push('request')
      throw new Error('probe timeout')
    },
    applyProbeResult: () => {
      events.push('apply')
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
    'track:18',
    'request',
    'plan:probe timeout',
    'untrack:18',
  ])
})
