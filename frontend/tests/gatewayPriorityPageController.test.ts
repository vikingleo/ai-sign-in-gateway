import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { ref } from 'vue'

import { useGatewayPriorityPageActions } from '../src/gatewayPriorityPageController.ts'
import type { GatewayRoute } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRouteActionsControllerPath = new URL('../src/gatewayPageRouteActionsController.ts', import.meta.url)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
const priorityPageControllerPath = new URL('../src/gatewayPriorityPageController.ts', import.meta.url)
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

test('useGatewayPriorityPageActions wires priority actions to page refs', async () => {
  const selectedRoute = route({ id: 12, route_priority: 2, site_name: '' })
  const peerRoute = route({ id: 13, route_priority: 1 })
  const loadedRoutes = [selectedRoute, peerRoute]
  const movedRoutes = [
    route({ id: 13, route_priority: 1 }),
    route({ id: 12, route_priority: 2, site_name: 'moved' }),
  ]
  const presetRoutes = [
    route({ id: 12, route_priority: 1, site_name: 'preset' }),
    route({ id: 13, route_priority: 2 }),
  ]
  const routes = ref<GatewayRoute[]>([selectedRoute, peerRoute])
  const priorityRoutes = ref<GatewayRoute[]>([])
  const priorityRoute = ref<GatewayRoute | null>(null)
  const priorityInsertIndex = ref<number | undefined>(undefined)
  const requestRouteCalls: Array<{ includeDisabled: true }> = []
  const reorderPayloads: Array<{ route_id?: number; mode: 'move' | 'package' | 'balance'; index?: number }> = []
  const loadingValues: boolean[] = []
  const notices: string[] = []
  let clearInsertIndexCount = 0

  const actions = useGatewayPriorityPageActions({
    routes,
    priorityRoute,
    priorityInsertIndex,
    requestRoutes: async (options) => {
      requestRouteCalls.push(options)
      return loadedRoutes
    },
    requestReorder: async (payload) => {
      reorderPayloads.push(payload)
      return payload.mode === 'move' ? movedRoutes : presetRoutes
    },
    normalizeRoute: (value) => ({
      ...value,
      site_name: value.site_name || 'normalized',
    }),
    openPriorityDialog: (route, currentRoutes) => {
      priorityRoute.value = route
      priorityRoutes.value = currentRoutes
    },
    setPriorityDialogLoading: (loading) => {
      loadingValues.push(loading)
    },
    setPriorityRoutes: (nextRoutes) => {
      priorityRoutes.value = nextRoutes
    },
    selectPriorityRoute: (route) => {
      priorityRoute.value = route ? priorityRoutes.value.find((item) => item.id === route.id) ?? route : null
    },
    clearPriorityInsertIndex: () => {
      clearInsertIndexCount += 1
      priorityInsertIndex.value = undefined
    },
    applyReorderedRoutes: (nextRoutes) => {
      priorityRoutes.value = nextRoutes
      routes.value = nextRoutes.filter((item) => item.is_enabled)
    },
    showNotice: (notice) => {
      notices.push(notice.message)
    },
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  await actions.openPriorityDialog(selectedRoute)
  priorityInsertIndex.value = 3
  await actions.handlePriorityMove()
  await actions.handlePriorityPreset('balance')

  assert.deepEqual(requestRouteCalls, [{ includeDisabled: true }])
  assert.equal(priorityRoutes.value[0].site_name, 'preset')
  assert.deepEqual(routes.value.map((item) => item.id), [12, 13])
  assert.deepEqual(reorderPayloads, [
    {
      route_id: 12,
      mode: 'move',
      index: 3,
    },
    {
      mode: 'balance',
    },
  ])
  assert.equal(clearInsertIndexCount, 1)
  assert.equal(priorityInsertIndex.value, undefined)
  assert.deepEqual(loadingValues, [true, false, true, false, true, false])
  assert.deepEqual(notices, ['优先级已更新。', '已按余额优先重排。'])
})

test('route operations page controller delegates priority page wiring to the priority controller', async () => {
  const source = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const routeActionsControllerSource = await readFile(gatewayPageRouteActionsControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')
  const controller = await readFile(priorityPageControllerPath, 'utf8')
  const operationsController = await readFile(routeOperationsPageControllerPath, 'utf8')

  assert.doesNotMatch(source, /from '(?:\.\.\/|\.\/)gatewayPriorityPageController(?:\.ts)?'/)
  assert.match(operationsControllerSource, /import \{ useGatewayPageRouteActions \} from '(?:\.\.\/|\.\/)gatewayPageRouteActionsController(?:\.ts)?'/)
  assert.match(operationsControllerSource, /\brouteActions\s*=\s*useGatewayPageRouteActions\(\{/)
  assert.match(routeActionsControllerSource, /import \{ useGatewayRouteManagementOperationsPageActions \} from '\.\/gatewayRouteManagementOperationsPageController\.ts'/)
  assert.match(routeActionsControllerSource, /return useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.match(routeActionsControllerSource, /openPriorityDialog: state\.priorityDialog\.openDialog/)
  assert.match(shellBindingsControllerSource, /handlePriorityMove: routeActions\.handlePriorityMove/)
  assert.match(shellBindingsControllerSource, /handlePriorityPreset: routeActions\.handlePriorityPreset/)
  assert.match(routeActionsControllerSource, /routes: state\.routes,[\s\S]*priorityRoute: state\.priorityRoute,[\s\S]*priorityInsertIndex: state\.priorityInsertIndex/)
  assert.match(routeActionsControllerSource, /requestRoutes: gatewayPageRequests\.getGatewayRoutes/)
  assert.match(routeActionsControllerSource, /requestReorder: gatewayPageRequests\.reorderGatewayRoutePriorities/)
  assert.match(routeActionsControllerSource, /normalizeRoute: gatewayPageDisplayHelpers\.normalizeGatewayRoute/)
  assert.match(routeActionsControllerSource, /applyReorderedRoutes/)
  assert.doesNotMatch(source, /createOpenGatewayPriorityDialogAction/)
  assert.doesNotMatch(source, /createMoveGatewayPriorityRouteAction/)
  assert.doesNotMatch(source, /createPresetGatewayPriorityRoutesAction/)

  assert.match(operationsController, /import \{ useGatewayPriorityPageActions \} from '\.\/gatewayPriorityPageController\.ts'/)
  assert.match(operationsController, /const priorityActions = useGatewayPriorityPageActions\(options\)/)
  assert.match(controller, /createOpenGatewayPriorityDialogAction/)
  assert.match(controller, /createMoveGatewayPriorityRouteAction/)
  assert.match(controller, /createPresetGatewayPriorityRoutesAction/)
})
