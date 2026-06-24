import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayPageShell.vue', import.meta.url)
const viewPath = new URL('../src/views/GatewayView.vue', import.meta.url)

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

test('gateway page shell declares the final page composition contract', async () => {
  const source = await readOptionalSource(componentPath)

  assert.match(source, /import ShellLayout from '\.\.\/ShellLayout\.vue'/)
  assert.match(source, /import type \{ GatewayPageSection \} from '\.\.\/\.\.\/gatewayPageSectionController'/)
  assert.match(source, /import GatewayMonitorPage from '\.\/GatewayMonitorPage\.vue'/)
  assert.match(source, /import GatewayRouteManagementPage from '\.\/GatewayRouteManagementPage\.vue'/)
  assert.match(source, /import GatewayOverlayPageHost from '\.\/GatewayOverlayPageHost\.vue'/)
  assert.match(source, /section: GatewayPageSection/)
  assert.match(source, /monitorPageProps: GatewayMonitorPageProps/)
  assert.match(source, /routeManagementPageProps: GatewayRouteManagementPageProps/)
  assert.match(source, /overlayPageProps: GatewayOverlayPageHostProps/)
  assert.match(source, /<ShellLayout>/)
  assert.match(source, /:class="pageStackClass"/)
  assert.match(source, /<GatewayMonitorPage/)
  assert.match(source, /v-if="section === 'monitor'"/)
  assert.match(source, /v-bind="monitorPageProps"/)
  assert.match(source, /v-on="monitorPageHandlers"/)
  assert.match(source, /<GatewayRouteManagementPage/)
  assert.match(source, /v-bind="routeManagementPageProps"/)
  assert.match(source, /v-on="routeManagementPageHandlers"/)
  assert.match(source, /<GatewayOverlayPageHost/)
  assert.match(source, /v-bind="overlayPageProps"/)
  assert.match(source, /v-on="overlayPageHandlers"/)
})

test('GatewayView delegates final page rendering to GatewayPageShell', async () => {
  const source = await readFile(viewPath, 'utf8')

  assert.match(source, /import GatewayPageShell from '\.\.\/components\/gateway\/GatewayPageShell\.vue'/)
  assert.doesNotMatch(source, /import GatewayMonitorPage from '\.\.\/components\/gateway\/GatewayMonitorPage\.vue'/)
  assert.doesNotMatch(source, /import GatewayRouteManagementPage from '\.\.\/components\/gateway\/GatewayRouteManagementPage\.vue'/)
  assert.doesNotMatch(source, /import GatewayOverlayPageHost from '\.\.\/components\/gateway\/GatewayOverlayPageHost\.vue'/)
  assert.match(source, /<GatewayPageShell/)
  assert.match(source, /:section="props\.section"/)
  assert.match(source, /:monitor-page-props="monitorPageProps"/)
  assert.match(source, /:monitor-page-handlers="monitorPageHandlers"/)
  assert.match(source, /:route-management-page-props="routeManagementPageProps"/)
  assert.match(source, /:route-management-page-handlers="routeManagementPageHandlers"/)
  assert.match(source, /:overlay-page-props="overlayPageProps"/)
  assert.match(source, /:overlay-page-handlers="overlayPageHandlers"/)
  assert.doesNotMatch(source, /<ShellLayout>/)
  assert.doesNotMatch(source, /<GatewayMonitorPage/)
  assert.doesNotMatch(source, /<GatewayRouteManagementPage/)
  assert.doesNotMatch(source, /<GatewayOverlayPageHost/)
})
