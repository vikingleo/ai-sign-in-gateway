import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageFoundationControllerPath = new URL('../src/gatewayPageFoundationController.ts', import.meta.url)
const gatewayPageSectionControllerPath = new URL('../src/gatewayPageSectionController.ts', import.meta.url)

test('GatewayView delegates section mode state to the page section controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const foundationControllerSource = await readFile(gatewayPageFoundationControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(pageControllerSource.includes("useGatewayPageFoundation"), "GatewayView delegates section mode state through the page foundation controller")
  assert.ok(foundationControllerSource.includes("useGatewayPageSectionState"), "GatewayView delegates section mode state to the page section controller should keep useGatewayPageSectionState in gateway page foundation controller")
  assert.ok(pageControllerSource.includes("props"), "GatewayView delegates section mode state to the page section controller should keep props in gateway page controller")
})

test('gateway page section controller owns the route and monitor mode computed values', async () => {
  const source = await readFile(gatewayPageSectionControllerPath, 'utf8')

  assert.match(source, /import \{ computed \} from 'vue'/)
  assert.match(source, /export type GatewayPageSection = 'routes' \| 'monitor'/)
  assert.match(source, /section\?: GatewayPageSection/)
  assert.match(source, /const isRouteManagement = computed\(\(\) => props\.section === 'routes'\)/)
  assert.match(source, /const isGatewayMonitor = computed\(\(\) => props\.section === 'monitor'\)/)
  assert.match(source, /return \{[\s\S]*isRouteManagement,[\s\S]*isGatewayMonitor,[\s\S]*\}/)
})
