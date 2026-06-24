import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const pageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const viewStateControllerPath = new URL('../src/gatewayPageViewStateController.ts', import.meta.url)

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

test('gateway page view state controller owns page view state wiring', async () => {
  const pageControllerSource = await readFile(pageControllerPath, 'utf8')
  const viewStateControllerSource = await readOptionalSource(viewStateControllerPath)

  assert.notEqual(viewStateControllerSource, '')
  assert.match(viewStateControllerSource, /export function useGatewayPageViewState\(/)
  assert.match(viewStateControllerSource, /useGatewayPageAccessState\(\{/)
  assert.match(viewStateControllerSource, /useGatewayRouteMutationActions\(\{/)
  assert.match(viewStateControllerSource, /useGatewayDisplayPageState\(\{/)
  assert.match(viewStateControllerSource, /getApiBase/)
  assert.match(viewStateControllerSource, /gatewayPagePlatform/)
  assert.match(viewStateControllerSource, /showPlanNotice/)
  assert.match(viewStateControllerSource, /routes: state\.routes/)
  assert.match(viewStateControllerSource, /priorityRoutes: state\.priorityRoutes/)
  assert.match(viewStateControllerSource, /settingsForm: state\.settingsDialog\.form/)
  assert.match(viewStateControllerSource, /routeFilterState: state\.routeFilters\.state/)

  assert.match(pageControllerSource, /useGatewayPageViewState\(\{/)
  assert.doesNotMatch(pageControllerSource, /useGatewayPageAccessState\(\{/)
  assert.doesNotMatch(pageControllerSource, /useGatewayRouteMutationActions\(\{/)
  assert.doesNotMatch(pageControllerSource, /useGatewayDisplayPageState\(\{/)
})
