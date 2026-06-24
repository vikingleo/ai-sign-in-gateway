import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayRouteLatencyCell.vue', import.meta.url)
const tablePath = new URL('../src/components/gateway/GatewayRouteManagementTable.vue', import.meta.url)

test('gateway route latency cell declares the route latency UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /route: GatewayRoute/)
  assert.match(source, /primaryLatency: \(route: GatewayRoute\) => number \| null/)
  assert.match(source, /latencyClass: \(latencyMs: number \| null \| undefined\) => string/)
  assert.match(source, /formatLatency: \(latencyMs: number \| null \| undefined\) => string/)
  assert.match(source, /routeLatencyDetails: \(route: GatewayRoute\) => string\[\]/)
  assert.match(source, /class="participation-cell"/)
  assert.match(source, /class="tooltip-detail-list"/)
  assert.match(source, /gateway-latency__dot/)
  assert.match(source, /gateway-latency__value/)
})

test('GatewayRouteManagementTable delegates route latency cells to the gateway component boundary', async () => {
  const source = await readFile(tablePath, 'utf8')

  assert.match(source, /import GatewayRouteLatencyCell from '\.\/GatewayRouteLatencyCell\.vue'/)
  assert.match(source, /<GatewayRouteLatencyCell/)
  assert.doesNotMatch(source, /routeLatencyDetails\(asRoute\(record\)\)\.length/)
  assert.doesNotMatch(source, /latencyClass\(primaryLatency\(asRoute\(record\)\)\)/)
})
