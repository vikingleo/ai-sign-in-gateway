import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  createRefreshGatewayManuallyAction,
  refreshGatewayManually,
} from '../src/gatewayManualRefreshController.ts'
import type { GatewayRoute } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const pageRefreshActionsControllerPath = new URL('../src/gatewayPageRefreshActionsController.ts', import.meta.url)
const refreshPageControllerPath = new URL('../src/gatewayRefreshPageController.ts', import.meta.url)
const refreshOperationsPageControllerPath = new URL(
  '../src/gatewayRefreshOperationsPageController.ts',
  import.meta.url,
)

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

test('refreshGatewayManually loads data, silently probes route balances, and refreshes summaries', async () => {
  const events: string[] = []
  const probedIds: number[][] = []

  await refreshGatewayManually({
    routes: [route(11), route(12)],
    loadGatewayData: async () => {
      events.push('load')
    },
    probeRouteBalances: async (routeIds, options) => {
      probedIds.push(routeIds)
      events.push(`probe:${options.silent}`)
      return { success: 2 }
    },
    refreshRouteSummaries: async () => {
      events.push('summaries')
    },
  })

  assert.deepEqual(probedIds, [[11, 12]])
  assert.deepEqual(events, [
    'load',
    'probe:true',
    'summaries',
  ])
})

test('refreshGatewayManually propagates load errors without probing or refreshing summaries', async () => {
  const events: string[] = []

  await assert.rejects(
    refreshGatewayManually({
      routes: [route(13)],
      loadGatewayData: async () => {
        events.push('load')
        throw new Error('load failed')
      },
      probeRouteBalances: async () => {
        events.push('probe')
        return { success: 0 }
      },
      refreshRouteSummaries: async () => {
        events.push('summaries')
      },
    }),
    /load failed/,
  )

  assert.deepEqual(events, ['load'])
})

test('refreshGatewayManually propagates balance probe errors without refreshing summaries', async () => {
  const events: string[] = []

  await assert.rejects(
    refreshGatewayManually({
      routes: [route(14)],
      loadGatewayData: async () => {
        events.push('load')
      },
      probeRouteBalances: async () => {
        events.push('probe')
        throw new Error('probe failed')
      },
      refreshRouteSummaries: async () => {
        events.push('summaries')
      },
    }),
    /probe failed/,
  )

  assert.deepEqual(events, ['load', 'probe'])
})

test('createRefreshGatewayManuallyAction reads latest routes when invoked', async () => {
  const events: string[] = []
  const probedIds: number[][] = []
  let currentRoutes = [route(21)]

  const handleRefresh = createRefreshGatewayManuallyAction({
    getRoutes: () => currentRoutes,
    loadGatewayData: async () => {
      events.push('load')
    },
    probeRouteBalances: async (routeIds, options) => {
      probedIds.push(routeIds)
      events.push(`probe:${options.silent}`)
      return { success: routeIds.length }
    },
    refreshRouteSummaries: async () => {
      events.push('summaries')
    },
  })

  await handleRefresh()
  currentRoutes = [route(22), route(23)]
  await handleRefresh()

  assert.deepEqual(probedIds, [[21], [22, 23]])
  assert.deepEqual(events, [
    'load',
    'probe:true',
    'summaries',
    'load',
    'probe:true',
    'summaries',
  ])
})

test('GatewayView delegates manual refresh through the manual refresh controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const pageRefreshActionsControllerSource = await readFile(pageRefreshActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRefreshActions"), "GatewayView delegates manual refresh through the page refresh actions controller should keep useGatewayPageRefreshActions in gateway page controller")
  assert.ok(pageRefreshActionsControllerSource.includes("useGatewayRefreshOperationsPageActions"), "GatewayView delegates manual refresh through the manual refresh controller should keep useGatewayRefreshOperationsPageActions in gateway page refresh actions controller")
  assert.ok(pageRefreshActionsControllerSource.includes("loadGatewayData: () => runtimeActions.loadData()"), "GatewayView delegates manual refresh through the manual refresh controller should keep loadGatewayData: () => runtimeActions.loadData() in gateway page refresh actions controller")
})
