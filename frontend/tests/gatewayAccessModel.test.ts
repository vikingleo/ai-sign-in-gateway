import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCodexGatewayRequestUrl,
  buildGatewayApiKeyCopyErrorPlan,
  buildGatewayApiKeyCopySuccessPlan,
  buildGatewayApiKeyMissingPlan,
  buildGatewayRequestUrlCopyErrorPlan,
  buildGatewayRequestUrlCopySuccessPlan,
  buildCodexGatewayTooltip,
  buildGatewayRequestUrl,
  maskGatewayApiKey,
  normalizeGatewayApiKeyCopyValue,
} from '../src/gatewayAccessModel.ts'

test('builds gateway request urls from relative and absolute api bases', () => {
  assert.equal(
    buildGatewayRequestUrl('/api', 'http://127.0.0.1:8972'),
    'http://127.0.0.1:8972/api/gateway',
  )
  assert.equal(
    buildGatewayRequestUrl('https://gateway.example.com/admin-api', 'http://127.0.0.1:8972'),
    'https://gateway.example.com/admin-api/gateway',
  )
})

test('falls back to the local api gateway url when api base is invalid', () => {
  assert.equal(
    buildGatewayRequestUrl('   ', 'http://127.0.0.1:8972'),
    'http://127.0.0.1:8972/api/gateway',
  )
  assert.equal(
    buildGatewayRequestUrl('http://[invalid', 'http://127.0.0.1:8972'),
    'http://127.0.0.1:8972/api/gateway',
  )
})

test('builds codex gateway url and tooltip from gateway url', () => {
  assert.equal(
    buildCodexGatewayRequestUrl('http://127.0.0.1:8972/api/gateway/'),
    'http://127.0.0.1:8972/api/gateway/v1',
  )
  assert.equal(
    buildCodexGatewayTooltip('http://127.0.0.1:8972/api/gateway/v1'),
    'Codex CLI 的 Base URL 需要使用 http://127.0.0.1:8972/api/gateway/v1，也就是在网关地址后追加 /v1。',
  )
})

test('masks gateway api key without exposing full secrets', () => {
  assert.equal(maskGatewayApiKey(''), '未配置 GATEWAY_API_KEY')
  assert.equal(maskGatewayApiKey('  short-key  '), '*********')
  assert.equal(maskGatewayApiKey('key-1234567890abcdef'), 'key-12...abcdef')
})

test('normalizes gateway api key values before copying', () => {
  assert.equal(normalizeGatewayApiKeyCopyValue('  key-test-key  '), 'key-test-key')
  assert.equal(normalizeGatewayApiKeyCopyValue('   '), '')
})

test('builds gateway request url copy error plans', () => {
  assert.deepEqual(buildGatewayRequestUrlCopyErrorPlan(), {
    notice: {
      tone: 'error',
      message: '复制失败，请手动复制。',
    },
  })
})

test('builds gateway request url copy success plans', () => {
  assert.deepEqual(buildGatewayRequestUrlCopySuccessPlan(), {
    notice: {
      tone: 'success',
      message: '网关请求地址已复制。',
    },
  })
})

test('builds gateway api key copy error plans', () => {
  assert.deepEqual(buildGatewayApiKeyCopyErrorPlan(), {
    notice: {
      tone: 'error',
      message: '复制失败，请手动复制。',
    },
  })
})

test('builds gateway api key copy success plans', () => {
  assert.deepEqual(buildGatewayApiKeyCopySuccessPlan(), {
    notice: {
      tone: 'success',
      message: '网关 API Key 已复制。',
    },
  })
})

test('builds gateway api key missing plans from normalized values', () => {
  assert.deepEqual(buildGatewayApiKeyMissingPlan(''), {
    isMissing: true,
    notice: {
      tone: 'error',
      message: '后端未配置 GATEWAY_API_KEY。',
    },
  })

  assert.deepEqual(buildGatewayApiKeyMissingPlan('key-test'), {
    isMissing: false,
    notice: null,
  })
})
