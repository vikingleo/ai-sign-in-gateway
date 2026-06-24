import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  createCopyGatewayActivityUrlAction,
  copyGatewayActivityUrlToClipboard,
} from '../src/gatewayActivityController.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageViewStateControllerPath = new URL('../src/gatewayPageViewStateController.ts', import.meta.url)
const gatewayAccessPageControllerPath = new URL('../src/gatewayAccessPageController.ts', import.meta.url)

test('copyGatewayActivityUrlToClipboard writes the normalized activity url', async () => {
  const events: string[] = []
  const writtenValues: string[] = []

  await copyGatewayActivityUrlToClipboard({
    value: '  /v1/responses  ',
    writeText: async (value) => {
      writtenValues.push(value)
      events.push(`write:${value}`)
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(writtenValues, ['/v1/responses'])
  assert.deepEqual(events, [
    'write:/v1/responses',
    'notice:请求 URL 已复制。',
  ])
})

test('copyGatewayActivityUrlToClipboard skips empty activity urls', async () => {
  const events: string[] = []

  await copyGatewayActivityUrlToClipboard({
    value: '   ',
    writeText: async (value) => {
      events.push(`write:${value}`)
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(events, [])
})

test('copyGatewayActivityUrlToClipboard reports clipboard errors', async () => {
  const notices: string[] = []

  await copyGatewayActivityUrlToClipboard({
    value: '/v1/responses',
    writeText: async () => {
      throw new Error('clipboard blocked')
    },
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  assert.deepEqual(notices, ['复制失败，请手动复制。'])
})

test('createCopyGatewayActivityUrlAction forwards activity urls through shared copy behavior', async () => {
  const events: string[] = []

  const copyGatewayActivityUrl = createCopyGatewayActivityUrlAction({
    writeText: async (value) => {
      events.push(`write:${value}`)
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  await copyGatewayActivityUrl('  /v1/responses  ')
  await copyGatewayActivityUrl('   ')

  assert.deepEqual(events, [
    'write:/v1/responses',
    'notice:请求 URL 已复制。',
  ])
})

test('gateway access page controller delegates activity url copying through the activity controller', async () => {
  const source = await readFile(gatewayAccessPageControllerPath, 'utf8')
  const handler =
    source.match(/const copyGatewayActivityUrl = createCopyGatewayActivityUrlAction\(\{[\s\S]*?\n\s*\}\)/)?.[0] ?? ''

  assert.match(source, /createCopyGatewayActivityUrlAction/)
  assert.match(source, /from '\.\/gatewayActivityController\.ts'/)
  assert.match(handler, /writeText/)
  assert.match(handler, /showPlanNotice/)
  assert.doesNotMatch(source, /async function copyGatewayActivityUrl/)
  assert.doesNotMatch(handler, /copyGatewayActivityUrlToClipboard\(\{/)
  assert.doesNotMatch(handler, /normalizeGatewayActivityCopyUrl/)
  assert.doesNotMatch(handler, /buildGatewayActivityCopySuccessPlan/)
  assert.doesNotMatch(handler, /buildGatewayActivityCopyErrorPlan/)
  assert.doesNotMatch(handler, /navigator\.clipboard\.writeText\(normalized\)/)

  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const viewStateControllerSource = await readFile(gatewayPageViewStateControllerPath, 'utf8')
  assert.match(pageControllerSource, /import \{ useGatewayPageViewState \} from '\.\/gatewayPageViewStateController\.ts'/)
  assert.match(viewStateControllerSource, /import \{ useGatewayPageAccessState \} from '\.\/gatewayPageAccessStateController\.ts'/)
  assert.doesNotMatch(pageControllerSource, /createCopyGatewayActivityUrlAction/)
})
