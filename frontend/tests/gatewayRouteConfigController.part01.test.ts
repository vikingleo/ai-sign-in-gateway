import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  changeGatewayRoutePath,
  changeGatewayRouteType,
  createChangeGatewayRoutePathAction,
  createChangeGatewayRouteTypeAction,
  createOpenGatewayRouteModelsDialogAction,
  createSaveGatewayRouteModelsAction,
  createSelectGatewayRoutePathAction,
  createSelectGatewayRouteTypeAction,
  saveGatewayRouteModels,
  selectGatewayRoutePath,
  selectGatewayRouteType,
  useGatewayRouteModelsDialog,
} from '../src/gatewayRouteConfigController.ts'
import type { GatewayRoute, GatewayRouteUpdatePayload } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRouteActionsControllerPath = new URL('../src/gatewayPageRouteActionsController.ts', import.meta.url)
const routeConfigPageControllerPath = new URL('../src/gatewayRouteConfigPageController.ts', import.meta.url)
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

test('opens route models dialog with normalized route draft', () => {
  const dialog = useGatewayRouteModelsDialog()
  const item = route({
    id: 8,
    supported_models: ['gpt-4o', 'gpt-4o', 'claude-3'],
    manual_request_base_urls: ['https://a.example', 'https://a.example', 'https://b.example'],
  })

  dialog.openDialog(item)

  assert.equal(dialog.open.value, true)
  assert.deepEqual(dialog.route.value, item)
  assert.deepEqual(dialog.supportedModels.value, ['gpt-4o', 'claude-3'])
  assert.equal(dialog.requestURLs.value, 'https://a.example\nhttps://b.example')
})

test('updates route models dialog saving and close state', () => {
  const dialog = useGatewayRouteModelsDialog()
  dialog.openDialog(route({ id: 9, supported_models: ['gpt-4o'] }))

  dialog.setSaving(true)
  assert.equal(dialog.saving.value, true)

  dialog.closeAfterSuccess()
  dialog.setSaving(false)

  assert.equal(dialog.open.value, false)
  assert.equal(dialog.saving.value, false)
  assert.equal(dialog.route.value, null)
})

