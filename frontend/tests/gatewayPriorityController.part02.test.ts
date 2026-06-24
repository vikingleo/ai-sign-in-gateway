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

test('createOpenGatewayPriorityDialogAction assembles list load dependencies without changing behavior', async () => {
  const selectedRoute = route({ id: 12, route_priority: 5 })
  const currentRoutes = [route({ id: 1 }), selectedRoute]
  const nextCurrentRoutes = [route({ id: 9 }), selectedRoute]
  const apiRoutes = [route({ id: 2, site_name: '未归一' }), selectedRoute]
  const normalizedRoutes = apiRoutes.map((item) => ({ ...item, site_name: `${item.site_name}-normalized` }))
  const openedRouteIds: number[] = []
  const loadingValues: boolean[] = []
  const requestCalls: Array<{ includeDisabled: true }> = []
  const selectedRouteIds: number[] = []
  const openedCurrentRouteIds: number[][] = []
  let currentRouteList = currentRoutes
  let appliedRoutes: GatewayRoute[] = []

  const openPriorityDialog = createOpenGatewayPriorityDialogAction({
    getCurrentRoutes: () => currentRouteList,
    requestRoutes: async (options) => {
      requestCalls.push(options)
      return apiRoutes
    },
    normalizeRoute: (value) => normalizedRoutes.find((item) => item.id === value.id) ?? value,
    openDialog: (openedRoute, openedRoutes) => {
      openedRouteIds.push(openedRoute.id)
      openedCurrentRouteIds.push(openedRoutes.map((item) => item.id))
    },
    setLoading: (loading) => loadingValues.push(loading),
    setRoutes: (routes) => {
      appliedRoutes = routes
    },
    selectRoute: (selected) => selectedRouteIds.push(selected.id),
    showPlanNotice: () => {
      throw new Error('should not show notice on success')
    },
  })

  await openPriorityDialog(selectedRoute)
  currentRouteList = nextCurrentRoutes
  await openPriorityDialog(selectedRoute)

  assert.deepEqual(openedRouteIds, [12, 12])
  assert.deepEqual(openedCurrentRouteIds, [[1, 12], [9, 12]])
  assert.deepEqual(requestCalls, [{ includeDisabled: true }, { includeDisabled: true }])
  assert.deepEqual(appliedRoutes, normalizedRoutes)
  assert.deepEqual(selectedRouteIds, [12, 12])
  assert.deepEqual(loadingValues, [true, false, true, false])
})

test('moves a priority route through injected dependencies', async () => {
  const selectedRoute = route({ id: 12, route_priority: 5 })
  const reorderedRoutes = [route({ id: 2, route_priority: 1 }), selectedRoute]
  const loadingValues: boolean[] = []
  const requestPayloads: Array<{ route_id?: number; mode: 'move' | 'package' | 'balance'; index?: number }> = []
  const selectedRouteIds: number[] = []
  const notices: string[] = []
  let appliedRoutes: GatewayRoute[] = []

  await moveGatewayPriorityRoute({
    route: selectedRoute,
    target: 3.8,
    requestReorder: async (payload) => {
      requestPayloads.push(payload)
      return reorderedRoutes
    },
    applyReorderedRoutes: (routes) => {
      appliedRoutes = routes
    },
    setLoading: (loading) => loadingValues.push(loading),
    selectRoute: (selected) => selectedRouteIds.push(selected.id),
    showNotice: () => {
      throw new Error('should not show validation notice on success')
    },
    showPlanNotice: (plan) => notices.push(plan.notice.message),
  })

  assert.deepEqual(requestPayloads, [{ route_id: 12, mode: 'move', index: 3 }])
  assert.deepEqual(appliedRoutes, reorderedRoutes)
  assert.deepEqual(selectedRouteIds, [12])
  assert.deepEqual(notices, ['优先级已更新。'])
  assert.deepEqual(loadingValues, [true, false])
})

test('createMoveGatewayPriorityRouteAction assembles move dependencies without changing behavior', async () => {
  let selectedRoute: GatewayRoute | null = route({ id: 12, route_priority: 5 })
  let target: number | null | undefined = 3.8
  const reorderedRoutes = [route({ id: 2, route_priority: 1 }), selectedRoute]
  const loadingValues: boolean[] = []
  const requestPayloads: Array<{ route_id?: number; mode: 'move' | 'package' | 'balance'; index?: number }> = []
  const selectedRouteIds: number[] = []
  const notices: string[] = []
  let appliedRoutes: GatewayRoute[] = []

  const movePriorityRoute = createMoveGatewayPriorityRouteAction({
    getRoute: () => selectedRoute,
    getTarget: () => target,
    requestReorder: async (payload) => {
      requestPayloads.push(payload)
      return reorderedRoutes
    },
    applyReorderedRoutes: (routes) => {
      appliedRoutes = routes
    },
    setLoading: (loading) => loadingValues.push(loading),
    selectRoute: (selected) => selectedRouteIds.push(selected.id),
    showNotice: () => {
      throw new Error('should not show validation notice on success')
    },
    showPlanNotice: (plan) => notices.push(plan.notice.message),
  })

  await movePriorityRoute()

  assert.deepEqual(requestPayloads, [{ route_id: 12, mode: 'move', index: 3 }])
  assert.deepEqual(appliedRoutes, reorderedRoutes)
  assert.deepEqual(selectedRouteIds, [12])
  assert.deepEqual(notices, ['优先级已更新。'])
  assert.deepEqual(loadingValues, [true, false])

  selectedRoute = null
  target = 1
  await movePriorityRoute()

  assert.deepEqual(requestPayloads, [{ route_id: 12, mode: 'move', index: 3 }])
})

test('moveGatewayPriorityRoute reports validation notices without sending requests', async () => {
  const loadingValues: boolean[] = []
  const notices: string[] = []

  await moveGatewayPriorityRoute({
    route: route({ id: 12 }),
    target: undefined,
    requestReorder: async () => {
      throw new Error('should not request when target is missing')
    },
    applyReorderedRoutes: () => {
      throw new Error('should not apply routes when target is missing')
    },
    setLoading: (loading) => loadingValues.push(loading),
    selectRoute: () => {
      throw new Error('should not select route when target is missing')
    },
    showNotice: (notice) => notices.push(notice.message),
    showPlanNotice: () => {
      throw new Error('should not show plan notice when validation fails')
    },
  })

  assert.deepEqual(notices, ['请输入目标优先级。'])
  assert.deepEqual(loadingValues, [])
})

test('moveGatewayPriorityRoute ignores empty selected routes', async () => {
  let sideEffectCount = 0

  await moveGatewayPriorityRoute({
    route: null,
    target: 2,
    requestReorder: async () => {
      sideEffectCount += 1
      return []
    },
    applyReorderedRoutes: () => {
      sideEffectCount += 1
    },
    setLoading: () => {
      sideEffectCount += 1
    },
    selectRoute: () => {
      sideEffectCount += 1
    },
    showNotice: () => {
      sideEffectCount += 1
    },
    showPlanNotice: () => {
      sideEffectCount += 1
    },
  })

  assert.equal(sideEffectCount, 0)
})
