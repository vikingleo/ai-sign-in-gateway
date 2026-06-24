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

test('selectGatewayRoutePath forwards valid path selections and ignores invalid values', async () => {
  const selected: string[] = []
  const targetRoute = route({ id: 20 })

  await selectGatewayRoutePath({
    route: targetRoute,
    value: 'responses',
    changeRoutePath: async (routeArg, routePath) => {
      assert.equal(routeArg, targetRoute)
      selected.push(routePath)
    },
  })
  await selectGatewayRoutePath({
    route: targetRoute,
    value: 'invalid-route-path',
    changeRoutePath: async () => {
      selected.push('invalid')
    },
  })

  assert.deepEqual(selected, ['responses'])
})

test('route config action factories assemble runtime dependencies without changing behavior', async () => {
  const events: string[] = []
  let routes = [
    route({ id: 21, route_type: 'codex', route_path: '', supported_models: ['gpt-4o'] }),
    route({ id: 22, route_type: 'openai', route_path: '', supported_models: ['gpt-4o'] }),
  ]
  let priorityRoutes = [...routes]
  const requestUpdateRoute = async (routeId: number, payload: GatewayRouteUpdatePayload) => {
    events.push(`request:${routeId}:${payload.route_type ?? 'same'}:${payload.route_path ?? 'same'}`)
    const current = routes.find((item) => item.id === routeId)
    assert.ok(current)
    return route({ ...current, ...payload })
  }
  const changeType = createChangeGatewayRouteTypeAction({
    getRoutes: () => routes,
    setRoutes: (nextRoutes) => {
      routes = nextRoutes
      events.push(`routes:${nextRoutes.map((item) => item.route_type).join(',')}`)
    },
    getPriorityRoutes: () => priorityRoutes,
    setPriorityRoutes: (nextRoutes) => {
      priorityRoutes = nextRoutes
      events.push(`priority:${nextRoutes.map((item) => item.route_type).join(',')}`)
    },
    requestUpdateRoute,
    routeLabel: (targetRoute) => `route-${targetRoute.id}`,
    routeTypeLabel: (routeType) => routeType.toUpperCase(),
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })
  const changePath = createChangeGatewayRoutePathAction({
    getRoutes: () => routes,
    setRoutes: (nextRoutes) => {
      routes = nextRoutes
      events.push(`routes-path:${nextRoutes.map((item) => item.route_path || 'empty').join(',')}`)
    },
    getPriorityRoutes: () => priorityRoutes,
    setPriorityRoutes: (nextRoutes) => {
      priorityRoutes = nextRoutes
      events.push(`priority-path:${nextRoutes.map((item) => item.route_path || 'empty').join(',')}`)
    },
    requestUpdateRoute,
    routeLabel: (targetRoute) => `route-${targetRoute.id}`,
    routePathLabel: (routePath) => routePath,
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })
  const selectType = createSelectGatewayRouteTypeAction({ changeRouteType: changeType })
  const selectPath = createSelectGatewayRoutePathAction({ changeRoutePath: changePath })

  await selectType(routes[0], 'gemini')
  await selectType(routes[0], 'invalid-type')
  await selectPath(routes[1], 'responses')
  await selectPath(routes[1], 'invalid-path')

  assert.deepEqual(events, [
    'routes:gemini,openai',
    'request:21:gemini:',
    'routes:gemini,openai',
    'priority:gemini,openai',
    'notice:route-21 已切换为 GEMINI。',
    'routes-path:empty,responses',
    'request:22:openai:responses',
    'routes-path:empty,responses',
    'priority-path:empty,responses',
    'notice:route-22 请求格式已切换为 responses。',
  ])
})

test('saveGatewayRouteModels persists route model drafts, replaces route lists, closes dialog, and reports success', async () => {
  const events: string[] = []
  const payloads: GatewayRouteUpdatePayload[] = []
  let routes = [route({ id: 16, route_type: 'codex', route_path: '', supported_models: ['old'] })]
  let priorityRoutes = [routes[0]]
  const updated = route({
    id: 16,
    route_type: 'codex',
    route_path: '',
    supported_models: ['gpt-4o', 'claude-3'],
    manual_request_base_urls: ['https://a.example', 'https://b.example'],
  })

  await saveGatewayRouteModels({
    route: routes[0],
    supportedModels: ['gpt-4o', 'claude-3', 'gpt-4o'],
    requestURLs: 'https://a.example\nhttps://b.example',
    getRoutes: () => routes,
    setRoutes: (nextRoutes) => {
      routes = nextRoutes
      events.push(`routes:${nextRoutes[0].supported_models.join(',')}`)
    },
    getPriorityRoutes: () => priorityRoutes,
    setPriorityRoutes: (nextRoutes) => {
      priorityRoutes = nextRoutes
      events.push(`priority:${nextRoutes[0].manual_request_base_urls?.join(',')}`)
    },
    requestUpdateRoute: async (_routeId, payload) => {
      payloads.push(payload)
      events.push('request')
      return updated
    },
    setSaving: (saving) => {
      events.push(`saving:${saving}`)
    },
    closeAfterSuccess: () => {
      events.push('close')
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(payloads, [{
    route_type: 'codex',
    route_path: '',
    supported_models: ['gpt-4o', 'claude-3'],
    manual_request_base_urls: ['https://a.example', 'https://b.example'],
  }])
  assert.deepEqual(events, [
    'saving:true',
    'request',
    'routes:gpt-4o,claude-3',
    'priority:https://a.example,https://b.example',
    'close',
    'notice:路由配置已更新。',
    'saving:false',
  ])
  assert.deepEqual(routes[0].supported_models, ['gpt-4o', 'claude-3'])
  assert.deepEqual(priorityRoutes[0].manual_request_base_urls, ['https://a.example', 'https://b.example'])
})

test('saveGatewayRouteModels reports request errors without replacing routes or closing the dialog', async () => {
  const events: string[] = []
  let routes = [route({ id: 17, supported_models: ['old'] })]
  let priorityRoutes = [routes[0]]

  await saveGatewayRouteModels({
    route: routes[0],
    supportedModels: ['gpt-4o'],
    requestURLs: '',
    getRoutes: () => routes,
    setRoutes: (nextRoutes) => {
      routes = nextRoutes
      events.push('routes')
    },
    getPriorityRoutes: () => priorityRoutes,
    setPriorityRoutes: (nextRoutes) => {
      priorityRoutes = nextRoutes
      events.push('priority')
    },
    requestUpdateRoute: async () => {
      events.push('request')
      throw new Error('模型保存失败')
    },
    setSaving: (saving) => {
      events.push(`saving:${saving}`)
    },
    closeAfterSuccess: () => {
      events.push('close')
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(events, [
    'saving:true',
    'request',
    'notice:模型保存失败',
    'saving:false',
  ])
  assert.deepEqual(routes[0].supported_models, ['old'])
  assert.deepEqual(priorityRoutes[0].supported_models, ['old'])
})
