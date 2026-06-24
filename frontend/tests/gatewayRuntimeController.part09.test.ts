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

test('loadGatewayUsage suppresses stale, aborted, mounted-out, and silent errors', async () => {
  const stale = new AbortController()
  const current = new AbortController()
  const notices: string[] = []
  const usageSnapshots: string[] = []
  const loadingCalls: boolean[] = []
  const base = {
    silent: false,
    isMonitor: true,
    requestRange: {
      start: '2026-05-25T00:00:00.000Z',
      end: '2026-05-25T23:59:59.000Z',
    },
    mounted: () => true,
    controllerSlot: {
      replace: () => current,
      clearIfCurrent: () => true,
    },
    requestUsage: async () => 'unused',
    setUsage: (usage: string | null) => {
      if (usage) {
        usageSnapshots.push(usage)
      }
    },
    setUsageLoading: (loading: boolean) => {
      loadingCalls.push(loading)
    },
    showNotice: () => {},
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
    isAbortError: (err: unknown) => err instanceof Error && err.name === 'AbortError',
  }

  await loadGatewayUsage({
    ...base,
    controllerSlot: {
      replace: () => stale,
      clearIfCurrent: () => true,
    },
    requestUsage: async () => {
      stale.abort()
      return 'stale'
    },
  })

  await loadGatewayUsage({
    ...base,
    mounted: () => false,
    requestUsage: async () => 'mounted-out',
  })

  await loadGatewayUsage({
    ...base,
    requestUsage: async () => {
      const error = new Error('aborted')
      error.name = 'AbortError'
      throw error
    },
  })

  await loadGatewayUsage({
    ...base,
    silent: true,
    requestUsage: async () => {
      throw new Error('silent failed')
    },
  })

  await loadGatewayUsage({
    ...base,
    requestUsage: async () => {
      throw new Error('visible failed')
    },
  })

  assert.deepEqual(usageSnapshots, [])
  assert.deepEqual(notices, ['visible failed'])
  assert.deepEqual(loadingCalls, [true, false, true, true, false, true, false, true, false])
})

test('GatewayView delegates usage loading to the runtime controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRuntimeActions"), "GatewayView delegates usage loading to the page runtime actions controller should keep useGatewayPageRuntimeActions in gateway page controller")
  assert.ok(runtimeActionsControllerSource.includes("useGatewayRuntimeOperationsPageActions"), "GatewayView delegates usage loading to the runtime controller should keep useGatewayRuntimeOperationsPageActions in gateway page runtime actions controller")
  assert.ok(runtimeActionsControllerSource.includes("loadUsage: state.gatewayRuntime.loadUsage"), "GatewayView delegates usage loading to the runtime controller should keep loadUsage: state.gatewayRuntime.loadUsage in gateway page runtime actions controller")
})

test('builds active request refresh plans from monitor state, visibility and silent mode', () => {
  assert.deepEqual(buildGatewayActiveRequestsRefreshPlan({
    isMonitor: false,
    visible: true,
    now: 1000,
    silent: true,
  }), {
    shouldStart: false,
    startOptions: null,
    loadSilent: true,
  })

  assert.deepEqual(buildGatewayActiveRequestsRefreshPlan({
    isMonitor: true,
    visible: false,
    now: 1000,
    silent: false,
  }), {
    shouldStart: false,
    startOptions: null,
    loadSilent: false,
  })

  assert.deepEqual(buildGatewayActiveRequestsRefreshPlan({
    isMonitor: true,
    visible: true,
    now: 1200,
    silent: false,
  }), {
    shouldStart: true,
    startOptions: {
      now: 1200,
      visible: true,
      enabled: true,
    },
    loadSilent: false,
  })
})

test('builds active request load result plans from mount and abort state', () => {
  assert.deepEqual(buildGatewayActiveRequestsLoadResultPlan({
    mounted: true,
    aborted: false,
  }), {
    applySnapshot: true,
  })

  assert.deepEqual(buildGatewayActiveRequestsLoadResultPlan({
    mounted: false,
    aborted: false,
  }), {
    applySnapshot: false,
  })

  assert.deepEqual(buildGatewayActiveRequestsLoadResultPlan({
    mounted: true,
    aborted: true,
  }), {
    applySnapshot: false,
  })
})
