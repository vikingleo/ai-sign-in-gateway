import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayRouteFiltersBar.vue', import.meta.url)
const tablePath = new URL('../src/components/gateway/GatewayRouteManagementTable.vue', import.meta.url)

test('gateway route filters bar declares the route management filter UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /routeSearch: string/)
  assert.match(source, /selectedGroups: string\[\]/)
  assert.match(source, /selectedRouteTypes: Array<GatewayRoute\['route_type'\]>/)
  assert.match(source, /selectedIssueStates: GatewayIssueState\[\]/)
  assert.match(source, /includeDisabled: boolean/)
  assert.match(source, /class="route-pool-filters"/)
  assert.match(source, /route-pool-type-tabs/)
  assert.match(source, /route-pool-searchbar/)
  assert.match(source, /event: 'include-disabled-change'/)
})

test('GatewayRouteManagementTable delegates the route filter bar to the gateway component boundary', async () => {
  const source = await readFile(tablePath, 'utf8')

  assert.match(source, /import GatewayRouteFiltersBar from '\.\/GatewayRouteFiltersBar\.vue'/)
  assert.match(source, /<GatewayRouteFiltersBar/)
  assert.doesNotMatch(source, /<div class="route-pool-filters">/)
})
