import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { useGatewayPageState } from '../src/gatewayPageStateController.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageFoundationControllerPath = new URL('../src/gatewayPageFoundationController.ts', import.meta.url)

test('useGatewayPageState creates gateway page refs and controller aliases', () => {
  const state = useGatewayPageState()

  assert.equal(state.loading, state.gatewayRuntime.loading)
  assert.equal(state.usageLoading, state.gatewayRuntime.usageLoading)
  assert.equal(state.probeLoading, state.routeProbeState.loading)
  assert.equal(state.balanceProbeAllLoading, state.routeBalanceProbeState.loading)
  assert.equal(state.priorityRoutes, state.priorityDialog.routes)
  assert.equal(state.priorityRoute, state.priorityDialog.route)
  assert.equal(state.priorityInsertIndex, state.priorityDialog.insertIndex)
  assert.equal(state.addUpstreamForm, state.addUpstreamDialog.form)
  assert.equal(state.addUpstreamGroupNames, state.addUpstreamDialog.groupNames)
  assert.equal(state.resetAddUpstreamForm, state.addUpstreamDialog.reset)
  assert.equal(state.logs, state.logsDrawer.logs)
  assert.equal(state.routeLogs, state.routeLogsDrawer.logs)
  assert.equal(state.usageRange, state.usageRangeState.range)
  assert.equal(state.routeModelsDialogRoute, state.routeModelsDialog.route)
  assert.equal(state.routeModelsDialogValue, state.routeModelsDialog.supportedModels)
  assert.equal(state.routeModelsDialogRequestURLs, state.routeModelsDialog.requestURLs)
  assert.equal(state.routeSearch, state.routeFilters.routeSearch)
  assert.equal(state.logSearch, state.logsDrawer.search)
  assert.equal(state.routeLogSearch, state.routeLogsDrawer.search)
  assert.equal(state.probeAllProgress, state.routeProbeState.progress)
  assert.equal(state.balanceProbeAllProgress, state.routeBalanceProbeState.progress)
  assert.equal(state.balanceProbeManualRoute, state.balanceProbeManualDialog.route)
  assert.equal(state.balanceProbeManualURL, state.balanceProbeManualDialog.url)
})

test('useGatewayPageState initializes page-owned gateway state with existing defaults', () => {
  const state = useGatewayPageState()

  assert.equal(state.overview.value, null)
  assert.deepEqual(state.routes.value, [])
  assert.deepEqual(state.activeRequests.value, [])
  assert.equal(state.gatewayUsage.value, null)
  assert.deepEqual(state.siteGroups.value, [])
  assert.equal(state.includeDisabled.value, false)
  assert.deepEqual(state.autoRefreshTimers, {
    autoRefreshTimer: null,
    activeRequestRefreshTimer: null,
  })
  assert.equal(state.gatewayTablePageSize, 20)
  assert.equal(state.gatewayRouteAutoRefreshMs, 180_000)
  assert.equal(state.gatewayMonitorAutoRefreshMs, 30_000)
  assert.equal(state.gatewayActiveRequestRefreshMs, 1_000)
})

test('GatewayView delegates page state construction to the page state controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const foundationControllerSource = await readFile(gatewayPageFoundationControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(pageControllerSource.includes("useGatewayPageFoundation"), "GatewayView delegates page state construction through the page foundation controller")
  assert.ok(foundationControllerSource.includes("useGatewayPageState()"), "GatewayView delegates page state construction to the page state controller should keep useGatewayPageState() in gateway page foundation controller")
  assert.ok(foundationControllerSource.includes("const state = useGatewayPageState()"), "GatewayView delegates page state construction to the page state controller should keep const state = useGatewayPageState() in gateway page foundation controller")
})
