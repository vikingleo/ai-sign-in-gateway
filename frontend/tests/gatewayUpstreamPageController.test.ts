import test from 'node:test'
import assert from 'node:assert/strict'
import { ref } from 'vue'
import { readFile } from 'node:fs/promises'

import { useGatewayUpstreamPageActions } from '../src/gatewayUpstreamPageController.ts'
import { createDefaultAddUpstreamForm } from '../src/gatewayAddUpstreamModel.ts'
import type { GatewayRoute, SitePayload } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageAdminActionsControllerPath = new URL(
  '../src/gatewayPageAdminActionsController.ts',
  import.meta.url,
)
const adminOperationsPageControllerPath = new URL('../src/gatewayAdminOperationsPageController.ts', import.meta.url)
const upstreamPageControllerPath = new URL('../src/gatewayUpstreamPageController.ts', import.meta.url)

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

test('useGatewayUpstreamPageActions wires sync and add upstream actions', async () => {
  const events: string[] = []
  const routes = ref([route(11), route(12)])
  const addUpstreamForm = createDefaultAddUpstreamForm()
  addUpstreamForm.name = '上游 A'
  addUpstreamForm.base_url = 'https://api.example.com'
  addUpstreamForm.api_key = 'key-test'
  const addUpstreamGroupNames = ref(['生产'])
  const createdPayloads: SitePayload[] = []

  const actions = useGatewayUpstreamPageActions({
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
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  await actions.handleSync()
  await actions.submitAddUpstream()

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
  ])
})

test('GatewayView delegates upstream page wiring to the page controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const pageAdminActionsControllerSource = await readFile(gatewayPageAdminActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageAdminActions"), "GatewayView delegates upstream page wiring to the page admin actions controller should keep useGatewayPageAdminActions in gateway page controller")
  assert.ok(pageAdminActionsControllerSource.includes("useGatewayAdminOperationsPageActions"), "GatewayView delegates upstream page wiring to the page admin actions controller should keep useGatewayAdminOperationsPageActions in gateway page admin actions controller")
  assert.ok(pageAdminActionsControllerSource.includes("requestCreateSite: gatewayPageRequests.createSite"), "GatewayView delegates upstream page wiring to the page admin actions controller should keep requestCreateSite: gatewayPageRequests.createSite in gateway page admin actions controller")
})
