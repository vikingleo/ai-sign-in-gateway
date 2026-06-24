import test from 'node:test'
import assert from 'node:assert/strict'
import { ref } from 'vue'
import { readFile } from 'node:fs/promises'

import { useGatewayUsagePageActions } from '../src/gatewayUsagePageController.ts'
import type { GatewayUsage } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRuntimeActionsControllerPath = new URL(
  '../src/gatewayPageRuntimeActionsController.ts',
  import.meta.url,
)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
const usagePageControllerPath = new URL('../src/gatewayUsagePageController.ts', import.meta.url)
const dataOperationsPageControllerPath = new URL(
  '../src/gatewayDataOperationsPageController.ts',
  import.meta.url,
)

function usage(overrides: Partial<GatewayUsage> = {}): GatewayUsage {
  return {
    route_id: null,
    route_label: '全部路由',
    site_id: null,
    site_name: null,
    key_name: '',
    key_fingerprint: '',
    group_name: '',
    route_type: '',
    model: '',
    request_count: 1,
    success_count: 1,
    failure_count: 0,
    success_rate: 1,
    stream_request_count: 0,
    prompt_tokens: 10,
    cached_input_tokens: 0,
    completion_tokens: 5,
    total_tokens: 15,
    usage_cost: null,
    computed_input_cost: 0,
    computed_cached_cost: 0,
    computed_output_cost: 0,
    computed_total_cost: 0,
    computed_cost_known: true,
    computed_cost_mixed: false,
    avg_latency_ms: null,
    last_used_at: null,
    start: '2026-05-27T00:00:00.000Z',
    end: '2026-05-27T01:00:00.000Z',
    routes: [],
    ...overrides,
  }
}

test('useGatewayUsagePageActions wires usage loading and today query actions', async () => {
  const events: string[] = []
  const usageRef = ref<GatewayUsage | null>(null)
  const actions = useGatewayUsagePageActions({
    gatewayUsage: usageRef,
    loadUsage: async (options) => {
      events.push(`runtime:${options.silent}:${options.isMonitor}:${options.requestRange.start}:${options.requestRange.end}`)
      options.setUsage(usage({ request_count: 8 }))
    },
    isMonitor: () => true,
    getRequestRange: () => ({
      start: '2026-05-27T00:00:00.000Z',
      end: '2026-05-27T01:00:00.000Z',
    }),
    mounted: () => true,
    controllerSlot: {
      replace: () => ({
        signal: { aborted: false },
        abort: () => {
          events.push('abort')
        },
      }),
      clearIfCurrent: () => {
        events.push('clear')
        return true
      },
    },
    requestUsage: async () => usage({ request_count: 9 }),
    setUsageLoading: (loading) => {
      events.push(`loading:${loading}`)
    },
    resetToToday: () => {
      events.push('reset-today')
    },
    showNotice: (notice) => {
      events.push(`notice:${notice.message}`)
    },
    showPlanNotice: (plan) => {
      events.push(`plan:${plan.notice.message}`)
    },
    isAbortError: () => false,
  })

  await actions.handleUsageQuery()
  await actions.handleUsageToday()

  assert.deepEqual(events, [
    'runtime:false:true:2026-05-27T00:00:00.000Z:2026-05-27T01:00:00.000Z',
    'reset-today',
    'runtime:false:true:2026-05-27T00:00:00.000Z:2026-05-27T01:00:00.000Z',
  ])
  assert.equal(usageRef.value?.request_count, 8)
})

test('GatewayView delegates usage page wiring to the page controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRuntimeActions"), "GatewayView delegates usage page wiring to the page runtime actions controller should keep useGatewayPageRuntimeActions in gateway page controller")
  assert.ok(runtimeActionsControllerSource.includes("useGatewayRuntimeOperationsPageActions"), "GatewayView delegates usage page wiring to the page runtime actions controller should keep useGatewayRuntimeOperationsPageActions in gateway page runtime actions controller")
  assert.ok(shellBindingsControllerSource.includes("handleUsageQuery: runtimeActions.handleUsageQuery"), "GatewayView delegates usage page wiring to the page controller should keep handleUsageQuery: runtimeActions.handleUsageQuery in gateway page controller")
})
