import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const pageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const operationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const refreshActionsControllerPath = new URL('../src/gatewayPageRefreshActionsController.ts', import.meta.url)

test('gateway page refresh actions controller owns refresh operation wiring', async () => {
  const pageController = await readFile(pageControllerPath, 'utf8')
  const operationsController = await readFile(operationsControllerPath, 'utf8')
  const refreshActionsController = await readFile(refreshActionsControllerPath, 'utf8')

  assert.match(operationsController, /useGatewayPageRefreshActions\(\{/)
  assert.match(pageController, /useGatewayPageOperations\(\{/)
  assert.doesNotMatch(pageController, /useGatewayPageRefreshActions\(\{/)
  assert.doesNotMatch(pageController, /useGatewayRefreshOperationsPageActions\(\{/)
  assert.match(refreshActionsController, /useGatewayRefreshOperationsPageActions\(\{/)
  assert.match(refreshActionsController, /routes: state\.routes/)
  assert.match(refreshActionsController, /requestSummaries: gatewayPageRequests\.refreshSiteSummaries/)
  assert.match(refreshActionsController, /requestSiteGroups: gatewayPageRequests\.getSiteGroups/)
  assert.match(refreshActionsController, /loadGatewayData: \(\) => runtimeActions\.loadData\(\)/)
  assert.match(operationsController, /getRouteActions: \(\) => routeActions/)
  assert.match(refreshActionsController, /probeRouteBalances: \(routeIds, options\) => getRouteActions\(\)\.probeRouteBalances\(routeIds, options\)/)
})
