import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayLogUserAgentCell.vue', import.meta.url)
const drawerPath = new URL('../src/components/gateway/GatewayLogsDrawer.vue', import.meta.url)

test('gateway log user agent cell declares the user agent UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /log: GatewayLog/)
  assert.match(source, /logUserAgent: \(log: GatewayLog\) => string/)
  assert.match(source, /v-if="logUserAgent\(log\)"/)
  assert.match(source, /:title="logUserAgent\(log\)"/)
  assert.match(source, /placement="topLeft"/)
  assert.match(source, /class="table-ellipsis gateway-log-user-agent"/)
  assert.match(source, /logUserAgent\(log\)/)
  assert.match(source, /暂无/)
})

test('gateway logs drawer delegates gateway log user agent cells to the component boundary', async () => {
  const source = await readFile(drawerPath, 'utf8')

  assert.match(source, /import GatewayLogUserAgentCell from '\.\/GatewayLogUserAgentCell\.vue'/)
  assert.match(source, /<GatewayLogUserAgentCell/)
  assert.match(source, /:log="asLog\(record\)"/)
  assert.match(source, /:log-user-agent="logUserAgent"/)
  assert.doesNotMatch(source, /class="table-ellipsis gateway-log-user-agent"/)
  assert.doesNotMatch(source, /logUserAgent\(asLog\(record\)\)/)
})
