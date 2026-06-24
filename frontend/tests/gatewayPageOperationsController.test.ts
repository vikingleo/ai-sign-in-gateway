import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const pageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const operationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)

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

test('gateway page operations controller owns action wiring order', async () => {
  const pageController = await readFile(pageControllerPath, 'utf8')
  const operationsController = await readOptionalSource(operationsControllerPath)

  assert.notEqual(operationsController, '')
  assert.match(operationsController, /export function useGatewayPageOperations\(/)
  assert.match(operationsController, /useGatewayPageRuntimeActions\(\{/)
  assert.match(operationsController, /useGatewayPageRefreshActions\(\{/)
  assert.match(operationsController, /getRouteActions: \(\) => routeActions/)
  assert.match(operationsController, /useGatewayPageRouteActions\(\{/)
  assert.match(operationsController, /refreshActions,\s+runtimeActions/)
  assert.match(operationsController, /useGatewayPageAdminActions\(\{/)
  assert.match(operationsController, /routeActions,\s+runtimeActions/)

  assert.match(pageController, /useGatewayPageOperations\(\{/)
  assert.doesNotMatch(pageController, /useGatewayPageRuntimeActions\(\{/)
  assert.doesNotMatch(pageController, /useGatewayPageRefreshActions\(\{/)
  assert.doesNotMatch(pageController, /useGatewayPageRouteActions\(\{/)
  assert.doesNotMatch(pageController, /useGatewayPageAdminActions\(\{/)
})
