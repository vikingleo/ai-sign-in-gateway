import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayRouteActionsMenu.vue', import.meta.url)
const tablePath = new URL('../src/components/gateway/GatewayRouteManagementTable.vue', import.meta.url)

test('gateway route actions menu declares the route table action UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /route: GatewayRoute/)
  assert.match(source, /routeProbing: boolean/)
  assert.match(source, /balanceProbing: boolean/)
  assert.match(source, /event: 'toggle'/)
  assert.match(source, /event: 'reset-circuit'/)
  assert.match(source, /event: 'probe'/)
  assert.match(source, /event: 'probe-balance'/)
  assert.match(source, /event: 'configure-models'/)
  assert.match(source, /event: 'assign-groups'/)
  assert.match(source, /event: 'enable-only'/)
  assert.match(source, /event: 'priority'/)
  assert.match(source, /event: 'diagnose'/)
  assert.match(source, /event: 'history'/)
  assert.match(source, /event: 'delete'/)
  assert.match(source, /class="gateway-actions-cell"/)
  assert.match(source, /gateway-actions-menu-button/)
  assert.match(source, /key="reset-circuit"/)
  assert.match(source, /route\.circuit_state === 'closed'/)
  assert.match(source, /MoreOutlined/)
  assert.match(source, /HistoryOutlined/)
  assert.match(source, /key="assign-groups"/)
  assert.match(source, /key="delete"/)
})

test('GatewayRouteManagementTable delegates route row actions to the gateway component boundary', async () => {
  const source = await readFile(tablePath, 'utf8')

  assert.match(source, /import GatewayRouteActionsMenu from '\.\/GatewayRouteActionsMenu\.vue'/)
  assert.match(source, /<GatewayRouteActionsMenu/)
  assert.doesNotMatch(source, /class="gateway-actions-cell"/)
  assert.doesNotMatch(source, /key="reset-circuit"/)
  assert.doesNotMatch(source, /gateway-actions-menu-button/)
})
