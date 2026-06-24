import test from 'node:test'
import assert from 'node:assert/strict'
import { computed, ref } from 'vue'
import { readFile } from 'node:fs/promises'

import { useGatewayDerivedState } from '../src/gatewayDerivedStateController.ts'
import {
  createLogColumns,
  createRouteColumns,
  createUsageColumns,
} from '../src/gatewayViewConfig.ts'
import {
  buildGatewayGroupOptions,
  buildGatewayMetricCards,
  buildGatewayRouteFilters,
  buildGatewayStrategyCards,
  buildSiteGroupOptions,
  buildRouteActivityFeed,
  buildRoutePoolPreviewRoutes,
  buildRoutePoolStatusCards,
  buildUsageSummaryCards,
  filterGatewayLogs,
  filterGatewayRoutes,
  routeTotalBalanceSummary,
} from '../src/gatewayViewModel.ts'
import type { GatewayActiveRequest, GatewayLog, GatewayOverview, GatewayRoute, GatewayRouteGroup, GatewayUsage, SiteGroup } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageViewStateControllerPath = new URL('../src/gatewayPageViewStateController.ts', import.meta.url)
const gatewayDisplayPageControllerPath = new URL('../src/gatewayDisplayPageController.ts', import.meta.url)

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
    key_name: 'Key',
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

function gatewayLog(overrides: Partial<GatewayLog>): GatewayLog {
  return {
    id: 1,
    created_at: '2026-05-27T00:00:00Z',
    route_id: 1,
    site_id: 10,
    site_name: '主站',
    route_label: '主站 / Key',
    key_name: 'Key',
    key_fingerprint: '',
    method: 'POST',
    request_url: '/v1/responses',
    target_path: '/v1/responses',
    model: 'gpt-4.1',
    requested_model: 'gpt-4.1',
    actual_model: 'gpt-4.1',
    user_agent: 'codex',
    status_code: 200,
    success: true,
    failure_reason: '',
    latency_ms: 120,
    is_stream: false,
    attempt_index: 1,
    ...overrides,
  } as GatewayLog
}

