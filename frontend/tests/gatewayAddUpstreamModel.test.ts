import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildAddUpstreamErrorPlan,
  buildAddUpstreamPayload,
  buildAddUpstreamSuccessPlan,
  buildAddUpstreamValidationPlan,
  buildAddUpstreamSuccessMessage,
  createDefaultAddUpstreamForm,
  validateAddUpstreamForm,
} from '../src/gatewayAddUpstreamModel.ts'

test('creates the default add upstream form state', () => {
  assert.deepEqual(createDefaultAddUpstreamForm(), {
    name: '',
    base_url: '',
    api_key: '',
    api_format: 'codex',
    group_name: '',
    preferred_model: '',
    supported_models: [],
  })
})

test('validates required fields and base url format', () => {
  assert.equal(validateAddUpstreamForm(createDefaultAddUpstreamForm()), '名称 / Base URL / API Key 都需要填写。')
  assert.equal(validateAddUpstreamForm({
    ...createDefaultAddUpstreamForm(),
    name: '上游',
    base_url: 'api.example.com',
    api_key: 'key-test',
  }), 'Base URL 必须以 http:// 或 https:// 开头。')
  assert.equal(validateAddUpstreamForm({
    ...createDefaultAddUpstreamForm(),
    name: '上游',
    base_url: 'https://api.example.com',
    api_key: 'key-test',
  }), '')
})

test('builds add upstream validation notice plans', () => {
  assert.deepEqual(buildAddUpstreamValidationPlan(createDefaultAddUpstreamForm()), {
    isValid: false,
    validationMessage: '名称 / Base URL / API Key 都需要填写。',
    notice: {
      tone: 'error',
      message: '名称 / Base URL / API Key 都需要填写。',
    },
  })

  assert.deepEqual(buildAddUpstreamValidationPlan({
    ...createDefaultAddUpstreamForm(),
    name: '上游',
    base_url: 'api.example.com',
    api_key: 'key-test',
  }), {
    isValid: false,
    validationMessage: 'Base URL 必须以 http:// 或 https:// 开头。',
    notice: {
      tone: 'error',
      message: 'Base URL 必须以 http:// 或 https:// 开头。',
    },
  })

  assert.deepEqual(buildAddUpstreamValidationPlan({
    ...createDefaultAddUpstreamForm(),
    name: '上游',
    base_url: 'https://api.example.com',
    api_key: 'key-test',
  }), {
    isValid: true,
    validationMessage: '',
    notice: null,
  })
})

test('builds add upstream payload with group fallback and normalized models', () => {
  const payload = buildAddUpstreamPayload(
    {
      name: '  上游 A  ',
      base_url: ' https://api.example.com ',
      api_key: ' key-test ',
      api_format: 'openai',
      group_name: '默认,默认',
      preferred_model: ' gpt-4o ',
      supported_models: ['gpt-4o', 'gpt-4o', 'claude-3'],
    },
    [],
  )

  assert.deepEqual(payload, {
    name: '上游 A',
    base_url: 'https://api.example.com',
    plugin_key: 'api-supplier',
    group_name: '默认',
    supported_models: ['gpt-4o', 'claude-3'],
    is_enabled: true,
    notes: '',
    credentials: {
      account: '',
      api_key: 'key-test',
    },
    plugin_config: {
      api_format: 'openai',
      endpoint_url: '',
      preferred_model: 'gpt-4o',
    },
  })
})

test('prefers selected groups over typed group text and builds success message', () => {
  const payload = buildAddUpstreamPayload(
    {
      ...createDefaultAddUpstreamForm(),
      name: '上游 B',
      base_url: 'https://b.example.com',
      api_key: 'key-b',
      group_name: '手填',
    },
    ['生产', '华东'],
  )

  assert.equal(payload.group_name, '生产,华东')
  assert.equal(buildAddUpstreamSuccessMessage('上游 B'), '已添加上游「上游 B」，可在路由池中调整 priority/weight。')
})

test('builds add upstream success plans', () => {
  assert.deepEqual(buildAddUpstreamSuccessPlan('上游 B'), {
    notice: {
      tone: 'success',
      message: '已添加上游「上游 B」，可在路由池中调整 priority/weight。',
    },
  })
})

test('builds add upstream error plans from thrown values', () => {
  assert.deepEqual(buildAddUpstreamErrorPlan(new Error('创建上游超时')), {
    notice: {
      tone: 'error',
      message: '创建上游超时',
    },
  })

  assert.deepEqual(buildAddUpstreamErrorPlan('bad gateway'), {
    notice: {
      tone: 'error',
      message: '添加失败',
    },
  })
})
