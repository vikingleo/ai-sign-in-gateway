import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const controllerPath = new URL('../src/gatewayPageRequestsController.ts', import.meta.url)
const viewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayViewPath = viewPath
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageFoundationControllerPath = new URL('../src/gatewayPageFoundationController.ts', import.meta.url)
const gatewayPageRuntimeActionsControllerPath = new URL(
  '../src/gatewayPageRuntimeActionsController.ts',
  import.meta.url,
)

const requestNames = [
  'createSite',
  'createGatewayRouteGroup',
  'deleteGatewayRoute',
  'deleteGatewayRouteGroup',
  'diagnoseGatewayRoute',
  'disableAllGatewayRoutes',
  'enableOnlyGatewayRoute',
  'getGatewayActiveRequests',
  'getGatewayLogs',
  'getGatewayOverview',
  'getGatewayRouteGroups',
  'getGatewayRouteLogs',
  'getGatewayRoutes',
  'getGatewaySettings',
  'getGatewayUsage',
  'getSiteGroups',
  'isAbortError',
  'probeGatewayRoute',
  'probeGatewayRouteBalance',
  'refreshSiteSummaries',
  'reorderGatewayRoutePriorities',
  'resetGatewayRouteCircuit',
  'syncGatewayRoutes',
  'toggleGatewayRoute',
  'updateGatewayRouteGroup',
  'updateGatewayRouteGroups',
  'updateGatewayRouteType',
  'updateGatewaySettings',
] as const

async function readOptionalSource(path: URL) {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return ''
    }
    throw error
  }
}

test('gateway page requests adapter exposes the page request boundary', async () => {
  const source = await readOptionalSource(controllerPath)

  assert.notEqual(source, '')
  assert.match(source, /from '\.\/api(?:\.ts)?'/)
  assert.match(source, /export function createGatewayPageRequests\(\)/)

  for (const requestName of requestNames) {
    assert.match(source, new RegExp(`\\b${requestName}\\b`))
    assert.match(source, new RegExp(`return \\{[\\s\\S]*\\b${requestName}\\b`))
  }
})

test('GatewayView delegates API request wiring to the page requests adapter', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const foundationControllerSource = await readFile(gatewayPageFoundationControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(pageControllerSource.includes("useGatewayPageFoundation"), "GatewayView delegates API request wiring through the page foundation controller")
  assert.ok(foundationControllerSource.includes("createGatewayPageRequests"), "GatewayView delegates API request wiring to the page requests adapter should keep createGatewayPageRequests in gateway page foundation controller")
  assert.ok(runtimeActionsControllerSource.includes("requestOverview: gatewayPageRequests.getGatewayOverview"), "GatewayView delegates API request wiring to the page runtime actions controller should keep requestOverview: gatewayPageRequests.getGatewayOverview in gateway page runtime actions controller")
})
