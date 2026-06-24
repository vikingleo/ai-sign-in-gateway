import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { useGatewaySiteGroupsPageActions } from '../src/gatewaySiteGroupsPageController.ts'
import type { GatewayRouteGroup, SiteGroup } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const pageRefreshActionsControllerPath = new URL('../src/gatewayPageRefreshActionsController.ts', import.meta.url)
const pageControllerPath = new URL('../src/gatewaySiteGroupsPageController.ts', import.meta.url)
const catalogRefreshPageControllerPath = new URL('../src/gatewayCatalogRefreshPageController.ts', import.meta.url)
const refreshOperationsPageControllerPath = new URL(
  '../src/gatewayRefreshOperationsPageController.ts',
  import.meta.url,
)

function group(name: string): SiteGroup {
  return {
    name,
    site_count: 1,
    in_catalog: true,
    in_use: true,
  }
}

function routeGroup(name: string, id = 1): GatewayRouteGroup {
  return {
    id,
    name,
    route_count: 1,
  }
}

test('useGatewaySiteGroupsPageActions wires site group refresh to the page ref', async () => {
  const events: string[] = []
  let count = 0
  let routeGroupCount = 0
  const siteGroups = {
    value: [group('旧分组')],
  }
  const routeGroups = {
    value: [routeGroup('旧路由分组')],
  }

  const { handleSiteGroupsChanged } = useGatewaySiteGroupsPageActions({
    siteGroups,
    requestSiteGroups: async () => {
      count += 1
      events.push(`request:${count}`)
      return [group(`新分组 ${count}`)]
    },
    routeGroups,
    requestRouteGroups: async () => {
      routeGroupCount += 1
      events.push(`request-route:${routeGroupCount}`)
      return [routeGroup(`新路由分组 ${routeGroupCount}`, routeGroupCount)]
    },
  })

  await handleSiteGroupsChanged()
  await handleSiteGroupsChanged()

  assert.deepEqual(events, [
    'request:1',
    'request-route:1',
    'request:2',
    'request-route:2',
  ])
  assert.deepEqual(siteGroups.value.map((item) => item.name), ['新分组 2'])
  assert.deepEqual(routeGroups.value.map((item) => item.name), ['新路由分组 2'])
})

test('GatewayView delegates site group page wiring to the page controller', async () => {
  const source = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const pageRefreshActionsController = await readFile(pageRefreshActionsControllerPath, 'utf8')
  const controller = await readFile(pageControllerPath, 'utf8')
  const catalogController = await readFile(catalogRefreshPageControllerPath, 'utf8')
  const operationsController = await readFile(refreshOperationsPageControllerPath, 'utf8')
  const pageActionStart = operationsControllerSource.indexOf('useGatewayPageRefreshActions({')
  const pageAction = operationsControllerSource.slice(
    pageActionStart,
    operationsControllerSource.indexOf('  routeActions = useGatewayPageRouteActions({', pageActionStart),
  )

  assert.match(operationsControllerSource, /import \{ useGatewayPageRefreshActions \} from '\.\/gatewayPageRefreshActionsController\.ts'/)
  assert.doesNotMatch(source, /import \{ useGatewayRefreshOperationsPageActions \} from '(?:\.\.\/|\.\/)gatewayRefreshOperationsPageController(?:\.ts)?'/)
  assert.doesNotMatch(source, /import \{ useGatewayCatalogRefreshPageActions \} from '(?:\.\.\/|\.\/)gatewayCatalogRefreshPageController(?:\.ts)?'/)
  assert.doesNotMatch(source, /import \{ useGatewaySiteGroupsPageActions \} from '(?:\.\.\/|\.\/)gatewaySiteGroupsPageController(?:\.ts)?'/)
  assert.doesNotMatch(source, /useGatewayRefreshOperationsPageActions\(\{/)
  assert.doesNotMatch(source, /useGatewayCatalogRefreshPageActions\(\{/)
  assert.doesNotMatch(source, /useGatewaySiteGroupsPageActions\(\{/)
  assert.match(pageAction, /state/)
  assert.match(pageRefreshActionsController, /siteGroups: state\.siteGroups/)
  assert.match(pageRefreshActionsController, /requestSiteGroups: gatewayPageRequests\.getSiteGroups/)
  assert.doesNotMatch(source, /createRefreshGatewaySiteGroupsAction/)
  assert.doesNotMatch(source, /siteGroups\.value = groups/)
  assert.match(operationsController, /useGatewayCatalogRefreshPageActions/)
  assert.match(catalogController, /useGatewaySiteGroupsPageActions/)
  assert.match(controller, /createRefreshGatewaySiteGroupsAction/)
  assert.match(controller, /setSiteGroups: \(groups\) => \{[\s\S]*siteGroups\.value = groups[\s\S]*\}/)
})
