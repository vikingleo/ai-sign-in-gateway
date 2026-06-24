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

test('opens priority dialog with the selected route and current route list', () => {
  const dialog = useGatewayPriorityDialog()
  const selectedRoute = route({ id: 2, route_priority: 3 })
  const routes = [route({ id: 1 }), selectedRoute]

  dialog.openDialog(selectedRoute, routes)

  assert.equal(dialog.open.value, true)
  assert.deepEqual(dialog.route.value, selectedRoute)
  assert.equal(dialog.insertIndex.value, undefined)
  assert.deepEqual(dialog.routes.value, routes)
})

test('updates priority dialog loading, selected route, and insert index state', () => {
  const dialog = useGatewayPriorityDialog()
  const staleRoute = route({ id: 2, route_priority: 3 })
  const updatedRoute = route({ id: 2, route_priority: 1 })
  dialog.openDialog(staleRoute, [staleRoute])

  dialog.setLoading(true)
  dialog.routes.value = [route({ id: 1 }), updatedRoute]
  dialog.selectRoute(staleRoute)
  dialog.insertIndex.value = 4
  dialog.clearInsertIndex()
  dialog.setLoading(false)

  assert.equal(dialog.loading.value, false)
  assert.deepEqual(dialog.route.value, updatedRoute)
  assert.equal(dialog.insertIndex.value, undefined)
})

test('builds priority route row classes from the current dialog route', () => {
  const dialog = useGatewayPriorityDialog()
  const selectedRoute = route({ id: 2, route_priority: 3 })
  const updatedRoute = route({ id: 3, route_priority: 1 })
  dialog.openDialog(selectedRoute, [selectedRoute])

  assert.equal(dialog.rowClassName(route({ id: 2 })), 'priority-route-row priority-route-row--current')
  assert.equal(dialog.rowClassName(route({ id: 3 })), 'priority-route-row')

  dialog.routes.value = [selectedRoute, updatedRoute]
  dialog.selectRoute(updatedRoute)

  assert.equal(dialog.rowClassName(route({ id: 2 })), 'priority-route-row')
  assert.equal(dialog.rowClassName(route({ id: 3 })), 'priority-route-row priority-route-row--current')
})

test('applies reordered priority routes through a single controller boundary', () => {
  const disabledRoute = route({ id: 1, route_priority: 1, is_enabled: false, route_path: 'legacy' })
  const enabledRoute = route({ id: 2, route_priority: 2, is_enabled: true, site_name: '' })
  let appliedPriorityRoutes: GatewayRoute[] = []
  let appliedRoutes: GatewayRoute[] = []

  applyGatewayPriorityReorderedRoutes({
    routeData: [disabledRoute, enabledRoute],
    includeDisabled: false,
    setPriorityRoutes: (routes) => {
      appliedPriorityRoutes = routes
    },
    setRoutes: (routes) => {
      appliedRoutes = routes
    },
  })

  assert.deepEqual(
    appliedPriorityRoutes.map((item) => item.id),
    [1, 2],
  )
  assert.deepEqual(
    appliedRoutes.map((item) => item.id),
    [2],
  )
  assert.equal(appliedPriorityRoutes[0].route_path, '')
})

test('createApplyGatewayPriorityReorderedRoutesAction assembles reorder dependencies without changing behavior', () => {
  const disabledRoute = route({ id: 1, route_priority: 1, is_enabled: false, route_path: 'legacy' })
  const enabledRoute = route({ id: 2, route_priority: 2, is_enabled: true, site_name: '' })
  let includeDisabled = false
  let appliedPriorityRoutes: GatewayRoute[] = []
  let appliedRoutes: GatewayRoute[] = []

  const applyReorderedRoutes = createApplyGatewayPriorityReorderedRoutesAction({
    getIncludeDisabled: () => includeDisabled,
    setPriorityRoutes: (routes) => {
      appliedPriorityRoutes = routes
    },
    setRoutes: (routes) => {
      appliedRoutes = routes
    },
  })

  applyReorderedRoutes([disabledRoute, enabledRoute])

  assert.deepEqual(
    appliedPriorityRoutes.map((item) => item.id),
    [1, 2],
  )
  assert.deepEqual(
    appliedRoutes.map((item) => item.id),
    [2],
  )
  assert.equal(appliedPriorityRoutes[0].route_path, '')

  includeDisabled = true
  applyReorderedRoutes([disabledRoute, enabledRoute])

  assert.deepEqual(
    appliedRoutes.map((item) => item.id),
    [1, 2],
  )
})

test('loads priority routes through injected dialog dependencies', async () => {
  const selectedRoute = route({ id: 12, route_priority: 5 })
  const currentRoutes = [route({ id: 1 }), selectedRoute]
  const apiRoutes = [route({ id: 2, site_name: '未归一' }), selectedRoute]
  const normalizedRoutes = apiRoutes.map((item) => ({ ...item, site_name: `${item.site_name}-normalized` }))
  const openedRouteIds: number[] = []
  const loadingValues: boolean[] = []
  const requestCalls: Array<{ includeDisabled: true }> = []
  const selectedRouteIds: number[] = []
  let openedCurrentRoutes: GatewayRoute[] = []
  let appliedRoutes: GatewayRoute[] = []

  await loadGatewayPriorityRoutes({
    route: selectedRoute,
    currentRoutes,
    requestRoutes: async (options) => {
      requestCalls.push(options)
      return apiRoutes
    },
    normalizeRoute: (value) => normalizedRoutes.find((item) => item.id === value.id) ?? value,
    openDialog: (openedRoute, openedRoutes) => {
      openedRouteIds.push(openedRoute.id)
      openedCurrentRoutes = openedRoutes
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

  assert.deepEqual(openedRouteIds, [12])
  assert.deepEqual(openedCurrentRoutes, currentRoutes)
  assert.deepEqual(requestCalls, [{ includeDisabled: true }])
  assert.deepEqual(appliedRoutes, normalizedRoutes)
  assert.deepEqual(selectedRouteIds, [12])
  assert.deepEqual(loadingValues, [true, false])
})

test('loadGatewayPriorityRoutes reports list load errors and resets loading', async () => {
  const selectedRoute = route({ id: 14 })
  const loadingValues: boolean[] = []
  const notices: string[] = []
  let openedCount = 0

  await loadGatewayPriorityRoutes({
    route: selectedRoute,
    currentRoutes: [selectedRoute],
    requestRoutes: async () => {
      throw new Error('priority list timeout')
    },
    normalizeRoute: (value) => value,
    openDialog: () => {
      openedCount += 1
    },
    setLoading: (loading) => loadingValues.push(loading),
    setRoutes: () => {
      throw new Error('should not set routes on failure')
    },
    selectRoute: () => {
      throw new Error('should not select route on failure')
    },
    showPlanNotice: (plan) => notices.push(plan.notice.message),
  })

  assert.equal(openedCount, 1)
  assert.deepEqual(notices, ['priority list timeout'])
  assert.deepEqual(loadingValues, [true, false])
})
