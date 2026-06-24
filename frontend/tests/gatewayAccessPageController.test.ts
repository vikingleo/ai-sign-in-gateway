import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { nextTick, reactive } from 'vue'

import { useGatewayAccessPageState } from '../src/gatewayAccessPageController.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageViewStateControllerPath = new URL('../src/gatewayPageViewStateController.ts', import.meta.url)
const gatewayPageAccessStateControllerPath = new URL('../src/gatewayPageAccessStateController.ts', import.meta.url)
const gatewayPagePlatformControllerPath = new URL('../src/gatewayPagePlatformController.ts', import.meta.url)

test('useGatewayAccessPageState derives gateway access display values and copy actions', async () => {
  const writtenValues: string[] = []
  const notices: string[] = []
  const settingsForm = reactive({
    gateway_api_key: '  key-initial-key  ',
  })
  const env = reactive({
    apiBase: '/api',
  })
  const location = reactive({
    origin: 'http://127.0.0.1:8972',
  })

  const access = useGatewayAccessPageState({
    settingsForm,
    getApiBase: () => env.apiBase,
    location,
    writeText: async (value) => {
      writtenValues.push(value)
    },
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  assert.equal(access.gatewayRequestUrl.value, 'http://127.0.0.1:8972/api/gateway')
  assert.equal(access.codexGatewayRequestUrl.value, 'http://127.0.0.1:8972/api/gateway/v1')
  assert.equal(
    access.codexGatewayTooltip.value,
    'Codex CLI 的 Base URL 需要使用 http://127.0.0.1:8972/api/gateway/v1，也就是在网关地址后追加 /v1。',
  )
  assert.equal(access.maskedGatewayApiKey.value, 'key-in...al-key')

  env.apiBase = 'https://gateway.example.com/admin-api'
  location.origin = 'http://localhost:8972'
  settingsForm.gateway_api_key = '  key-updated-key  '
  await nextTick()

  assert.equal(access.gatewayRequestUrl.value, 'https://gateway.example.com/admin-api/gateway')
  assert.equal(access.codexGatewayRequestUrl.value, 'https://gateway.example.com/admin-api/gateway/v1')
  assert.equal(access.maskedGatewayApiKey.value, 'key-up...ed-key')

  await access.copyGatewayRequestUrl()
  await access.copyGatewayApiKey()
  await access.copyGatewayActivityUrl('  /v1/responses  ')

  assert.deepEqual(writtenValues, [
    'https://gateway.example.com/admin-api/gateway',
    'key-updated-key',
    '/v1/responses',
  ])
  assert.deepEqual(notices, [
    '网关请求地址已复制。',
    '网关 API Key 已复制。',
    '请求 URL 已复制。',
  ])
})

test('GatewayView delegates gateway access page wiring to the access page controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const viewStateControllerSource = await readFile(gatewayPageViewStateControllerPath, 'utf8')
  const pageAccessStateControllerSource = await readFile(gatewayPageAccessStateControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(pageControllerSource.includes("useGatewayPageViewState"), "GatewayView delegates gateway access page wiring through the page view state controller should keep useGatewayPageViewState in gateway page controller")
  assert.ok(viewStateControllerSource.includes("useGatewayPageAccessState"), "GatewayView delegates gateway access page wiring to the page view state controller should keep useGatewayPageAccessState in gateway page view state controller")
  assert.ok(pageAccessStateControllerSource.includes("useGatewayAccessPageState"), "GatewayView delegates gateway access page wiring to the access page controller should keep useGatewayAccessPageState in gateway page access state controller")
  assert.ok(pageAccessStateControllerSource.includes("gatewayPagePlatform"), "GatewayView delegates gateway access page wiring to the access page controller should keep gatewayPagePlatform in gateway page access state controller")
})
