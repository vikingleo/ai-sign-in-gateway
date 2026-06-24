import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayRouteConfigCell.vue', import.meta.url)
const tablePath = new URL('../src/components/gateway/GatewayRouteManagementTable.vue', import.meta.url)

test('gateway route config cell declares the route type and path selector contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /route: GatewayRoute/)
  assert.match(source, /mode: 'type' \| 'path'/)
  assert.match(source, /routeTypeOptions: Array<SelectOption<GatewayRoute\['route_type'\]>>/)
  assert.match(source, /routePathOptions: Array<SelectOption<NonNullable<GatewayRoute\['route_path'\]>>>/)
  assert.match(source, /normalizeRoutePath: \(routePath: unknown\) => NonNullable<GatewayRoute\['route_path'\]>/)
  assert.match(source, /typeChange: \[route: GatewayRoute, value: unknown\]/)
  assert.match(source, /pathChange: \[route: GatewayRoute, value: unknown\]/)
  assert.match(source, /route-type-select/)
  assert.match(source, /route-type-option/)
  assert.match(source, /route\.route_type/)
  assert.match(source, /normalizeRoutePath\(route\.route_path\)/)
  assert.match(source, /style="width: 104px"/)
  assert.match(source, /style="width: 148px"/)
})

test('GatewayRouteManagementTable delegates route config selector cells to the gateway component boundary', async () => {
  const source = await readFile(tablePath, 'utf8')

  assert.match(source, /import GatewayRouteConfigCell from '\.\/GatewayRouteConfigCell\.vue'/)
  assert.match(source, /<GatewayRouteConfigCell/)
  assert.match(source, /mode="type"/)
  assert.match(source, /mode="path"/)
  assert.match(source, /@type-change="\(?route, value\)? => emit\('type-change', route, value\)"/)
  assert.match(source, /@path-change="\(?route, value\)? => emit\('path-change', route, value\)"/)
  assert.doesNotMatch(source, /handleRouteTypeSelect\(asRoute\(record\), value\)/)
  assert.doesNotMatch(source, /handleRoutePathSelect\(asRoute\(record\), value\)/)
  assert.doesNotMatch(source, /normalizeRoutePath\(asRoute\(record\)\.route_path\)/)
  assert.doesNotMatch(source, /<span :class="\['route-type-option'/)
})
