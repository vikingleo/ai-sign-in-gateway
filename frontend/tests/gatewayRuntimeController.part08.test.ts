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

test('builds gateway usage load error plans from abort, mount and silent state', () => {
  assert.deepEqual(buildGatewayUsageLoadErrorPlan({
    aborted: true,
    mounted: true,
    silent: false,
    errorMessage: 'usage aborted',
  }), {
    showError: false,
    errorMessage: null,
  })

  assert.deepEqual(buildGatewayUsageLoadErrorPlan({
    aborted: false,
    mounted: false,
    silent: false,
    errorMessage: 'usage failed',
  }), {
    showError: false,
    errorMessage: null,
  })

  assert.deepEqual(buildGatewayUsageLoadErrorPlan({
    aborted: false,
    mounted: true,
    silent: true,
    errorMessage: 'usage failed',
  }), {
    showError: false,
    errorMessage: null,
  })

  assert.deepEqual(buildGatewayUsageLoadErrorPlan({
    aborted: false,
    mounted: true,
    silent: false,
    errorMessage: 'usage failed',
  }), {
    showError: true,
    errorMessage: 'usage failed',
    notice: {
      tone: 'error',
      message: 'usage failed',
    },
  })

  assert.deepEqual(buildGatewayUsageLoadErrorPlan({
    aborted: false,
    mounted: true,
    silent: false,
    errorMessage: '',
  }), {
    showError: true,
    errorMessage: '',
    notice: {
      tone: 'error',
      message: '',
    },
  })

  assert.deepEqual(buildGatewayUsageLoadErrorPlan({
    aborted: false,
    mounted: true,
    silent: false,
    errorMessage: null,
  }), {
    showError: true,
    errorMessage: '网关消耗加载失败',
    notice: {
      tone: 'error',
      message: '网关消耗加载失败',
    },
  })
})

test('GatewayView delegates usage load errors through the runtime controller', async () => {
  const source = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')
  const usagePageController = await readFile(gatewayUsagePageControllerPath, 'utf8')
  const dataOperationsPageController = await readFile(gatewayDataOperationsPageControllerPath, 'utf8')

  assert.match(source, /useGatewayRuntimeOperationsPageActions\(\{[\s\S]*showPlanNotice/)
  assert.match(dataOperationsPageController, /const usageActions = useGatewayUsagePageActions\(\{/)
  assert.match(usagePageController, /createLoadGatewayUsageRuntimeAction\(\{[\s\S]*showPlanNotice/)
  assert.doesNotMatch(usagePageController, /gatewayRuntime\.buildUsageLoadErrorPlan\({/)
  assert.doesNotMatch(usagePageController, /toast\.error\(errorPlan\.errorMessage\)/)
})

test('loads gateway usage through injected runtime dependencies', async () => {
  const controller = new AbortController()
  const calls: string[] = []
  const state = {
    usage: null as string | null,
    loading: false,
  }

  await loadGatewayUsage({
    silent: false,
    isMonitor: true,
    requestRange: {
      start: '2026-05-25T00:00:00.000Z',
      end: '2026-05-25T23:59:59.000Z',
    },
    mounted: () => true,
    controllerSlot: {
      replace: () => controller,
      clearIfCurrent: (current) => {
        assert.equal(current, controller)
        calls.push('clear')
        return true
      },
    },
    requestUsage: async ({ start, end, signal }) => {
      assert.equal(start, '2026-05-25T00:00:00.000Z')
      assert.equal(end, '2026-05-25T23:59:59.000Z')
      assert.equal(signal, controller.signal)
      calls.push('request')
      return 'usage-snapshot'
    },
    setUsage: (usage) => {
      state.usage = usage
      calls.push('set')
    },
    setUsageLoading: (loading) => {
      state.loading = loading
      calls.push(loading ? 'loading-on' : 'loading-off')
    },
    showNotice: () => {
      calls.push('invalid-notice')
    },
    showPlanNotice: () => {
      calls.push('error-notice')
    },
    isAbortError: () => false,
  })

  assert.deepEqual(calls, ['loading-on', 'request', 'set', 'clear', 'loading-off'])
  assert.equal(state.usage, 'usage-snapshot')
  assert.equal(state.loading, false)
})

test('loadGatewayUsage clears usage outside monitor and reports invalid range without requests', async () => {
  const calls: string[] = []
  const base = {
    silent: false,
    requestRange: {
      start: '2026-05-25T00:00:00.000Z',
      end: '2026-05-25T23:59:59.000Z',
    },
    mounted: () => true,
    controllerSlot: {
      replace: () => {
        throw new Error('usage request should not start')
      },
      clearIfCurrent: () => true,
    },
    requestUsage: async () => {
      throw new Error('usage request should not run')
    },
    setUsage: (usage: string | null) => {
      calls.push(usage === null ? 'clear' : 'set')
    },
    setUsageLoading: () => {
      calls.push('loading')
    },
    showNotice: (notice) => {
      calls.push(notice.message)
    },
    showPlanNotice: () => {
      calls.push('error-notice')
    },
    isAbortError: () => false,
  }

  await loadGatewayUsage({
    ...base,
    isMonitor: false,
  })

  await loadGatewayUsage({
    ...base,
    isMonitor: true,
    requestRange: {
      start: '',
      end: '2026-05-25T23:59:59.000Z',
    },
  })

  await loadGatewayUsage({
    ...base,
    silent: true,
    isMonitor: true,
    requestRange: {
      start: '',
      end: '2026-05-25T23:59:59.000Z',
    },
  })

  assert.deepEqual(calls, ['clear', '请选择有效的开始和结束时间'])
})
