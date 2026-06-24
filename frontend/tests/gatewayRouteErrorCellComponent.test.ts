import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayRouteErrorCell.vue', import.meta.url)
const tablePath = new URL('../src/components/gateway/GatewayRouteManagementTable.vue', import.meta.url)

test('gateway route error cell declares the route error UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /route: GatewayRoute/)
  assert.match(source, /routeErrorDetails: \(route: GatewayRoute\) => string\[\]/)
  assert.match(source, /compactText/)
  assert.match(source, /class="tooltip-detail-list"/)
  assert.match(source, /class="table-ellipsis"/)
  assert.match(source, /last_error/)
  assert.match(source, /\|\| '-'/)
})

test('GatewayRouteManagementTable delegates route error cells to the gateway component boundary', async () => {
  const source = await readFile(tablePath, 'utf8')

  assert.match(source, /import GatewayRouteErrorCell from '\.\/GatewayRouteErrorCell\.vue'/)
  assert.match(source, /<GatewayRouteErrorCell/)
  assert.doesNotMatch(source, /routeErrorDetails\(asRoute\(record\)\)\.length/)
  assert.doesNotMatch(source, /compactText\(asRoute\(record\)\.last_error, 42\)/)
})
