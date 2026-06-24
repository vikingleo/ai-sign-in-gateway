import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const controllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)

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

test('GatewayView delegates page orchestration to the gateway page controller', async () => {
  const source = await readFile(gatewayViewPath, 'utf8')

  assert.match(source, /import \{[\s\S]*useGatewayPageController[\s\S]*\} from '(?:\.\.\/|\.\/)gatewayPageController(?:\.ts)?'/)
  assert.match(source, /const \{[\s\S]*monitorPageProps,[\s\S]*overlayPageHandlers,[\s\S]*mount,[\s\S]*unmount,[\s\S]*\} = useGatewayPageController\(\{/)
  assert.match(source, /:section="props\.section"/)
  assert.match(source, /onMounted\(async \(\) => \{[\s\S]*await mount\(\)[\s\S]*\}\)/)
  assert.match(source, /onBeforeUnmount\(\(\) => \{[\s\S]*unmount\(\)[\s\S]*\}\)/)
  assert.doesNotMatch(source, /from '(?:\.\.\/|\.\/)gatewayPageStateController(?:\.ts)?'/)
  assert.doesNotMatch(source, /from '(?:\.\.\/|\.\/)gatewayPageRequestsController(?:\.ts)?'/)
  assert.doesNotMatch(source, /from '(?:\.\.\/|\.\/)gatewayPagePlatformController(?:\.ts)?'/)
  assert.doesNotMatch(source, /from '(?:\.\.\/|\.\/)gatewayRuntimeOperationsPageController(?:\.ts)?'/)
  assert.doesNotMatch(source, /from '(?:\.\.\/|\.\/)gatewayRouteManagementOperationsPageController(?:\.ts)?'/)
  assert.doesNotMatch(source, /from '(?:\.\.\/|\.\/)gatewayAdminOperationsPageController(?:\.ts)?'/)
  assert.doesNotMatch(source, /from '(?:\.\.\/|\.\/)gatewayPageBindingsController(?:\.ts)?'/)
})

test('gateway page controller keeps gateway business domains inside the controller boundary', async () => {
  const controller = await readOptionalSource(controllerPath)

  assert.notEqual(controller, '')
  assert.match(controller, /export function useGatewayPageController\(/)
  assert.match(controller, /useGatewayPageFoundation\(\{/)
  assert.doesNotMatch(controller, /useGatewayPageState\(\)/)
  assert.doesNotMatch(controller, /createGatewayPageRequests\(\)/)
  assert.doesNotMatch(controller, /createGatewayPagePlatform\(\{/)
  assert.match(controller, /useGatewayPageViewState\(\{/)
  assert.doesNotMatch(controller, /useGatewayPageAccessState\(\{/)
  assert.doesNotMatch(controller, /useGatewayRouteMutationActions\(\{/)
  assert.doesNotMatch(controller, /useGatewayDisplayPageState\(\{/)
  assert.match(controller, /useGatewayPageOperations\(\{/)
  assert.doesNotMatch(controller, /useGatewayPageRuntimeActions\(\{/)
  assert.doesNotMatch(controller, /useGatewayPageRefreshActions\(\{/)
  assert.doesNotMatch(controller, /useGatewayPageRouteActions\(\{/)
  assert.doesNotMatch(controller, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(controller, /useGatewayPageAdminActions\(\{/)
  assert.match(controller, /useGatewayPageShellBindings\(\{/)
  assert.match(controller, /useGatewayPageLifecycleActions\(\{/)
  assert.doesNotMatch(controller, /mountGatewayPageLifecycle\(\{/)
  assert.doesNotMatch(controller, /unmountGatewayPageLifecycle\(\{/)
})
