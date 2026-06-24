import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayMetricCards.vue', import.meta.url)
const dashboardPath = new URL('../src/components/gateway/GatewayMonitorDashboard.vue', import.meta.url)

test('gateway metric cards component declares the monitor metrics UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /cards: GatewayMetricCard\[\]/)
  assert.match(source, /class="gateway-metrics"/)
  assert.match(source, /gateway-metric-card/)
  assert.match(source, /gateway-metric-card__label/)
  assert.match(source, /gateway-metric-card__value/)
})

test('GatewayMonitorDashboard delegates the monitor metrics grid to the gateway component boundary', async () => {
  const source = await readFile(dashboardPath, 'utf8')

  assert.match(source, /import GatewayMetricCards from '\.\/GatewayMetricCards\.vue'/)
  assert.match(source, /<GatewayMetricCards/)
  assert.match(source, /:cards="metricCards"/)
  assert.doesNotMatch(source, /<div v-if="isGatewayMonitor" class="gateway-metrics">/)
})
