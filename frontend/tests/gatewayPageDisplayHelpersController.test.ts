import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { gatewayLogRowKey } from '../src/gatewayActivityDisplayModel.ts'
import { gatewayRouteRowKey } from '../src/gatewayRouteDisplayModel.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageFoundationControllerPath = new URL('../src/gatewayPageFoundationController.ts', import.meta.url)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
const displayHelpersControllerPath = new URL('../src/gatewayPageDisplayHelpersController.ts', import.meta.url)

async function readOptionalSource(path: URL) {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return ''
    }
    throw error
  }
}

test('createGatewayPageDisplayHelpers exposes route and log row key aliases', async () => {
  const module = await import('../src/gatewayPageDisplayHelpersController.ts').catch(() => null)

  assert.notEqual(module, null)
  const { createGatewayPageDisplayHelpers } = module as NonNullable<typeof module>
  const helpers = createGatewayPageDisplayHelpers()

  assert.equal(helpers.rowKey, gatewayRouteRowKey)
  assert.equal(helpers.routeRowKey, gatewayRouteRowKey)
  assert.equal(helpers.logRowKey, gatewayLogRowKey)
})

test('gateway page display helpers controller owns static display helper imports', async () => {
  const source = await readOptionalSource(displayHelpersControllerPath)

  assert.notEqual(source, '')
  assert.match(source, /from '\.\/format\.ts'/)
  assert.match(source, /from '\.\/viewUtils\.ts'/)
  assert.match(source, /from '\.\/gatewayRouteDisplayModel\.ts'/)
  assert.match(source, /from '\.\/gatewayActivityDisplayModel\.ts'/)
  assert.match(source, /export function createGatewayPageDisplayHelpers\(\)/)
  assert.match(source, /asRoute: asGatewayRoute/)
  assert.match(source, /rowKey: gatewayRouteRowKey/)
  assert.match(source, /routeRowKey: gatewayRouteRowKey/)
  assert.match(source, /logRowKey: gatewayLogRowKey/)
})

test('GatewayView delegates static display helpers to the page display helpers controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const foundationControllerSource = await readFile(gatewayPageFoundationControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(pageControllerSource.includes("useGatewayPageFoundation"), "GatewayView delegates static display helpers through the page foundation controller")
  assert.ok(foundationControllerSource.includes("createGatewayPageDisplayHelpers"), "GatewayView delegates static display helpers to the page display helpers controller should keep createGatewayPageDisplayHelpers in gateway page foundation controller")
  assert.ok(shellBindingsControllerSource.includes("...gatewayPageDisplayHelpers"), "GatewayView delegates static display helpers to the page display helpers controller should keep ...gatewayPageDisplayHelpers in gateway page controller")
})
