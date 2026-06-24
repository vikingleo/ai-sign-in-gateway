import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildGatewayActiveRequestsLoadErrorPlan,
  buildGatewayActiveRequestsLoadResultPlan,
  buildGatewayActiveRequestsRefreshPlan,
  buildGatewayAutoRefreshTimerPlan,
  buildGatewayInitialDataApplyPlan,
  buildGatewayInitialDataLoadErrorPlan,
  buildGatewayInitialDataLoadPlan,
  buildGatewayRealtimeRefreshApplyPlan,
  buildGatewayRealtimeRefreshPlan,
  buildGatewayUsageLoadErrorPlan,
  buildGatewayUsageLoadPlan,
  buildGatewayUsageLoadResultPlan,
  buildGatewayVisibilityRefreshPlan,
  createGatewayAbortControllerSlot,
  handleGatewayVisibilityRefresh,
  loadGatewayActiveRequests,
  loadGatewayData,
  loadGatewayUsage,
  refreshGatewayRealtimeData,
  useGatewayRuntimeController,
  useGatewayRuntimeState,
} from '../src/gatewayRuntimeController.ts'
import * as gatewayRuntimeController from '../src/gatewayRuntimeController.ts'
import * as gatewayInitialDataLoadController from '../src/gatewayInitialDataLoadController.ts'
import * as gatewayRuntimeLoadController from '../src/gatewayRuntimeLoadController.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRuntimeActionsControllerPath = new URL(
  '../src/gatewayPageRuntimeActionsController.ts',
  import.meta.url,
)
const gatewayPageRouteActionsControllerPath = new URL('../src/gatewayPageRouteActionsController.ts', import.meta.url)
const gatewayRouteMutationActionsControllerPath = new URL(
  '../src/gatewayRouteMutationActionsController.ts',
  import.meta.url,
)
const gatewayRuntimeControllerPath = new URL('../src/gatewayRuntimeController.ts', import.meta.url)
const gatewayRuntimeLoadControllerPath = new URL('../src/gatewayRuntimeLoadController.ts', import.meta.url)
const gatewayDataOperationsPageControllerPath = new URL(
  '../src/gatewayDataOperationsPageController.ts',
  import.meta.url,
)
const gatewayUsagePageControllerPath = new URL('../src/gatewayUsagePageController.ts', import.meta.url)
const gatewayRealtimePageControllerPath = new URL('../src/gatewayRealtimePageController.ts', import.meta.url)
const gatewayRealtimeOperationsPageControllerPath = new URL(
  '../src/gatewayRealtimeOperationsPageController.ts',
  import.meta.url,
)
const gatewayInitialDataPageControllerPath = new URL('../src/gatewayInitialDataPageController.ts', import.meta.url)

test('loads initial gateway data through injected runtime dependencies', async () => {
  const controller = new AbortController()
  const calls: string[] = []
  const state = {
    overview: '',
    settings: '',
    routes: [] as string[],
    priorityRoutes: [] as string[],
    logs: [] as string[],
    groups: [] as string[],
    routeGroups: [] as string[],
    usage: '',
    activeRequests: [] as string[],
    loading: false,
  }

  await loadGatewayData({
    isMonitor: true,
    hasUsageSnapshot: false,
    includeDisabled: true,
    requestRange: {
      start: '2026-05-26T00:00',
      end: '2026-05-26T23:59',
    },
    currentUsage: () => 'cached-usage',
    mounted: () => true,
    controllerSlot: {
      replace: () => controller,
      clearIfCurrent: (current) => {
        assert.equal(current, controller)
        calls.push('clear')
        return true
      },
    },
    setLoading: (loading) => {
      state.loading = loading
      calls.push(`loading-${loading}`)
    },
    requestOverview: async ({ signal }) => {
      assert.equal(signal, controller.signal)
      calls.push('overview')
      return 'overview'
    },
    requestSettings: async ({ signal }) => {
      assert.equal(signal, controller.signal)
      calls.push('settings')
      return 'settings'
    },
    requestRoutes: async ({ includeDisabled, signal }) => {
      assert.equal(includeDisabled, true)
      assert.equal(signal, controller.signal)
      calls.push('routes')
      return ['primary']
    },
    requestLogs: async (limit, { signal }) => {
      assert.equal(limit, 80)
      assert.equal(signal, controller.signal)
      calls.push('logs')
      return ['log']
    },
    requestSiteGroups: async ({ signal }) => {
      assert.equal(signal, controller.signal)
      calls.push('groups')
      return ['group']
    },
    requestRouteGroups: async ({ signal }) => {
      assert.equal(signal, controller.signal)
      calls.push('route-groups')
      return ['route-group']
    },
    requestUsage: async ({ start, end, signal }) => {
      assert.equal(start, '2026-05-26T00:00')
      assert.equal(end, '2026-05-26T23:59')
      assert.equal(signal, controller.signal)
      calls.push('usage')
      return 'usage'
    },
    requestActiveRequests: async ({ signal }) => {
      assert.equal(signal, controller.signal)
      calls.push('active')
      return ['active']
    },
    normalizeRoute: (route) => route.toUpperCase(),
    setOverview: (overview) => {
      state.overview = overview
      calls.push('set-overview')
    },
    setSettings: (settings) => {
      state.settings = settings
      calls.push('set-settings')
    },
    setPriorityRoutes: (routes) => {
      state.priorityRoutes = routes
      calls.push('set-priority-routes')
    },
    setRoutes: (routes) => {
      state.routes = routes
      calls.push('set-routes')
    },
    setLogs: (logs) => {
      state.logs = logs
      calls.push('set-logs')
    },
    setSiteGroups: (groups) => {
      state.groups = groups
      calls.push('set-groups')
    },
    setRouteGroups: (groups) => {
      state.routeGroups = groups
      calls.push('set-route-groups')
    },
    setUsage: (usage) => {
      state.usage = usage
      calls.push('set-usage')
    },
    setActiveRequests: (activeRequests) => {
      state.activeRequests = activeRequests
      calls.push('set-active')
    },
    applyActiveRequestSnapshot: (activeRequests) => {
      assert.deepEqual(activeRequests, ['active'])
      calls.push('apply-active')
    },
    showPlanNotice: () => {
      throw new Error('success should not show an error notice')
    },
    isAbortError: () => false,
  })

  assert.deepEqual(calls, [
    'loading-true',
    'overview',
    'settings',
    'routes',
    'logs',
    'groups',
    'route-groups',
    'usage',
    'active',
    'set-overview',
    'set-settings',
    'set-priority-routes',
    'set-routes',
    'set-logs',
    'set-groups',
    'set-route-groups',
    'set-usage',
    'set-active',
    'apply-active',
    'clear',
    'loading-false',
  ])
  assert.deepEqual(state, {
    overview: 'overview',
    settings: 'settings',
    routes: ['PRIMARY'],
    priorityRoutes: ['PRIMARY'],
    logs: ['log'],
    groups: ['group'],
    routeGroups: ['route-group'],
    usage: 'usage',
    activeRequests: ['active'],
    loading: false,
  })
})
