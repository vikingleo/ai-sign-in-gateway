import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayRouteStatusPanel.vue', import.meta.url)
const dashboardPath = new URL('../src/components/gateway/GatewayMonitorDashboard.vue', import.meta.url)

test('gateway route status panel declares the monitor route pool UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /statusCards: GatewayRoutePoolStatusCard\[\]/)
  assert.match(source, /previewRoutes: GatewayRoute\[\]/)
  assert.match(source, /routeConcurrencyLimitLabel: string/)
  assert.match(source, /class="gateway-panel gateway-panel--route-status"/)
  assert.match(source, /route-pool-status__card/)
  assert.match(source, /route-pool-preview__row/)
  assert.match(source, /Math\.max\(8, item\.ratio \* 100\)/)
  assert.match(source, /formatLatency\(primaryLatency\(route\)\)/)
})

test('GatewayMonitorDashboard delegates the monitor route pool status panel to the gateway component boundary', async () => {
  const source = await readFile(dashboardPath, 'utf8')

  assert.match(source, /import GatewayRouteStatusPanel from '\.\/GatewayRouteStatusPanel\.vue'/)
  assert.match(source, /<GatewayRouteStatusPanel/)
  assert.match(source, /:status-cards="routePoolStatusCards"/)
  assert.match(source, /:preview-routes="routePoolPreviewRoutes"/)
  assert.match(source, /:route-concurrency-limit-label="routeConcurrencyLimitLabel"/)
  assert.doesNotMatch(source, /<section class="gateway-panel gateway-panel--route-status">/)
})
