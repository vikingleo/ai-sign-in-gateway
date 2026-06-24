import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayMonitorToolbar.vue', import.meta.url)
const pagePath = new URL('../src/components/gateway/GatewayMonitorPage.vue', import.meta.url)

test('gateway monitor toolbar declares the monitor toolbar UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /requestUrl: string/)
  assert.match(source, /codexTooltip: string/)
  assert.match(source, /maskedApiKey: string/)
  assert.match(source, /hasApiKey: boolean/)
  assert.match(source, /loading: boolean/)
  assert.match(source, /event: 'copy-request-url'/)
  assert.match(source, /event: 'copy-api-key'/)
  assert.match(source, /event: 'refresh'/)
  assert.match(source, /event: 'open-settings'/)
  assert.match(source, /event: 'open-logs'/)
  assert.match(source, /class="page-toolbar page-toolbar--actions"/)
  assert.match(source, /class="gateway-monitor-toolbar"/)
  assert.match(source, /<GatewayAccessBar/)
  assert.doesNotMatch(source, /variant="route"/)
  assert.match(source, /刷新/)
  assert.match(source, /网关策略/)
  assert.match(source, /最近请求/)
  assert.match(source, /ReloadOutlined/)
  assert.match(source, /SettingOutlined/)
})

test('GatewayMonitorPage delegates monitor toolbar rendering to the component boundary', async () => {
  const source = await readFile(pagePath, 'utf8')

  assert.match(source, /import GatewayMonitorToolbar from '\.\/GatewayMonitorToolbar\.vue'/)
  assert.match(source, /<GatewayMonitorToolbar/)
  assert.match(source, /:request-url="requestUrl"/)
  assert.match(source, /@refresh="emit\('refresh'\)"/)
  assert.match(source, /@open-settings="emit\('open-settings'\)"/)
  assert.match(source, /@open-logs="emit\('open-logs'\)"/)
  assert.doesNotMatch(source, /class="gateway-monitor-toolbar"/)
  assert.doesNotMatch(source, /<GatewayAccessBar/)
  assert.doesNotMatch(source, /最近请求<\/a-button>/)
})
