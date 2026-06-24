import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  createRefreshGatewayRouteSummariesAction,
  refreshGatewayRouteSummaries,
} from '../src/gatewayRouteSummaryController.ts'
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

test('refreshGatewayRouteSummaries skips requests when no routes exist', async () => {
  await refreshGatewayRouteSummaries({
    routes: [],
    requestSummaries: async () => {
      throw new Error('should not request summaries without routes')
    },
    setRoutes: () => {
      throw new Error('should not set routes without summaries')
    },
    showPlanNotice: () => {
      throw new Error('should not show notice without errors')
    },
  })
})

test('refreshGatewayRouteSummaries loads unique site summaries and applies them', async () => {
  const routes = [
    route({ id: 1, site_id: 10, package_display: '' }),
    route({ id: 2, site_id: 11, package_display: '' }),
    route({ id: 3, site_id: 10, package_display: '' }),
  ]
  const requestPayloads: Array<{ site_ids: number[] }> = []
  let appliedRoutes: GatewayRoute[] = []

  await refreshGatewayRouteSummaries({
    routes,
    requestSummaries: async (payload) => {
      requestPayloads.push(payload)
      return [
        {
          site_id: 10,
          package_remaining: 8,
          package_total: 10,
          package_used: 2,
          package_unit: 'USD',
          package_display: '$8 / $10',
          checkin_status: 'ok',
        },
        {
          site_id: 11,
          package_remaining: 4,
          package_total: 10,
          package_used: 6,
          package_unit: 'CNY',
          package_display: '¥4 / ¥10',
          checkin_status: 'failed',
        },
      ] as SiteSummary[]
    },
    setRoutes: (nextRoutes) => {
      appliedRoutes = nextRoutes
    },
    showPlanNotice: () => {
      throw new Error('should not show notice on success')
    },
  })

  assert.deepEqual(requestPayloads, [{ site_ids: [10, 11] }])
  assert.equal(appliedRoutes[0].package_display, '$8 / $10')
  assert.equal(appliedRoutes[0].package_unit, '$')
  assert.equal(appliedRoutes[0].checkin_status, 'ok')
  assert.equal(appliedRoutes[1].package_display, '¥4 / ¥10')
  assert.equal(appliedRoutes[1].package_unit, '¥')
  assert.equal(appliedRoutes[1].checkin_status, 'failed')
  assert.equal(appliedRoutes[2].package_display, '$8 / $10')
  assert.equal(routes[0].package_display, '')
})

test('refreshGatewayRouteSummaries reports refresh errors', async () => {
  const notices: string[] = []

  await refreshGatewayRouteSummaries({
    routes: [route({ id: 1, site_id: 10 })],
    requestSummaries: async () => {
      throw new Error('summary timeout')
    },
    setRoutes: () => {
      throw new Error('should not set routes on failure')
    },
    showPlanNotice: (plan) => notices.push(plan.notice.message),
  })

  assert.deepEqual(notices, ['summary timeout'])
})

test('createRefreshGatewayRouteSummariesAction assembles route summary dependencies without changing behavior', async () => {
  const sourceRoutes = [
    route({ id: 1, site_id: 10, package_display: '' }),
    route({ id: 2, site_id: 10, package_display: '' }),
  ]
  const requestPayloads: Array<{ site_ids: number[] }> = []
  let appliedRoutes: GatewayRoute[] = []

  const refreshRouteSummaries = createRefreshGatewayRouteSummariesAction({
    getRoutes: () => sourceRoutes,
    requestSummaries: async (payload) => {
      requestPayloads.push(payload)
      return [
        {
          site_id: 10,
          package_remaining: 6,
          package_total: 10,
          package_used: 4,
          package_unit: 'USD',
          package_display: '$6 / $10',
          checkin_status: 'ok',
        },
      ] as SiteSummary[]
    },
    setRoutes: (nextRoutes) => {
      appliedRoutes = nextRoutes
    },
    showPlanNotice: () => {
      throw new Error('should not show notice on success')
    },
  })

  await refreshRouteSummaries()

  assert.deepEqual(requestPayloads, [{ site_ids: [10] }])
  assert.equal(appliedRoutes[0].package_display, '$6 / $10')
  assert.equal(appliedRoutes[1].package_display, '$6 / $10')
  assert.equal(sourceRoutes[0].package_display, '')
})

test('GatewayView delegates route summary refreshing through the route summary controller', async () => {
  const source = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const pageRefreshActionsController = await readFile(pageRefreshActionsControllerPath, 'utf8')
  const controller = await readFile(refreshPageControllerPath, 'utf8')
  const catalogController = await readFile(catalogRefreshPageControllerPath, 'utf8')
  const operationsController = await readFile(refreshOperationsPageControllerPath, 'utf8')
  const helper = controller.slice(
    controller.indexOf('const refreshRouteSummaries = createRefreshGatewayRouteSummariesAction'),
    controller.indexOf('const { schedule: scheduleRouteSummaryRefresh }'),
  )

  assert.match(operationsControllerSource, /import \{ useGatewayPageRefreshActions \} from '\.\/gatewayPageRefreshActionsController\.ts'/)
  assert.match(operationsControllerSource, /useGatewayPageRefreshActions\(\{[\s\S]*state[\s\S]*gatewayPageRequests[\s\S]*showPlanNotice[\s\S]*\}/)
  assert.match(pageRefreshActionsController, /useGatewayRefreshOperationsPageActions\(\{[\s\S]*routes: state\.routes[\s\S]*requestSummaries: gatewayPageRequests\.refreshSiteSummaries[\s\S]*showPlanNotice[\s\S]*\}/)
  assert.doesNotMatch(source, /import \{ useGatewayCatalogRefreshPageActions \} from '(?:\.\.\/|\.\/)gatewayCatalogRefreshPageController(?:\.ts)?'/)
  assert.doesNotMatch(source, /import \{ useGatewayRefreshOperationsPageActions \} from '(?:\.\.\/|\.\/)gatewayRefreshOperationsPageController(?:\.ts)?'/)
  assert.doesNotMatch(source, /useGatewayRefreshOperationsPageActions\(\{/)
  assert.doesNotMatch(source, /useGatewayCatalogRefreshPageActions\(\{/)
  assert.doesNotMatch(source, /useGatewayRouteSummaryPageActions\(\{/)
  assert.doesNotMatch(source, /createRefreshGatewayRouteSummariesAction/)
  assert.match(operationsController, /useGatewayCatalogRefreshPageActions/)
  assert.match(catalogController, /useGatewayRouteSummaryPageActions/)
  assert.match(controller, /import \{ createRefreshGatewayRouteSummariesAction \} from '\.\/gatewayRouteSummaryController\.ts'/)
  assert.match(helper, /getRoutes: \(\) => routes\.value/)
  assert.match(helper, /requestSummaries/)
  assert.match(helper, /setRoutes/)
  assert.match(helper, /showPlanNotice/)
  assert.doesNotMatch(source, /async function refreshRouteSummaries/)
  assert.doesNotMatch(helper, /await refreshGatewayRouteSummaries\(\{/)
  assert.doesNotMatch(helper, /buildGatewayRouteSummaryRefreshPlan/)
  assert.doesNotMatch(helper, /refreshSiteSummaries\(\{ site_ids: refreshPlan\.siteIds \}\)/)
  assert.doesNotMatch(helper, /applyGatewaySiteSummaries/)
  assert.doesNotMatch(helper, /buildGatewayRouteSummaryRefreshErrorPlan/)
})
