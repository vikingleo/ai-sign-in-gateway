import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  applyGatewayPriorityReorderedRoutes,
  createApplyGatewayPriorityReorderedRoutesAction,
  createMoveGatewayPriorityRouteAction,
  createOpenGatewayPriorityDialogAction,
  createPresetGatewayPriorityRoutesAction,
  loadGatewayPriorityRoutes,
  moveGatewayPriorityRoute,
  presetGatewayPriorityRoutes,
  useGatewayPriorityDialog,
} from '../src/gatewayPriorityController.ts'
import type { GatewayRoute } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageViewStateControllerPath = new URL('../src/gatewayPageViewStateController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRouteActionsControllerPath = new URL('../src/gatewayPageRouteActionsController.ts', import.meta.url)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
const gatewayPriorityPageControllerPath = new URL('../src/gatewayPriorityPageController.ts', import.meta.url)
const gatewayRouteOperationsPageControllerPath = new URL(
  '../src/gatewayRouteOperationsPageController.ts',
  import.meta.url,
)
const gatewayRouteMutationActionsControllerPath = new URL(
  '../src/gatewayRouteMutationActionsController.ts',
  import.meta.url,
)
const gatewayOverlayPageHostPath = new URL(
  '../src/components/gateway/GatewayOverlayPageHost.vue',
  import.meta.url,
)

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

test('moveGatewayPriorityRoute reports reorder errors and resets loading', async () => {
  const loadingValues: boolean[] = []
  const notices: string[] = []

  await moveGatewayPriorityRoute({
    route: route({ id: 14 }),
    target: 2,
    requestReorder: async () => {
      throw new Error('priority move timeout')
    },
    applyReorderedRoutes: () => {
      throw new Error('should not apply routes on failure')
    },
    setLoading: (loading) => loadingValues.push(loading),
    selectRoute: () => {
      throw new Error('should not select route on failure')
    },
    showNotice: () => {
      throw new Error('should not show validation notice on request failure')
    },
    showPlanNotice: (plan) => notices.push(plan.notice.message),
  })

  assert.deepEqual(notices, ['priority move timeout'])
  assert.deepEqual(loadingValues, [true, false])
})

test('applies a priority preset through injected dependencies', async () => {
  const selectedRoute = route({ id: 12, route_priority: 5 })
  const reorderedRoutes = [route({ id: 2, route_priority: 1 }), selectedRoute]
  const loadingValues: boolean[] = []
  const requestPayloads: Array<{ route_id?: number; mode: 'move' | 'package' | 'balance'; index?: number }> = []
  const selectedRouteIds: Array<number | null> = []
  const notices: string[] = []
  let appliedRoutes: GatewayRoute[] = []
  let clearCount = 0

  await presetGatewayPriorityRoutes({
    mode: 'balance',
    currentRoute: selectedRoute,
    requestReorder: async (payload) => {
      requestPayloads.push(payload)
      return reorderedRoutes
    },
    applyReorderedRoutes: (routes) => {
      appliedRoutes = routes
    },
    setLoading: (loading) => loadingValues.push(loading),
    clearInsertIndex: () => {
      clearCount += 1
    },
    selectRoute: (selected) => selectedRouteIds.push(selected?.id ?? null),
    showPlanNotice: (plan) => notices.push(plan.notice.message),
  })

  assert.deepEqual(requestPayloads, [{ mode: 'balance' }])
  assert.deepEqual(appliedRoutes, reorderedRoutes)
  assert.equal(clearCount, 1)
  assert.deepEqual(selectedRouteIds, [12])
  assert.deepEqual(notices, ['已按余额优先重排。'])
  assert.deepEqual(loadingValues, [true, false])
})

test('createPresetGatewayPriorityRoutesAction assembles preset dependencies without changing behavior', async () => {
  let selectedRoute: GatewayRoute | null = route({ id: 12, route_priority: 5 })
  const reorderedRoutes = [route({ id: 2, route_priority: 1 }), selectedRoute]
  const loadingValues: boolean[] = []
  const requestPayloads: Array<{ route_id?: number; mode: 'move' | 'package' | 'balance'; index?: number }> = []
  const selectedRouteIds: Array<number | null> = []
  const notices: string[] = []
  let appliedRoutes: GatewayRoute[] = []
  let clearCount = 0

  const presetPriorityRoutes = createPresetGatewayPriorityRoutesAction({
    getCurrentRoute: () => selectedRoute,
    requestReorder: async (payload) => {
      requestPayloads.push(payload)
      return reorderedRoutes
    },
    applyReorderedRoutes: (routes) => {
      appliedRoutes = routes
    },
    setLoading: (loading) => loadingValues.push(loading),
    clearInsertIndex: () => {
      clearCount += 1
    },
    selectRoute: (selected) => selectedRouteIds.push(selected?.id ?? null),
    showPlanNotice: (plan) => notices.push(plan.notice.message),
  })

  await presetPriorityRoutes('balance')

  assert.deepEqual(requestPayloads, [{ mode: 'balance' }])
  assert.deepEqual(appliedRoutes, reorderedRoutes)
  assert.equal(clearCount, 1)
  assert.deepEqual(selectedRouteIds, [12])
  assert.deepEqual(notices, ['已按余额优先重排。'])
  assert.deepEqual(loadingValues, [true, false])

  selectedRoute = null
  await presetPriorityRoutes('package')

  assert.deepEqual(requestPayloads, [{ mode: 'balance' }, { mode: 'package' }])
  assert.deepEqual(selectedRouteIds, [12, null])
})

test('presetGatewayPriorityRoutes reports reorder errors and resets loading', async () => {
  const loadingValues: boolean[] = []
  const notices: string[] = []

  await presetGatewayPriorityRoutes({
    mode: 'package',
    currentRoute: route({ id: 14 }),
    requestReorder: async () => {
      throw new Error('priority preset timeout')
    },
    applyReorderedRoutes: () => {
      throw new Error('should not apply routes on failure')
    },
    setLoading: (loading) => loadingValues.push(loading),
    clearInsertIndex: () => {
      throw new Error('should not clear insert index on failure')
    },
    selectRoute: () => {
      throw new Error('should not select route on failure')
    },
    showPlanNotice: (plan) => notices.push(plan.notice.message),
  })

  assert.deepEqual(notices, ['priority preset timeout'])
  assert.deepEqual(loadingValues, [true, false])
})

test('GatewayView delegates priority list loading through the priority controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const routeActionsControllerSource = await readFile(gatewayPageRouteActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRouteActions"), "GatewayView delegates priority list loading through the priority controller should keep useGatewayPageRouteActions in gateway page controller")
  assert.ok(routeActionsControllerSource.includes("openPriorityDialog: state.priorityDialog.openDialog"), "GatewayView delegates priority list loading through the priority controller should keep openPriorityDialog: state.priorityDialog.openDialog in route actions controller")
})

