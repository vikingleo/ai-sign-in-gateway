import { loadRouteLabel } from './gatewayRouteDisplayModel.ts'
import type { GatewayRoute, GatewayRouteProbeResult } from './types.ts'
import type { RouteBatchProgress } from './gatewayViewModel.ts'

type GatewayProbeBatchStartPlan = {
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

type GatewaySingleProbeCompletionPlan = {
  notice: ReturnType<typeof buildGatewaySingleProbeNotice>
}

type GatewaySingleProbeErrorPlan = {
  notice: {
    tone: 'error'
    message: string
  }
}

type GatewayProbeCompletionPlan = {
  notice: ReturnType<typeof buildGatewayProbeNotice>
}

type GatewayProbeStepPlan = {
  failedResults: GatewayRouteProbeResult[]
  routeSucceeded: boolean
}

export function normalizeGatewayProbeRouteIds(routeIds: number[]) {
  return [...new Set(routeIds.filter((id) => Number.isFinite(id) && id > 0))]
}

export function buildGatewayProbeBatchStartPlan(routeIds: number[]): GatewayProbeBatchStartPlan {
  const normalizedRouteIds = normalizeGatewayProbeRouteIds(routeIds)
  if (!normalizedRouteIds.length) {
    const message = '当前没有可探测的网关路由。'
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

export function mergeGatewayProbingIds(currentIds: number[], routeIds: number[]) {
  return normalizeGatewayProbeRouteIds([...currentIds, ...routeIds])
}

export function removeGatewayProbingIds(currentIds: number[], routeIds: number[]) {
  const removed = new Set(routeIds)
  return currentIds.filter((id) => !removed.has(id))
}

export function isGatewayRouteProbing(probingRouteIds: number[], routeId: number) {
  return probingRouteIds.includes(routeId)
}

export function createGatewayProbeProgress(total: number): RouteBatchProgress {
  return { total, done: 0, success: 0, failed: 0 }
}

export function buildGatewayProbeFailureResult({
  routeId,
  route,
  error,
  checkedAt,
}: {
  routeId: number
  route: GatewayRoute | undefined
  error: unknown
  checkedAt: string
}): GatewayRouteProbeResult {
  const message = error instanceof Error ? error.message : String(error || '探测请求失败')
  return {
    id: routeId,
    site_id: route?.site_id ?? 0,
    site_name: route ? loadRouteLabel(route) : `Route #${routeId}`,
    request_base_url: route?.request_base_url,
    key_name: route?.key_name ?? '',
    key_fingerprint: route?.key_fingerprint,
    ok: false,
    status_code: null,
    latency_ms: null,
    message,
    models: [],
    supported_models: route?.supported_models ?? [],
    last_status_code: route?.last_status_code ?? null,
    last_error: route?.last_error ?? message,
    last_latency_ms: route?.last_latency_ms ?? null,
    last_success_at: route?.last_success_at ?? null,
    last_failure_at: route?.last_failure_at ?? null,
    checked_at: checkedAt,
  }
}

export function nextGatewayProbeProgress(progress: RouteBatchProgress, ok: boolean): RouteBatchProgress {
  return {
    ...progress,
    done: progress.done + 1,
    success: progress.success + (ok ? 1 : 0),
    failed: progress.failed + (ok ? 0 : 1),
  }
}

export function buildGatewayProbeStepPlan({
  failedResults,
  result,
}: {
  failedResults: GatewayRouteProbeResult[]
  result: GatewayRouteProbeResult
}): GatewayProbeStepPlan {
  return {
    failedResults: result.ok ? failedResults : [...failedResults, result],
    routeSucceeded: result.ok,
  }
}

export function buildGatewayProbeNotice(successCount: number, failedResults: GatewayRouteProbeResult[]) {
  if (!failedResults.length) {
    return {
      tone: 'success' as const,
      message: `路由探测完成，${successCount} 条全部可用。`,
    }
  }
  const sample = failedResults
    .slice(0, 2)
    .map((item) => `${item.site_name}${item.key_name ? ` / ${item.key_name}` : ''}`)
    .join('，')
  return {
    tone: 'error' as const,
    message: `路由探测完成，成功 ${successCount} 条，失败 ${failedResults.length} 条：${sample}`,
  }
}

export function buildGatewayProbeCompletionPlan(
  successCount: number,
  failedResults: GatewayRouteProbeResult[],
): GatewayProbeCompletionPlan {
  return {
    notice: buildGatewayProbeNotice(successCount, failedResults),
  }
}

export function buildGatewaySingleProbeNotice(route: GatewayRoute, result: GatewayRouteProbeResult) {
  if (result.ok) {
    return {
      tone: 'success' as const,
      message: `${loadRouteLabel(route)} 探测成功${result.latency_ms !== null ? `，${result.latency_ms} ms` : ''}。`,
    }
  }
  return {
    tone: 'error' as const,
    message: `${loadRouteLabel(route)} 探测失败：${result.message}`,
  }
}

export function buildGatewaySingleProbeCompletionPlan(
  route: GatewayRoute,
  result: GatewayRouteProbeResult,
): GatewaySingleProbeCompletionPlan {
  return {
    notice: buildGatewaySingleProbeNotice(route, result),
  }
}

export function buildGatewaySingleProbeErrorPlan(error: unknown): GatewaySingleProbeErrorPlan {
  return {
    notice: {
      tone: 'error',
      message: error instanceof Error ? error.message : '路由探测失败',
    },
  }
}
