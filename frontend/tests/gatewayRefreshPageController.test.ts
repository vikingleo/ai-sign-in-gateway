import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  useGatewayManualRefreshPageActions,
  useGatewayRouteSummaryPageActions,
} from '../src/gatewayRefreshPageController.ts'
import type { GatewayRoute, SiteSummary } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const pageRefreshActionsControllerPath = new URL('../src/gatewayPageRefreshActionsController.ts', import.meta.url)
const refreshPageControllerPath = new URL('../src/gatewayRefreshPageController.ts', import.meta.url)
const catalogRefreshPageControllerPath = new URL('../src/gatewayCatalogRefreshPageController.ts', import.meta.url)
const refreshOperationsPageControllerPath = new URL(
  '../src/gatewayRefreshOperationsPageController.ts',
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

test('useGatewayRouteSummaryPageActions wires route summary refresh and scheduling', async () => {
  const routes = {
    value: [
      route({ id: 1, site_id: 10, package_display: '' }),
      route({ id: 2, site_id: 11, package_display: '' }),
    ],
  }
  const requestPayloads: Array<{ site_ids: number[] }> = []
  let appliedRoutes: GatewayRoute[] = []
  let scheduledTask: (() => Promise<void>) | null = null

  const actions = useGatewayRouteSummaryPageActions({
    routes,
    requestSummaries: async (payload) => {
      requestPayloads.push(payload)
      return [
        {
          site_id: 10,
          package_remaining: 7,
          package_total: 10,
          package_used: 3,
          package_unit: 'USD',
          package_display: '$7 / $10',
          checkin_status: 'ok',
        },
        {
          site_id: 11,
          package_remaining: 2,
          package_total: 8,
          package_used: 6,
          package_unit: 'CNY',
          package_display: '¥2 / ¥8',
          checkin_status: 'failed',
        },
      ] as SiteSummary[]
    },
    setRoutes: (nextRoutes) => {
      appliedRoutes = nextRoutes
    },
    createScheduledTask: (task) => {
      scheduledTask = task
      return {
        schedule: () => undefined,
      }
    },
    showPlanNotice: () => {
      throw new Error('should not show notice on success')
    },
  })

  actions.scheduleRouteSummaryRefresh()
  await actions.refreshRouteSummaries()

  assert.equal(scheduledTask, actions.refreshRouteSummaries)
  assert.deepEqual(requestPayloads, [{ site_ids: [10, 11] }])
  assert.equal(appliedRoutes[0].package_display, '$7 / $10')
  assert.equal(appliedRoutes[1].package_display, '¥2 / ¥8')
})

test('useGatewayManualRefreshPageActions wires manual refresh action', async () => {
  const routes = {
    value: [route({ id: 21 })],
  }
  const probedIds: number[][] = []
  const events: string[] = []
  const actions = useGatewayManualRefreshPageActions({
    routes,
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

  await actions.handleRefresh()
  routes.value = [route({ id: 22 }), route({ id: 23 })]
  await actions.handleRefresh()

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

test('GatewayView delegates refresh page wiring to the page controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const pageRefreshActionsControllerSource = await readFile(pageRefreshActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRefreshActions"), "GatewayView delegates refresh page wiring to the page refresh actions controller should keep useGatewayPageRefreshActions in gateway page controller")
  assert.ok(pageRefreshActionsControllerSource.includes("useGatewayRefreshOperationsPageActions"), "GatewayView delegates refresh page wiring to the page refresh actions controller should keep useGatewayRefreshOperationsPageActions in gateway page refresh actions controller")
  assert.ok(pageRefreshActionsControllerSource.includes("requestSummaries: gatewayPageRequests.refreshSiteSummaries"), "GatewayView delegates refresh page wiring to the page refresh actions controller should keep requestSummaries: gatewayPageRequests.refreshSiteSummaries in gateway page refresh actions controller")
})
