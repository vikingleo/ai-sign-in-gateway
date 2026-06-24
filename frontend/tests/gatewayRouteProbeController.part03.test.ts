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

test('createProbeAllGatewayRoutesAction reads latest batch probe dependencies when invoked', async () => {
  const events: string[] = []
  let routes = [route({ id: 44 })]
  const action = createProbeAllGatewayRoutesAction({
    getRoutes: () => routes,
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

  routes = [route({ id: 45 }), route({ id: 46 })]
  await action()

  assert.deepEqual(events, [
    'start:45,46',
    'request-batch:45,46',
    'apply:45',
    'finish-route:45:true',
    'apply:46',
    'finish-route:46:true',
    'notice:路由探测完成，2 条全部可用。',
    'finish:45,46',
  ])
})

test('probeGatewayRouteAction assembles single route probe dependencies without changing behavior', async () => {
  const events: string[] = []
  const item = route({ id: 43, site_name: '主站', key_name: '主 Key' })

  await probeGatewayRouteAction({
    route: item,
    requestProbe: async (routeId) => {
      events.push(`request:${routeId}`)
      return {
        id: routeId,
        ok: true,
        latency_ms: 99,
        message: '',
      } as GatewayRouteProbeResult
    },
    applyProbeResult: (result) => {
      events.push(`apply:${result.id}`)
    },
    probeState: {
      trackRoute: (routeId) => {
        events.push(`track:${routeId}`)
      },
      untrackRoute: (routeId) => {
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

  assert.deepEqual(events, [
    'track:43',
    'request:43',
    'apply:43',
    'notice:主站 / 主 Key 探测成功，99 ms。',
    'untrack:43',
  ])
})

test('createProbeGatewayRouteAction assembles single route dependencies without changing behavior', async () => {
  const events: string[] = []
  const action = createProbeGatewayRouteAction({
    requestProbe: async (routeId) => {
      events.push(`request:${routeId}`)
      return {
        id: routeId,
        ok: true,
        latency_ms: 101,
        message: '',
      } as GatewayRouteProbeResult
    },
    applyProbeResult: (result) => {
      events.push(`apply:${result.id}`)
    },
    probeState: {
      trackRoute: (routeId) => {
        events.push(`track:${routeId}`)
      },
      untrackRoute: (routeId) => {
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

  await action(route({ id: 47, site_name: '主站', key_name: '主 Key' }))

  assert.deepEqual(events, [
    'track:47',
    'request:47',
    'apply:47',
    'notice:主站 / 主 Key 探测成功，101 ms。',
    'untrack:47',
  ])
})

test('GatewayView delegates single route probing through the route probe controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRouteActions"), "GatewayView delegates single route probing through the route probe controller should keep useGatewayPageRouteActions in gateway page controller")
  assert.ok(shellBindingsControllerSource.includes("handleProbeRoute: routeActions.handleProbeRoute"), "GatewayView delegates single route probing through the route probe controller should keep handleProbeRoute: routeActions.handleProbeRoute in gateway page controller")
})

test('GatewayView delegates batch route probing through the route probe controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRouteActions"), "GatewayView delegates batch route probing through the route probe controller should keep useGatewayPageRouteActions in gateway page controller")
  assert.ok(shellBindingsControllerSource.includes("handleProbeAll: routeActions.handleProbeAll"), "GatewayView delegates batch route probing through the route probe controller should keep handleProbeAll: routeActions.handleProbeAll in gateway page controller")
})
