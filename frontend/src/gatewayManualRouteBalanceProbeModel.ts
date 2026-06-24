import { formatBalance } from './format.ts'
import { loadRouteLabel } from './gatewayRouteDisplayModel.ts'
import type { BalanceProbeResult, GatewayRoute } from './types.ts'

type GatewayManualRouteBalanceProbeCompletionPlan = {
  shouldNotifyOverviewChanged: boolean
  notice: {
    tone: 'success' | 'error'
    message: string
  }
  shouldCloseDialog: boolean
  failureMessage: string
}

type GatewayManualRouteBalanceProbeErrorPlan = {
  notice: {
    tone: 'error'
    message: string
  }
  failureMessage: string
}

type GatewayManualRouteBalanceProbeURLValidationPlan = {
  isValid: boolean
  validationMessage: string
  notice: {
    tone: 'error'
    message: string
  } | null
}

export function buildManualGatewayRouteBalanceDialogDraft(
  route: GatewayRoute,
  routes: GatewayRoute[],
  message = '',
) {
  const latest = routes.find((item) => item.id === route.id) ?? route
  return {
    route: latest,
    url: latest.balance_probe_url?.trim() || '',
    message,
  }
}

export function normalizeManualGatewayRouteBalanceProbeURL(value: string) {
  return value.trim()
}

export function validateManualGatewayRouteBalanceProbeURL(value: string) {
  const url = value.trim()
  if (!url) {
    return '请填写余额探测接口地址。'
  }
  if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) {
    return '探测接口地址需要是完整 URL，或以 / 开头的相对路径。'
  }
  return ''
}

export function buildManualGatewayRouteBalanceProbeURLValidationPlan(
  value: string,
): GatewayManualRouteBalanceProbeURLValidationPlan {
  const validationMessage = validateManualGatewayRouteBalanceProbeURL(value)
  return {
    isValid: !validationMessage,
    validationMessage,
    notice: validationMessage ? {
      tone: 'error',
      message: validationMessage,
    } : null,
  }
}

export function buildManualGatewayRouteBalanceSuccessNotice(route: GatewayRoute, result: BalanceProbeResult) {
  return `${loadRouteLabel(route)} 余额读取成功：${result.balance_display || formatBalance(result.remaining, result.unit)}。`
}

export function buildManualGatewayRouteBalanceFailureNotice(route: GatewayRoute, message: string) {
  return `${loadRouteLabel(route)} 余额读取失败：${message}`
}

export function buildManualGatewayRouteBalanceProbeCompletionPlan(
  route: GatewayRoute,
  result: BalanceProbeResult,
): GatewayManualRouteBalanceProbeCompletionPlan {
  if (result.ok) {
    return {
      shouldNotifyOverviewChanged: true,
      notice: {
        tone: 'success',
        message: buildManualGatewayRouteBalanceSuccessNotice(route, result),
      },
      shouldCloseDialog: true,
      failureMessage: '',
    }
  }
  return {
    shouldNotifyOverviewChanged: false,
    notice: {
      tone: 'error',
      message: buildManualGatewayRouteBalanceFailureNotice(route, result.message),
    },
    shouldCloseDialog: false,
    failureMessage: result.message,
  }
}

export function buildManualGatewayRouteBalanceProbeErrorPlan(error: unknown): GatewayManualRouteBalanceProbeErrorPlan {
  const message = error instanceof Error ? error.message : '余额读取失败'
  return {
    notice: {
      tone: 'error',
      message,
    },
    failureMessage: message,
  }
}

export function buildManualGatewayRouteBalanceSuccessState() {
  return {
    open: false,
    route: null as GatewayRoute | null,
    message: '',
  }
}
