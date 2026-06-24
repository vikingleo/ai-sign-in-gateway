import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { reactive, ref } from 'vue'

import { useGatewayPageBindings } from '../src/gatewayPageBindingsController.ts'
import type { GatewayErrorDetail } from '../src/gatewayActivityDisplayModel.ts'
import type { AddUpstreamForm } from '../src/gatewayAddUpstreamModel.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
const pageBindingsControllerPath = new URL('../src/gatewayPageBindingsController.ts', import.meta.url)

test('useGatewayPageBindings composes monitor, route management, and overlay bindings', () => {
  const events: string[] = []
  const route = { id: 11, route_type: 'codex', route_path: '', group_name: 'prod' }
  const log = { id: 21, request_id: 'req-21', method: 'POST', created_at: '2026-05-27T00:00:00Z' }
  const usageRange = reactive({ start: '2026-05-27T00:00', end: '2026-05-27T01:00' })
  const settingsForm = reactive({ gateway_api_key: 'key-test' })
  const priorityDialog = { id: 'priority-dialog' }
  const balanceManualDialog = { id: 'balance-manual-dialog' }
  const settingsDialog = { id: 'settings-dialog' }
  const addUpstreamDialog = { id: 'add-upstream-dialog' }
  const routeGroupManagerDialog = { id: 'route-group-manager-dialog' }
  const routeGroupAssignmentDialog = { id: 'route-group-assignment-dialog' }
  const routeModelsDialog = { id: 'route-models-dialog' }
  const logsDrawer = { id: 'logs-drawer' }
  const errorDetailDrawer = { id: 'error-detail-drawer' }
  const routeLogsDrawer = { id: 'route-logs-drawer' }
  const routeDiagnosisDrawer = { id: 'route-diagnosis-drawer' }
  const errorDetail: GatewayErrorDetail = {
    title: '请求失败',
    sourceLabel: '路由',
    statusLabel: '失败',
    success: false,
    lines: [],
    fields: [],
    fullText: 'upstream error',
  }

  const bindings = useGatewayPageBindings({
    gatewayRequestUrl: ref('http://127.0.0.1:8972/api/gateway'),
    codexGatewayTooltip: ref('Codex tooltip'),
    maskedGatewayApiKey: ref('sk-...test'),
    settingsForm,
    loading: ref(false),
    autoRefreshError: ref('自动刷新失败：network failed'),
    metricCards: ref([{ title: '请求', value: '10' }]),
    usageRange,
    usageSummaryCards: ref([{ title: '消耗', value: '$1' }]),
    usageColumns: [{ key: 'usage-route' }],
    gatewayUsage: ref({ request_count: 10 }),
    usageLoading: ref(false),
    usageRowKey: (record) => String(record.id),
    usageRouteLabel: () => 'usage-route',
    usageRouteMeta: () => 'usage-meta',
    formatNumber: (value) => String(value ?? 'none'),
    formatUSD: (value) => `$${value ?? 0}`,
    formatTime: (value) => value ?? '暂无',
    routeActivityFeed: ref([{ id: 'activity-1' }]),
    activeRequests: ref([{ id: 'active-1' }]),
    routePoolStatusCards: ref([{ key: 'healthy' }]),
    routePoolPreviewRoutes: ref([route]),
    routeConcurrencyLimitLabel: ref('并发上限 5'),
    gatewayStrategyCards: ref([{ key: 'round-robin' }]),
    copyGatewayRequestUrl: () => events.push('copy-request-url'),
    copyGatewayApiKey: () => events.push('copy-api-key'),
    handleRefresh: () => events.push('refresh'),
    openSettings: () => events.push('open-settings'),
    openLogs: () => events.push('open-logs'),
    handleUsageToday: () => events.push('usage-today'),
    handleUsageQuery: () => events.push('usage-query'),
    copyGatewayActivityUrl: (value) => events.push(`copy-activity-url:${value}`),
    routeSearch: ref('route'),
    selectedGroups: ref(['prod']),
    selectedIssueStates: ref(['with_error']),
    includeDisabled: ref(false),
    filteredRoutes: ref([route]),
    routes: ref([route]),
    probeLoading: ref(false),
    balanceProbeAllLoading: ref(false),
    probeAllProgress: ref(null),
    probeAllProgressPercent: ref(0),
    balanceProbeAllProgress: ref(null),
    balanceProbeAllProgressPercent: ref(0),
    routeColumns: [{ key: 'route' }],
    pageSize: 20,
    tableY: ref(320),
    rowKey: (record) => record.id,
    bindTableContainer: () => events.push('bind-table'),
    selectedRouteTypes: ref(['codex']),
    groupOptions: ref([{ label: 'prod', value: 'prod' }]),
    activeRouteFilterCount: ref(1),
    isRouteTypeFilterActive: () => true,
    asRoute: (record) => record,
    loadRouteLabel: () => 'route-label',
    routeDetailItems: () => [{ label: '站点', value: '主站' }],
    routeIssueLabels: () => ['有异常'],
    supportedModelsPreview: (models) => models.join(', '),
    normalizeRoutePath: () => '',
    balanceClass: () => 'ok',
    formatGroupNames: (value) => String(value ?? ''),
    primaryLatency: () => 120,
    latencyClass: () => 'ok',
    formatLatency: () => '120ms',
    routeLatencyDetails: () => ['平均 120ms'],
    routeErrorDetails: () => ['无'],
    isRouteProbing: () => false,
    isRouteBalanceProbing: () => false,
    handleSync: () => events.push('sync'),
    handleProbeAll: () => events.push('probe-all'),
    handleUpdateAllBalances: () => events.push('update-all-balances'),
    handleDisableAllRoutes: () => events.push('disable-all'),
    openRouteGroupManager: () => events.push('manage-groups'),
    openAddUpstream: () => events.push('add-upstream'),
    clearRouteTypeFilter: () => events.push('clear-route-types'),
    toggleRouteTypeFilter: (routeType) => events.push(`toggle-route-type:${routeType}`),
    clearRouteFilters: () => events.push('clear-filters'),
    loadData: () => events.push('load-data'),
    handleRouteTypeSelect: () => events.push('type-change'),
    handleRoutePathSelect: () => events.push('path-change'),
    handleToggle: () => events.push('toggle'),
    handleResetCircuit: () => events.push('reset-circuit'),
    handleProbeRoute: () => events.push('probe'),
    handleProbeRouteBalance: () => events.push('probe-balance'),
    openRouteModelsDialog: () => events.push('configure-models'),
    openRouteGroupAssignment: () => events.push('assign-groups'),
    handleEnableOnlyRoute: () => events.push('enable-only'),
    openPriorityDialog: () => events.push('priority'),
    openRouteDiagnosis: () => events.push('diagnose'),
    openRouteLogs: () => events.push('history'),
    handleDeleteRoute: () => events.push('delete'),
    priorityDialog,
    balanceManualDialog,
    settingsDialog,
    addUpstreamDialog,
    routeGroupManagerDialog,
    routeGroupAssignmentDialog,
    routeGroups: ref([{ id: 101, name: '默认路由组', route_count: 1 }]),
    routeModelsDialog,
    logsDrawer,
    errorDetailDrawer,
    routeLogsDrawer,
    routeDiagnosisDrawer,
    priorityColumns: [{ key: 'priority' }],
    routeRowKey: (record) => record.id,
    routePriorityLabel: () => 'P1',
    siteGroupOptions: ref([{ label: '默认', value: 'default' }]),
    logColumns: [{ key: 'log' }],
    logs: ref([log]),
    routeLogs: ref([log]),
    drawerTableY: ref(240),
    logRowKey: (record) => record.id,
    requestMethodColor: () => 'blue',
    logMethodLabel: () => 'POST',
    logRequestLabel: () => 'POST /v1/responses',
    logRequestURL: () => '/v1/responses',
    logRouteLabel: () => 'route-label',
    logRouteMeta: () => 'route-meta',
    logTransferLines: () => [],
    gatewayLogHasErrorDetail: () => false,
    logModelMeta: () => 'gpt-4o',
    logUserAgent: () => 'codex',
    buildLogErrorDetail: () => errorDetail,
    handlePriorityMove: () => events.push('priority-move'),
    handlePriorityPreset: (mode) => events.push(`priority-preset:${mode}`),
    submitManualRouteBalanceProbe: () => events.push('balance-submit'),
    refreshRouteGroups: () => events.push('route-groups-refresh'),
    createRouteGroup: () => events.push('route-group-create'),
    updateRouteGroup: () => events.push('route-group-update'),
    deleteRouteGroup: () => events.push('route-group-delete'),
    saveRouteGroupAssignment: () => events.push('route-group-assignment-save'),
    saveSettings: (settings) => events.push(`settings-save:${settings.gateway_api_key}`),
    submitAddUpstream: (form, groupNames) => events.push(`add-upstream-submit:${form.name}:${groupNames.join(',')}`),
    resetAddUpstreamForm: () => events.push('add-upstream-reset'),
    saveRouteModelsDialog: () => events.push('route-models-save'),
    openGatewayErrorDetail: () => events.push('open-error-detail'),
    copyGatewayErrorDetail: () => events.push('copy-error-detail'),
  })

  assert.equal(bindings.monitorPageProps.value.requestUrl, 'http://127.0.0.1:8972/api/gateway')
  assert.equal(bindings.monitorPageProps.value.autoRefreshError, '自动刷新失败：network failed')
  assert.equal(bindings.routeManagementPageProps.value.routeCount, 1)
  assert.equal(bindings.routeManagementPageProps.value.autoRefreshError, '自动刷新失败：network failed')
  assert.equal(bindings.routeManagementPageProps.value.tableY, 320)
  assert.equal(bindings.overlayPageProps.value.priorityDialog, priorityDialog)
  assert.equal(bindings.overlayPageProps.value.routeGroupManagerDialog, routeGroupManagerDialog)
  assert.equal(bindings.overlayPageProps.value.routeGroupAssignmentDialog, routeGroupAssignmentDialog)
  assert.equal(bindings.overlayPageProps.value.drawerTableY, 240)

  bindings.monitorPageHandlers.refresh()
  bindings.routeManagementPageHandlers.sync()
  bindings.overlayPageHandlers['settings-save']({ gateway_api_key: 'key-from-dialog' })
  bindings.overlayPageHandlers['add-upstream-submit']({ name: '上游 C' } as AddUpstreamForm, ['默认'])

  assert.deepEqual(events, ['refresh', 'sync', 'settings-save:key-from-dialog', 'add-upstream-submit:上游 C:默认'])
})

test('GatewayView delegates page bindings through the aggregate page bindings controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(pageControllerSource.includes("useGatewayPageShellBindings"), "GatewayView delegates page bindings through the shell bindings controller should keep useGatewayPageShellBindings in gateway page controller")
  assert.ok(pageControllerSource.includes("routeManagementPageProps"), "GatewayView delegates page bindings through the aggregate page bindings controller should keep routeManagementPageProps in gateway page controller")
  assert.ok(pageControllerSource.includes("overlayPageHandlers"), "GatewayView delegates page bindings through the aggregate page bindings controller should keep overlayPageHandlers in gateway page controller")
  assert.ok(shellBindingsControllerSource.includes("useGatewayPageBindings"), "GatewayView delegates page bindings through the aggregate page bindings controller should keep useGatewayPageBindings in shell bindings controller")
})
