import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayActivityPanel.vue', import.meta.url)
const dashboardPath = new URL('../src/components/gateway/GatewayMonitorDashboard.vue', import.meta.url)

test('gateway activity panel declares the monitor activity UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /items: GatewayActivityFeedItem\[\]/)
  assert.match(source, /activeCount: number/)
  assert.match(source, /event: 'copy'/)
  assert.match(source, /class="gateway-panel gateway-panel--activity"/)
  assert.match(source, /CopyOutlined/)
  assert.match(source, /v-for="\((?:meta, index|meta, index)\) in item\.meta"/)
  assert.match(source, /:key="`\$\{meta\}-\$\{index\}`"/)
  assert.match(source, /等待网关请求进入路由池/)
})

test('GatewayMonitorDashboard delegates the monitor activity panel to the gateway component boundary', async () => {
  const source = await readFile(dashboardPath, 'utf8')

  assert.match(source, /import GatewayActivityPanel from '\.\/GatewayActivityPanel\.vue'/)
  assert.match(source, /<GatewayActivityPanel/)
  assert.match(source, /:items="routeActivityFeed"/)
  assert.match(source, /:active-count="activeRequestCount"/)
  assert.match(source, /@copy="emit\('copy-activity-url', \$event\)"/)
  assert.doesNotMatch(source, /<section class="gateway-panel gateway-panel--activity">/)
})
