import type { RouteBatchProgress } from './gatewayViewModel.ts'
import { loadRouteLabel } from './gatewayRouteDisplayModel.ts'
import { formatBalance } from './format.ts'
import type { BalanceProbeResult, GatewayRoute } from './types.ts'

type ProbeCount = {
  success: number
  failed: number
}

type GatewayRouteBalanceBatchStartPlan = {
  shouldStart: true
  routeIds: number[]
  errorMessage: null
} | {
  shouldStart: false
  routeIds: []
  errorMessage: string
  notice: {
    tone: 'error'
    message: string
  }
}

type GatewayRouteBalanceProbeRunPlan = {
  shouldRun: true
  routeIds: number[]
  progress: RouteBatchProgress | null
  result: null
} | {
  shouldRun: false
  routeIds: []
  progress: null
  result: ProbeCount
}

type GatewayRouteBalanceProbeCompletionPlan = {
  shouldNotifyOverviewChanged: boolean
  notice: ReturnType<typeof buildGatewayRouteBalanceNotice> | null
}

type GatewayRouteBalanceBatchUpdateErrorPlan = {
  notice: {
    tone: 'error'
    message: string
  }
}

type GatewaySingleRouteBalanceProbeCompletionPlan = {
  shouldNotifyOverviewChanged: boolean
  notice: ReturnType<typeof buildGatewaySingleRouteBalanceNotice>
  shouldOpenManualDialog: boolean
  manualDialogMessage: string
}

type GatewaySingleRouteBalanceProbeErrorPlan = {
  notice: {
    tone: 'error'
    message: string
  }
}

export function normalizeGatewayRouteBalanceProbeIds(routeIds: number[]) {
  return [...new Set(routeIds.filter((id) => Number.isFinite(id) && id > 0))]
}

export function buildGatewayRouteBalanceProbeRunPlan(
  routeIds: number[],
  withProgress: boolean,
): GatewayRouteBalanceProbeRunPlan {
  const normalizedRouteIds = normalizeGatewayRouteBalanceProbeIds(routeIds)
  if (!normalizedRouteIds.length) {
    return {
      shouldRun: false,
      routeIds: [],
      progress: null,
      result: { success: 0, failed: 0 },
    }
  }
  return {
    shouldRun: true,
    routeIds: normalizedRouteIds,
    progress: withProgress ? createGatewayRouteBalanceProgress(normalizedRouteIds.length) : null,
    result: null,
  }
}

export function buildGatewayRouteBalanceBatchStartPlan(
  routeIds: number[],
  isRouteProbeRunning: boolean,
): GatewayRouteBalanceBatchStartPlan {
  const normalizedRouteIds = normalizeGatewayRouteBalanceProbeIds(routeIds)
  if (!normalizedRouteIds.length) {
    const message = '当前没有可更新余额的网关路由。'
    return {
      shouldStart: false,
      routeIds: [],
      errorMessage: message,
      notice: {
        tone: 'error',
        message,
      },
    }
  }
  if (isRouteProbeRunning) {
    const message = '路由探测仍在运行，请稍后再更新余额。'
    return {
      shouldStart: false,
      routeIds: [],
      errorMessage: message,
      notice: {
        tone: 'error',
        message,
      },
    }
  }
  return {
    shouldStart: true,
    routeIds: normalizedRouteIds,
    errorMessage: null,
  }
}

export function mergeGatewayRouteBalanceProbingIds(currentIds: number[], routeIds: number[]) {
  return normalizeGatewayRouteBalanceProbeIds([...currentIds, ...routeIds])
}

export function removeGatewayRouteBalanceProbingIds(currentIds: number[], routeIds: number[]) {
  const removed = new Set(routeIds)
  return currentIds.filter((id) => !removed.has(id))
}

export function isGatewayRouteBalanceProbing(balanceProbingRouteIds: number[], routeId: number) {
  return balanceProbingRouteIds.includes(routeId)
}

export function createGatewayRouteBalanceProgress(total: number): RouteBatchProgress {
  return { total, done: 0, success: 0, failed: 0 }
}

export function nextGatewayRouteBalanceProgress(progress: RouteBatchProgress, ok: boolean): RouteBatchProgress {
  return {
    ...progress,
    done: progress.done + 1,
    success: progress.success + (ok ? 1 : 0),
    failed: progress.failed + (ok ? 0 : 1),
  }
}

export function buildGatewayRouteBalanceProbeStepPlan({
  count,
  progress,
  ok,
}: {
  count: ProbeCount
  progress: RouteBatchProgress | null
  ok: boolean
}) {
  return {
    count: {
      success: count.success + (ok ? 1 : 0),
      failed: count.failed + (ok ? 0 : 1),
    },
    progress: progress ? nextGatewayRouteBalanceProgress(progress, ok) : null,
  }
}

export function buildGatewayRouteBalanceProbeCompletionPlan({
  count,
  silent,
}: {
  count: ProbeCount
  silent: boolean
}): GatewayRouteBalanceProbeCompletionPlan {
  return {
    shouldNotifyOverviewChanged: count.success > 0,
    notice: silent ? null : buildGatewayRouteBalanceNotice('余额探测', count),
  }
}

export function buildGatewayRouteBalanceNotice(actionLabel: '余额探测' | '余额更新', count: ProbeCount) {
  if (count.failed > 0) {
    return {
      tone: 'error' as const,
      message: `${actionLabel}完成，成功 ${count.success} 条，失败 ${count.failed} 条。`,
    }
  }
  return {
    tone: 'success' as const,
    message: `${actionLabel}完成，${count.success} 条全部读取成功。`,
  }
}

export function buildGatewayRouteBalanceBatchUpdateErrorPlan(error: unknown): GatewayRouteBalanceBatchUpdateErrorPlan {
  return {
    notice: {
      tone: 'error',
      message: error instanceof Error ? error.message : '余额更新失败',
    },
  }
}

export function buildGatewaySingleRouteBalanceNotice(route: GatewayRoute, result: BalanceProbeResult) {
  if (result.ok) {
    return {
      tone: 'success' as const,
      message: `${loadRouteLabel(route)} 余额读取成功：${result.balance_display || formatBalance(result.remaining, result.unit)}（${result.base_url}）`,
    }
  }
  return {
    tone: 'error' as const,
    message: `${loadRouteLabel(route)} 余额读取失败：${result.message}`,
  }
}

export function buildGatewaySingleRouteBalanceProbeCompletionPlan(
  route: GatewayRoute,
  result: BalanceProbeResult,
): GatewaySingleRouteBalanceProbeCompletionPlan {
  return {
    shouldNotifyOverviewChanged: result.ok,
    notice: buildGatewaySingleRouteBalanceNotice(route, result),
    shouldOpenManualDialog: !result.ok,
    manualDialogMessage: result.ok ? '' : result.message,
  }
}

export function buildGatewaySingleRouteBalanceProbeErrorPlan(error: unknown): GatewaySingleRouteBalanceProbeErrorPlan {
  return {
    notice: {
      tone: 'error',
      message: error instanceof Error ? error.message : '余额读取失败',
    },
  }
}
