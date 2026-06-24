import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayLogLatencyCell.vue', import.meta.url)
const drawerPath = new URL('../src/components/gateway/GatewayLogsDrawer.vue', import.meta.url)

test('gateway log latency cell declares the latency display UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /log: GatewayLog/)
  assert.match(source, /log\.latency_ms != null \?/)
  assert.match(source, /\$\{log\.latency_ms\} ms/)
  assert.match(source, /暂无/)
})

test('gateway logs drawer delegates gateway log latency cells to the component boundary', async () => {
  const source = await readFile(drawerPath, 'utf8')

  assert.match(source, /import GatewayLogLatencyCell from '\.\/GatewayLogLatencyCell\.vue'/)
  assert.match(source, /<GatewayLogLatencyCell/)
  assert.match(source, /:log="asLog\(record\)"/)
  assert.doesNotMatch(source, /asLog\(record\)\.latency_ms \?/)
})
