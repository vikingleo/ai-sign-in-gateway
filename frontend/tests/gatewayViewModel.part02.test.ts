import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildGatewayRouteFilters,
  buildRouteActivityFeed,
  buildGatewayMetricCards,
  buildGatewayStrategyCards,
  buildRoutePoolPreviewRoutes,
  buildUsageSummaryCards,
  filterGatewayLogs,
  filterGatewayRoutes,
  progressPercent,
  routeTotalBalanceSummary,
} from '../src/gatewayViewModel.ts'
import {
  buildGatewayUsageTodayRange,
  datetimeLocalToISOString,
  toDatetimeLocalValue,
} from '../src/gatewayUsageRangeModel.ts'
import type { GatewayIssueState } from '../src/gatewayViewConfig.ts'
import type { GatewayActiveRequest, GatewayLog, GatewayOverview, GatewayRoute, GatewayUsage } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageFoundationControllerPath = new URL('../src/gatewayPageFoundationController.ts', import.meta.url)
const gatewayPageRuntimeActionsControllerPath = new URL(
  '../src/gatewayPageRuntimeActionsController.ts',
  import.meta.url,
)
const gatewayPageRouteActionsControllerPath = new URL('../src/gatewayPageRouteActionsController.ts', import.meta.url)
const adminOperationsPageControllerPath = new URL('../src/gatewayAdminOperationsPageController.ts', import.meta.url)
const routeActionPageControllerPath = new URL('../src/gatewayRouteActionPageController.ts', import.meta.url)
const upstreamPageControllerPath = new URL('../src/gatewayUpstreamPageController.ts', import.meta.url)
const settingsPageControllerPath = new URL('../src/gatewaySettingsPageController.ts', import.meta.url)
const initialDataPageControllerPath = new URL('../src/gatewayInitialDataPageController.ts', import.meta.url)
const dataOperationsPageControllerPath = new URL(
  '../src/gatewayDataOperationsPageController.ts',
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

test('filters gateway routes and logs with the existing search semantics', () => {
  const routes = [
    route({ id: 1, site_name: '主站', group_name: '生产,华东', route_type: 'codex', last_error: '' }),
    route({ id: 2, site_name: '备用', group_name: '测试', route_type: 'gemini', last_error: 'timeout' }),
  ]
  const logs = [
    { id: 1, site_name: '主站', model: 'gpt-4o', request_url: '/v1/responses', method: 'POST' },
    { id: 2, site_name: '备用', model: 'gemini-pro', request_url: '/v1/chat/completions', method: 'GET' },
  ] as GatewayLog[]

  assert.deepEqual(filterGatewayRoutes(routes, { keyword: '华东', selectedGroups: ['生产'], selectedRouteTypes: [], selectedIssueStates: [] }).map((item) => item.id), [1])
  assert.deepEqual(filterGatewayRoutes(routes, { keyword: '', selectedGroups: [], selectedRouteTypes: ['gemini'], selectedIssueStates: ['with_error'] }).map((item) => item.id), [2])
  assert.deepEqual(filterGatewayLogs(logs, 'responses').map((item) => item.id), [1])
})

test('builds route list filter parameters from route filter state without reusing arrays', () => {
  const selectedGroups = ['生产']
  const selectedRouteTypes: Array<GatewayRoute['route_type']> = ['codex']
  const selectedIssueStates: GatewayIssueState[] = ['with_error']

  const filters = buildGatewayRouteFilters({
    routeSearch: ' 主站 ',
    selectedGroups,
    selectedRouteTypes,
    selectedIssueStates,
  })

  assert.deepEqual(filters, {
    keyword: ' 主站 ',
    selectedGroups,
    selectedRouteTypes,
    selectedIssueStates,
  })
  assert.notEqual(filters.selectedGroups, selectedGroups)
  assert.notEqual(filters.selectedRouteTypes, selectedRouteTypes)
  assert.notEqual(filters.selectedIssueStates, selectedIssueStates)
})

test('formats gateway usage time ranges and progress values', () => {
  const date = new Date(2026, 4, 24, 9, 5)
  const todayRange = buildGatewayUsageTodayRange(date)
  const usage = {
    computed_total_cost: 0.25,
    computed_cost_mixed: false,
    request_count: 12,
    success_count: 10,
    total_tokens: 3456,
  } as GatewayUsage

  assert.equal(toDatetimeLocalValue(date), '2026-05-24T09:05')
  assert.deepEqual(todayRange, {
    start: '2026-05-24T00:00',
    end: '2026-05-24T09:05',
  })
  assert.equal(datetimeLocalToISOString('not-a-date'), '')
  assert.match(datetimeLocalToISOString('2026-05-24T09:05'), /^2026-05-24T/)
  assert.deepEqual(buildUsageSummaryCards(usage).map((item) => item.value), ['$0.25', '12', '10', '3,456'])
  assert.equal(progressPercent({ total: 4, done: 3, success: 2, failed: 1 }), 75)
  assert.equal(progressPercent(null), 0)
})