test('GatewayView delegates priority moving through the priority controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRouteActions"), "GatewayView delegates priority moving through the priority controller should keep useGatewayPageRouteActions in gateway page controller")
  assert.ok(shellBindingsControllerSource.includes("handlePriorityMove"), "GatewayView delegates priority moving through the priority controller should keep handlePriorityMove in gateway page controller")
})

test('GatewayView creates priority reorder runtime helper through the priority controller', async () => {
  const source = await readFile(gatewayPageControllerPath, 'utf8')
  const viewStateControllerSource = await readFile(gatewayPageViewStateControllerPath, 'utf8')
  const mutationActionsController = await readFile(gatewayRouteMutationActionsControllerPath, 'utf8')
  const overlayPageHost = await readFile(gatewayOverlayPageHostPath, 'utf8')
  const helper = mutationActionsController.slice(
    mutationActionsController.indexOf('const applyReorderedRoutes = createApplyGatewayPriorityReorderedRoutesAction'),
    mutationActionsController.indexOf('return {'),
  )

  assert.match(source, /import \{ useGatewayPageViewState \} from '(?:\.\.\/|\.\/)gatewayPageViewStateController(?:\.ts)?'/)
  assert.match(viewStateControllerSource, /import \{ useGatewayRouteMutationActions \} from '(?:\.\.\/|\.\/)gatewayRouteMutationActionsController(?:\.ts)?'/)
  assert.doesNotMatch(source, /createApplyGatewayPriorityReorderedRoutesAction/)
  assert.match(mutationActionsController, /import \{ createApplyGatewayPriorityReorderedRoutesAction \} from '\.\/gatewayPriorityController\.ts'/)
  assert.match(overlayPageHost, /:priority-row-class-name="priorityDialog\.rowClassName"/)
  assert.doesNotMatch(source, /const priorityRouteRowClassName = priorityDialog\.rowClassName/)
  assert.doesNotMatch(source, /import \{ gatewayPriorityRouteRowClassName \} from '(?:\.\.\/|\.\/)gatewayPriorityModel'/)
  assert.doesNotMatch(source, /function priorityRouteRowClassName\(record: GatewayRoute\)/)
  assert.match(helper, /getIncludeDisabled: \(\) => includeDisabled\.value/)
  assert.match(helper, /setPriorityRoutes/)
  assert.match(helper, /setRoutes/)
  assert.doesNotMatch(source, /function applyReorderedRoutes/)
  assert.doesNotMatch(mutationActionsController, /applyGatewayPriorityReorderedRoutes\(/)
})

test('GatewayView delegates priority presets through the priority controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRouteActions"), "GatewayView delegates priority presets through the priority controller should keep useGatewayPageRouteActions in gateway page controller")
  assert.ok(shellBindingsControllerSource.includes("handlePriorityPreset"), "GatewayView delegates priority presets through the priority controller should keep handlePriorityPreset in gateway page controller")
})
