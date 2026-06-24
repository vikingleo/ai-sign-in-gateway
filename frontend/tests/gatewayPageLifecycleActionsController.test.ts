import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const pageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const lifecycleActionsControllerPath = new URL(
  '../src/gatewayPageLifecycleActionsController.ts',
  import.meta.url,
)

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

test('gateway page lifecycle actions controller owns lifecycle option wiring', async () => {
  const pageController = await readFile(pageControllerPath, 'utf8')
  const lifecycleActionsController = await readOptionalSource(lifecycleActionsControllerPath)

  assert.notEqual(lifecycleActionsController, '')
  assert.match(lifecycleActionsController, /export function useGatewayPageLifecycleActions\(/)
  assert.match(lifecycleActionsController, /mountGatewayPageLifecycle\(\{/)
  assert.match(lifecycleActionsController, /unmountGatewayPageLifecycle\(\{/)
  assert.match(lifecycleActionsController, /addPageListeners: gatewayPagePlatform\.lifecycle\.addPageListeners/)
  assert.match(lifecycleActionsController, /removePageListeners: gatewayPagePlatform\.lifecycle\.removePageListeners/)
  assert.match(lifecycleActionsController, /handleSiteGroupsChanged: refreshActions\.handleSiteGroupsChanged/)
  assert.match(lifecycleActionsController, /handleVisibilityChange: runtimeActions\.handleVisibilityChange/)
  assert.match(lifecycleActionsController, /resetUsageRangeToToday: state\.usageRangeState\.resetToToday/)
  assert.match(lifecycleActionsController, /scheduleRouteSummaryRefresh: refreshActions\.scheduleRouteSummaryRefresh/)
  assert.match(lifecycleActionsController, /abortLoadData: state\.gatewayRuntime\.loadDataControllerSlot\.abortAndClear/)
  assert.match(lifecycleActionsController, /disposeRouteProbeState: state\.routeProbeState\.dispose/)

  assert.match(pageController, /useGatewayPageLifecycleActions\(\{/)
  assert.doesNotMatch(pageController, /mountGatewayPageLifecycle\(\{/)
  assert.doesNotMatch(pageController, /unmountGatewayPageLifecycle\(\{/)
  assert.doesNotMatch(pageController, /from '\.\/gatewayPageLifecycleController\.ts'/)
})
