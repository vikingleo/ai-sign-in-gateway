import {
  gatewayConcurrencyTransferOptions,
  gatewayFailureRetryModeOptions,
  gatewayOverflowStrategyOptions,
  gatewayRouteStrategyOptions,
} from './gatewayViewConfig.ts'
import type { GatewaySettingsData } from './types.ts'

type DescribedOption = {
  label: string
  value: string
  description: string
}

export function gatewaySettingOptionDescription(options: DescribedOption[], value: string) {
  return options.find((item) => item.value === value)?.description ?? ''
}

export function routeConcurrencyLimitLabel(value: number) {
  const limit = Number(value)
  return Number.isFinite(limit) && limit > 0 ? String(Math.trunc(limit)) : '不限'
}

export function buildGatewaySettingsSaveErrorPlan(error: unknown) {
  return {
    notice: {
      tone: 'error' as const,
      message: error instanceof Error ? error.message : '保存失败',
    },
  }
}

export function buildGatewaySettingsSaveSuccessPlan() {
  return {
    notice: {
      tone: 'success' as const,
      message: '网关策略已保存。',
    },
  }
}

export function buildGatewaySelectedStrategyDescriptions(settings: GatewaySettingsData) {
  return {
    routeStrategy: gatewaySettingOptionDescription(gatewayRouteStrategyOptions, settings.route_strategy),
    concurrencyTransfer: gatewaySettingOptionDescription(gatewayConcurrencyTransferOptions, settings.concurrency_transfer_strategy),
    overflowStrategy: gatewaySettingOptionDescription(gatewayOverflowStrategyOptions, settings.concurrency_overflow_strategy),
    failureRetryMode: gatewaySettingOptionDescription(gatewayFailureRetryModeOptions, settings.failure_retry_mode),
  }
}

export function buildGatewayStrategyDescriptionItems(settings: GatewaySettingsData) {
  return [
    {
      label: '路由策略',
      value: gatewaySettingOptionDescription(gatewayRouteStrategyOptions, settings.route_strategy),
    },
    {
      label: '并发转移',
      value: gatewaySettingOptionDescription(gatewayConcurrencyTransferOptions, settings.concurrency_transfer_strategy),
    },
    {
      label: '并发溢出',
      value: gatewaySettingOptionDescription(gatewayOverflowStrategyOptions, settings.concurrency_overflow_strategy),
    },
    {
      label: '错误切换',
      value: gatewaySettingOptionDescription(gatewayFailureRetryModeOptions, settings.failure_retry_mode),
    },
    {
      label: '自动模型类型',
      value: '请求体里的 model 包含 claude / gpt / gemini 时，网关会自动选择对应类型路由；仍可用 type 参数手动指定。',
    },
  ]
}
