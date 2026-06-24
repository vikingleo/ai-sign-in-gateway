import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  createConfirmGatewayRouteAction,
  createDisableAllGatewayRoutesAction,
  createEnableOnlyGatewayRouteAction,
  createResetGatewayRouteCircuitAction,
  createToggleGatewayRouteAction,
  disableAllGatewayRoutesAction,
  enableOnlyGatewayRouteAction,
  resetGatewayRouteCircuitAction,
  toggleGatewayRouteAction,
} from '../src/gatewayRouteActionController.ts'
import type { GatewayRoute } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRouteActionsControllerPath = new URL('../src/gatewayPageRouteActionsController.ts', import.meta.url)
const routeActionPageControllerPath = new URL('../src/gatewayRouteActionPageController.ts', import.meta.url)
const routeOperationsPageControllerPath = new URL('../src/gatewayRouteOperationsPageController.ts', import.meta.url)

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

test('disableAllGatewayRoutesAction uses the canonical confirmation message', async () => {
  const messages: string[] = []
  let requestCount = 0

  await disableAllGatewayRoutesAction({
    confirm: (message) => {
      messages.push(message)
      return false
    },
    requestDisableAll: async () => {
      requestCount += 1
      return { disabled_count: 1 }
    },
    reloadGatewayData: async () => {},
    showPlanNotice: () => {},
  })

  assert.deepEqual(messages, ['确认禁用全部路由？禁用后网关将没有可用路由，直到重新启用。'])
  assert.equal(requestCount, 0)
})

test('createConfirmGatewayRouteAction delegates to the injected browser confirm boundary', () => {
  const messages: string[] = []
  const confirmGatewayRouteAction = createConfirmGatewayRouteAction({
    confirmWindow: {
      confirm(message: string) {
        messages.push(message)
        return message === 'allow'
      },
    },
  })

  assert.equal(confirmGatewayRouteAction('deny'), false)
  assert.equal(confirmGatewayRouteAction('allow'), true)
  assert.deepEqual(messages, ['deny', 'allow'])
})

test('enableOnlyGatewayRouteAction uses the selected route label in confirmation', async () => {
  const targetRoute = route({ id: 41, site_name: '备用站' })
  const messages: string[] = []
  let requestCount = 0

  await enableOnlyGatewayRouteAction({
    route: targetRoute,
    routeLabel: () => '备用站 / codex',
    confirm: (message) => {
      messages.push(message)
      return false
    },
    requestEnableOnly: async () => {
      requestCount += 1
    },
    reloadGatewayData: async () => {},
    showPlanNotice: () => {},
  })

  assert.deepEqual(messages, ['确认仅启用「备用站 / codex」，并禁用其他全部路由？'])
  assert.equal(requestCount, 0)
})

test('toggleGatewayRouteAction delegates requests, notices, and reloads', async () => {
  const events: string[] = []

  await toggleGatewayRouteAction({
    route: route({ id: 42, is_enabled: true }),
    requestToggle: async (routeId) => {
      events.push(`request:${routeId}`)
    },
    reloadGatewayData: async () => {
      events.push('reload')
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(events, [
    'request:42',
    'notice:已禁用该路由。',
    'reload',
  ])
})

test('resetGatewayRouteCircuitAction delegates requests, notices, and reloads', async () => {
  const events: string[] = []

  await resetGatewayRouteCircuitAction({
    route: route({ id: 43, circuit_state: 'open' }),
    requestReset: async (routeId) => {
      events.push(`request:${routeId}`)
    },
    reloadGatewayData: async () => {
      events.push('reload')
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(events, [
    'request:43',
    'notice:已重置该路由熔断状态。',
    'reload',
  ])
})

test('route action factories assemble runtime dependencies without changing behavior', async () => {
  const events: string[] = []
  const showPlanNotice = (plan: { notice: { message: string } }) => {
    events.push(`notice:${plan.notice.message}`)
  }
  const reloadGatewayData = async () => {
    events.push('reload')
  }
  const confirm = (message: string) => {
    events.push(`confirm:${message}`)
    return true
  }

  const toggleAction = createToggleGatewayRouteAction({
    requestToggle: async (routeId) => {
      events.push(`toggle:${routeId}`)
    },
    reloadGatewayData,
    showPlanNotice,
  })
  const disableAllAction = createDisableAllGatewayRoutesAction({
    confirm,
    requestDisableAll: async () => {
      events.push('disable-all')
      return { disabled_count: 2 }
    },
    reloadGatewayData,
    showPlanNotice,
  })
  const enableOnlyAction = createEnableOnlyGatewayRouteAction({
    confirm,
    routeLabel: (targetRoute) => `route-${targetRoute.id}`,
    requestEnableOnly: async (routeId) => {
      events.push(`enable-only:${routeId}`)
    },
    reloadGatewayData,
    showPlanNotice,
  })
  const resetCircuitAction = createResetGatewayRouteCircuitAction({
    requestReset: async (routeId) => {
      events.push(`reset:${routeId}`)
    },
    reloadGatewayData,
    showPlanNotice,
  })

  await toggleAction(route({ id: 44, is_enabled: true }))
  await disableAllAction()
  await enableOnlyAction(route({ id: 45 }))
  await resetCircuitAction(route({ id: 46, circuit_state: 'open' }))

  assert.deepEqual(events, [
    'toggle:44',
    'notice:已禁用该路由。',
    'reload',
    'confirm:确认禁用全部路由？禁用后网关将没有可用路由，直到重新启用。',
    'disable-all',
    'notice:已禁用 2 条路由。',
    'reload',
    'confirm:确认仅启用「route-45」，并禁用其他全部路由？',
    'enable-only:45',
    'notice:已仅启用该路由，其他路由已禁用。',
    'reload',
    'reset:46',
    'notice:已重置该路由熔断状态。',
    'reload',
  ])
})

test('GatewayView delegates route actions through the route action controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const routeActionsControllerSource = await readFile(gatewayPageRouteActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRouteActions"), "GatewayView delegates route actions through the route action controller should keep useGatewayPageRouteActions in gateway page controller")
  assert.ok(routeActionsControllerSource.includes("requestToggle: gatewayPageRequests.toggleGatewayRoute"), "GatewayView delegates route actions through the route action controller should keep requestToggle: gatewayPageRequests.toggleGatewayRoute in route actions controller")
})

test('GatewayView keeps route action side effects behind the route action controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const routeActionsControllerSource = await readFile(gatewayPageRouteActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRouteActions"), "GatewayView keeps route action side effects behind the route action controller should keep useGatewayPageRouteActions in gateway page controller")
  assert.ok(routeActionsControllerSource.includes("confirmWindow: gatewayPagePlatform.confirmWindow"), "GatewayView keeps route action side effects behind the route action controller should keep confirmWindow: gatewayPagePlatform.confirmWindow in route actions controller")
})
