import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayOverlayPageHost.vue', import.meta.url)
const shellPath = new URL('../src/components/gateway/GatewayPageShell.vue', import.meta.url)
const viewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayViewPath = viewPath
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
const pageBindingsControllerPath = new URL('../src/gatewayPageBindingsController.ts', import.meta.url)

test('gateway overlay page host declares the page-level overlay wiring contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /priorityDialog: GatewayPriorityDialog/)
  assert.match(source, /balanceManualDialog: GatewayRouteBalanceManualDialog/)
  assert.match(source, /settingsDialog: GatewaySettingsDialog/)
  assert.match(source, /addUpstreamDialog: GatewayAddUpstreamDialog/)
  assert.match(source, /routeModelsDialog: GatewayRouteModelsDialog/)
  assert.match(source, /logsDrawer: GatewayLogsDrawer/)
  assert.match(source, /routeLogsDrawer: GatewayRouteLogsDrawer/)
  assert.match(source, /routeDiagnosisDrawer: GatewayRouteDiagnosisDrawer/)
  assert.match(source, /function writableValue<T>/)
  assert.match(source, /const priorityOpen = writableValue/)
  assert.match(source, /const routeLogsTitle = computed/)
  assert.match(source, /event: 'priority-move'/)
  assert.match(source, /event: 'route-models-save'/)
  assert.match(source, /<GatewayOverlayHost/)
})

test('GatewayView delegates overlay wiring to the page host boundary', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(shellBindingsControllerSource.includes("useGatewayPageBindings"), "GatewayView delegates overlay wiring to the page host boundary should keep useGatewayPageBindings in gateway page controller")
  assert.ok(pageControllerSource.includes("overlayPageHandlers"), "GatewayView delegates overlay wiring to the page host boundary should keep overlayPageHandlers in gateway page controller")
})
