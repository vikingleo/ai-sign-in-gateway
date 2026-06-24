import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { ref } from 'vue'

import { useGatewayRouteConfigPageActions } from '../src/gatewayRouteConfigPageController.ts'
import type { GatewayRoute, GatewayRouteUpdatePayload } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRouteActionsControllerPath = new URL('../src/gatewayPageRouteActionsController.ts', import.meta.url)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
const routeConfigPageControllerPath = new URL('../src/gatewayRouteConfigPageController.ts', import.meta.url)
const routeOperationsPageControllerPath = new URL('../src/gatewayRouteOperationsPageController.ts', import.meta.url)

function route(overrides: Partial<GatewayRoute> = {}): GatewayRoute {
  return {
    id: 1,
    site_id: 10,
    site_name: '主站',
    site_name_snapshot: '',
    site_base_url_snapshot: '',
    base_url: 'https://api.example.com',
    request_base_url: 'https://api.example.com',
    request_base_urls: [],
    manual_request_base_urls: [],
    group_name: '',
    supported_models: [],
    key_name: 'main',
    key_fingerprint: 'fp-main',
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

test('useGatewayRouteConfigPageActions wires route config actions to page refs', async () => {
  const notices: string[] = []
  const payloads: GatewayRouteUpdatePayload[] = []
  const firstRoute = route({
    id: 21,
    route_type: 'codex',
    route_path: '',
    supported_models: ['old-model'],
  })
  const secondRoute = route({
    id: 22,
    route_type: 'gpt',
    route_path: 'chat/completions',
    supported_models: [],
  })
  const routes = ref([firstRoute, secondRoute])
  const priorityRoutes = ref([firstRoute, secondRoute])
  const routeModelsDialogRoute = ref<GatewayRoute | null>(null)
  const routeModelsDialogValue = ref<string[]>([])
  const routeModelsDialogRequestURLs = ref('')
  const dialogEvents: string[] = []

  const actions = useGatewayRouteConfigPageActions({
    routes,
    priorityRoutes,
    routeModelsDialogRoute,
    routeModelsDialogValue,
    routeModelsDialogRequestURLs,
    requestUpdateRoute: async (routeId, payload) => {
      payloads.push(payload)
      const current = routes.value.find((item) => item.id === routeId)
      assert.ok(current)
      return route({ ...current, ...payload })
    },
    routeLabel: (selectedRoute) => `route-${selectedRoute.id}`,
    routeTypeLabel: (routeType) => routeType.toUpperCase(),
    routePathLabel: (routePath) => routePath || 'default',
    openRouteModelsDialog: (selectedRoute) => {
      dialogEvents.push(`open:${selectedRoute.id}`)
      routeModelsDialogRoute.value = selectedRoute
      routeModelsDialogValue.value = [...selectedRoute.supported_models]
      routeModelsDialogRequestURLs.value = selectedRoute.manual_request_base_urls?.join('\n') ?? ''
    },
    setRouteModelsDialogSaving: (saving) => {
      dialogEvents.push(`saving:${saving}`)
    },
    closeRouteModelsDialogAfterSuccess: () => {
      dialogEvents.push('close')
      routeModelsDialogRoute.value = null
    },
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  await actions.handleRouteTypeSelect(firstRoute, 'gemini')
  await actions.handleRoutePathSelect(routes.value[1], 'responses')
  actions.openRouteModelsDialog(routes.value[0])
  routeModelsDialogValue.value = ['gemini-2.5-pro', 'gemini-2.5-pro']
  routeModelsDialogRequestURLs.value = 'https://a.example.com\nhttps://b.example.com'
  await actions.saveRouteModelsDialog()

  assert.deepEqual(payloads, [
    {
      route_type: 'gemini',
      route_path: '',
      supported_models: ['old-model'],
    },
    {
      route_type: 'gpt',
      route_path: 'responses',
      supported_models: [],
    },
    {
      route_type: 'gemini',
      route_path: '',
      supported_models: ['gemini-2.5-pro'],
      manual_request_base_urls: ['https://a.example.com', 'https://b.example.com'],
    },
  ])
  assert.equal(routes.value[0].route_type, 'gemini')
  assert.equal(routes.value[1].route_path, 'responses')
  assert.deepEqual(routes.value[0].supported_models, ['gemini-2.5-pro'])
  assert.deepEqual(priorityRoutes.value[0].manual_request_base_urls, [
    'https://a.example.com',
    'https://b.example.com',
  ])
  assert.deepEqual(dialogEvents, [
    'open:21',
    'saving:true',
    'close',
    'saving:false',
  ])
  assert.deepEqual(notices, [
    'route-21 已切换为 GEMINI。',
    'route-22 请求格式已切换为 responses。',
    '路由配置已更新。',
  ])
})

test('route operations page controller delegates route config page wiring to the config controller', async () => {
  const source = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const routeActionsControllerSource = await readFile(gatewayPageRouteActionsControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')
  const controller = await readFile(routeConfigPageControllerPath, 'utf8')
  const operationsController = await readFile(routeOperationsPageControllerPath, 'utf8')

  assert.doesNotMatch(source, /from '(?:\.\.\/|\.\/)gatewayRouteConfigPageController(?:\.ts)?'/)
  assert.match(operationsControllerSource, /import \{ useGatewayPageRouteActions \} from '(?:\.\.\/|\.\/)gatewayPageRouteActionsController(?:\.ts)?'/)
  assert.match(operationsControllerSource, /\brouteActions\s*=\s*useGatewayPageRouteActions\(\{/)
  assert.match(routeActionsControllerSource, /return useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.match(shellBindingsControllerSource, /handleRouteTypeSelect: routeActions\.handleRouteTypeSelect/)
  assert.match(shellBindingsControllerSource, /handleRoutePathSelect: routeActions\.handleRoutePathSelect/)
  assert.match(shellBindingsControllerSource, /openRouteModelsDialog: routeActions\.openRouteModelsDialog/)
  assert.match(shellBindingsControllerSource, /saveRouteModelsDialog: routeActions\.saveRouteModelsDialog/)
  assert.match(routeActionsControllerSource, /routes: state\.routes,[\s\S]*priorityRoutes: state\.priorityRoutes,[\s\S]*routeModelsDialogRoute: state\.routeModelsDialogRoute,[\s\S]*routeModelsDialogValue: state\.routeModelsDialogValue,[\s\S]*routeModelsDialogRequestURLs: state\.routeModelsDialogRequestURLs/)
  assert.doesNotMatch(source, /createChangeGatewayRouteTypeAction/)
  assert.doesNotMatch(source, /createSelectGatewayRouteTypeAction/)
  assert.doesNotMatch(source, /createChangeGatewayRoutePathAction/)
  assert.doesNotMatch(source, /createSelectGatewayRoutePathAction/)
  assert.doesNotMatch(source, /createOpenGatewayRouteModelsDialogAction/)
  assert.doesNotMatch(source, /createSaveGatewayRouteModelsAction/)

  assert.match(operationsController, /import \{ useGatewayRouteConfigPageActions \} from '\.\/gatewayRouteConfigPageController\.ts'/)
  assert.match(operationsController, /const routeConfigActions = useGatewayRouteConfigPageActions\(options\)/)
  assert.match(controller, /createChangeGatewayRouteTypeAction/)
  assert.match(controller, /createSelectGatewayRouteTypeAction/)
  assert.match(controller, /createChangeGatewayRoutePathAction/)
  assert.match(controller, /createSelectGatewayRoutePathAction/)
  assert.match(controller, /createOpenGatewayRouteModelsDialogAction/)
  assert.match(controller, /createSaveGatewayRouteModelsAction/)
})
