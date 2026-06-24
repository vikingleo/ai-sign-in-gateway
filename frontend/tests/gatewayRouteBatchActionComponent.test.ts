import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayRouteBatchAction.vue', import.meta.url)
const toolbarPath = new URL('../src/components/gateway/GatewayRouteManagementToolbar.vue', import.meta.url)

test('gateway route batch action declares the route management progress UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /label: string/)
  assert.match(source, /progress: RouteBatchProgress \| null/)
  assert.match(source, /progressPercent: number/)
  assert.match(source, /tone\?: 'default' \| 'balance'/)
  assert.match(source, /event: 'action'/)
  assert.match(source, /class="route-probe-control"/)
  assert.match(source, /route-probe-progress--balance/)
  assert.match(source, /progress\.success/)
})

test('GatewayRouteManagementToolbar delegates route batch actions to the gateway component boundary', async () => {
  const source = await readFile(toolbarPath, 'utf8')

  assert.match(source, /import GatewayRouteBatchAction from '\.\/GatewayRouteBatchAction\.vue'/)
  assert.match(source, /<GatewayRouteBatchAction/)
  assert.doesNotMatch(source, /<div v-if="isRouteManagement" class="route-probe-control">/)
})
