import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  createGatewayRequestUrlAction,
  createCopyGatewayApiKeyAction,
  createCopyGatewayRequestUrlAction,
  copyGatewayApiKeyToClipboard,
  copyGatewayRequestUrlToClipboard,
} from '../src/gatewayAccessController.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageViewStateControllerPath = new URL('../src/gatewayPageViewStateController.ts', import.meta.url)
const gatewayAccessPageControllerPath = new URL('../src/gatewayAccessPageController.ts', import.meta.url)

test('copyGatewayRequestUrlToClipboard writes the request url and reports success', async () => {
  const events: string[] = []
  const writtenValues: string[] = []

  await copyGatewayRequestUrlToClipboard({
    requestUrl: 'http://127.0.0.1:8972/api/gateway',
    writeText: async (value) => {
      writtenValues.push(value)
      events.push(`write:${value}`)
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(writtenValues, ['http://127.0.0.1:8972/api/gateway'])
  assert.deepEqual(events, [
    'write:http://127.0.0.1:8972/api/gateway',
    'notice:网关请求地址已复制。',
  ])
})

test('copyGatewayRequestUrlToClipboard reports clipboard errors', async () => {
  const notices: string[] = []

  await copyGatewayRequestUrlToClipboard({
    requestUrl: 'http://127.0.0.1:8972/api/gateway',
    writeText: async () => {
      throw new Error('clipboard blocked')
    },
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  assert.deepEqual(notices, ['复制失败，请手动复制。'])
})

test('copyGatewayApiKeyToClipboard trims and writes the api key', async () => {
  const events: string[] = []
  const writtenValues: string[] = []

  await copyGatewayApiKeyToClipboard({
    apiKey: '  key-test-key  ',
    writeText: async (value) => {
      writtenValues.push(value)
      events.push(`write:${value}`)
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(writtenValues, ['key-test-key'])
  assert.deepEqual(events, [
    'write:key-test-key',
    'notice:网关 API Key 已复制。',
  ])
})

test('copyGatewayApiKeyToClipboard reports missing api keys without writing', async () => {
  const events: string[] = []

  await copyGatewayApiKeyToClipboard({
    apiKey: '   ',
    writeText: async (value) => {
      events.push(`write:${value}`)
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(events, ['notice:后端未配置 GATEWAY_API_KEY。'])
})

test('copyGatewayApiKeyToClipboard reports clipboard errors', async () => {
  const notices: string[] = []

  await copyGatewayApiKeyToClipboard({
    apiKey: 'key-test-key',
    writeText: async () => {
      throw new Error('clipboard blocked')
    },
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  assert.deepEqual(notices, ['复制失败，请手动复制。'])
})

test('createCopyGatewayRequestUrlAction reads the latest request url when invoked', async () => {
  const writtenValues: string[] = []
  const notices: string[] = []
  let requestUrl = 'http://127.0.0.1:8972/api/gateway'

  const copyGatewayRequestUrl = createCopyGatewayRequestUrlAction({
    getRequestUrl: () => requestUrl,
    writeText: async (value) => {
      writtenValues.push(value)
    },
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  await copyGatewayRequestUrl()
  requestUrl = 'http://127.0.0.1:8972/api/gateway/v1'
  await copyGatewayRequestUrl()

  assert.deepEqual(writtenValues, [
    'http://127.0.0.1:8972/api/gateway',
    'http://127.0.0.1:8972/api/gateway/v1',
  ])
  assert.deepEqual(notices, ['网关请求地址已复制。', '网关请求地址已复制。'])
})

test('createGatewayRequestUrlAction reads the latest location origin and api base', () => {
  let apiBase = '/api'
  const location = {
    origin: 'http://127.0.0.1:8972',
  }
  const gatewayRequestUrl = createGatewayRequestUrlAction({
    getApiBase: () => apiBase,
    location,
  })

  assert.equal(gatewayRequestUrl(), 'http://127.0.0.1:8972/api/gateway')
  apiBase = 'https://gateway.example.com/admin-api'
  location.origin = 'http://localhost:8972'
  assert.equal(gatewayRequestUrl(), 'https://gateway.example.com/admin-api/gateway')
})

test('createCopyGatewayApiKeyAction reads the latest api key when invoked', async () => {
  const writtenValues: string[] = []
  const notices: string[] = []
  let apiKey = ' key-initial '

  const copyGatewayApiKey = createCopyGatewayApiKeyAction({
    getApiKey: () => apiKey,
    writeText: async (value) => {
      writtenValues.push(value)
    },
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  await copyGatewayApiKey()
  apiKey = ' key-updated '
  await copyGatewayApiKey()

  assert.deepEqual(writtenValues, ['key-initial', 'key-updated'])
  assert.deepEqual(notices, ['网关 API Key 已复制。', '网关 API Key 已复制。'])
})

test('gateway access page controller delegates request url copying through the access controller', async () => {
  const source = await readFile(gatewayAccessPageControllerPath, 'utf8')
  const handler =
    source.match(/const copyGatewayRequestUrl = createCopyGatewayRequestUrlAction\(\{[\s\S]*?\n\s*\}\)/)?.[0] ?? ''

  assert.match(
    source,
    /import \{[\s\S]*createCopyGatewayApiKeyAction,[\s\S]*createCopyGatewayRequestUrlAction,[\s\S]*createGatewayRequestUrlAction,[\s\S]*\} from '\.\/gatewayAccessController\.ts'/,
  )
  assert.match(source, /const gatewayRequestUrl = computed\(createGatewayRequestUrlAction\(\{[\s\S]*getApiBase,[\s\S]*location,[\s\S]*\}\)\)/)
  assert.doesNotMatch(source, /buildGatewayRequestUrl\(String\(import\.meta\.env\.VITE_API_BASE \|\| '\/api'\), window\.location\.origin\)/)
  assert.doesNotMatch(source, /window\.location\.origin/)
  assert.match(handler, /getRequestUrl: \(\) => gatewayRequestUrl\.value/)
  assert.match(handler, /writeText/)
  assert.match(handler, /showPlanNotice/)
  assert.doesNotMatch(source, /async function copyGatewayRequestUrl/)
  assert.doesNotMatch(handler, /copyGatewayRequestUrlToClipboard\(\{/)
  assert.doesNotMatch(handler, /navigator\.clipboard\.writeText\(gatewayRequestUrl\.value\)/)
  assert.doesNotMatch(handler, /buildGatewayRequestUrlCopySuccessPlan/)
  assert.doesNotMatch(handler, /buildGatewayRequestUrlCopyErrorPlan/)
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const viewStateControllerSource = await readFile(gatewayPageViewStateControllerPath, 'utf8')
  assert.match(pageControllerSource, /import \{ useGatewayPageViewState \} from '\.\/gatewayPageViewStateController\.ts'/)
  assert.match(viewStateControllerSource, /import \{ useGatewayPageAccessState \} from '\.\/gatewayPageAccessStateController\.ts'/)
  assert.doesNotMatch(pageControllerSource, /createCopyGatewayRequestUrlAction/)
})

test('gateway access page controller delegates api key copying through the access controller', async () => {
  const source = await readFile(gatewayAccessPageControllerPath, 'utf8')
  const handler =
    source.match(/const copyGatewayApiKey = createCopyGatewayApiKeyAction\(\{[\s\S]*?\n\s*\}\)/)?.[0] ?? ''

  assert.match(
    source,
    /import \{[\s\S]*createCopyGatewayApiKeyAction,[\s\S]*createCopyGatewayRequestUrlAction,[\s\S]*createGatewayRequestUrlAction,[\s\S]*\} from '\.\/gatewayAccessController\.ts'/,
  )
  assert.match(handler, /getApiKey: \(\) => settingsForm\.gateway_api_key/)
  assert.match(handler, /writeText/)
  assert.match(handler, /showPlanNotice/)
  assert.doesNotMatch(source, /async function copyGatewayApiKey/)
  assert.doesNotMatch(handler, /copyGatewayApiKeyToClipboard\(\{/)
  assert.doesNotMatch(handler, /normalizeGatewayApiKeyCopyValue/)
  assert.doesNotMatch(handler, /buildGatewayApiKeyMissingPlan/)
  assert.doesNotMatch(handler, /buildGatewayApiKeyCopySuccessPlan/)
  assert.doesNotMatch(handler, /buildGatewayApiKeyCopyErrorPlan/)

  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const viewStateControllerSource = await readFile(gatewayPageViewStateControllerPath, 'utf8')
  assert.match(pageControllerSource, /import \{ useGatewayPageViewState \} from '\.\/gatewayPageViewStateController\.ts'/)
  assert.match(viewStateControllerSource, /import \{ useGatewayPageAccessState \} from '\.\/gatewayPageAccessStateController\.ts'/)
  assert.doesNotMatch(pageControllerSource, /createCopyGatewayApiKeyAction/)
})
