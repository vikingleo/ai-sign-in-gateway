import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const pageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const operationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const adminActionsControllerPath = new URL('../src/gatewayPageAdminActionsController.ts', import.meta.url)

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

test('gateway page admin actions controller owns admin operations wiring', async () => {
  const pageController = await readFile(pageControllerPath, 'utf8')
  const operationsController = await readFile(operationsControllerPath, 'utf8')
  const adminActionsController = await readOptionalSource(adminActionsControllerPath)

  assert.notEqual(adminActionsController, '')
  assert.match(adminActionsController, /export function useGatewayPageAdminActions\(/)
  assert.match(adminActionsController, /useGatewayAdminOperationsPageActions\(\{/)
  assert.match(adminActionsController, /requestSync: gatewayPageRequests\.syncGatewayRoutes/)
  assert.match(adminActionsController, /requestSaveSettings: gatewayPageRequests\.updateGatewaySettings/)
  assert.match(adminActionsController, /reloadGatewayData: runtimeActions\.reloadGatewayDataAfterAction/)
  assert.match(adminActionsController, /probeRouteBalances: routeActions\.probeRouteBalances/)

  assert.match(operationsController, /useGatewayPageAdminActions\(\{/)
  assert.match(pageController, /useGatewayPageOperations\(\{/)
  assert.doesNotMatch(pageController, /useGatewayPageAdminActions\(\{/)
  assert.doesNotMatch(pageController, /useGatewayAdminOperationsPageActions\(\{/)
  assert.doesNotMatch(pageController, /from '\.\/gatewayAdminOperationsPageController\.ts'/)
})
