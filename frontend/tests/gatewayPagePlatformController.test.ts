import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { createGatewayPagePlatform } from '../src/gatewayPagePlatformController.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageFoundationControllerPath = new URL('../src/gatewayPageFoundationController.ts', import.meta.url)
const pagePlatformControllerPath = new URL('../src/gatewayPagePlatformController.ts', import.meta.url)

test('createGatewayPagePlatform composes browser visibility, lifecycle, access, confirm, and timer boundaries', async () => {
  const calls: string[] = []
  let visibilityState = 'hidden'
  const location = { origin: 'http://127.0.0.1:8972' }
  const platformWindow = {
    location,
    confirm(message: string) {
      calls.push(`confirm:${message}`)
      return true
    },
    addEventListener(type: 'site-groups:changed', handler: () => void) {
      calls.push(`window:add:${type}:${typeof handler}`)
    },
    removeEventListener(type: 'site-groups:changed', handler: () => void) {
      calls.push(`window:remove:${type}:${typeof handler}`)
    },
    setInterval(handler: () => void, timeout: number) {
      calls.push(`set:${timeout}:${typeof handler}`)
      return 42
    },
    clearInterval(timer: number) {
      calls.push(`clear:${timer}`)
    },
  }
  const platformDocument = {
    get visibilityState() {
      return visibilityState
    },
    addEventListener(type: 'visibilitychange', handler: () => void) {
      calls.push(`document:add:${type}:${typeof handler}`)
    },
    removeEventListener(type: 'visibilitychange', handler: () => void) {
      calls.push(`document:remove:${type}:${typeof handler}`)
    },
  }
  const platformNavigator = {
    clipboard: {
      async writeText(value: string) {
        calls.push(`write:${value}`)
      },
    },
  }

  const platform = createGatewayPagePlatform({
    platformWindow,
    platformDocument,
    platformNavigator,
  })

  assert.equal(platform.location, location)
  assert.equal(platform.confirmWindow, platformWindow)
  assert.equal(platform.timerWindow, platformWindow)
  assert.equal(platform.visibility.isVisible(), false)

  visibilityState = 'visible'
  assert.equal(platform.visibility.isVisible(), true)

  await platform.writeText('copied')
  assert.equal(platform.timerWindow.setInterval(() => undefined, 30), 42)
  platform.timerWindow.clearInterval(42)
  assert.equal(platform.confirmWindow.confirm('confirm message'), true)
  platform.lifecycle.addPageListeners({
    handleSiteGroupsChanged: () => undefined,
    handleVisibilityChange: () => undefined,
  })
  platform.lifecycle.removePageListeners({
    handleSiteGroupsChanged: () => undefined,
    handleVisibilityChange: () => undefined,
  })

  assert.deepEqual(calls, [
    'write:copied',
    'set:30:function',
    'clear:42',
    'confirm:confirm message',
    'window:add:site-groups:changed:function',
    'document:add:visibilitychange:function',
    'window:remove:site-groups:changed:function',
    'document:remove:visibilitychange:function',
  ])
})

test('GatewayView delegates browser platform wiring through the page platform controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const foundationControllerSource = await readFile(gatewayPageFoundationControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(pageControllerSource.includes("useGatewayPageFoundation"), "GatewayView delegates browser platform wiring through the page foundation controller")
  assert.ok(foundationControllerSource.includes("createGatewayPagePlatform"), "GatewayView delegates browser platform wiring through the page platform controller should keep createGatewayPagePlatform in gateway page foundation controller")
  assert.ok(foundationControllerSource.includes("platformWindow"), "GatewayView delegates browser platform wiring through the page platform controller should keep platformWindow in gateway page foundation controller")
})
