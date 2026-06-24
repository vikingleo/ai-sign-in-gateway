import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayMonitorPage.vue', import.meta.url)
const shellPath = new URL('../src/components/gateway/GatewayPageShell.vue', import.meta.url)
const viewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayViewPath = viewPath
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
const pageControllerPath = new URL('../src/gatewayMonitorPageController.ts', import.meta.url)
const pageBindingsControllerPath = new URL('../src/gatewayPageBindingsController.ts', import.meta.url)

test('gateway monitor page declares the toolbar and dashboard composition contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /requestUrl: string/)
  assert.match(source, /codexTooltip: string/)
  assert.match(source, /maskedApiKey: string/)
  assert.match(source, /hasApiKey: boolean/)
  assert.match(source, /autoRefreshError: string \| null/)
  assert.match(source, /metricCards: GatewayMetricCard\[\]/)
  assert.match(source, /usageRange: GatewayUsageRange/)
  assert.match(source, /routeActivityFeed: GatewayActivityFeedItem\[\]/)
  assert.match(source, /activeRequestCount: number/)
  assert.match(source, /gatewayStrategyCards: GatewayStrategyCard\[\]/)
  assert.match(source, /event: 'copy-request-url'/)
  assert.match(source, /event: 'open-logs'/)
  assert.match(source, /event: 'update:start'/)
  assert.match(source, /event: 'copy-activity-url'/)
  assert.match(source, /<GatewayMonitorToolbar/)
  assert.match(source, /class="gateway-auto-refresh-alert"/)
  assert.match(source, /<GatewayMonitorDashboard/)
})

test('GatewayView delegates monitor rendering to the page component boundary', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(shellBindingsControllerSource.includes("useGatewayPageBindings"), "GatewayView delegates monitor rendering to the page component boundary should keep useGatewayPageBindings in gateway page controller")
  assert.ok(pageControllerSource.includes("monitorPageProps"), "GatewayView delegates monitor rendering to the page component boundary should keep monitorPageProps in gateway page controller")
})
