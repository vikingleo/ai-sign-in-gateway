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

test('builds active request load error plans from abort, mount and silent state', () => {
  assert.deepEqual(buildGatewayActiveRequestsLoadErrorPlan({
    aborted: true,
    mounted: true,
    silent: false,
    errorMessage: 'upstream aborted',
  }), {
    showError: false,
    errorMessage: null,
  })

  assert.deepEqual(buildGatewayActiveRequestsLoadErrorPlan({
    aborted: false,
    mounted: false,
    silent: false,
    errorMessage: 'upstream failed',
  }), {
    showError: false,
    errorMessage: null,
  })

  assert.deepEqual(buildGatewayActiveRequestsLoadErrorPlan({
    aborted: false,
    mounted: true,
    silent: true,
    errorMessage: 'upstream failed',
  }), {
    showError: false,
    errorMessage: null,
  })

  assert.deepEqual(buildGatewayActiveRequestsLoadErrorPlan({
    aborted: false,
    mounted: true,
    silent: false,
    errorMessage: 'upstream failed',
  }), {
    showError: true,
    errorMessage: 'upstream failed',
    notice: {
      tone: 'error',
      message: 'upstream failed',
    },
  })

  assert.deepEqual(buildGatewayActiveRequestsLoadErrorPlan({
    aborted: false,
    mounted: true,
    silent: false,
    errorMessage: '',
  }), {
    showError: true,
    errorMessage: '网关实时请求加载失败',
    notice: {
      tone: 'error',
      message: '网关实时请求加载失败',
    },
  })

  assert.deepEqual(buildGatewayActiveRequestsLoadErrorPlan({
    aborted: false,
    mounted: true,
    silent: false,
    errorMessage: null,
  }), {
    showError: true,
    errorMessage: '网关实时请求加载失败',
    notice: {
      tone: 'error',
      message: '网关实时请求加载失败',
    },
  })
})

test('loads active request snapshots through injected runtime dependencies', async () => {
  const controller = new AbortController()
  const calls: string[] = []
  const state = {
    activeRequests: [] as string[],
    applied: [] as string[],
  }

  await loadGatewayActiveRequests({
    silent: false,
    mounted: () => true,
    controllerSlot: {
      replace: () => controller,
      clearIfCurrent: (current) => {
        assert.equal(current, controller)
        calls.push('clear')
        return true
      },
    },
    requestActiveRequests: async ({ signal }) => {
      assert.equal(signal, controller.signal)
      calls.push('request')
      return ['first']
    },
    setActiveRequests: (snapshot) => {
      state.activeRequests = snapshot
      calls.push('set')
    },
    applyActiveRequestSnapshot: (snapshot) => {
      state.applied = snapshot
      calls.push('apply')
    },
    showPlanNotice: () => {
      calls.push('notice')
    },
  })

  assert.deepEqual(calls, ['request', 'set', 'apply', 'clear'])
  assert.deepEqual(state.activeRequests, ['first'])
  assert.deepEqual(state.applied, ['first'])
})

test('loadGatewayActiveRequests suppresses stale, aborted, mounted-out, and silent errors', async () => {
  const stale = new AbortController()
  const current = new AbortController()
  const silentError = new Error('silent failed')
  const visibleError = new Error('visible failed')
  const notices: string[] = []
  const base = {
    mounted: () => true,
    controllerSlot: {
      replace: () => current,
      clearIfCurrent: () => true,
    },
    requestActiveRequests: async () => ['unused'],
    setActiveRequests: () => {},
    applyActiveRequestSnapshot: () => {},
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  }

  await loadGatewayActiveRequests({
    ...base,
    silent: false,
    mounted: () => true,
    controllerSlot: {
      replace: () => stale,
      clearIfCurrent: () => true,
    },
    requestActiveRequests: async () => {
      stale.abort()
      return ['stale']
    },
    setActiveRequests: () => {
      throw new Error('stale snapshot should not apply')
    },
  })

  await loadGatewayActiveRequests({
    ...base,
    silent: false,
    mounted: () => false,
    requestActiveRequests: async () => ['mounted-out'],
    setActiveRequests: () => {
      throw new Error('mounted-out snapshot should not apply')
    },
  })

  await loadGatewayActiveRequests({
    ...base,
    silent: true,
    requestActiveRequests: async () => {
      throw silentError
    },
  })

  await loadGatewayActiveRequests({
    ...base,
    silent: false,
    requestActiveRequests: async () => {
      throw visibleError
    },
  })

  assert.deepEqual(notices, ['visible failed'])
})

test('GatewayView delegates active request loading to the runtime controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRuntimeActions"), "GatewayView delegates active request loading to the page runtime actions controller should keep useGatewayPageRuntimeActions in gateway page controller")
  assert.ok(runtimeActionsControllerSource.includes("useGatewayRuntimeOperationsPageActions"), "GatewayView delegates active request loading to the runtime controller should keep useGatewayRuntimeOperationsPageActions in gateway page runtime actions controller")
  assert.ok(runtimeActionsControllerSource.includes("loadActiveRequests: state.gatewayRuntime.loadActiveRequests"), "GatewayView delegates active request loading to the runtime controller should keep loadActiveRequests: state.gatewayRuntime.loadActiveRequests in gateway page runtime actions controller")
})
