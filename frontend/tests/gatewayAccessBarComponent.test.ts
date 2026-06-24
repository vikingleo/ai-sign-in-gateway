import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayAccessBar.vue', import.meta.url)
const viewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const shellPath = new URL('../src/components/gateway/GatewayPageShell.vue', import.meta.url)
const routePagePath = new URL('../src/components/gateway/GatewayRouteManagementPage.vue', import.meta.url)
const monitorPagePath = new URL('../src/components/gateway/GatewayMonitorPage.vue', import.meta.url)
const monitorToolbarPath = new URL('../src/components/gateway/GatewayMonitorToolbar.vue', import.meta.url)
const routeToolbarPath = new URL('../src/components/gateway/GatewayRouteManagementToolbar.vue', import.meta.url)

test('gateway access bar declares the gateway copy UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /requestUrl: string/)
  assert.match(source, /codexTooltip: string/)
  assert.match(source, /maskedApiKey: string/)
  assert.match(source, /hasApiKey: boolean/)
  assert.match(source, /variant\?: 'default' \| 'route'/)
  assert.match(source, /event: 'copy-request-url'/)
  assert.match(source, /event: 'copy-api-key'/)
  assert.match(source, /class="gateway-access"/)
  assert.match(source, /gateway-access--route/)
  assert.match(source, /Codex \/v1/)
  assert.match(source, /CopyOutlined/)
})

test('gateway toolbar parents delegate gateway access copy controls to the gateway component boundary', async () => {
  const viewSource = await readFile(viewPath, 'utf8')
  const shellSource = await readFile(shellPath, 'utf8')
  const routePageSource = await readFile(routePagePath, 'utf8')
  const monitorPageSource = await readFile(monitorPagePath, 'utf8')
  const monitorToolbarSource = await readFile(monitorToolbarPath, 'utf8')
  const routeToolbarSource = await readFile(routeToolbarPath, 'utf8')
  const toolbarSource = `${monitorToolbarSource}\n${routeToolbarSource}`

  assert.match(monitorToolbarSource, /import GatewayAccessBar from '\.\/GatewayAccessBar\.vue'/)
  assert.match(routeToolbarSource, /import GatewayAccessBar from '\.\/GatewayAccessBar\.vue'/)
  assert.match(toolbarSource, /<GatewayAccessBar/)
  assert.match(viewSource, /<GatewayPageShell/)
  assert.match(shellSource, /<GatewayMonitorPage/)
  assert.match(shellSource, /<GatewayRouteManagementPage/)
  assert.match(monitorPageSource, /<GatewayMonitorToolbar/)
  assert.match(routePageSource, /<GatewayRouteManagementToolbar/)
  assert.doesNotMatch(viewSource, /<div class="gateway-access">/)
  assert.doesNotMatch(viewSource, /<div class="gateway-access gateway-access--route">/)
})
