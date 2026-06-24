import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayRouteGroupsDialog.vue', import.meta.url)

test('route groups dialog validates new group names before emitting create', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /const newGroupError = ref\(''\)/)
  assert.match(source, /const name = newGroup\.name\.trim\(\)/)
  assert.match(source, /if \(!name\) \{/)
  assert.match(source, /newGroupError\.value = '请输入分组名称'/)
  assert.match(source, /return/)
  assert.match(source, /emit\('create', \{ name, apiKey: newGroup\.apiKey\.trim\(\) \}\)/)
  assert.match(source, /:status="newGroupError \? 'error' : undefined"/)
  assert.match(source, /<a-typography-text v-if="newGroupError" type="danger">/)
})
