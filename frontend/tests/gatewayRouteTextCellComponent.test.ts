import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayRouteTextCell.vue', import.meta.url)
const priorityDialogPath = new URL('../src/components/gateway/GatewayPriorityDialog.vue', import.meta.url)
const tablePath = new URL('../src/components/gateway/GatewayRouteManagementTable.vue', import.meta.url)

test('gateway route text cell declares the scalar route text UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /route: GatewayRoute/)
  assert.match(source, /mode: 'group' \| 'priority' \| 'weight' \| 'successRate'/)
  assert.match(source, /formatGroupNames: \(value: string \| string\[\] \| null \| undefined\) => string/)
  assert.match(source, /valueClass\?: string/)
  assert.match(source, /route\.group_name/)
  assert.match(source, /\|\| '未分组'/)
  assert.match(source, /route\.route_priority/)
  assert.match(source, /route\.weight/)
  assert.match(source, /route\.success_rate != null/)
  assert.match(source, /: '暂无'/)
  assert.match(source, /%/)
})

test('gateway parents delegate scalar route text cells to the component boundary', async () => {
  const tableSource = await readFile(tablePath, 'utf8')
  const priorityDialogSource = await readFile(priorityDialogPath, 'utf8')
  const delegatedSource = `${tableSource}\n${priorityDialogSource}`

  assert.match(tableSource, /import GatewayRouteTextCell from '\.\/GatewayRouteTextCell\.vue'/)
  assert.match(priorityDialogSource, /import GatewayRouteTextCell from '\.\/GatewayRouteTextCell\.vue'/)
  assert.match(delegatedSource, /<GatewayRouteTextCell/)
  assert.match(delegatedSource, /mode="group"/)
  assert.match(delegatedSource, /mode="priority"/)
  assert.match(delegatedSource, /mode="weight"/)
  assert.match(delegatedSource, /mode="successRate"/)
  assert.match(delegatedSource, /value-class="priority-number"/)
  assert.doesNotMatch(tableSource, /formatGroupNames\(asRoute\(record\)\.group_name\) \|\| '未分组'/)
  assert.doesNotMatch(tableSource, /asRoute\(record\)\.success_rate \}\}%/)
  assert.doesNotMatch(tableSource, /asRoute\(record\)\.weight \}\}/)
  assert.doesNotMatch(tableSource, /asRoute\(record\)\.route_priority \}\}/)
})
