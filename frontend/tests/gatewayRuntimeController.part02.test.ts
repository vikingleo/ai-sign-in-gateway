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

test('builds initial gateway data apply plans from mount, abort and snapshot state', () => {
  let normalizeCalls = 0
  const normalizeRoute = (route: string) => {
    normalizeCalls += 1
    return route.toUpperCase()
  }

  assert.deepEqual(buildGatewayInitialDataApplyPlan({
    mounted: false,
    aborted: false,
    routes: ['primary'],
    normalizeRoute,
    applyActiveRequestSnapshot: true,
  }), {
    shouldApply: false,
    normalizedRoutes: [],
    applyActiveRequestSnapshot: false,
  })
  assert.equal(normalizeCalls, 0)

  assert.deepEqual(buildGatewayInitialDataApplyPlan({
    mounted: true,
    aborted: true,
    routes: ['primary'],
    normalizeRoute,
    applyActiveRequestSnapshot: true,
  }), {
    shouldApply: false,
    normalizedRoutes: [],
    applyActiveRequestSnapshot: false,
  })
  assert.equal(normalizeCalls, 0)

  assert.deepEqual(buildGatewayInitialDataApplyPlan({
    mounted: true,
    aborted: false,
    routes: ['primary', 'backup'],
    normalizeRoute,
    applyActiveRequestSnapshot: true,
  }), {
    shouldApply: true,
    normalizedRoutes: ['PRIMARY', 'BACKUP'],
    applyActiveRequestSnapshot: true,
  })
  assert.equal(normalizeCalls, 2)

  assert.deepEqual(buildGatewayInitialDataApplyPlan({
    mounted: true,
    aborted: false,
    routes: ['primary'],
    normalizeRoute,
    applyActiveRequestSnapshot: false,
  }), {
    shouldApply: true,
    normalizedRoutes: ['PRIMARY'],
    applyActiveRequestSnapshot: false,
  })
  assert.equal(normalizeCalls, 3)
})

test('builds initial gateway data load error plans from abort and mount state', () => {
  assert.deepEqual(buildGatewayInitialDataLoadErrorPlan({
    aborted: true,
    mounted: true,
    errorMessage: 'load aborted',
  }), {
    showError: false,
    errorMessage: null,
  })

  assert.deepEqual(buildGatewayInitialDataLoadErrorPlan({
    aborted: false,
    mounted: false,
    errorMessage: 'load failed',
  }), {
    showError: false,
    errorMessage: null,
  })

  assert.deepEqual(buildGatewayInitialDataLoadErrorPlan({
    aborted: false,
    mounted: true,
    errorMessage: 'load failed',
  }), {
    showError: true,
    errorMessage: 'load failed',
    notice: {
      tone: 'error',
      message: 'load failed',
    },
  })

  assert.deepEqual(buildGatewayInitialDataLoadErrorPlan({
    aborted: false,
    mounted: true,
    errorMessage: '',
  }), {
    showError: true,
    errorMessage: '',
    notice: {
      tone: 'error',
      message: '',
    },
  })

  assert.deepEqual(buildGatewayInitialDataLoadErrorPlan({
    aborted: false,
    mounted: true,
    errorMessage: null,
  }), {
    showError: true,
    errorMessage: '网关数据加载失败',
    notice: {
      tone: 'error',
      message: '网关数据加载失败',
    },
  })
})
