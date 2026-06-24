import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { ref } from 'vue'

import { useGatewayCatalogRefreshPageActions } from '../src/gatewayCatalogRefreshPageController.ts'
import type { GatewayRoute, GatewayRouteGroup, SiteGroup, SiteSummary } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const pageRefreshActionsControllerPath = new URL('../src/gatewayPageRefreshActionsController.ts', import.meta.url)
const catalogRefreshPageControllerPath = new URL('../src/gatewayCatalogRefreshPageController.ts', import.meta.url)
const refreshOperationsPageControllerPath = new URL(
  '../src/gatewayRefreshOperationsPageController.ts',
  import.meta.url,
)

function route(overrides: Partial<GatewayRoute> = {}): GatewayRoute {
  return {
    id: 1,
    site_id: 10,
    site_name: '主站',
    site_name_snapshot: '',
    site_base_url_snapshot: '',
    base_url: 'https://api.example.com',
    request_base_url: '',
    request_base_urls: [],
    manual_request_base_urls: [],
    group_name: '',
    supported_models: [],
    key_name: 'main',
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

function siteSummary(siteId: number): SiteSummary {
  return {
    site_id: siteId,
    last_status: 'ok',
    connection_status: 'connected',
    last_message: 'healthy',
    last_balance: 12,
    package_remaining: 12,
    package_total: 20,
    package_used: 8,
    package_unit: 'credits',
    package_display: '12 credits',
    last_run_at: '2026-05-27T00:00:00Z',
  }
}

function routeGroup(name: string, id = 1): GatewayRouteGroup {
  return {
    id,
    name,
    route_count: 1,
  }
}

test('useGatewayCatalogRefreshPageActions wires route summaries and site group refreshes', async () => {
  const events: string[] = []
  const routes = ref([route({ id: 11, site_id: 101 })])
  const siteGroups = ref<SiteGroup[]>([])
  const routeGroups = ref<GatewayRouteGroup[]>([])

  const actions = useGatewayCatalogRefreshPageActions({
    routes,
    requestSummaries: async (payload) => {
      events.push(`summaries:${payload.site_ids.join(',')}`)
      return payload.site_ids.map(siteSummary)
    },
    setRoutes: (nextRoutes) => {
      events.push(`routes:${nextRoutes.length}:${nextRoutes[0]?.package_remaining}`)
      routes.value = nextRoutes
    },
    createScheduledTask: (task) => ({
      schedule: () => {
        events.push('schedule')
        void task()
      },
    }),
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
    siteGroups,
    requestSiteGroups: async () => {
      events.push('site-groups')
      return [{ name: '生产', count: 2 }]
    },
    routeGroups,
    requestRouteGroups: async () => {
      events.push('route-groups')
      return [routeGroup('默认路由组')]
    },
  })

  await actions.refreshRouteSummaries()
  await actions.handleSiteGroupsChanged()
  actions.scheduleRouteSummaryRefresh()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))

  assert.deepEqual(siteGroups.value, [{ name: '生产', count: 2 }])
  assert.deepEqual(routeGroups.value.map((item) => item.name), ['默认路由组'])
  assert.deepEqual(events, [
    'summaries:101',
    'routes:1:12',
    'site-groups',
    'route-groups',
    'schedule',
    'summaries:101',
    'routes:1:12',
  ])
})

test('GatewayView delegates catalog refresh wiring through the refresh operations controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const pageRefreshActionsControllerSource = await readFile(pageRefreshActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRefreshActions"), "GatewayView delegates catalog refresh wiring through the page refresh actions controller should keep useGatewayPageRefreshActions in gateway page controller")
  assert.ok(pageRefreshActionsControllerSource.includes("useGatewayRefreshOperationsPageActions"), "GatewayView delegates catalog refresh wiring through the refresh operations controller should keep useGatewayRefreshOperationsPageActions in gateway page refresh actions controller")
  assert.ok(pageRefreshActionsControllerSource.includes("requestSiteGroups: gatewayPageRequests.getSiteGroups"), "GatewayView delegates catalog refresh wiring through the refresh operations controller should keep requestSiteGroups: gatewayPageRequests.getSiteGroups in gateway page refresh actions controller")
})
