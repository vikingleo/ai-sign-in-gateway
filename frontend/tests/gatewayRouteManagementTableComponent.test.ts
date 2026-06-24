import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayRouteManagementTable.vue', import.meta.url)
const pagePath = new URL('../src/components/gateway/GatewayRouteManagementPage.vue', import.meta.url)

test('gateway route management table declares the route table UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /columns: ColumnsType<GatewayRoute>/)
  assert.match(source, /routes: GatewayRoute\[\]/)
  assert.match(source, /selectedRouteTypes: Array<GatewayRoute\['route_type'\]>/)
  assert.match(source, /selectedIssueStates = defineModel<GatewayIssueState\[\]>\('selectedIssueStates'/)
  assert.match(source, /includeDisabled = defineModel<boolean>\('includeDisabled'/)
  assert.match(source, /bindTableContainer: \(element: Element \| ComponentPublicInstance \| null\) => void/)
  assert.match(source, /event: 'type-change'/)
  assert.match(source, /event: 'path-change'/)
  assert.match(source, /event: 'configure-models'/)
  assert.match(source, /event: 'include-disabled-change'/)
  assert.match(source, /<GatewayRouteFiltersBar/)
  assert.match(source, /class="table-fill table-fill--management"/)
  assert.match(source, /<a-table/)
  assert.match(source, /:columns="columns"/)
  assert.match(source, /:data-source="routes"/)
  assert.match(source, /:pagination="\{ pageSize \}"/)
  assert.match(source, /:scroll="\{ x: 1760, y: tableY \}"/)
  assert.match(source, /column\.key === 'weight'/)
  assert.match(source, /QuestionCircleOutlined/)
  assert.match(source, /<GatewayRouteSummaryCell/)
  assert.match(source, /<GatewayRouteConfigCell/)
  assert.match(source, /<GatewayRouteBalanceCell/)
  assert.match(source, /<GatewayRouteTextCell/)
  assert.match(source, /<GatewayRouteConcurrencyCell/)
  assert.match(source, /<GatewayRouteLatencyCell/)
  assert.match(source, /<GatewayRouteErrorCell/)
  assert.match(source, /<GatewayRouteActionsMenu/)
})

test('GatewayRouteManagementPage delegates route management table rendering to the component boundary', async () => {
  const source = await readFile(pagePath, 'utf8')

  assert.match(source, /import GatewayRouteManagementTable from '\.\/GatewayRouteManagementTable\.vue'/)
  assert.match(source, /<GatewayRouteManagementTable/)
  assert.match(source, /:routes="routes"/)
  assert.match(source, /@type-change="\(route, value\) => emit\('type-change', route, value\)"/)
  assert.match(source, /@configure-models="emit\('configure-models', \$event\)"/)
  assert.match(source, /class="gateway-fill"/)
  assert.doesNotMatch(source, /class="table-fill table-fill--management"/)
  assert.doesNotMatch(source, /<a-table/)
  assert.doesNotMatch(source, /<GatewayRouteSummaryCell/)
  assert.doesNotMatch(source, /<GatewayRouteActionsMenu/)
})
