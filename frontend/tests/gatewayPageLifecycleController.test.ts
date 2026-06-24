import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  mountGatewayPageLifecycle,
  unmountGatewayPageLifecycle,
} from '../src/gatewayPageLifecycleController.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageLifecycleActionsControllerPath = new URL(
  '../src/gatewayPageLifecycleActionsController.ts',
  import.meta.url,
)

test('mountGatewayPageLifecycle preserves the gateway page mounted order', async () => {
  const events: string[] = []

  await mountGatewayPageLifecycle({
    setMounted: (mounted) => events.push(`mounted:${mounted}`),
    addPageListeners: ({ handleSiteGroupsChanged, handleVisibilityChange }) => {
      events.push([
        'add-listeners',
        handleSiteGroupsChanged() === 'site-groups',
        handleVisibilityChange() === 'visibility',
      ].join(':'))
    },
    handleSiteGroupsChanged: () => 'site-groups',
    handleVisibilityChange: () => 'visibility',
    resetUsageRangeToToday: () => events.push('reset-usage-range'),
    loadData: async () => {
      events.push('load-data')
    },
    isMounted: () => true,
    startAutoRefresh: () => events.push('start-auto-refresh'),
    scheduleRouteSummaryRefresh: () => events.push('schedule-route-summary'),
  })

  assert.deepEqual(events, [
    'mounted:true',
    'add-listeners:true:true',
    'reset-usage-range',
    'load-data',
    'start-auto-refresh',
    'schedule-route-summary',
  ])
})

test('mountGatewayPageLifecycle stops after loadData when unmounted during startup', async () => {
  const events: string[] = []
  let mounted = true

  await mountGatewayPageLifecycle({
    setMounted: (nextMounted) => {
      mounted = nextMounted
      events.push(`mounted:${nextMounted}`)
    },
    addPageListeners: () => events.push('add-listeners'),
    handleSiteGroupsChanged: () => undefined,
    handleVisibilityChange: () => undefined,
    resetUsageRangeToToday: () => events.push('reset-usage-range'),
    loadData: async () => {
      events.push('load-data')
      mounted = false
    },
    isMounted: () => mounted,
    startAutoRefresh: () => events.push('start-auto-refresh'),
    scheduleRouteSummaryRefresh: () => events.push('schedule-route-summary'),
  })

  assert.deepEqual(events, [
    'mounted:true',
    'add-listeners',
    'reset-usage-range',
    'load-data',
  ])
})

test('unmountGatewayPageLifecycle preserves cleanup order', () => {
  const events: string[] = []

  unmountGatewayPageLifecycle({
    setMounted: (mounted) => events.push(`mounted:${mounted}`),
    stopAutoRefresh: () => events.push('stop-auto-refresh'),
    abortLoadData: () => events.push('abort-load-data'),
    abortUsageLoad: () => events.push('abort-usage-load'),
    disposeRouteProbeState: () => events.push('dispose-route-probe'),
    disposeRouteBalanceProbeState: () => events.push('dispose-balance-probe'),
    removePageListeners: ({ handleSiteGroupsChanged, handleVisibilityChange }) => {
      events.push([
        'remove-listeners',
        handleSiteGroupsChanged() === 'site-groups',
        handleVisibilityChange() === 'visibility',
      ].join(':'))
    },
    handleSiteGroupsChanged: () => 'site-groups',
    handleVisibilityChange: () => 'visibility',
  })

  assert.deepEqual(events, [
    'mounted:false',
    'stop-auto-refresh',
    'abort-load-data',
    'abort-usage-load',
    'dispose-route-probe',
    'dispose-balance-probe',
    'remove-listeners:true:true',
  ])
})

test('GatewayView delegates mounted and unmounted lifecycle sequencing to the lifecycle controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const lifecycleActionsControllerSource = await readFile(gatewayPageLifecycleActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(pageControllerSource.includes("useGatewayPageLifecycleActions"), "GatewayView delegates mounted and unmounted lifecycle sequencing to the lifecycle controller should keep useGatewayPageLifecycleActions in gateway page controller")
  assert.ok(lifecycleActionsControllerSource.includes("mountGatewayPageLifecycle"), "GatewayView delegates mounted and unmounted lifecycle sequencing to the lifecycle controller should keep mountGatewayPageLifecycle in gateway page lifecycle actions controller")
  assert.ok(lifecycleActionsControllerSource.includes("unmountGatewayPageLifecycle"), "GatewayView delegates mounted and unmounted lifecycle sequencing to the lifecycle controller should keep unmountGatewayPageLifecycle in gateway page lifecycle actions controller")
})
