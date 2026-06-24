import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { ref, reactive } from 'vue'

import { useGatewayRouteManagementPageBindings } from '../src/gatewayRouteManagementPageController.ts'
import type { GatewayIssueState } from '../src/gatewayViewConfig.ts'
import type { RouteBatchProgress } from '../src/gatewayViewModel.ts'
import type { GatewayRoute } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
const pageBindingsControllerPath = new URL('../src/gatewayPageBindingsController.ts', import.meta.url)

function route(overrides: Partial<GatewayRoute> = {}): GatewayRoute {
  return {
    id: 1,
    route_type: 'codex',
    is_enabled: true,
    ...overrides,
  } as GatewayRoute
}

test('useGatewayRouteManagementPageBindings maps route management props, models, and events', () => {
  const events: string[] = []
  const routes = ref([route({ id: 1 }), route({ id: 2, is_enabled: false })])
  const filteredRoutes = ref([routes.value[0]])
  const routeSearch = ref('codex')
  const selectedGroups = ref(['default'])
  const selectedIssueStates = ref<GatewayIssueState[]>(['healthy'])
  const includeDisabled = ref(false)
  const gatewayRequestUrl = ref('http://127.0.0.1:8972/api/gateway')
  const codexGatewayTooltip = ref('Codex tooltip')
  const maskedGatewayApiKey = ref('sk-...test')
  const settingsForm = reactive({
    gateway_api_key: 'key-test',
  })
  const loading = ref(false)
  const autoRefreshError = ref<string | null>('自动刷新失败：timeout')
  const probeLoading = ref(true)
  const balanceProbeAllLoading = ref(false)
  const probeAllProgress = ref<RouteBatchProgress | null>({
    total: 2,
    done: 1,
    success: 1,
    startedAt: '2026-05-27T00:00:00.000Z',
  })
  const balanceProbeAllProgress = ref<RouteBatchProgress | null>(null)
  const probeAllProgressPercent = ref(50)
  const balanceProbeAllProgressPercent = ref(0)
  const columns = [{ key: 'route' }]
  const groupOptions = ref([{ label: '默认', value: 'default' }])
  const selectedRouteTypes = ref<GatewayRoute['route_type'][]>(['codex'])
  const activeRouteFilterCount = ref(2)
  const pageTableY = ref(480)
  const rowKey = (targetRoute: GatewayRoute) => targetRoute.id
  const bindTableContainer = () => events.push('bind-table')
  const isRouteTypeFilterActive = (routeType: GatewayRoute['route_type']) => routeType === 'codex'
  const asRoute = (record: unknown) => record as GatewayRoute
  const loadRouteLabel = (targetRoute: GatewayRoute) => `route-${targetRoute.id}`
  const routeDetailItems = (targetRoute: GatewayRoute) => [{ label: 'ID', value: String(targetRoute.id) }]
  const routeIssueLabels = () => ['healthy']
  const supportedModelsPreview = (models: string[]) => models.join(', ')
  const normalizeRoutePath = () => '/v1/chat/completions' as NonNullable<GatewayRoute['route_path']>
  const balanceClass = () => 'balance-ok'
  const formatGroupNames = (value: string | string[] | null | undefined) => String(value ?? '')
  const routeConcurrencyLimitLabel = ref('并发上限 2')
  const primaryLatency = () => 100
  const latencyClass = () => 'latency-ok'
  const formatLatency = (latency: number | null | undefined) => `${latency ?? 0}ms`
  const routeLatencyDetails = () => ['100ms']
  const routeErrorDetails = () => ['无错误']
  const isRouteProbing = (routeId: number) => routeId === 1
  const isRouteBalanceProbing = (routeId: number) => routeId === 2

  const { routeManagementPageProps, routeManagementPageHandlers } = useGatewayRouteManagementPageBindings({
    routeSearch,
    selectedGroups,
    selectedIssueStates,
    includeDisabled,
    filteredRoutes,
    routes,
    gatewayRequestUrl,
    codexGatewayTooltip,
    maskedGatewayApiKey,
    settingsForm,
    loading,
    autoRefreshError,
    probeLoading,
    balanceProbeAllLoading,
    probeAllProgress,
    probeAllProgressPercent,
    balanceProbeAllProgress,
    balanceProbeAllProgressPercent,
    routeColumns: columns,
    pageSize: 20,
    tableY: pageTableY,
    rowKey,
    bindTableContainer,
    selectedRouteTypes,
    groupOptions,
    activeRouteFilterCount,
    isRouteTypeFilterActive,
    asRoute,
    loadRouteLabel,
    routeDetailItems,
    routeIssueLabels,
    supportedModelsPreview,
    normalizeRoutePath,
    balanceClass,
    formatGroupNames,
    routeConcurrencyLimitLabel,
    primaryLatency,
    latencyClass,
    formatLatency,
    routeLatencyDetails,
    routeErrorDetails,
    isRouteProbing,
    isRouteBalanceProbing,
    copyGatewayRequestUrl: () => events.push('copy-request-url'),
    copyGatewayApiKey: () => events.push('copy-api-key'),
    handleRefresh: () => events.push('refresh'),
    handleSync: () => events.push('sync'),
    handleProbeAll: () => events.push('probe-all'),
    handleUpdateAllBalances: () => events.push('update-all-balances'),
    handleDisableAllRoutes: () => events.push('disable-all'),
    openRouteGroupManager: () => events.push('manage-groups'),
    openAddUpstream: () => events.push('add-upstream'),
    openSettings: () => events.push('open-settings'),
    clearRouteTypeFilter: () => events.push('clear-route-types'),
    toggleRouteTypeFilter: (routeType) => events.push(`toggle-route-type:${routeType}`),
    clearRouteFilters: () => events.push('clear-filters'),
    loadData: () => events.push('include-disabled-change'),
    handleRouteTypeSelect: (targetRoute, value) => events.push(`type-change:${targetRoute.id}:${String(value)}`),
    handleRoutePathSelect: (targetRoute, value) => events.push(`path-change:${targetRoute.id}:${String(value)}`),
    handleToggle: (targetRoute) => events.push(`toggle:${targetRoute.id}`),
    handleResetCircuit: (targetRoute) => events.push(`reset-circuit:${targetRoute.id}`),
    handleProbeRoute: (targetRoute) => events.push(`probe:${targetRoute.id}`),
    handleProbeRouteBalance: (targetRoute) => events.push(`probe-balance:${targetRoute.id}`),
    openRouteModelsDialog: (targetRoute) => events.push(`configure-models:${targetRoute.id}`),
    openRouteGroupAssignment: (targetRoute) => events.push(`assign-groups:${targetRoute.id}`),
    handleEnableOnlyRoute: (targetRoute) => events.push(`enable-only:${targetRoute.id}`),
    openPriorityDialog: (targetRoute) => events.push(`priority:${targetRoute.id}`),
    openRouteDiagnosis: (targetRoute) => events.push(`diagnose:${targetRoute.id}`),
    openRouteLogs: (targetRoute) => events.push(`history:${targetRoute.id}`),
    handleDeleteRoute: (targetRoute) => events.push(`delete:${targetRoute.id}`),
  })

  assert.equal(routeManagementPageProps.value.routeSearch, routeSearch.value)
  assert.equal(routeManagementPageProps.value.selectedGroups, selectedGroups.value)
  assert.equal(routeManagementPageProps.value.selectedIssueStates, selectedIssueStates.value)
  assert.equal(routeManagementPageProps.value.includeDisabled, includeDisabled.value)
  assert.equal(routeManagementPageProps.value.filteredRouteCount, 1)
  assert.equal(routeManagementPageProps.value.routeCount, 2)
  assert.equal(routeManagementPageProps.value.requestUrl, 'http://127.0.0.1:8972/api/gateway')
  assert.equal(routeManagementPageProps.value.codexTooltip, 'Codex tooltip')
  assert.equal(routeManagementPageProps.value.maskedApiKey, 'sk-...test')
  assert.equal(routeManagementPageProps.value.hasApiKey, true)
  assert.equal(routeManagementPageProps.value.loading, false)
  assert.equal(routeManagementPageProps.value.autoRefreshError, '自动刷新失败：timeout')
  assert.equal(routeManagementPageProps.value.probeLoading, true)
  assert.equal(routeManagementPageProps.value.balanceProbeAllLoading, false)
  assert.equal(routeManagementPageProps.value.probeAllProgress, probeAllProgress.value)
  assert.equal(routeManagementPageProps.value.probeAllProgressPercent, 50)
  assert.equal(routeManagementPageProps.value.balanceProbeAllProgress, null)
  assert.equal(routeManagementPageProps.value.balanceProbeAllProgressPercent, 0)
  assert.equal(routeManagementPageProps.value.columns, columns)
  assert.equal(routeManagementPageProps.value.routes, filteredRoutes.value)
  assert.equal(routeManagementPageProps.value.pageSize, 20)
  assert.equal(routeManagementPageProps.value.tableY, 480)
  assert.equal(routeManagementPageProps.value.rowKey, rowKey)
  assert.equal(routeManagementPageProps.value.bindTableContainer, bindTableContainer)
  assert.equal(routeManagementPageProps.value.selectedRouteTypes, selectedRouteTypes.value)
  assert.equal(routeManagementPageProps.value.groupOptions, groupOptions.value)
  assert.equal(routeManagementPageProps.value.activeRouteFilterCount, 2)
  assert.equal(routeManagementPageProps.value.isRouteTypeFilterActive, isRouteTypeFilterActive)
  assert.equal(routeManagementPageProps.value.asRoute, asRoute)
  assert.equal(routeManagementPageProps.value.loadRouteLabel, loadRouteLabel)
  assert.equal(routeManagementPageProps.value.routeDetailItems, routeDetailItems)
  assert.equal(routeManagementPageProps.value.routeIssueLabels, routeIssueLabels)
  assert.equal(routeManagementPageProps.value.supportedModelsPreview, supportedModelsPreview)
  assert.equal(routeManagementPageProps.value.normalizeRoutePath, normalizeRoutePath)
  assert.equal(routeManagementPageProps.value.balanceClass, balanceClass)
  assert.equal(routeManagementPageProps.value.formatGroupNames, formatGroupNames)
  assert.equal(routeManagementPageProps.value.routeConcurrencyLimitLabel, '并发上限 2')
  assert.equal(routeManagementPageProps.value.primaryLatency, primaryLatency)
  assert.equal(routeManagementPageProps.value.latencyClass, latencyClass)
  assert.equal(routeManagementPageProps.value.formatLatency, formatLatency)
  assert.equal(routeManagementPageProps.value.routeLatencyDetails, routeLatencyDetails)
  assert.equal(routeManagementPageProps.value.routeErrorDetails, routeErrorDetails)
  assert.equal(routeManagementPageProps.value.isRouteProbing, isRouteProbing)
  assert.equal(routeManagementPageProps.value.isRouteBalanceProbing, isRouteBalanceProbing)

  routes.value = [route({ id: 3 })]
  filteredRoutes.value = routes.value
  routeSearch.value = 'openai'
  selectedGroups.value = ['vip']
  selectedIssueStates.value = ['warning']
  includeDisabled.value = true
  settingsForm.gateway_api_key = ''
  pageTableY.value = 520
  autoRefreshError.value = null

  assert.equal(routeManagementPageProps.value.routeSearch, 'openai')
  assert.deepEqual(routeManagementPageProps.value.selectedGroups, ['vip'])
  assert.deepEqual(routeManagementPageProps.value.selectedIssueStates, ['warning'])
  assert.equal(routeManagementPageProps.value.includeDisabled, true)
  assert.equal(routeManagementPageProps.value.filteredRouteCount, 1)
  assert.equal(routeManagementPageProps.value.routeCount, 1)
  assert.equal(routeManagementPageProps.value.hasApiKey, false)
  assert.equal(routeManagementPageProps.value.tableY, 520)
  assert.equal(routeManagementPageProps.value.autoRefreshError, null)

  routeManagementPageHandlers['update:routeSearch']('claude')
  routeManagementPageHandlers['update:selectedGroups'](['ops'])
  routeManagementPageHandlers['update:selectedIssueStates'](['error'])
  routeManagementPageHandlers['update:includeDisabled'](false)
  routeManagementPageHandlers['copy-request-url']()
  routeManagementPageHandlers['copy-api-key']()
  routeManagementPageHandlers.refresh()
  routeManagementPageHandlers.sync()
  routeManagementPageHandlers['probe-all']()
  routeManagementPageHandlers['update-all-balances']()
  routeManagementPageHandlers['disable-all']()
  routeManagementPageHandlers['manage-groups']()
  routeManagementPageHandlers['add-upstream']()
  routeManagementPageHandlers['open-settings']()
  routeManagementPageHandlers['clear-route-types']()
  routeManagementPageHandlers['toggle-route-type']('openai')
  routeManagementPageHandlers['clear-filters']()
  routeManagementPageHandlers['include-disabled-change']()
  routeManagementPageHandlers['type-change'](route({ id: 11 }), 'gemini')
  routeManagementPageHandlers['path-change'](route({ id: 12 }), '/v1/responses')
  routeManagementPageHandlers.toggle(route({ id: 13 }))
  routeManagementPageHandlers['reset-circuit'](route({ id: 14 }))
  routeManagementPageHandlers.probe(route({ id: 15 }))
  routeManagementPageHandlers['probe-balance'](route({ id: 16 }))
  routeManagementPageHandlers['configure-models'](route({ id: 17 }))
  routeManagementPageHandlers['assign-groups'](route({ id: 22 }))
  routeManagementPageHandlers['enable-only'](route({ id: 18 }))
  routeManagementPageHandlers.priority(route({ id: 19 }))
  routeManagementPageHandlers.diagnose(route({ id: 20 }))
  routeManagementPageHandlers.history(route({ id: 21 }))
  routeManagementPageHandlers.delete(route({ id: 23 }))

  assert.equal(routeSearch.value, 'claude')
  assert.deepEqual(selectedGroups.value, ['ops'])
  assert.deepEqual(selectedIssueStates.value, ['error'])
  assert.equal(includeDisabled.value, false)
  assert.deepEqual(events, [
    'copy-request-url',
    'copy-api-key',
    'refresh',
    'sync',
    'probe-all',
    'update-all-balances',
    'disable-all',
    'manage-groups',
    'add-upstream',
    'open-settings',
    'clear-route-types',
    'toggle-route-type:openai',
    'clear-filters',
    'include-disabled-change',
    'type-change:11:gemini',
    'path-change:12:/v1/responses',
    'toggle:13',
    'reset-circuit:14',
    'probe:15',
    'probe-balance:16',
    'configure-models:17',
    'assign-groups:22',
    'enable-only:18',
    'priority:19',
    'diagnose:20',
    'history:21',
    'delete:23',
  ])
})

test('GatewayView delegates route management page bindings through the page controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(shellBindingsControllerSource.includes("useGatewayPageBindings"), "GatewayView delegates route management page bindings through the page controller should keep useGatewayPageBindings in gateway page controller")
  assert.ok(pageControllerSource.includes("routeManagementPageHandlers"), "GatewayView delegates route management page bindings through the page controller should keep routeManagementPageHandlers in gateway page controller")
})
