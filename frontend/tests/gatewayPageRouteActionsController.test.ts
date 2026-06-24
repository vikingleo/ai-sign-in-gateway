import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const pageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const operationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const routeActionsControllerPath = new URL('../src/gatewayPageRouteActionsController.ts', import.meta.url)

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

test('gateway page route actions controller owns route operation wiring', async () => {
  const pageController = await readFile(pageControllerPath, 'utf8')
  const operationsController = await readFile(operationsControllerPath, 'utf8')
  const routeActionsController = await readOptionalSource(routeActionsControllerPath)

  assert.notEqual(routeActionsController, '')
  assert.match(routeActionsController, /export function useGatewayPageRouteActions\(/)
  assert.match(routeActionsController, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.match(routeActionsController, /routes: state\.routes/)
  assert.match(routeActionsController, /requestProbeBatch: gatewayPageRequests\.probeGatewayRoutes/)
  assert.match(routeActionsController, /requestProbe: gatewayPageRequests\.probeGatewayRoute/)
  assert.match(routeActionsController, /requestBalance: gatewayPageRequests\.probeGatewayRouteBalance/)
  assert.match(routeActionsController, /refreshRouteSummaries: refreshActions\.refreshRouteSummaries/)
  assert.match(routeActionsController, /confirmWindow: gatewayPagePlatform\.confirmWindow/)
  assert.match(routeActionsController, /requestDiagnosis: gatewayPageRequests\.diagnoseGatewayRoute/)
  assert.match(routeActionsController, /requestLogs: gatewayPageRequests\.getGatewayRouteLogs/)

  assert.match(operationsController, /useGatewayPageRouteActions\(\{/)
  assert.match(pageController, /useGatewayPageOperations\(\{/)
  assert.doesNotMatch(pageController, /useGatewayPageRouteActions\(\{/)
  assert.doesNotMatch(pageController, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(pageController, /notifyGatewayOverviewChanged/)
  assert.doesNotMatch(pageController, /from '\.\/gatewayRouteManagementOperationsPageController\.ts'/)
})
