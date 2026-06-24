import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayLogRouteCell.vue', import.meta.url)
const drawerPath = new URL('../src/components/gateway/GatewayLogsDrawer.vue', import.meta.url)

test('gateway log route cell declares the log route identity UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /log: GatewayLog/)
  assert.match(source, /logRouteLabel: \(log: GatewayLog\) => string/)
  assert.match(source, /logRouteMeta: \(log: GatewayLog\) => string/)
  assert.match(source, /InfoCircleOutlined/)
  assert.match(source, /class="table-cell-compact"/)
  assert.match(source, /class="table-cell-compact__head"/)
  assert.match(source, /class="table-cell-compact__title"/)
  assert.match(source, /placement="right"/)
  assert.match(source, /logRouteLabel\(log\)/)
  assert.match(source, /logRouteMeta\(log\)/)
})

test('gateway logs drawer delegates gateway log route cells to the component boundary', async () => {
  const source = await readFile(drawerPath, 'utf8')

  assert.match(source, /import GatewayLogRouteCell from '\.\/GatewayLogRouteCell\.vue'/)
  assert.match(source, /<GatewayLogRouteCell/)
  assert.match(source, /:log="asLog\(record\)"/)
  assert.match(source, /:log-route-label="logRouteLabel"/)
  assert.match(source, /:log-route-meta="logRouteMeta"/)
  assert.doesNotMatch(source, /logRouteLabel\(asLog\(record\)\)/)
  assert.doesNotMatch(source, /logRouteMeta\(asLog\(record\)\)/)
  assert.doesNotMatch(source, /<InfoCircleOutlined class="table-info-icon" \/>/)
})