test('useGatewayDerivedState computes gateway page display state from injected refs', () => {
  const overview = ref<GatewayOverview | null>({
    total_routes: 1,
    enabled_routes: 1,
    healthy_routes: 1,
    open_circuits: 0,
    total_requests_24h: 4,
    success_rate_24h: 0.75,
    avg_latency_ms_24h: 88,
    active_concurrency: 1,
    route_concurrency_limit: 2,
    strategy_breakdown_24h: [{
      route_strategy: 'priority',
      request_count: 3,
      success_rate: 100,
      avg_latency_ms: 88,
      stream_request_count: 1,
      stream_success_rate: 100,
      avg_stream_ttfb_ms: 30,
    }],
  } as GatewayOverview)
  const routes = ref([
    route({ id: 1, site_name: '主站', group_name: '生产', route_type: 'codex' }),
    route({ id: 2, site_name: '测试站', group_name: '测试', route_type: 'claude', is_enabled: false }),
  ])
  const logs = ref([
    gatewayLog({ id: 1, route_label: '主站 / Key', model: 'gpt-4.1' }),
    gatewayLog({
      id: 2,
      route_label: '测试站 / Key',
      model: 'claude-sonnet',
      requested_model: 'claude-sonnet',
      actual_model: 'claude-sonnet',
    }),
  ])
  const routeLogs = ref([
    gatewayLog({ id: 3, route_label: '主站 / Key', model: 'gpt-4.1-mini' }),
  ])
  const activeRequests = ref<GatewayActiveRequest[]>([{
    request_id: 'req-1',
    route_id: 1,
    site_name: '主站',
    key_name: 'Key',
    method: 'POST',
    request_url: '/v1/responses',
    target_path: '/v1/responses',
    model: 'gpt-4.1',
    started_at: '2026-05-27T00:00:00Z',
    duration_ms: 100,
    is_stream: false,
  } as GatewayActiveRequest])
  const gatewayUsage = ref<GatewayUsage | null>({
    request_count: 1,
    success_count: 1,
    failure_count: 0,
    total_tokens: 100,
    computed_total_cost: 0.1,
    computed_cost_mixed: false,
    routes: [],
  } as GatewayUsage)
  const siteGroups = ref<SiteGroup[]>([{ name: '生产', site_count: 1 } as SiteGroup])
  const routeGroups = ref<GatewayRouteGroup[]>([
    { id: 1, name: '生产', route_count: 1 },
    { id: 2, name: '专线', route_count: 0 },
  ])
  const selectedGroups = ref(['生产'])
  const addUpstreamGroupNames = ref(['新增组'])
  const routeFilterState = computed(() => buildGatewayRouteFilters({
    routeSearch: '主站',
    selectedGroups: selectedGroups.value,
    selectedRouteTypes: [],
    selectedIssueStates: [],
  }))
  const logSearch = ref('gpt-4.1')
  const routeLogSearch = ref('mini')

  const derived = useGatewayDerivedState({
    overview,
    routes,
    logs,
    routeLogs,
    activeRequests,
    gatewayUsage,
    siteGroups,
    routeGroups,
    selectedGroups,
    addUpstreamGroupNames,
    routeFilterState,
    logSearch,
    routeLogSearch,
    settingsForm: { route_concurrency_limit: 2, gateway_api_key: 'secret' },
    buildRouteTotalBalanceSummary: routeTotalBalanceSummary,
    buildMetricCards: buildGatewayMetricCards,
    buildRoutePoolStatusCards,
    buildRoutePoolPreviewRoutes,
    buildGatewayStrategyCards,
    buildUsageSummaryCards,
    buildGroupOptions: buildGatewayGroupOptions,
    buildSiteGroupOptions,
    buildActivityFeed: buildRouteActivityFeed,
    filterRoutes: filterGatewayRoutes,
    filterLogs: filterGatewayLogs,
    createRouteColumns: () => createRouteColumns({
      loadRouteLabel: (item) => item.site_name,
      routePathLabel: (item) => item.route_path || '自动',
      routeLastUpdateTime: () => '刚刚',
    }),
    createUsageColumns: () => createUsageColumns({
      usageRouteLabel: (item) => item.route_label || item.site_name || '-',
    }),
    createLogColumns: () => createLogColumns({
      logRequestLabel: (item) => item.request_url,
      logRouteLabel: (item) => item.route_label,
      logModelMeta: (item) => ({ label: item.model, tone: 'default' }),
      logUserAgent: (item) => item.user_agent,
    }),
  })

  assert.equal(derived.routeTotalBalanceSummary.value, '暂无')
  assert.equal(derived.metricCards.value.length > 0, true)
  assert.equal(derived.routePoolStatusCards.value.length > 0, true)
  assert.equal(derived.routePoolPreviewRoutes.value[0]?.id, 1)
  assert.equal(derived.gatewayStrategyCards.value.length > 0, true)
  assert.equal(derived.usageSummaryCards.value.length > 0, true)
  assert.equal(derived.groupOptions.value.some((option) => option.value === '专线'), true)
  assert.equal(derived.groupOptions.value.some((option) => option.value === '新增组'), false)
  assert.equal(derived.siteGroupOptions.value.some((option) => option.value === '新增组'), true)
  assert.equal(derived.routeActivityFeed.value[0]?.kind, 'active')
  assert.deepEqual(derived.filteredRoutes.value.map((item) => item.id), [1])
  assert.deepEqual(derived.filteredLogs.value.map((item) => item.id), [1])
  assert.deepEqual(derived.filteredRouteLogs.value.map((item) => item.id), [3])
  assert.equal(derived.routeConcurrencyLimitLabel.value, '2')
  assert.equal(Array.isArray(derived.routeColumns), true)
  assert.equal(Array.isArray(derived.usageColumns), true)
  assert.equal(Array.isArray(derived.logColumns), true)
})

test('gateway display page controller owns page display state wiring', async () => {
  const source = await readFile(gatewayDisplayPageControllerPath, 'utf8')

  assert.match(source, /import \{ useGatewayDerivedState \} from '\.\/gatewayDerivedStateController\.ts'/)
  assert.match(source, /from '\.\/gatewayViewModel\.ts'/)
  assert.match(source, /from '\.\/gatewayViewConfig\.ts'/)
  assert.match(source, /export function useGatewayDisplayPageState\(/)
  assert.match(source, /computed\(\(\) => buildGatewayRouteFilters\(routeFilterState\.value\)\)/)
  assert.match(source, /createRouteColumns\(\{[\s\S]*routeLastUpdateTime/)
  assert.match(source, /createUsageColumns\(\{[\s\S]*usageRouteLabel/)
  assert.match(source, /createLogColumns\(\{[\s\S]*logRequestLabel/)
  assert.match(source, /priorityDialogColumns/)
  assert.match(source, /formatGatewayTime/)
})

test('GatewayView delegates display state wiring to the display page controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const viewStateControllerSource = await readFile(gatewayPageViewStateControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(pageControllerSource.includes("useGatewayPageViewState"), "GatewayView delegates display state wiring through the page view state controller should keep useGatewayPageViewState in gateway page controller")
  assert.ok(viewStateControllerSource.includes("useGatewayDisplayPageState"), "GatewayView delegates display state wiring to the page view state controller should keep useGatewayDisplayPageState in gateway page view state controller")
  assert.ok(viewStateControllerSource.includes("routeFilterState: state.routeFilters.state"), "GatewayView delegates display state wiring to the display page controller should keep routeFilterState: state.routeFilters.state in gateway page view state controller")
})
