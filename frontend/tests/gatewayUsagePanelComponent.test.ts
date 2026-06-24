import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayUsagePanel.vue', import.meta.url)
const dashboardPath = new URL('../src/components/gateway/GatewayMonitorDashboard.vue', import.meta.url)

test('gateway usage panel declares the monitor usage UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /usageRange: GatewayUsageRange/)
  assert.match(source, /usage: GatewayUsage \| null/)
  assert.match(source, /'update:start'/)
  assert.match(source, /'update:end'/)
  assert.match(source, /'today'/)
  assert.match(source, /'query'/)
  assert.match(source, /class="gateway-panel gateway-panel--usage"/)
})

test('GatewayMonitorDashboard delegates the monitor usage panel to the gateway component boundary', async () => {
  const source = await readFile(dashboardPath, 'utf8')

  assert.match(source, /import GatewayUsagePanel from '\.\/GatewayUsagePanel\.vue'/)
  assert.match(source, /<GatewayUsagePanel/)
  assert.match(source, /:usage-range="usageRange"/)
  assert.match(source, /@update:start="emit\('update:start', \$event\)"/)
  assert.match(source, /@query="emit\('query'\)"/)
  assert.doesNotMatch(source, /<section class="gateway-panel gateway-panel--usage">/)
})
