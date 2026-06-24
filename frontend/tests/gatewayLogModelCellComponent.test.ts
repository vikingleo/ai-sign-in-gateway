import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayLogModelCell.vue', import.meta.url)
const drawerPath = new URL('../src/components/gateway/GatewayLogsDrawer.vue', import.meta.url)

test('gateway log model cell declares the model display UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /log: GatewayLog/)
  assert.match(source, /logModelMeta: \(log: GatewayLog\) => string/)
  assert.match(source, /:title="logModelMeta\(log\)"/)
  assert.match(source, /placement="topLeft"/)
  assert.match(source, /class="gateway-log-model-line"/)
  assert.match(source, /logModelMeta\(log\)/)
})

test('gateway logs drawer delegates gateway log model cells to the component boundary', async () => {
  const source = await readFile(drawerPath, 'utf8')

  assert.match(source, /import GatewayLogModelCell from '\.\/GatewayLogModelCell\.vue'/)
  assert.match(source, /<GatewayLogModelCell/)
  assert.match(source, /:log="asLog\(record\)"/)
  assert.match(source, /:log-model-meta="logModelMeta"/)
  assert.doesNotMatch(source, /class="gateway-log-model-line"/)
  assert.doesNotMatch(source, /logModelMeta\(asLog\(record\)\)/)
})
