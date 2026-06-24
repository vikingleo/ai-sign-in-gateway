import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { useGatewaySettingsPageActions } from '../src/gatewaySettingsPageController.ts'
import type { GatewaySettingsData } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageAdminActionsControllerPath = new URL(
  '../src/gatewayPageAdminActionsController.ts',
  import.meta.url,
)
const adminOperationsPageControllerPath = new URL('../src/gatewayAdminOperationsPageController.ts', import.meta.url)
const settingsPageControllerPath = new URL('../src/gatewaySettingsPageController.ts', import.meta.url)

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

test('useGatewaySettingsPageActions wires gateway settings save action', async () => {
  const events: string[] = []
  const form = settings({ gateway_api_key: 'current-key' })
  const saved = settings({ route_strategy: 'smart', gateway_api_key: 'saved-key' })
  const actions = useGatewaySettingsPageActions({
    settingsForm: form,
    requestSave: async (value) => {
      events.push(`request:${value.gateway_api_key}`)
      return saved
    },
    setLoading: (loading) => {
      events.push(`loading:${loading}`)
    },
    setSettings: (value) => {
      events.push(`set:${value.gateway_api_key}`)
    },
    closeAfterSuccess: () => {
      events.push('close')
    },
    reloadGatewayData: async () => {
      events.push('reload')
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  await actions.saveSettings()

  assert.deepEqual(events, [
    'loading:true',
    'request:current-key',
    'set:saved-key',
    'close',
    'notice:网关策略已保存。',
    'reload',
    'loading:false',
  ])
})

test('GatewayView delegates settings page wiring to the page controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const pageAdminActionsControllerSource = await readFile(gatewayPageAdminActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageAdminActions"), "GatewayView delegates settings page wiring to the page admin actions controller should keep useGatewayPageAdminActions in gateway page controller")
  assert.ok(pageAdminActionsControllerSource.includes("useGatewayAdminOperationsPageActions"), "GatewayView delegates settings page wiring to the page admin actions controller should keep useGatewayAdminOperationsPageActions in gateway page admin actions controller")
  assert.ok(pageAdminActionsControllerSource.includes("settingsForm: state.settingsDialog.form"), "GatewayView delegates settings page wiring to the page admin actions controller should keep settingsForm: state.settingsDialog.form in gateway page admin actions controller")
})
