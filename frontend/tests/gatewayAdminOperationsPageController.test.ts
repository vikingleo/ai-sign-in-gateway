import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { ref } from 'vue'

import { useGatewayAdminOperationsPageActions } from '../src/gatewayAdminOperationsPageController.ts'
import { createDefaultAddUpstreamForm } from '../src/gatewayAddUpstreamModel.ts'
import type { GatewayRoute, GatewaySettingsData, SitePayload } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageAdminActionsControllerPath = new URL(
  '../src/gatewayPageAdminActionsController.ts',
  import.meta.url,
)
const adminOperationsPageControllerPath = new URL('../src/gatewayAdminOperationsPageController.ts', import.meta.url)

function route(id: number): GatewayRoute {
  return {
    id,
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
    key_name: '主 Key',
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

function settings(overrides: Partial<GatewaySettingsData> = {}): GatewaySettingsData {
  return {
    route_strategy: 'round_robin',
    failure_threshold: 3,
    cooldown_seconds: 180,
    request_timeout: 60,
    max_attempts: 0,
    failure_retry_mode: 'retryable',
    route_concurrency_limit: 5,
    concurrency_transfer_strategy: 'limit_only',
    concurrency_overflow_strategy: 'latency_first',
    smart_latency_bias: 1,
    smart_concurrency_bias: 1.5,
    smart_failure_bias: 1,
    smart_priority_bias: 0.5,
    gateway_api_key: '',
    ...overrides,
  }
}

test('useGatewayAdminOperationsPageActions wires upstream and settings page actions', async () => {
  const events: string[] = []
  const routes = ref([route(11), route(12)])
  const addUpstreamForm = createDefaultAddUpstreamForm()
  addUpstreamForm.name = '上游 A'
  addUpstreamForm.base_url = 'https://api.example.com'
  addUpstreamForm.api_key = 'key-test'
  const addUpstreamGroupNames = ref(['生产'])
  const settingsForm = settings({ gateway_api_key: 'current-key' })
  const savedSettings = settings({ route_strategy: 'smart', gateway_api_key: 'saved-key' })
  const createdPayloads: SitePayload[] = []

  const actions = useGatewayAdminOperationsPageActions({
    routes,
    addUpstreamForm,
    addUpstreamGroupNames,
    requestSync: async () => {
      events.push('sync-request')
      return { route_count: routes.value.length }
    },
    requestCreateSite: async (payload) => {
      createdPayloads.push(payload)
      events.push(`create:${payload.name}:${payload.group_name}`)
    },
    reloadGatewayData: async () => {
      events.push('reload')
    },
    probeRouteBalances: async (routeIds, options) => {
      events.push(`probe:${routeIds.join(',')}:${options.silent}`)
      return { success: routeIds.length }
    },
    setGatewayLoading: (loading) => {
      events.push(`gateway-loading:${loading}`)
    },
    setAddUpstreamLoading: (loading) => {
      events.push(`add-loading:${loading}`)
    },
    closeAddUpstreamAfterSuccess: () => {
      events.push('add-close')
    },
    settingsForm,
    requestSaveSettings: async (value) => {
      events.push(`settings-request:${value.gateway_api_key}`)
      return savedSettings
    },
    setSettingsLoading: (loading) => {
      events.push(`settings-loading:${loading}`)
    },
    setSettings: (value) => {
      events.push(`settings-set:${value.gateway_api_key}`)
    },
    closeSettingsAfterSuccess: () => {
      events.push('settings-close')
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  await actions.handleSync()
  await actions.submitAddUpstream()
  await actions.saveSettings()

  assert.deepEqual(createdPayloads.map((payload) => ({
    name: payload.name,
    base_url: payload.base_url,
    group_name: payload.group_name,
  })), [{
    name: '上游 A',
    base_url: 'https://api.example.com',
    group_name: '生产',
  }])
  assert.deepEqual(events, [
    'gateway-loading:true',
    'sync-request',
    'reload',
    'probe:11,12:true',
    'notice:已同步 2 条网关路由，余额读取成功 2 条。',
    'gateway-loading:false',
    'add-loading:true',
    'create:上游 A:生产',
    'notice:已添加上游「上游 A」，可在路由池中调整 priority/weight。',
    'add-close',
    'gateway-loading:true',
    'sync-request',
    'reload',
    'probe:11,12:true',
    'notice:已同步 2 条网关路由，余额读取成功 2 条。',
    'gateway-loading:false',
    'reload',
    'add-loading:false',
    'settings-loading:true',
    'settings-request:current-key',
    'settings-set:saved-key',
    'settings-close',
    'notice:网关策略已保存。',
    'reload',
    'settings-loading:false',
  ])
})

test('GatewayView delegates admin operation wiring to the admin operations page controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const pageAdminActionsControllerSource = await readFile(gatewayPageAdminActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageAdminActions"), "GatewayView delegates admin operation wiring to the page admin actions controller should keep useGatewayPageAdminActions in gateway page controller")
  assert.ok(pageAdminActionsControllerSource.includes("useGatewayAdminOperationsPageActions"), "GatewayView delegates admin operation wiring to the admin operations page controller should keep useGatewayAdminOperationsPageActions in gateway page admin actions controller")
  assert.ok(pageAdminActionsControllerSource.includes("requestSaveSettings: gatewayPageRequests.updateGatewaySettings"), "GatewayView delegates admin operation wiring to the admin operations page controller should keep requestSaveSettings: gatewayPageRequests.updateGatewaySettings in gateway page admin actions controller")
})
