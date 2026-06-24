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

test('createLoadGatewayUsageRuntimeAction reads latest usage dependencies when invoked', async () => {
  assert.equal(
    typeof gatewayRuntimeLoadController.createLoadGatewayUsageRuntimeAction,
    'function',
    'createLoadGatewayUsageRuntimeAction should be exported',
  )

  const controller = new AbortController()
  const calls: Array<{ silent: boolean, isMonitor: boolean, range: { start: string, end: string } }> = []
  let isMonitor = false
  let requestRange = {
    start: '2026-05-27T00:00:00.000Z',
    end: '2026-05-27T12:00:00.000Z',
  }
  const controllerSlot = {
    replace: () => controller,
    clearIfCurrent: () => true,
  }
  const requestUsage = async () => 'usage'
  const setUsage = () => {}
  const setUsageLoading = () => {}
  const showNotice = () => {}
  const showPlanNotice = () => {}
  const isAbortError = () => false

  const loadGatewayUsageAction = gatewayRuntimeLoadController.createLoadGatewayUsageRuntimeAction({
    loadUsage: async (options) => {
      assert.equal(options.controllerSlot, controllerSlot)
      assert.equal(options.requestUsage, requestUsage)
      assert.equal(options.setUsage, setUsage)
      assert.equal(options.setUsageLoading, setUsageLoading)
      assert.equal(options.showNotice, showNotice)
      assert.equal(options.showPlanNotice, showPlanNotice)
      assert.equal(options.isAbortError, isAbortError)
      calls.push({
        silent: options.silent,
        isMonitor: options.isMonitor,
        range: options.requestRange,
      })
    },
    isMonitor: () => isMonitor,
    getRequestRange: () => requestRange,
    mounted: () => true,
    controllerSlot,
    requestUsage,
    setUsage,
    setUsageLoading,
    showNotice,
    showPlanNotice,
    isAbortError,
  })

  await loadGatewayUsageAction()
  isMonitor = true
  requestRange = {
    start: '2026-05-27T12:00:00.000Z',
    end: '2026-05-27T23:59:59.000Z',
  }
  await loadGatewayUsageAction(true)

  assert.deepEqual(calls, [
    {
      silent: false,
      isMonitor: false,
      range: {
        start: '2026-05-27T00:00:00.000Z',
        end: '2026-05-27T12:00:00.000Z',
      },
    },
    {
      silent: true,
      isMonitor: true,
      range: {
        start: '2026-05-27T12:00:00.000Z',
        end: '2026-05-27T23:59:59.000Z',
      },
    },
  ])
})

test('createLoadGatewayActiveRequestsRuntimeAction delegates through injected dependencies', async () => {
  let gatewayActiveRequestsRuntimeController: {
    createLoadGatewayActiveRequestsRuntimeAction?: Function
  } = {}
  try {
    gatewayActiveRequestsRuntimeController = await import('../src/gatewayActiveRequestsRuntimeController.ts')
  } catch {
    gatewayActiveRequestsRuntimeController = {}
  }
  assert.equal(
    typeof gatewayActiveRequestsRuntimeController.createLoadGatewayActiveRequestsRuntimeAction,
    'function',
    'createLoadGatewayActiveRequestsRuntimeAction should be exported',
  )

  const controller = new AbortController()
  const calls: boolean[] = []
  const controllerSlot = {
    replace: () => controller,
    clearIfCurrent: () => true,
  }
  const requestActiveRequests = async () => ['active']
  const setActiveRequests = () => {}
  const applyActiveRequestSnapshot = () => {}
  const showPlanNotice = () => {}

  const loadActiveRequestsAction = gatewayActiveRequestsRuntimeController.createLoadGatewayActiveRequestsRuntimeAction({
    loadActiveRequests: async (options) => {
      assert.equal(options.mounted(), true)
      assert.equal(options.controllerSlot, controllerSlot)
      assert.equal(options.requestActiveRequests, requestActiveRequests)
      assert.equal(options.setActiveRequests, setActiveRequests)
      assert.equal(options.applyActiveRequestSnapshot, applyActiveRequestSnapshot)
      assert.equal(options.showPlanNotice, showPlanNotice)
      calls.push(options.silent)
    },
    mounted: () => true,
    controllerSlot,
    requestActiveRequests,
    setActiveRequests,
    applyActiveRequestSnapshot,
    showPlanNotice,
  })

  await loadActiveRequestsAction()
  await loadActiveRequestsAction(true)

  assert.deepEqual(calls, [false, true])
})

test('createRefreshGatewayActiveRequestsRuntimeAction reads latest refresh state and finishes started refreshes', async () => {
  let gatewayActiveRequestsRuntimeController: {
    createRefreshGatewayActiveRequestsRuntimeAction?: Function
  } = {}
  try {
    gatewayActiveRequestsRuntimeController = await import('../src/gatewayActiveRequestsRuntimeController.ts')
  } catch {
    gatewayActiveRequestsRuntimeController = {}
  }
  assert.equal(
    typeof gatewayActiveRequestsRuntimeController.createRefreshGatewayActiveRequestsRuntimeAction,
    'function',
    'createRefreshGatewayActiveRequestsRuntimeAction should be exported',
  )

  let now = 1000
  let visible = false
  let monitor = false
  let allowStart = true
  let throwOnLoad = false
  const calls: string[] = []
  const refreshActiveRequests = gatewayActiveRequestsRuntimeController.createRefreshGatewayActiveRequestsRuntimeAction({
    buildActiveRequestsRefreshPlan: (options) => {
      calls.push(`plan:${options.now}:${options.visible}:${options.isMonitor}:${options.silent}`)
      if (!options.visible || !options.isMonitor) {
        return {
          shouldStart: false,
          startOptions: null,
          loadSilent: options.silent,
        }
      }
      return {
        shouldStart: true,
        startOptions: {
          now: options.now,
          visible: options.visible,
          enabled: true,
        },
        loadSilent: options.silent,
      }
    },
    startActiveRequestsRefresh: (startOptions) => {
      calls.push(`start:${startOptions.now}:${startOptions.visible}:${startOptions.enabled}`)
      return allowStart
    },
    finishActiveRequestsRefresh: () => {
      calls.push('finish')
    },
    loadActiveRequests: async (silent) => {
      calls.push(`load:${silent}`)
      if (throwOnLoad) {
        throw new Error('load failed')
      }
    },
    now: () => now,
    isVisible: () => visible,
    isMonitor: () => monitor,
  })

  await refreshActiveRequests(false)
  visible = true
  monitor = true
  now = 1200
  allowStart = false
  await refreshActiveRequests()
  now = 1800
  allowStart = true
  await refreshActiveRequests()
  now = 2400
  throwOnLoad = true
  await assert.rejects(() => refreshActiveRequests(false), /load failed/)

  assert.deepEqual(calls, [
    'plan:1000:false:false:false',
    'plan:1200:true:true:true',
    'start:1200:true:true',
    'plan:1800:true:true:true',
    'start:1800:true:true',
    'load:true',
    'finish',
    'plan:2400:true:true:false',
    'start:2400:true:true',
    'load:false',
    'finish',
  ])
})
