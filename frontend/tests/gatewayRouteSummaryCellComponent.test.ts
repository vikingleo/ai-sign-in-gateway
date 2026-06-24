import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayRouteSummaryCell.vue', import.meta.url)
const tablePath = new URL('../src/components/gateway/GatewayRouteManagementTable.vue', import.meta.url)

test('gateway route summary cell declares the route identity UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /route: GatewayRoute/)
  assert.match(source, /loadRouteLabel: \(route: GatewayRoute\) => string/)
  assert.match(source, /routeDetailItems: \(route: GatewayRoute\) => GatewayRouteDetailItem\[\]/)
  assert.match(source, /routeIssueLabels: \(route: GatewayRoute\) => string\[\]/)
  assert.match(source, /supportedModelsPreview: \(models: string\[\]\) => string/)
  assert.match(source, /class="table-cell-compact"/)
  assert.match(source, /class="tooltip-detail-list"/)
  assert.match(source, /class="table-cell-compact__meta-label"/)
  assert.match(source, /模型能力/)
  assert.match(source, /route-issue-tag/)
  assert.match(source, /InfoCircleOutlined/)
})

test('GatewayRouteManagementTable delegates route identity cells to the gateway component boundary', async () => {
  const source = await readFile(tablePath, 'utf8')

  assert.match(source, /import GatewayRouteSummaryCell from '\.\/GatewayRouteSummaryCell\.vue'/)
  assert.match(source, /<GatewayRouteSummaryCell/)
  assert.doesNotMatch(source, /<div class="table-cell-compact">\s*<div class="table-cell-compact__head">\s*<a-tooltip placement="topLeft" :title="loadRouteLabel\(asRoute\(record\)\)">/)
  assert.doesNotMatch(source, /routeIssueLabels\(asRoute\(record\)\)\.length/)
})
