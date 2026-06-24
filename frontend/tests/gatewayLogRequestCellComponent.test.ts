import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayLogRequestCell.vue', import.meta.url)
const drawerPath = new URL('../src/components/gateway/GatewayLogsDrawer.vue', import.meta.url)

test('gateway log request cell declares the request target UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /log: GatewayLog/)
  assert.match(source, /requestMethodColor: \(method: string\) => string/)
  assert.match(source, /logMethodLabel: \(log: GatewayLog\) => string/)
  assert.match(source, /logRequestLabel: \(log: GatewayLog\) => string/)
  assert.match(source, /logRequestURL: \(log: GatewayLog\) => string/)
  assert.match(source, /class="gateway-log-request"/)
  assert.match(source, /class="gateway-log-method"/)
  assert.match(source, /placement="topLeft"/)
  assert.match(source, /class="table-ellipsis gateway-log-request-url"/)
  assert.match(source, /log\.is_stream/)
  assert.match(source, /class="stream-tag"/)
  assert.match(source, /流式/)
})

test('gateway logs drawer delegates gateway log request cells to the component boundary', async () => {
  const source = await readFile(drawerPath, 'utf8')

  assert.match(source, /import GatewayLogRequestCell from '\.\/GatewayLogRequestCell\.vue'/)
  assert.match(source, /<GatewayLogRequestCell/)
  assert.match(source, /:log="asLog\(record\)"/)
  assert.match(source, /:request-method-color="requestMethodColor"/)
  assert.match(source, /:log-method-label="logMethodLabel"/)
  assert.match(source, /:log-request-label="logRequestLabel"/)
  assert.match(source, /:log-request-u-r-l="logRequestURL"/)
  assert.doesNotMatch(source, /class="gateway-log-request"/)
  assert.doesNotMatch(source, /logRequestURL\(asLog\(record\)\)/)
  assert.doesNotMatch(source, /asLog\(record\)\.is_stream/)
})
