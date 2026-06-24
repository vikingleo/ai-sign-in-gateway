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

test('builds realtime gateway refresh apply plans from mount, abort and priority state', () => {
  let normalizeCalls = 0
  const normalizeRoute = (route: string) => {
    normalizeCalls += 1
    return route.toUpperCase()
  }

  assert.deepEqual(buildGatewayRealtimeRefreshApplyPlan({
    mounted: false,
    aborted: false,
    priorityDialogOpen: false,
    routes: ['primary'],
    normalizeRoute,
    refreshActiveRequests: true,
  }), {
    shouldApply: false,
    normalizedRoutes: [],
    updatePriorityRoutes: false,
    refreshActiveRequests: false,
  })
  assert.equal(normalizeCalls, 0)

  assert.deepEqual(buildGatewayRealtimeRefreshApplyPlan({
    mounted: true,
    aborted: true,
    priorityDialogOpen: false,
    routes: ['primary'],
    normalizeRoute,
    refreshActiveRequests: true,
  }), {
    shouldApply: false,
    normalizedRoutes: [],
    updatePriorityRoutes: false,
    refreshActiveRequests: false,
  })
  assert.equal(normalizeCalls, 0)

  assert.deepEqual(buildGatewayRealtimeRefreshApplyPlan({
    mounted: true,
    aborted: false,
    priorityDialogOpen: false,
    routes: ['primary', 'backup'],
    normalizeRoute,
    refreshActiveRequests: true,
  }), {
    shouldApply: true,
    normalizedRoutes: ['PRIMARY', 'BACKUP'],
    updatePriorityRoutes: true,
    refreshActiveRequests: true,
  })
  assert.equal(normalizeCalls, 2)

  assert.deepEqual(buildGatewayRealtimeRefreshApplyPlan({
    mounted: true,
    aborted: false,
    priorityDialogOpen: true,
    routes: ['primary'],
    normalizeRoute,
    refreshActiveRequests: false,
  }), {
    shouldApply: true,
    normalizedRoutes: ['PRIMARY'],
    updatePriorityRoutes: false,
    refreshActiveRequests: false,
  })
  assert.equal(normalizeCalls, 3)
})

test('builds gateway usage load plans from monitor state, range and silent mode', () => {
  assert.deepEqual(buildGatewayUsageLoadPlan({
    isMonitor: false,
    start: '2026-05-25T00:00',
    end: '2026-05-25T23:59',
    silent: false,
  }), {
    shouldLoad: false,
    clearUsage: true,
    showInvalidRangeError: false,
    invalidRangeNotice: null,
    requestRange: null,
  })

  assert.deepEqual(buildGatewayUsageLoadPlan({
    isMonitor: true,
    start: '',
    end: '2026-05-25T23:59',
    silent: false,
  }), {
    shouldLoad: false,
    clearUsage: false,
    showInvalidRangeError: true,
    invalidRangeNotice: {
      tone: 'error',
      message: '请选择有效的开始和结束时间',
    },
    requestRange: null,
  })

  assert.deepEqual(buildGatewayUsageLoadPlan({
    isMonitor: true,
    start: '2026-05-25T00:00',
    end: '',
    silent: true,
  }), {
    shouldLoad: false,
    clearUsage: false,
    showInvalidRangeError: false,
    invalidRangeNotice: null,
    requestRange: null,
  })

  assert.deepEqual(buildGatewayUsageLoadPlan({
    isMonitor: true,
    start: '2026-05-25T00:00',
    end: '2026-05-25T23:59',
    silent: false,
  }), {
    shouldLoad: true,
    clearUsage: false,
    showInvalidRangeError: false,
    invalidRangeNotice: null,
    requestRange: {
      start: '2026-05-25T00:00',
      end: '2026-05-25T23:59',
    },
  })
})

test('GatewayView delegates invalid usage range notices through the runtime controller', async () => {
  const source = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')
  const usagePageController = await readFile(gatewayUsagePageControllerPath, 'utf8')
  const dataOperationsPageController = await readFile(gatewayDataOperationsPageControllerPath, 'utf8')

  assert.match(source, /useGatewayRuntimeOperationsPageActions\(\{[\s\S]*showNotice/)
  assert.match(dataOperationsPageController, /const usageActions = useGatewayUsagePageActions\(\{/)
  assert.match(usagePageController, /createLoadGatewayUsageRuntimeAction\(\{[\s\S]*showNotice/)
  assert.doesNotMatch(usagePageController, /const notice = usagePlan\.invalidRangeNotice/)
  assert.doesNotMatch(usagePageController, /toast\.error\('请选择有效的开始和结束时间'\)/)
})

test('builds gateway usage load result plans from mount and abort state', () => {
  assert.deepEqual(buildGatewayUsageLoadResultPlan({
    mounted: true,
    aborted: false,
  }), {
    applyUsage: true,
  })

  assert.deepEqual(buildGatewayUsageLoadResultPlan({
    mounted: false,
    aborted: false,
  }), {
    applyUsage: false,
  })

  assert.deepEqual(buildGatewayUsageLoadResultPlan({
    mounted: true,
    aborted: true,
  }), {
    applyUsage: false,
  })
})
