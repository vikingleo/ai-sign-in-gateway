import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayStrategyPanel.vue', import.meta.url)
const dashboardPath = new URL('../src/components/gateway/GatewayMonitorDashboard.vue', import.meta.url)

test('gateway strategy panel declares the monitor strategy UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /cards: GatewayStrategyCard\[\]/)
  assert.match(source, /class="gateway-panel gateway-panel--strategy"/)
  assert.match(source, /gateway-strategy-board__item/)
  assert.match(source, /item\.width/)
  assert.match(source, /暂无策略统计数据/)
})

test('GatewayMonitorDashboard delegates the monitor strategy panel to the gateway component boundary', async () => {
  const source = await readFile(dashboardPath, 'utf8')

  assert.match(source, /import GatewayStrategyPanel from '\.\/GatewayStrategyPanel\.vue'/)
  assert.match(source, /<GatewayStrategyPanel/)
  assert.match(source, /:cards="gatewayStrategyCards"/)
  assert.doesNotMatch(source, /<section class="gateway-panel gateway-panel--strategy">/)
})
