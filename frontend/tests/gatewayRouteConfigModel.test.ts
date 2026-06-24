import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyGatewayRoutePathDraft,
  applyGatewayRouteTypeDraft,
  buildGatewayRouteModelsSaveErrorPlan,
  buildGatewayRouteModelsSaveSuccessPlan,
  buildGatewayRouteModelsDialogDraft,
  buildGatewayRouteModelsPayload,
  buildGatewayRoutePathChangeErrorPlan,
  buildGatewayRoutePathChangeSuccessPlan,
  buildGatewayRoutePathPayload,
  buildGatewayRouteTypeChangeErrorPlan,
  buildGatewayRouteTypeChangeSuccessPlan,
  buildGatewayRouteTypePayload,
  isGatewayRoutePath,
  isGatewayRouteType,
  replaceGatewayRoute,
} from '../src/gatewayRouteConfigModel.ts'
import type { GatewayRoute } from '../src/types.ts'

function route(overrides: Partial<GatewayRoute>): GatewayRoute {
  return {
    id: 1,
    site_id: 10,
    site_name: '主站',
    site_name_snapshot: '',
    site_base_url_snapshot: '',
    base_url: 'https://api.example',
    request_base_url: '',
    request_base_urls: [],
    manual_request_base_urls: [],
    group_name: '',
    supported_models: [],
    key_name: '',
    key_fingerprint: '',
    key_source: 'credential',
    route_type: 'codex',
    route_path: '',
    route_priority: 1,
    weight: 1,
    is_enabled: true,
    circuit_state: 'closed',
    consecutive_failures: 0,
    active_concurrency: 0,
    request_count: 0,
    success_count: 0,
    failure_count: 0,
    avg_latency_ms: null,
    ewma_latency_ms: null,
    last_latency_ms: null,
    success_rate: 0,
    last_status_code: null,
    last_error: '',
    last_used_at: null,
    last_success_at: null,
    last_failure_at: null,
    circuit_open_until: null,
    ...overrides,
  }
}

test('validates gateway route type and path selections', () => {
  assert.equal(isGatewayRouteType('gemini'), true)
  assert.equal(isGatewayRouteType('openai'), false)
  assert.equal(isGatewayRoutePath('responses'), true)
  assert.equal(isGatewayRoutePath('v1/responses'), false)
})

test('builds route type and path update payloads without dropping supported models', () => {
  const item = route({
    route_type: 'codex',
    route_path: 'responses',
    supported_models: ['gpt-4o'],
  })

  assert.deepEqual(buildGatewayRouteTypePayload(item, 'gemini'), {
    route_type: 'gemini',
    route_path: 'responses',
    supported_models: ['gpt-4o'],
  })
  assert.deepEqual(buildGatewayRoutePathPayload(item, 'chat/completions'), {
    route_type: 'codex',
    route_path: 'chat/completions',
    supported_models: ['gpt-4o'],
  })
})

test('builds route type change error plans', () => {
  assert.deepEqual(buildGatewayRouteTypeChangeErrorPlan(new Error('类型更新超时')), {
    notice: {
      tone: 'error',
      message: '类型更新超时',
    },
  })
  assert.deepEqual(buildGatewayRouteTypeChangeErrorPlan(undefined), {
    notice: {
      tone: 'error',
      message: '类型切换失败',
    },
  })
})

test('builds route type change success plans', () => {
  assert.deepEqual(buildGatewayRouteTypeChangeSuccessPlan({
    routeLabel: '主站',
    routeTypeLabel: 'Gemini',
  }), {
    notice: {
      tone: 'success',
      message: '主站 已切换为 Gemini。',
    },
  })
})

test('builds route path change error plans', () => {
  assert.deepEqual(buildGatewayRoutePathChangeErrorPlan(new Error('请求格式更新超时')), {
    notice: {
      tone: 'error',
      message: '请求格式更新超时',
    },
  })
  assert.deepEqual(buildGatewayRoutePathChangeErrorPlan('failed'), {
    notice: {
      tone: 'error',
      message: '请求格式切换失败',
    },
  })
})

test('builds route path change success plans', () => {
  assert.deepEqual(buildGatewayRoutePathChangeSuccessPlan({
    routeLabel: '主站',
    routePathLabel: 'Responses',
  }), {
    notice: {
      tone: 'success',
      message: '主站 请求格式已切换为 Responses。',
    },
  })
})

test('applies optimistic route config drafts and replacements by id', () => {
  const routes = [
    route({ id: 1, route_type: 'codex', route_path: '' }),
    route({ id: 2, route_type: 'gpt', route_path: 'responses' }),
  ]
  const typeDraft = applyGatewayRouteTypeDraft(routes, 1, 'claude')
  const pathDraft = applyGatewayRoutePathDraft(typeDraft, 2, 'chat/completions')
  const replaced = replaceGatewayRoute(pathDraft, route({
    id: 1,
    route_type: 'gemini',
    route_path: 'responses',
    balance_unit: 'RMB',
    last_balance: 5,
  }))

  assert.equal(typeDraft[0].route_type, 'claude')
  assert.equal(pathDraft[1].route_path, 'chat/completions')
  assert.equal(replaced[0].route_type, 'gemini')
  assert.equal(replaced[0].balance_display, '¥5')
  assert.equal(replaced[1], pathDraft[1])
})

test('builds route models dialog draft and save payload', () => {
  const item = route({
    supported_models: ['gpt-4o', 'gpt-4o', 'claude-3'],
    manual_request_base_urls: ['https://a.example', 'https://a.example', 'https://b.example'],
    route_path: undefined,
  })
  const draft = buildGatewayRouteModelsDialogDraft(item)
  const payload = buildGatewayRouteModelsPayload(item, ['gpt-4o', 'claude-3', 'gpt-4o'], 'https://a.example\nhttps://b.example')

  assert.deepEqual(draft.supportedModels, ['gpt-4o', 'claude-3'])
  assert.equal(draft.requestURLs, 'https://a.example\nhttps://b.example')
  assert.deepEqual(payload, {
    route_type: 'codex',
    route_path: '',
    supported_models: ['gpt-4o', 'claude-3'],
    manual_request_base_urls: ['https://a.example', 'https://b.example'],
  })
})

test('builds route models save error plans', () => {
  assert.deepEqual(buildGatewayRouteModelsSaveErrorPlan(new Error('模型保存超时')), {
    notice: {
      tone: 'error',
      message: '模型保存超时',
    },
  })
  assert.deepEqual(buildGatewayRouteModelsSaveErrorPlan(null), {
    notice: {
      tone: 'error',
      message: '保存失败',
    },
  })
})

test('builds route models save success plans', () => {
  assert.deepEqual(buildGatewayRouteModelsSaveSuccessPlan(), {
    notice: {
      tone: 'success',
      message: '路由配置已更新。',
    },
  })
})
