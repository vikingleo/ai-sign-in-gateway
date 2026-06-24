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

test('probeGatewayRouteBatch probes routes, applies successes, advances progress, and reports completion', async () => {
  const events: string[] = []
  const routes = [
    route({ id: 21, site_name: '主站', key_name: 'Key A' }),
    route({ id: 22, site_name: '备用站', key_name: 'Key B' }),
  ]

  await probeGatewayRouteBatch({
    routes,
    requestProbeBatch: async (routeIds) => {
      events.push(`request-batch:${routeIds.join(',')}`)
      return routeIds.map((routeId) => ({
        id: routeId,
        ok: true,
        latency_ms: 100 + routeId,
        message: '',
      } as GatewayRouteProbeResult))
    },
    applyProbeResult: (probeResult) => {
      events.push(`apply:${probeResult.id}`)
    },
    startBatch: (routeIds) => {
      events.push(`start:${routeIds.join(',')}`)
    },
    finishBatchRoute: (routeId, ok) => {
      events.push(`finish-route:${routeId}:${ok}`)
    },
    finishBatch: (routeIds) => {
      events.push(`finish:${routeIds.join(',')}`)
    },
    now: () => '2026-05-26T10:00:00.000Z',
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(events, [
    'start:21,22',
    'request-batch:21,22',
    'apply:21',
    'finish-route:21:true',
    'apply:22',
    'finish-route:22:true',
    'notice:路由探测完成，2 条全部可用。',
    'finish:21,22',
  ])
})

test('probeGatewayRouteBatch converts per-route failures into failed results and keeps probing remaining routes', async () => {
  const events: string[] = []
  const routes = [
    route({ id: 31, site_name: '主站', key_name: 'Key A' }),
    route({ id: 32, site_name: '备用站', key_name: '' }),
  ]

  await probeGatewayRouteBatch({
    routes,
    requestProbeBatch: async (routeIds) => {
      events.push(`request-batch:${routeIds.join(',')}`)
      return routeIds
        .filter((routeId) => routeId !== 31)
        .map((routeId) => ({
          id: routeId,
          ok: true,
          latency_ms: 88,
          message: '',
        } as GatewayRouteProbeResult))
    },
    applyProbeResult: (probeResult) => {
      events.push(`apply:${probeResult.id}`)
    },
    startBatch: (routeIds) => {
      events.push(`start:${routeIds.join(',')}`)
    },
    finishBatchRoute: (routeId, ok) => {
      events.push(`finish-route:${routeId}:${ok}`)
    },
    finishBatch: (routeIds) => {
      events.push(`finish:${routeIds.join(',')}`)
    },
    now: () => '2026-05-26T10:00:00.000Z',
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(events, [
    'start:31,32',
    'request-batch:31,32',
    'apply:31',
    'finish-route:31:false',
    'apply:32',
    'finish-route:32:true',
    'notice:路由探测完成，成功 1 条，失败 1 条：主站 / Key A / Key A',
    'finish:31,32',
  ])
})

test('probeGatewayRouteBatch reports empty route selections without starting a batch', async () => {
  const events: string[] = []

  await probeGatewayRouteBatch({
    routes: [],
    requestProbeBatch: async () => {
      events.push('request')
      return [{ id: 1, ok: true } as GatewayRouteProbeResult]
    },
    applyProbeResult: () => {
      events.push('apply')
    },
    startBatch: () => {
      events.push('start')
    },
    finishBatchRoute: () => {
      events.push('finish-route')
    },
    finishBatch: () => {
      events.push('finish')
    },
    now: () => '2026-05-26T10:00:00.000Z',
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(events, ['notice:当前没有可探测的网关路由。'])
})

test('probeAllGatewayRoutesAction assembles batch probe dependencies without changing behavior', async () => {
  const events: string[] = []
  const routes = [
    route({ id: 41 }),
    route({ id: 42 }),
  ]

  await probeAllGatewayRoutesAction({
    routes,
    requestProbeBatch: async (routeIds) => {
      events.push(`request-batch:${routeIds.join(',')}`)
      return routeIds.map((routeId) => ({
        id: routeId,
        ok: true,
        latency_ms: routeId,
        message: '',
      } as GatewayRouteProbeResult))
    },
    applyProbeResult: (result) => {
      events.push(`apply:${result.id}`)
    },
    probeState: {
      startBatch: (routeIds) => {
        events.push(`start:${routeIds.join(',')}`)
      },
      finishBatchRoute: (routeId, ok) => {
        events.push(`finish-route:${routeId}:${ok}`)
      },
      finishBatch: (routeIds) => {
        events.push(`finish:${routeIds.join(',')}`)
      },
    },
    now: () => '2026-05-26T10:00:00.000Z',
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(events, [
    'start:41,42',
    'request-batch:41,42',
    'apply:41',
    'finish-route:41:true',
    'apply:42',
    'finish-route:42:true',
    'notice:路由探测完成，2 条全部可用。',
    'finish:41,42',
  ])
})
