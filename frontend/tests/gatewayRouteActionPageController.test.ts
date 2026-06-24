import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { useGatewayRouteActionPageActions } from '../src/gatewayRouteActionPageController.ts'
import type { GatewayRoute } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRouteActionsControllerPath = new URL('../src/gatewayPageRouteActionsController.ts', import.meta.url)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
const gatewayPagePlatformControllerPath = new URL('../src/gatewayPagePlatformController.ts', import.meta.url)
const routeActionPageControllerPath = new URL('../src/gatewayRouteActionPageController.ts', import.meta.url)
const routeOperationsPageControllerPath = new URL('../src/gatewayRouteOperationsPageController.ts', import.meta.url)

function route(overrides: Partial<GatewayRoute> = {}): GatewayRoute {
  return {
    id: 1,
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

test('useGatewayRouteActionPageActions wires route actions to page dependencies', async () => {
  const events: string[] = []
  const actions = useGatewayRouteActionPageActions({
    confirmWindow: {
      confirm: (message) => {
        events.push(`confirm:${message}`)
        return true
      },
    },
    requestToggle: async (routeId) => {
      events.push(`toggle:${routeId}`)
      return {
        id: routeId,
        is_enabled: false,
        circuit_state: 'closed',
      }
    },
    requestDisableAll: async () => {
      events.push('disable-all')
      return {
        status: 'ok',
        disabled_count: 2,
      }
    },
    requestEnableOnly: async (routeId) => {
      events.push(`enable-only:${routeId}`)
      return {
        status: 'ok',
        enabled_route_id: routeId,
      }
    },
    requestReset: async (routeId) => {
      events.push(`reset:${routeId}`)
      return {
        id: routeId,
        is_enabled: true,
        circuit_state: 'closed',
      }
    },
    requestDeleteRoute: async (routeId) => {
      events.push(`delete:${routeId}`)
      return {
        status: 'ok',
        message: 'deleted',
        deleted_route_id: routeId,
        site_id: 10,
        removed_api_key: true,
      }
    },
    reloadGatewayData: async () => {
      events.push('reload')
    },
    routeLabel: (targetRoute) => `route-${targetRoute.id}`,
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  await actions.handleToggle(route({ id: 31, is_enabled: true }))
  await actions.handleDisableAllRoutes()
  await actions.handleEnableOnlyRoute(route({ id: 32 }))
  await actions.handleResetCircuit(route({ id: 33, circuit_state: 'open' }))
  await actions.handleDeleteRoute(route({ id: 34 }))

  assert.deepEqual(events, [
    'toggle:31',
    'notice:已禁用该路由。',
    'reload',
    'confirm:确认禁用全部路由？禁用后网关将没有可用路由，直到重新启用。',
    'disable-all',
    'notice:已禁用 2 条路由。',
    'reload',
    'confirm:确认仅启用「route-32」，并禁用其他全部路由？',
    'enable-only:32',
    'notice:已仅启用该路由，其他路由已禁用。',
    'reload',
    'reset:33',
    'notice:已重置该路由熔断状态。',
    'reload',
    'confirm:确认删除路由「route-34」吗？对应站点 API Key 会同步移除。',
    'delete:34',
    'notice:路由已删除。',
    'reload',
  ])
})

test('route operations page controller delegates route action page wiring to the action controller', async () => {
  const source = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const routeActionsControllerSource = await readFile(gatewayPageRouteActionsControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')
  const pagePlatformController = await readFile(gatewayPagePlatformControllerPath, 'utf8')
  const controller = await readFile(routeActionPageControllerPath, 'utf8')
  const operationsController = await readFile(routeOperationsPageControllerPath, 'utf8')

  assert.doesNotMatch(source, /from '(?:\.\.\/|\.\/)gatewayRouteActionPageController(?:\.ts)?'/)
  assert.match(operationsControllerSource, /import \{ useGatewayPageRouteActions \} from '(?:\.\.\/|\.\/)gatewayPageRouteActionsController(?:\.ts)?'/)
  assert.match(operationsControllerSource, /\brouteActions\s*=\s*useGatewayPageRouteActions\(\{/)
  assert.match(routeActionsControllerSource, /return useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.match(shellBindingsControllerSource, /handleToggle: routeActions\.handleToggle/)
  assert.match(shellBindingsControllerSource, /handleDisableAllRoutes: routeActions\.handleDisableAllRoutes/)
  assert.match(shellBindingsControllerSource, /handleEnableOnlyRoute: routeActions\.handleEnableOnlyRoute/)
  assert.match(shellBindingsControllerSource, /handleResetCircuit: routeActions\.handleResetCircuit/)
  assert.match(shellBindingsControllerSource, /handleDeleteRoute: routeActions\.handleDeleteRoute/)
  assert.match(routeActionsControllerSource, /confirmWindow: gatewayPagePlatform\.confirmWindow/)
  assert.match(pagePlatformController, /confirmWindow: platformWindow/)
  assert.doesNotMatch(routeActionsControllerSource, /confirmWindow: window/)
  assert.match(routeActionsControllerSource, /requestToggle: gatewayPageRequests\.toggleGatewayRoute/)
  assert.match(routeActionsControllerSource, /requestDisableAll: gatewayPageRequests\.disableAllGatewayRoutes/)
  assert.match(routeActionsControllerSource, /requestEnableOnly: gatewayPageRequests\.enableOnlyGatewayRoute/)
  assert.match(routeActionsControllerSource, /requestReset: gatewayPageRequests\.resetGatewayRouteCircuit/)
  assert.match(routeActionsControllerSource, /requestDeleteRoute: gatewayPageRequests\.deleteGatewayRoute/)
  assert.match(routeActionsControllerSource, /reloadGatewayData: runtimeActions\.reloadGatewayDataAfterAction/)
  assert.match(routeActionsControllerSource, /routeLabel: gatewayPageDisplayHelpers\.loadRouteLabel/)
  assert.doesNotMatch(source, /createConfirmGatewayRouteAction/)
  assert.doesNotMatch(source, /createToggleGatewayRouteAction/)
  assert.doesNotMatch(source, /createDisableAllGatewayRoutesAction/)
  assert.doesNotMatch(source, /createEnableOnlyGatewayRouteAction/)
  assert.doesNotMatch(source, /createResetGatewayRouteCircuitAction/)
  assert.doesNotMatch(source, /createDeleteGatewayRouteAction/)

  assert.match(operationsController, /import \{ useGatewayRouteActionPageActions \} from '\.\/gatewayRouteActionPageController\.ts'/)
  assert.match(operationsController, /const routeActions = useGatewayRouteActionPageActions\(options\)/)
  assert.match(controller, /createConfirmGatewayRouteAction/)
  assert.match(controller, /createToggleGatewayRouteAction/)
  assert.match(controller, /createDisableAllGatewayRoutesAction/)
  assert.match(controller, /createEnableOnlyGatewayRouteAction/)
  assert.match(controller, /createResetGatewayRouteCircuitAction/)
  assert.match(controller, /createDeleteGatewayRouteAction/)
})
