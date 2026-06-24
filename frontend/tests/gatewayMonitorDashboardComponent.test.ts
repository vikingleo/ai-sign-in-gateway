import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayMonitorDashboard.vue', import.meta.url)
const pagePath = new URL('../src/components/gateway/GatewayMonitorPage.vue', import.meta.url)

test('gateway monitor dashboard declares the monitor body UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /metricCards: GatewayMetricCard\[\]/)
  assert.match(source, /usageRange: GatewayUsageRange/)
  assert.match(source, /usage: GatewayUsage \| null/)
  assert.match(source, /routeActivityFeed: GatewayActivityFeedItem\[\]/)
  assert.match(source, /routePoolStatusCards: GatewayRoutePoolStatusCard\[\]/)
  assert.match(source, /routePoolPreviewRoutes: GatewayRoute\[\]/)
  assert.match(source, /gatewayStrategyCards: GatewayStrategyCard\[\]/)
  assert.match(source, /event: 'update:start'/)
  assert.match(source, /event: 'update:end'/)
  assert.match(source, /event: 'today'/)
  assert.match(source, /event: 'query'/)
  assert.match(source, /event: 'copy-activity-url'/)
  assert.match(source, /<GatewayMetricCards/)
  assert.match(source, /class="gateway-fill"/)
  assert.match(source, /class="admin-card gateway-overview-shell"/)
  assert.match(source, /class="gateway-overview-grid"/)
  assert.match(source, /<GatewayUsagePanel/)
  assert.match(source, /<GatewayActivityPanel/)
  assert.match(source, /<GatewayRouteStatusPanel/)
  assert.match(source, /<GatewayStrategyPanel/)
})

test('GatewayMonitorPage delegates monitor body rendering to the dashboard component boundary', async () => {
  const source = await readFile(pagePath, 'utf8')

  assert.match(source, /import GatewayMonitorDashboard from '\.\/GatewayMonitorDashboard\.vue'/)
  assert.match(source, /<GatewayMonitorDashboard/)
  assert.match(source, /:metric-cards="metricCards"/)
  assert.match(source, /:route-activity-feed="routeActivityFeed"/)
  assert.match(source, /@copy-activity-url="emit\('copy-activity-url', \$event\)"/)
  assert.doesNotMatch(source, /<GatewayMetricCards/)
  assert.doesNotMatch(source, /class="admin-card gateway-overview-shell"/)
  assert.doesNotMatch(source, /class="gateway-overview-grid"/)
  assert.doesNotMatch(source, /<GatewayUsagePanel/)
  assert.doesNotMatch(source, /<GatewayActivityPanel/)
  assert.doesNotMatch(source, /<GatewayRouteStatusPanel/)
  assert.doesNotMatch(source, /<GatewayStrategyPanel/)
})
