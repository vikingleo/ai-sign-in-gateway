import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayRouteManagementPage.vue', import.meta.url)
const shellPath = new URL('../src/components/gateway/GatewayPageShell.vue', import.meta.url)
const viewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayViewPath = viewPath
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
const pageBindingsControllerPath = new URL('../src/gatewayPageBindingsController.ts', import.meta.url)

test('gateway route management page declares the toolbar and table composition contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /const routeSearch = defineModel<string>\('routeSearch'/)
  assert.match(source, /const selectedGroups = defineModel<string\[\]>\('selectedGroups'/)
  assert.match(source, /const selectedIssueStates = defineModel<GatewayIssueState\[\]>\('selectedIssueStates'/)
  assert.match(source, /const includeDisabled = defineModel<boolean>\('includeDisabled'/)
  assert.match(source, /filteredRouteCount: number/)
  assert.match(source, /routeCount: number/)
  assert.match(source, /requestUrl: string/)
  assert.match(source, /autoRefreshError: string \| null/)
  assert.match(source, /columns: ColumnsType<GatewayRoute>/)
  assert.match(source, /routes: GatewayRoute\[\]/)
  assert.match(source, /bindTableContainer: \(element: Element \| ComponentPublicInstance \| null\) => void/)
  assert.match(source, /event: 'copy-request-url'/)
  assert.match(source, /event: 'sync'/)
  assert.match(source, /event: 'probe-all'/)
  assert.match(source, /event: 'type-change'/)
  assert.match(source, /event: 'history'/)
  assert.match(source, /<GatewayRouteManagementToolbar/)
  assert.match(source, /class="gateway-auto-refresh-alert"/)
  assert.match(source, /<div class="gateway-fill">/)
  assert.match(source, /<GatewayRouteManagementTable/)
})

test('GatewayView delegates route management rendering to the page component boundary', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(shellBindingsControllerSource.includes("useGatewayPageBindings"), "GatewayView delegates route management rendering to the page component boundary should keep useGatewayPageBindings in gateway page controller")
  assert.ok(pageControllerSource.includes("routeManagementPageProps"), "GatewayView delegates route management rendering to the page component boundary should keep routeManagementPageProps in gateway page controller")
})
