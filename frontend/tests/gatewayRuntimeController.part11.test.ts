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

test('refreshes realtime gateway data through injected runtime dependencies', async () => {
  const controller = new AbortController()
  const calls: string[] = []
  const state = {
    overview: '',
    routes: [] as string[],
    priorityRoutes: [] as string[],
    logs: [] as string[],
    routeGroups: [] as string[],
  }

  await refreshGatewayRealtimeData({
    now: 1000,
    visible: true,
    isMonitor: true,
    logsDrawerOpen: false,
    includeDisabled: true,
    mounted: () => true,
    priorityDialogOpen: () => false,
    startAutoRefresh: ({ now, visible }) => {
      assert.equal(now, 1000)
      assert.equal(visible, true)
      calls.push('start')
      return true
    },
    finishAutoRefresh: () => {
      calls.push('finish')
    },
    controllerSlot: {
      replace: () => controller,
      clearIfCurrent: (current) => {
        assert.equal(current, controller)
        calls.push('clear')
        return true
      },
    },
    requestOverview: async ({ signal }) => {
      assert.equal(signal, controller.signal)
      calls.push('overview')
      return 'overview'
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
    requestRouteGroups: async ({ signal }) => {
      assert.equal(signal, controller.signal)
      calls.push('route-groups')
      return ['route-group']
    },
    currentLogs: () => ['old-log'],
    normalizeRoute: (route) => route.toUpperCase(),
    setOverview: (overview) => {
      state.overview = overview
      calls.push('set-overview')
    },
    setRoutes: (routes) => {
      state.routes = routes
      calls.push('set-routes')
    },
    setPriorityRoutes: (routes) => {
      state.priorityRoutes = routes
      calls.push('set-priority-routes')
    },
    setLogs: (logs) => {
      state.logs = logs
      calls.push('set-logs')
    },
    setRouteGroups: (groups) => {
      state.routeGroups = groups
      calls.push('set-route-groups')
    },
    setAutoRefreshError: (message, occurredAt) => {
      calls.push(`set-refresh-error:${message ?? ''}:${occurredAt ?? ''}`)
    },
    refreshActiveRequests: async (silent) => {
      assert.equal(silent, true)
      calls.push('refresh-active')
    },
    isAbortError: () => false,
  })

  assert.deepEqual(calls, [
    'start',
    'overview',
    'routes',
    'logs',
    'route-groups',
    'set-overview',
    'set-routes',
    'set-priority-routes',
    'set-logs',
    'set-route-groups',
    'set-refresh-error::',
    'refresh-active',
    'clear',
    'finish',
  ])
  assert.equal(state.overview, 'overview')
  assert.deepEqual(state.routes, ['PRIMARY'])
  assert.deepEqual(state.priorityRoutes, ['PRIMARY'])
  assert.deepEqual(state.logs, ['log'])
  assert.deepEqual(state.routeGroups, ['route-group'])
})

test('refreshGatewayRealtimeData skips requests when runtime throttling rejects start', async () => {
  const calls: string[] = []

  await refreshGatewayRealtimeData({
    now: 1000,
    visible: true,
    isMonitor: true,
    logsDrawerOpen: true,
    includeDisabled: false,
    mounted: () => true,
    priorityDialogOpen: () => false,
    startAutoRefresh: () => {
      calls.push('start')
      return false
    },
    finishAutoRefresh: () => {
      calls.push('finish')
    },
    controllerSlot: {
      replace: () => {
        throw new Error('controller should not start')
      },
      clearIfCurrent: () => true,
    },
    requestOverview: async () => {
      throw new Error('overview should not load')
    },
    requestRoutes: async () => {
      throw new Error('routes should not load')
    },
    requestLogs: async () => {
      throw new Error('logs should not load')
    },
    requestRouteGroups: async () => {
      throw new Error('route groups should not load')
    },
    currentLogs: () => [],
    normalizeRoute: (route: string) => route,
    setOverview: () => {},
    setRoutes: () => {},
    setPriorityRoutes: () => {},
    setLogs: () => {},
    setRouteGroups: () => {},
    setAutoRefreshError: () => {},
    refreshActiveRequests: async () => {},
    isAbortError: () => false,
  })

  assert.deepEqual(calls, ['start'])
})

test('refreshGatewayRealtimeData preserves stale, mounted-out, and priority-editing boundaries', async () => {
  const stale = new AbortController()
  const mountedOut = new AbortController()
  const priorityEditing = new AbortController()
  const calls: string[] = []
  const base = {
    now: 1000,
    visible: true,
    isMonitor: false,
    logsDrawerOpen: false,
    includeDisabled: false,
    startAutoRefresh: () => true,
    finishAutoRefresh: () => {
      calls.push('finish')
    },
    requestOverview: async () => 'overview',
    requestRoutes: async () => ['primary'],
    requestLogs: async () => ['log'],
    requestRouteGroups: async () => ['route-group'],
    currentLogs: () => ['existing-log'],
    normalizeRoute: (route: string) => route.toUpperCase(),
    setOverview: () => {
      calls.push('set-overview')
    },
    setRoutes: () => {
      calls.push('set-routes')
    },
    setPriorityRoutes: () => {
      calls.push('set-priority-routes')
    },
    setLogs: () => {
      calls.push('set-logs')
    },
    setRouteGroups: () => {
      calls.push('set-route-groups')
    },
    setAutoRefreshError: (message: string | null, occurredAt: number | null) => {
      calls.push(`set-refresh-error:${message ?? ''}:${occurredAt ?? ''}`)
    },
    refreshActiveRequests: async () => {
      calls.push('refresh-active')
    },
    isAbortError: () => false,
  }

  await refreshGatewayRealtimeData({
    ...base,
    mounted: () => true,
    priorityDialogOpen: () => false,
    controllerSlot: {
      replace: () => stale,
      clearIfCurrent: () => true,
    },
    requestRoutes: async () => {
      stale.abort()
      return ['stale']
    },
  })

  await refreshGatewayRealtimeData({
    ...base,
    mounted: () => false,
    priorityDialogOpen: () => false,
    controllerSlot: {
      replace: () => mountedOut,
      clearIfCurrent: () => true,
    },
  })

  await refreshGatewayRealtimeData({
    ...base,
    mounted: () => true,
    priorityDialogOpen: () => true,
    controllerSlot: {
      replace: () => priorityEditing,
      clearIfCurrent: () => true,
    },
  })

  assert.deepEqual(calls, [
    'finish',
    'set-overview',
    'set-routes',
    'set-logs',
    'set-route-groups',
    'set-refresh-error::',
    'finish',
  ])
})

test('refreshGatewayRealtimeData records non-abort refresh failures without notifying', async () => {
  const controller = new AbortController()
  const calls: string[] = []

  await refreshGatewayRealtimeData({
    now: 9876,
    visible: true,
    isMonitor: true,
    logsDrawerOpen: false,
    includeDisabled: false,
    mounted: () => true,
    priorityDialogOpen: () => false,
    startAutoRefresh: () => {
      calls.push('start')
      return true
    },
    finishAutoRefresh: () => {
      calls.push('finish')
    },
    controllerSlot: {
      replace: () => controller,
      clearIfCurrent: () => {
        calls.push('clear')
        return true
      },
    },
    requestOverview: async () => {
      throw new Error('overview failed')
    },
    requestRoutes: async () => ['route'],
    requestLogs: async () => ['log'],
    requestRouteGroups: async () => ['group'],
    currentLogs: () => [],
    normalizeRoute: (route: string) => route,
    setOverview: () => {
      calls.push('set-overview')
    },
    setRoutes: () => {
      calls.push('set-routes')
    },
    setPriorityRoutes: () => {
      calls.push('set-priority-routes')
    },
    setLogs: () => {
      calls.push('set-logs')
    },
    setRouteGroups: () => {
      calls.push('set-route-groups')
    },
    setAutoRefreshError: (message, occurredAt) => {
      calls.push(`set-refresh-error:${message}:${occurredAt}`)
    },
    refreshActiveRequests: async () => {
      calls.push('refresh-active')
    },
    isAbortError: () => false,
  })

  assert.deepEqual(calls, [
    'start',
    'set-refresh-error:overview failed:9876',
    'clear',
    'finish',
  ])
})
