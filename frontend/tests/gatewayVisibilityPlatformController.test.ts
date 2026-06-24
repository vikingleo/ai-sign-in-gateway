import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  createGatewayPageLifecycleEventPlatform,
  createGatewayVisibilityPlatform,
} from '../src/gatewayVisibilityPlatformController.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageFoundationControllerPath = new URL('../src/gatewayPageFoundationController.ts', import.meta.url)
const gatewayPageLifecycleActionsControllerPath = new URL(
  '../src/gatewayPageLifecycleActionsController.ts',
  import.meta.url,
)
const gatewayPageRuntimeActionsControllerPath = new URL(
  '../src/gatewayPageRuntimeActionsController.ts',
  import.meta.url,
)
const gatewayPagePlatformControllerPath = new URL('../src/gatewayPagePlatformController.ts', import.meta.url)
const gatewayRealtimePageControllerPath = new URL('../src/gatewayRealtimePageController.ts', import.meta.url)
const gatewayRealtimeOperationsPageControllerPath = new URL(
  '../src/gatewayRealtimeOperationsPageController.ts',
  import.meta.url,
)

test('createGatewayVisibilityPlatform reads the latest document visibility state', () => {
  let visibilityState = 'hidden'
  const visibilityDocument = {
    get visibilityState() {
      return visibilityState
    },
  }
  const platform = createGatewayVisibilityPlatform({
    visibilityDocument,
  })

  assert.equal(platform.isVisible(), false)
  visibilityState = 'visible'
  assert.equal(platform.isVisible(), true)
  visibilityState = 'prerender'
  assert.equal(platform.isVisible(), false)
})

test('GatewayView delegates document visibility reads through the visibility platform', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const foundationControllerSource = await readFile(gatewayPageFoundationControllerPath, 'utf8')
  const runtimeActionsControllerSource = await readFile(gatewayPageRuntimeActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(pageControllerSource.includes("useGatewayPageFoundation"), "GatewayView delegates document visibility reads through the page foundation controller")
  assert.ok(foundationControllerSource.includes("createGatewayPagePlatform"), "GatewayView delegates document visibility reads through the visibility platform should keep createGatewayPagePlatform in gateway page foundation controller")
  assert.ok(runtimeActionsControllerSource.includes("isVisible: gatewayPagePlatform.visibility.isVisible"), "GatewayView delegates document visibility reads through the visibility platform should keep isVisible: gatewayPagePlatform.visibility.isVisible in gateway page runtime actions controller")
})

test('createGatewayPageLifecycleEventPlatform registers and removes page event handlers', () => {
  const calls: string[] = []
  const siteGroupsHandler = () => calls.push('site-handler')
  const visibilityHandler = () => calls.push('visibility-handler')
  const lifecycleWindow = {
    addEventListener(type: string, handler: () => void) {
      calls.push(`window:add:${type}:${handler === siteGroupsHandler}`)
    },
    removeEventListener(type: string, handler: () => void) {
      calls.push(`window:remove:${type}:${handler === siteGroupsHandler}`)
    },
  }
  const lifecycleDocument = {
    addEventListener(type: string, handler: () => void) {
      calls.push(`document:add:${type}:${handler === visibilityHandler}`)
    },
    removeEventListener(type: string, handler: () => void) {
      calls.push(`document:remove:${type}:${handler === visibilityHandler}`)
    },
  }
  const platform = createGatewayPageLifecycleEventPlatform({
    lifecycleWindow,
    lifecycleDocument,
  })

  platform.addPageListeners({
    handleSiteGroupsChanged: siteGroupsHandler,
    handleVisibilityChange: visibilityHandler,
  })
  platform.removePageListeners({
    handleSiteGroupsChanged: siteGroupsHandler,
    handleVisibilityChange: visibilityHandler,
  })

  assert.deepEqual(calls, [
    'window:add:site-groups:changed:true',
    'document:add:visibilitychange:true',
    'window:remove:site-groups:changed:true',
    'document:remove:visibilitychange:true',
  ])
})

test('GatewayView delegates page lifecycle event listeners through the visibility platform', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const foundationControllerSource = await readFile(gatewayPageFoundationControllerPath, 'utf8')
  const lifecycleActionsControllerSource = await readFile(gatewayPageLifecycleActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(pageControllerSource.includes("useGatewayPageFoundation"), "GatewayView delegates page lifecycle event listeners through the page foundation controller")
  assert.ok(foundationControllerSource.includes("createGatewayPagePlatform"), "GatewayView delegates page lifecycle event listeners through the visibility platform should keep createGatewayPagePlatform in gateway page foundation controller")
  assert.ok(pageControllerSource.includes("useGatewayPageLifecycleActions"), "GatewayView delegates page lifecycle event listeners through the visibility platform should keep useGatewayPageLifecycleActions in gateway page controller")
  assert.ok(lifecycleActionsControllerSource.includes("gatewayPagePlatform.lifecycle.addPageListeners"), "GatewayView delegates page lifecycle event listeners through the visibility platform should keep gatewayPagePlatform.lifecycle.addPageListeners in gateway page lifecycle actions controller")
})
