import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayLogStatusCell.vue', import.meta.url)
const drawerPath = new URL('../src/components/gateway/GatewayLogsDrawer.vue', import.meta.url)

test('gateway log status cell declares the request status UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /log: GatewayLog/)
  assert.match(source, /log\.success/)
  assert.match(source, /log\.failure_reason/)
  assert.match(source, /请求成功/)
  assert.match(source, /请求失败/)
  assert.match(source, /成功/)
  assert.match(source, /失败/)
  assert.match(source, /'success' : 'error'/)
})

test('gateway logs drawer delegates gateway log status cells to the component boundary', async () => {
  const source = await readFile(drawerPath, 'utf8')

  assert.match(source, /import GatewayLogStatusCell from '\.\/GatewayLogStatusCell\.vue'/)
  assert.match(source, /<GatewayLogStatusCell/)
  assert.match(source, /:log="asLog\(record\)"/)
  assert.doesNotMatch(source, /asLog\(record\)\.success \? '请求成功'/)
  assert.doesNotMatch(source, /asLog\(record\)\.failure_reason \|\| '请求失败'/)
  assert.doesNotMatch(source, /asLog\(record\)\.success \? '成功' : '失败'/)
})
