import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  createLoadGatewayUsageAction,
  createLoadGatewayUsageTodayAction,
  loadGatewayUsageToday,
  useGatewayUsageRangeState,
} from '../src/gatewayUsageRangeController.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRuntimeActionsControllerPath = new URL(
  '../src/gatewayPageRuntimeActionsController.ts',
  import.meta.url,
)
const gatewayUsagePageControllerPath = new URL('../src/gatewayUsagePageController.ts', import.meta.url)
const gatewayDataOperationsPageControllerPath = new URL(
  '../src/gatewayDataOperationsPageController.ts',
  import.meta.url,
)

test('resets gateway usage range to the current local day', () => {
  const usageRange = useGatewayUsageRangeState()

  usageRange.resetToToday(new Date(2026, 4, 24, 9, 5))

  assert.deepEqual(
    { start: usageRange.range.start, end: usageRange.range.end },
    { start: '2026-05-24T00:00', end: '2026-05-24T09:05' },
  )
})

test('normalizes gateway usage datetime-local values into request range', () => {
  const usageRange = useGatewayUsageRangeState()
  usageRange.range.start = '2026-05-24T00:00'
  usageRange.range.end = '2026-05-24T09:05'

  assert.deepEqual(usageRange.toRequestRange(), {
    start: new Date('2026-05-24T00:00').toISOString(),
    end: new Date('2026-05-24T09:05').toISOString(),
  })
})

test('keeps invalid gateway usage range visible as empty request values', () => {
  const usageRange = useGatewayUsageRangeState()
  usageRange.range.start = 'not-a-date'
  usageRange.range.end = ''

  assert.deepEqual(usageRange.toRequestRange(), { start: '', end: '' })
})

test('loads gateway usage after resetting the range to today', async () => {
  const calls: string[] = []

  await loadGatewayUsageToday({
    resetToToday: () => {
      calls.push('reset')
    },
    loadGatewayUsage: async () => {
      calls.push('load')
    },
  })

  assert.deepEqual(calls, ['reset', 'load'])
})

test('propagates gateway usage today loading errors after resetting the range', async () => {
  const calls: string[] = []

  await assert.rejects(
    loadGatewayUsageToday({
      resetToToday: () => {
        calls.push('reset')
      },
      loadGatewayUsage: async () => {
        calls.push('load')
        throw new Error('usage failed')
      },
    }),
    /usage failed/,
  )
  assert.deepEqual(calls, ['reset', 'load'])
})

test('createLoadGatewayUsageAction loads usage through injected dependencies', async () => {
  const calls: string[] = []
  const action = createLoadGatewayUsageAction({
    loadGatewayUsage: async () => {
      calls.push('load')
    },
  })

  await action()
  await action()

  assert.deepEqual(calls, ['load', 'load'])
})

test('createLoadGatewayUsageTodayAction resets before loading through injected dependencies', async () => {
  const calls: string[] = []
  const action = createLoadGatewayUsageTodayAction({
    resetToToday: () => {
      calls.push('reset')
    },
    loadGatewayUsage: async () => {
      calls.push('load')
    },
  })

  await action()

  assert.deepEqual(calls, ['reset', 'load'])
})

test('GatewayView delegates usage query and today loading through usage range actions', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRuntimeActions"), "GatewayView delegates usage query and today loading through usage range actions should keep useGatewayPageRuntimeActions in gateway page controller")
  assert.ok(runtimeActionsControllerSource.includes("useGatewayRuntimeOperationsPageActions"), "GatewayView delegates usage query and today loading through usage range actions should keep useGatewayRuntimeOperationsPageActions in gateway page runtime actions controller")
  assert.ok(runtimeActionsControllerSource.includes("resetToToday: state.usageRangeState.resetToToday"), "GatewayView delegates usage query and today loading through usage range actions should keep resetToToday: state.usageRangeState.resetToToday in gateway page runtime actions controller")
})
