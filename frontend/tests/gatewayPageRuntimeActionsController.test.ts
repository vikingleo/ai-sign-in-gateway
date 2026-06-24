import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const pageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const operationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const runtimeActionsControllerPath = new URL('../src/gatewayPageRuntimeActionsController.ts', import.meta.url)

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

test('gateway page runtime actions controller owns runtime operations wiring', async () => {
  const pageController = await readFile(pageControllerPath, 'utf8')
  const operationsController = await readFile(operationsControllerPath, 'utf8')
  const runtimeActionsController = await readOptionalSource(runtimeActionsControllerPath)

  assert.notEqual(runtimeActionsController, '')
  assert.match(runtimeActionsController, /export function useGatewayPageRuntimeActions\(/)
  assert.match(runtimeActionsController, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.match(runtimeActionsController, /requestUsage: gatewayPageRequests\.getGatewayUsage/)
  assert.match(runtimeActionsController, /startAutoRefreshRuntime: state\.gatewayRuntime\.startAutoRefresh/)
  assert.match(runtimeActionsController, /handleVisibilityRefresh: state\.gatewayRuntime\.handleVisibilityRefresh/)

  assert.match(operationsController, /useGatewayPageRuntimeActions\(\{/)
  assert.match(pageController, /useGatewayPageOperations\(\{/)
  assert.doesNotMatch(pageController, /useGatewayPageRuntimeActions\(\{/)
  assert.doesNotMatch(pageController, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(pageController, /from '\.\/gatewayRuntimeOperationsPageController\.ts'/)
})
