import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayRouteBalanceCell.vue', import.meta.url)
const tablePath = new URL('../src/components/gateway/GatewayRouteManagementTable.vue', import.meta.url)

test('gateway route balance cell declares the route balance UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /route: GatewayRoute/)
  assert.match(source, /balanceClass: \(balance: number \| null \| undefined\) => string/)
  assert.match(source, /last_balance/)
  assert.match(source, /balance_display/)
  assert.match(source, /\|\| '暂无'/)
})

test('GatewayRouteManagementTable delegates route balance cells to the gateway component boundary', async () => {
  const source = await readFile(tablePath, 'utf8')

  assert.match(source, /import GatewayRouteBalanceCell from '\.\/GatewayRouteBalanceCell\.vue'/)
  assert.match(source, /<GatewayRouteBalanceCell/)
  assert.doesNotMatch(source, /balanceClass\(asRoute\(record\)\.last_balance\)/)
  assert.doesNotMatch(source, /asRoute\(record\)\.balance_display \|\| '暂无'/)
})