test('changeGatewayRouteType applies an optimistic draft, persists it, replaces route lists, and reports success', async () => {
  const events: string[] = []
  const payloads: GatewayRouteUpdatePayload[] = []
  let routes = [route({ id: 12, route_type: 'codex', route_path: 'responses', supported_models: ['gpt-4o'] })]
  let priorityRoutes = [routes[0]]
  const updated = route({ id: 12, route_type: 'gemini', route_path: 'responses', supported_models: ['gpt-4o'] })

  await changeGatewayRouteType({
    route: routes[0],
    routeType: 'gemini',
    getRoutes: () => routes,
    setRoutes: (nextRoutes) => {
      routes = nextRoutes
      events.push(`routes:${nextRoutes[0].route_type}`)
    },
    getPriorityRoutes: () => priorityRoutes,
    setPriorityRoutes: (nextRoutes) => {
      priorityRoutes = nextRoutes
      events.push(`priority:${nextRoutes[0].route_type}`)
    },
    requestUpdateRoute: async (_routeId, payload) => {
      payloads.push(payload)
      events.push('request')
      return updated
    },
    routeLabel: () => '主站',
    routeTypeLabel: () => 'Gemini',
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(payloads, [{
    route_type: 'gemini',
    route_path: 'responses',
    supported_models: ['gpt-4o'],
  }])
  assert.deepEqual(events, [
    'routes:gemini',
    'request',
    'routes:gemini',
    'priority:gemini',
    'notice:主站 已切换为 Gemini。',
  ])
  assert.equal(routes[0].id, updated.id)
  assert.equal(routes[0].route_type, 'gemini')
  assert.equal(priorityRoutes[0].id, updated.id)
  assert.equal(priorityRoutes[0].route_type, 'gemini')
})

test('changeGatewayRouteType rolls the optimistic draft back and reports request errors', async () => {
  const notices: string[] = []
  let routes = [route({ id: 13, route_type: 'codex' })]
  let priorityRoutes = [routes[0]]

  await changeGatewayRouteType({
    route: routes[0],
    routeType: 'claude',
    getRoutes: () => routes,
    setRoutes: (nextRoutes) => {
      routes = nextRoutes
    },
    getPriorityRoutes: () => priorityRoutes,
    setPriorityRoutes: (nextRoutes) => {
      priorityRoutes = nextRoutes
    },
    requestUpdateRoute: async () => {
      throw new Error('类型保存失败')
    },
    routeLabel: () => '主站',
    routeTypeLabel: () => 'Claude',
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  assert.equal(routes[0].route_type, 'codex')
  assert.equal(priorityRoutes[0].route_type, 'codex')
  assert.deepEqual(notices, ['类型保存失败'])
})

test('changeGatewayRoutePath applies an optimistic draft, persists it, replaces route lists, and reports success', async () => {
  const events: string[] = []
  let routes = [route({ id: 14, route_type: 'codex', route_path: '' })]
  let priorityRoutes = [routes[0]]
  const updated = route({ id: 14, route_type: 'codex', route_path: 'responses' })

  await changeGatewayRoutePath({
    route: routes[0],
    routePath: 'responses',
    getRoutes: () => routes,
    setRoutes: (nextRoutes) => {
      routes = nextRoutes
      events.push(`routes:${nextRoutes[0].route_path}`)
    },
    getPriorityRoutes: () => priorityRoutes,
    setPriorityRoutes: (nextRoutes) => {
      priorityRoutes = nextRoutes
      events.push(`priority:${nextRoutes[0].route_path}`)
    },
    requestUpdateRoute: async () => {
      events.push('request')
      return updated
    },
    routeLabel: () => '主站',
    routePathLabel: () => 'Responses',
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(events, [
    'routes:responses',
    'request',
    'routes:responses',
    'priority:responses',
    'notice:主站 请求格式已切换为 Responses。',
  ])
  assert.equal(routes[0].id, updated.id)
  assert.equal(routes[0].route_path, 'responses')
  assert.equal(priorityRoutes[0].id, updated.id)
  assert.equal(priorityRoutes[0].route_path, 'responses')
})

test('changeGatewayRoutePath rolls the optimistic draft back and reports request errors', async () => {
  const notices: string[] = []
  let routes = [route({ id: 15, route_path: 'responses' })]
  let priorityRoutes = [routes[0]]

  await changeGatewayRoutePath({
    route: routes[0],
    routePath: 'chat/completions',
    getRoutes: () => routes,
    setRoutes: (nextRoutes) => {
      routes = nextRoutes
    },
    getPriorityRoutes: () => priorityRoutes,
    setPriorityRoutes: (nextRoutes) => {
      priorityRoutes = nextRoutes
    },
    requestUpdateRoute: async () => {
      throw new Error('格式保存失败')
    },
    routeLabel: () => '主站',
    routePathLabel: () => 'Chat Completions',
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  assert.equal(routes[0].route_path, 'responses')
  assert.equal(priorityRoutes[0].route_path, 'responses')
  assert.deepEqual(notices, ['格式保存失败'])
})

test('selectGatewayRouteType forwards valid type selections and ignores invalid values', async () => {
  const selected: string[] = []
  const targetRoute = route({ id: 19 })

  await selectGatewayRouteType({
    route: targetRoute,
    value: 'gemini',
    changeRouteType: async (routeArg, routeType) => {
      assert.equal(routeArg, targetRoute)
      selected.push(routeType)
    },
  })
  await selectGatewayRouteType({
    route: targetRoute,
    value: 'invalid-route-type',
    changeRouteType: async () => {
      selected.push('invalid')
    },
  })

  assert.deepEqual(selected, ['gemini'])
})
