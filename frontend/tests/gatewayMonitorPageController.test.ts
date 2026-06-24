import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { reactive, ref } from 'vue'

import { useGatewayMonitorPageBindings } from '../src/gatewayMonitorPageController.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
const pageBindingsControllerPath = new URL('../src/gatewayPageBindingsController.ts', import.meta.url)

test('useGatewayMonitorPageBindings maps monitor props and events from page state', () => {
  const events: string[] = []
  const usageRange = reactive({
    start: '2026-05-27T00:00',
    end: '2026-05-27T01:00',
  })
  const settingsForm = reactive({
    gateway_api_key: 'key-test',
  })
  const gatewayRequestUrl = ref('http://127.0.0.1:8972/api/gateway')
  const codexGatewayTooltip = ref('Codex tooltip')
  const maskedGatewayApiKey = ref('sk-...test')
  const loading = ref(true)
  const autoRefreshError = ref<string | null>('自动刷新失败：network failed')
  const metricCards = ref([{ title: '总额度', value: '$1', tone: 'primary' }])
  const usageSummaryCards = ref([{ title: '请求', value: '1', tone: 'info' }])
  const gatewayUsage = ref({ request_count: 1 })
  const usageLoading = ref(false)
  const routeActivityFeed = ref([{ id: 'activity-1' }])
  const activeRequests = ref([{ id: 'active-1' }, { id: 'active-2' }])
  const routePoolStatusCards = ref([{ key: 'healthy' }])
  const routePoolPreviewRoutes = ref([{ id: 1 }])
  const routeConcurrencyLimitLabel = ref('并发上限 2')
  const gatewayStrategyCards = ref([{ key: 'priority' }])
  const usageColumns = [{ key: 'route' }]
  const usageRowKey = (record: { id: string }) => record.id
  const usageRouteLabel = (record: { label: string }) => record.label
  const usageRouteMeta = (record: { meta: string }) => record.meta
  const formatNumber = (value: number | null | undefined) => String(value ?? 'none')
  const formatUSD = (value: number | null | undefined) => `$${value ?? 0}`
  const formatTime = (value: string | null) => value ?? '暂无'

  const { monitorPageProps, monitorPageHandlers } = useGatewayMonitorPageBindings({
    gatewayRequestUrl,
    codexGatewayTooltip,
    maskedGatewayApiKey,
    settingsForm,
    loading,
    autoRefreshError,
    metricCards,
    usageRange,
    usageSummaryCards,
    usageColumns,
    gatewayUsage,
    usageLoading,
    usageRowKey,
    usageRouteLabel,
    usageRouteMeta,
    formatNumber,
    formatUSD,
    formatTime,
    routeActivityFeed,
    activeRequests,
    routePoolStatusCards,
    routePoolPreviewRoutes,
    routeConcurrencyLimitLabel,
    gatewayStrategyCards,
    copyGatewayRequestUrl: () => events.push('copy-request-url'),
    copyGatewayApiKey: () => events.push('copy-api-key'),
    handleRefresh: () => events.push('refresh'),
    openSettings: () => events.push('open-settings'),
    openLogs: () => events.push('open-logs'),
    handleUsageToday: () => events.push('today'),
    handleUsageQuery: () => events.push('query'),
    copyGatewayActivityUrl: (value) => events.push(`copy-activity-url:${value}`),
  })

  assert.equal(monitorPageProps.value.requestUrl, 'http://127.0.0.1:8972/api/gateway')
  assert.equal(monitorPageProps.value.codexTooltip, 'Codex tooltip')
  assert.equal(monitorPageProps.value.maskedApiKey, 'sk-...test')
  assert.equal(monitorPageProps.value.hasApiKey, true)
  assert.equal(monitorPageProps.value.loading, true)
  assert.equal(monitorPageProps.value.autoRefreshError, '自动刷新失败：network failed')
  assert.deepEqual(monitorPageProps.value.metricCards, metricCards.value)
  assert.equal(monitorPageProps.value.usageRange, usageRange)
  assert.deepEqual(monitorPageProps.value.usageSummaryCards, usageSummaryCards.value)
  assert.equal(monitorPageProps.value.usageColumns, usageColumns)
  assert.equal(monitorPageProps.value.usage, gatewayUsage.value)
  assert.equal(monitorPageProps.value.usageLoading, false)
  assert.equal(monitorPageProps.value.usageRowKey, usageRowKey)
  assert.equal(monitorPageProps.value.usageRouteLabel, usageRouteLabel)
  assert.equal(monitorPageProps.value.usageRouteMeta, usageRouteMeta)
  assert.equal(monitorPageProps.value.formatNumber, formatNumber)
  assert.equal(monitorPageProps.value.formatUSD, formatUSD)
  assert.equal(monitorPageProps.value.formatTime, formatTime)
  assert.deepEqual(monitorPageProps.value.routeActivityFeed, routeActivityFeed.value)
  assert.equal(monitorPageProps.value.activeRequestCount, 2)
  assert.deepEqual(monitorPageProps.value.routePoolStatusCards, routePoolStatusCards.value)
  assert.deepEqual(monitorPageProps.value.routePoolPreviewRoutes, routePoolPreviewRoutes.value)
  assert.equal(monitorPageProps.value.routeConcurrencyLimitLabel, '并发上限 2')
  assert.deepEqual(monitorPageProps.value.gatewayStrategyCards, gatewayStrategyCards.value)

  gatewayRequestUrl.value = 'http://127.0.0.1:8972/api/gateway-next'
  settingsForm.gateway_api_key = ''
  activeRequests.value = [{ id: 'active-1' }]
  loading.value = false
  autoRefreshError.value = null

  assert.equal(monitorPageProps.value.requestUrl, 'http://127.0.0.1:8972/api/gateway-next')
  assert.equal(monitorPageProps.value.hasApiKey, false)
  assert.equal(monitorPageProps.value.activeRequestCount, 1)
  assert.equal(monitorPageProps.value.loading, false)
  assert.equal(monitorPageProps.value.autoRefreshError, null)

  monitorPageHandlers['copy-request-url']()
  monitorPageHandlers['copy-api-key']()
  monitorPageHandlers.refresh()
  monitorPageHandlers['open-settings']()
  monitorPageHandlers['open-logs']()
  monitorPageHandlers['update:start']('2026-05-27T02:00')
  monitorPageHandlers['update:end']('2026-05-27T03:00')
  monitorPageHandlers.today()
  monitorPageHandlers.query()
  monitorPageHandlers['copy-activity-url']('/v1/responses')

  assert.equal(usageRange.start, '2026-05-27T02:00')
  assert.equal(usageRange.end, '2026-05-27T03:00')
  assert.deepEqual(events, [
    'copy-request-url',
    'copy-api-key',
    'refresh',
    'open-settings',
    'open-logs',
    'today',
    'query',
    'copy-activity-url:/v1/responses',
  ])
})

test('GatewayView delegates monitor page bindings through the monitor page controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(shellBindingsControllerSource.includes("useGatewayPageBindings"), "GatewayView delegates monitor page bindings through the monitor page controller should keep useGatewayPageBindings in gateway page controller")
  assert.ok(pageControllerSource.includes("monitorPageHandlers"), "GatewayView delegates monitor page bindings through the monitor page controller should keep monitorPageHandlers in gateway page controller")
})
