import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  createSaveGatewaySettingsAction,
  saveGatewaySettings,
  useGatewaySettingsDialog,
} from '../src/gatewaySettingsController.ts'
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
    smart_latency_bias: 1.0,
    smart_concurrency_bias: 1.5,
    smart_failure_bias: 1.0,
    smart_priority_bias: 0.5,
    gateway_api_key: '',
    ...overrides,
  }
}

test('opens gateway settings dialog without resetting the current form', () => {
  const dialog = useGatewaySettingsDialog()
  dialog.form.gateway_api_key = 'existing-key'

  dialog.openDialog()

  assert.equal(dialog.open.value, true)
  assert.equal(dialog.form.gateway_api_key, 'existing-key')
})

test('updates gateway settings dialog state with loaded settings', () => {
  const dialog = useGatewaySettingsDialog()

  dialog.setSettings(settings({
    route_strategy: 'smart',
    failure_retry_mode: 'all',
    gateway_api_key: 'loaded-key',
  }))

  assert.equal(dialog.form.route_strategy, 'smart')
  assert.equal(dialog.form.failure_retry_mode, 'all')
  assert.equal(dialog.form.gateway_api_key, 'loaded-key')
})

test('closes gateway settings dialog after a successful save', () => {
  const dialog = useGatewaySettingsDialog()
  dialog.openDialog()
  dialog.setLoading(true)

  dialog.closeAfterSuccess()
  dialog.setLoading(false)

  assert.equal(dialog.open.value, false)
  assert.equal(dialog.loading.value, false)
})

test('saveGatewaySettings saves settings, reports success, closes dialog, and reloads data', async () => {
  const currentSettings = settings({ gateway_api_key: 'old-key' })
  const savedSettings = settings({ route_strategy: 'smart', gateway_api_key: 'new-key' })
  const events: string[] = []
  const requestedSettings: GatewaySettingsData[] = []

  await saveGatewaySettings({
    settings: currentSettings,
    requestSave: async (value) => {
      requestedSettings.push(value)
      events.push('request')
      return savedSettings
    },
    setLoading: (value) => {
      events.push(`loading:${value}`)
    },
    setSettings: (value) => {
      assert.equal(value, savedSettings)
      events.push('set-settings')
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

  assert.deepEqual(requestedSettings, [currentSettings])
  assert.deepEqual(events, [
    'loading:true',
    'request',
    'set-settings',
    'close',
    'notice:网关策略已保存。',
    'reload',
    'loading:false',
  ])
})

test('saveGatewaySettings reports request errors, keeps the dialog open, and resets loading', async () => {
  const events: string[] = []

  await saveGatewaySettings({
    settings: settings(),
    requestSave: async () => {
      events.push('request')
      throw new Error('settings timeout')
    },
    setLoading: (value) => {
      events.push(`loading:${value}`)
    },
    setSettings: () => {
      events.push('set-settings')
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

  assert.deepEqual(events, [
    'loading:true',
    'request',
    'notice:settings timeout',
    'loading:false',
  ])
})

test('saveGatewaySettings preserves the existing success then reload error notice order', async () => {
  const events: string[] = []

  await saveGatewaySettings({
    settings: settings(),
    requestSave: async () => settings({ route_strategy: 'smart' }),
    setLoading: (value) => {
      events.push(`loading:${value}`)
    },
    setSettings: () => {
      events.push('set-settings')
    },
    closeAfterSuccess: () => {
      events.push('close')
    },
    reloadGatewayData: async () => {
      events.push('reload')
      throw new Error('reload failed')
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(events, [
    'loading:true',
    'set-settings',
    'close',
    'notice:网关策略已保存。',
    'reload',
    'notice:reload failed',
    'loading:false',
  ])
})

test('createSaveGatewaySettingsAction reads the latest settings when invoked', async () => {
  const firstSettings = settings({ gateway_api_key: 'first-key' })
  const secondSettings = settings({ route_strategy: 'smart', gateway_api_key: 'second-key' })
  let currentSettings = firstSettings
  const requestedSettings: GatewaySettingsData[] = []
  const events: string[] = []

  const saveSettings = createSaveGatewaySettingsAction({
    getSettings: () => currentSettings,
    requestSave: async (value) => {
      requestedSettings.push(value)
      events.push(`request:${value.gateway_api_key}`)
      return settings({ route_strategy: value.route_strategy, gateway_api_key: `${value.gateway_api_key}-saved` })
    },
    setLoading: (value) => {
      events.push(`loading:${value}`)
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

  await saveSettings()
  currentSettings = secondSettings
  await saveSettings()

  assert.deepEqual(requestedSettings, [firstSettings, secondSettings])
  assert.deepEqual(events, [
    'loading:true',
    'request:first-key',
    'set:first-key-saved',
    'close',
    'notice:网关策略已保存。',
    'reload',
    'loading:false',
    'loading:true',
    'request:second-key',
    'set:second-key-saved',
    'close',
    'notice:网关策略已保存。',
    'reload',
    'loading:false',
  ])
})

test('createSaveGatewaySettingsAction saves an explicit dialog payload when provided', async () => {
  const fallbackSettings = settings({ gateway_api_key: 'fallback-key' })
  const dialogSettings = settings({ route_strategy: 'smart', gateway_api_key: 'dialog-key' })
  const requestedSettings: GatewaySettingsData[] = []

  const saveSettings = createSaveGatewaySettingsAction({
    getSettings: () => fallbackSettings,
    requestSave: async (value) => {
      requestedSettings.push(value)
      return value
    },
    setLoading: () => {},
    setSettings: () => {},
    closeAfterSuccess: () => {},
    reloadGatewayData: async () => {},
    showPlanNotice: () => {},
  })

  await saveSettings(dialogSettings)

  assert.deepEqual(requestedSettings, [dialogSettings])
})

test('GatewayView delegates settings saves through the settings controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const pageAdminActionsControllerSource = await readFile(gatewayPageAdminActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageAdminActions"), "GatewayView delegates settings saves through the page admin actions controller should keep useGatewayPageAdminActions in gateway page controller")
  assert.ok(pageAdminActionsControllerSource.includes("useGatewayAdminOperationsPageActions"), "GatewayView delegates settings saves through the settings controller should keep useGatewayAdminOperationsPageActions in gateway page admin actions controller")
  assert.ok(pageAdminActionsControllerSource.includes("requestSaveSettings: gatewayPageRequests.updateGatewaySettings"), "GatewayView delegates settings saves through the settings controller should keep requestSaveSettings: gatewayPageRequests.updateGatewaySettings in gateway page admin actions controller")
})
