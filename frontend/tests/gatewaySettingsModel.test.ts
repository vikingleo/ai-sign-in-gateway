import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildGatewaySettingsSaveErrorPlan,
  buildGatewaySettingsSaveSuccessPlan,
  buildGatewaySelectedStrategyDescriptions,
  buildGatewayStrategyDescriptionItems,
  gatewaySettingOptionDescription,
  routeConcurrencyLimitLabel,
} from '../src/gatewaySettingsModel.ts'
import {
  gatewayConcurrencyTransferOptions,
  gatewayFailureRetryModeOptions,
  gatewayOverflowStrategyOptions,
  gatewayRouteStrategyOptions,
} from '../src/gatewayViewConfig.ts'
import type { GatewaySettingsData } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)

function settings(overrides: Partial<GatewaySettingsData> = {}): GatewaySettingsData {
  return {
    route_strategy: 'round_robin',
    failure_threshold: 3,
    cooldown_seconds: 180,
    request_timeout: 60,
    max_attempts: 0,
    failure_retry_mode: 'retryable',
    route_concurrency_limit: 5,
    concurrency_transfer_strategy: 'limit_only',
    concurrency_overflow_strategy: 'latency_first',
    smart_latency_bias: 1.0,
    smart_concurrency_bias: 1.5,
    smart_failure_bias: 1.0,
    smart_priority_bias: 0.5,
    gateway_api_key: '',
    ...overrides,
  }
}

test('reads option descriptions with an empty fallback', () => {
  assert.equal(
    gatewaySettingOptionDescription(gatewayRouteStrategyOptions, 'smart'),
    '综合延迟、当前并发、失败记录、优先级和权重，自动挑选当前最合适的路由。',
  )
  assert.equal(gatewaySettingOptionDescription(gatewayRouteStrategyOptions, 'missing'), '')
})

test('formats route concurrency limit labels from settings values', () => {
  assert.equal(routeConcurrencyLimitLabel(8), '8')
  assert.equal(routeConcurrencyLimitLabel(8.8), '8')
  assert.equal(routeConcurrencyLimitLabel(0), '不限')
  assert.equal(routeConcurrencyLimitLabel(Number.NaN), '不限')
})

test('builds gateway strategy description items from current settings', () => {
  const items = buildGatewayStrategyDescriptionItems(
    settings({
      route_strategy: 'priority',
      concurrency_transfer_strategy: 'balance',
      concurrency_overflow_strategy: 'sequential',
      failure_retry_mode: 'all',
    }),
  )

  assert.deepEqual(items, [
    {
      label: '路由策略',
      value: gatewaySettingOptionDescription(gatewayRouteStrategyOptions, 'priority'),
    },
    {
      label: '并发转移',
      value: gatewaySettingOptionDescription(gatewayConcurrencyTransferOptions, 'balance'),
    },
    {
      label: '并发溢出',
      value: gatewaySettingOptionDescription(gatewayOverflowStrategyOptions, 'sequential'),
    },
    {
      label: '错误切换',
      value: gatewaySettingOptionDescription(gatewayFailureRetryModeOptions, 'all'),
    },
    {
      label: '自动模型类型',
      value: '请求体里的 model 包含 claude / gpt / gemini 时，网关会自动选择对应类型路由；仍可用 type 参数手动指定。',
    },
  ])
})

test('builds selected strategy option descriptions from current settings', () => {
  const descriptions = buildGatewaySelectedStrategyDescriptions(
    settings({
      route_strategy: 'smart',
      concurrency_transfer_strategy: 'balance',
      concurrency_overflow_strategy: 'sequential',
      failure_retry_mode: 'all',
    }),
  )

  assert.deepEqual(descriptions, {
    routeStrategy: gatewaySettingOptionDescription(gatewayRouteStrategyOptions, 'smart'),
    concurrencyTransfer: gatewaySettingOptionDescription(gatewayConcurrencyTransferOptions, 'balance'),
    overflowStrategy: gatewaySettingOptionDescription(gatewayOverflowStrategyOptions, 'sequential'),
    failureRetryMode: gatewaySettingOptionDescription(gatewayFailureRetryModeOptions, 'all'),
  })
})

test('builds gateway settings save error plans', () => {
  assert.deepEqual(buildGatewaySettingsSaveErrorPlan(new Error('请求超时')), {
    notice: {
      tone: 'error',
      message: '请求超时',
    },
  })
  assert.deepEqual(buildGatewaySettingsSaveErrorPlan('failed'), {
    notice: {
      tone: 'error',
      message: '保存失败',
    },
  })
})

test('builds gateway settings save success plans', () => {
  assert.deepEqual(buildGatewaySettingsSaveSuccessPlan(), {
    notice: {
      tone: 'success',
      message: '网关策略已保存。',
    },
  })
})
