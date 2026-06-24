import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayRouteConcurrencyCell.vue', import.meta.url)
const tablePath = new URL('../src/components/gateway/GatewayRouteManagementTable.vue', import.meta.url)

test('gateway route concurrency cell declares the concurrency UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /route: GatewayRoute/)
  assert.match(source, /routeConcurrencyLimitLabel: string/)
  assert.match(source, /active_concurrency/)
  assert.match(source, /当前并发/)
  assert.match(source, /最大转移/)
  assert.match(source, /不是硬上限/)
  assert.match(source, /gateway-concurrency--active/)
  assert.match(source, /gateway-concurrency__current/)
  assert.match(source, /gateway-concurrency__separator/)
  assert.match(source, /gateway-concurrency__limit/)
})

test('GatewayRouteManagementTable delegates route concurrency cells to the gateway component boundary', async () => {
  const source = await readFile(tablePath, 'utf8')

  assert.match(source, /import GatewayRouteConcurrencyCell from '\.\/GatewayRouteConcurrencyCell\.vue'/)
  assert.match(source, /<GatewayRouteConcurrencyCell/)
  assert.doesNotMatch(source, /gateway-concurrency__current">\{\{ asRoute\(record\)\.active_concurrency \}\}/)
  assert.doesNotMatch(source, /当前并发 \$\{asRoute\(record\)\.active_concurrency\} \/ 最大转移/)
})
