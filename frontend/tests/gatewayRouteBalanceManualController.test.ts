import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { createProbeManualGatewayRouteBalanceAction } from '../src/gatewayRouteBalanceProbeRuntimeController.ts'
import type { BalanceProbeResult, GatewayRoute } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
const routeProbePageControllerPath = new URL('../src/gatewayRouteProbePageController.ts', import.meta.url)

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
    ...overrides,
  }
}

function balanceResult(overrides: Partial<BalanceProbeResult>): BalanceProbeResult {
  return {
    site_id: 10,
    route_id: 1,
    ok: true,
    status_code: 200,
    latency_ms: 20,
    remaining: 12.5,
    unit: '$',
    base_url: 'https://api.example',
    message: '',
    checked_at: '2026-05-27T00:00:00Z',
    last_balance: 12.5,
    ...overrides,
  }
}

test('createProbeManualGatewayRouteBalanceAction reads the latest dialog route and url when invoked', async () => {
  const events: string[] = []
  let currentRoute: GatewayRoute | null = route({ id: 41, site_name: '主站', key_name: '主 Key' })
  let currentURL = '  /balance-one  '
  const action = createProbeManualGatewayRouteBalanceAction({
    getRoute: () => currentRoute,
    getBalanceProbeURL: () => currentURL,
    requestBalance: async (routeId, payload) => {
      events.push(`request:${routeId}:${payload?.balance_probe_url}`)
      return balanceResult({ route_id: routeId, balance_display: `$${routeId}.00` })
    },
    applyBalanceResult: (probeResult) => {
      events.push(`apply:${probeResult.route_id}`)
    },
    refreshRouteSummaries: async () => {
      events.push('refresh-summaries')
    },
    notifyOverviewChanged: () => {
      events.push('notify')
    },
    setLoading: (loading) => {
      events.push(`loading:${loading}`)
    },
    trackRoute: (routeId) => {
      events.push(`track:${routeId}`)
    },
    untrackRoute: (routeId) => {
      events.push(`untrack:${routeId}`)
    },
    closeAfterSuccess: () => {
      events.push('close')
    },
    setFailureMessage: (message) => {
      events.push(`failure:${message}`)
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  await action()
  currentRoute = route({ id: 42, site_name: '备站', key_name: '备 Key' })
  currentURL = '  /balance-two  '
  await action()

  assert.deepEqual(events, [
    'loading:true',
    'track:41',
    'request:41:/balance-one',
    'apply:41',
    'refresh-summaries',
    'notify',
    'notice:主站 / 主 Key 余额读取成功：$41.00。',
    'close',
    'loading:false',
    'untrack:41',
    'loading:true',
    'track:42',
    'request:42:/balance-two',
    'apply:42',
    'refresh-summaries',
    'notify',
    'notice:备站 / 备 Key 余额读取成功：$42.00。',
    'close',
    'loading:false',
    'untrack:42',
  ])
})

test('GatewayView delegates manual balance submission through the runtime controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRouteActions"), "GatewayView delegates manual balance submission through the runtime controller should keep useGatewayPageRouteActions in gateway page controller")
  assert.ok(shellBindingsControllerSource.includes("submitManualRouteBalanceProbe"), "GatewayView delegates manual balance submission through the runtime controller should keep submitManualRouteBalanceProbe in gateway page controller")
})
