import { formatBalance, normalizeBalanceUnit } from './format.ts'
import { applyGatewayActiveConcurrency } from './gatewayRouteConcurrency.ts'
import { normalizeGatewayRoute } from './gatewayRouteDisplayModel.ts'
import type { BalanceProbeResult, GatewayActiveRequest, GatewayOverview, GatewayRoute, GatewayRouteProbeResult, SiteSummary } from './types.ts'

export function mergeActiveRequestSnapshot({
  routes,
  priorityRoutes,
  overview,
  activeRequests,
}: {
  routes: GatewayRoute[]
  priorityRoutes: GatewayRoute[]
  overview: GatewayOverview | null
  activeRequests: GatewayActiveRequest[]
}) {
  const activeConcurrency = activeRequests.length
  return {
    routes: applyGatewayActiveConcurrency(routes, activeRequests),
    priorityRoutes: applyGatewayActiveConcurrency(priorityRoutes, activeRequests),
    overview: overview && overview.active_concurrency !== activeConcurrency
      ? { ...overview, active_concurrency: activeConcurrency }
      : overview,
  }
}

export function mergeGatewaySiteSummary(routes: GatewayRoute[], summary: SiteSummary) {
  return routes.map((route) =>
    route.site_id === summary.site_id
      ? normalizeGatewayRoute({
          ...route,
          package_remaining: summary.package_remaining,
          package_total: summary.package_total,
          package_used: summary.package_used,
          package_unit: summary.package_unit,
          package_display: summary.package_display,
          checkin_status: summary.checkin_status,
        })
      : route,
  )
}

export function buildGatewayRouteSummaryRefreshPlan(routes: GatewayRoute[]) {
  const siteIds = [...new Set(routes.map((route) => route.site_id))]
  return {
    shouldRefresh: siteIds.length > 0,
    siteIds,
  }
}

export function buildGatewayRouteSummaryRefreshErrorPlan(error: unknown) {
  return {
    notice: {
      tone: 'error' as const,
      message: error instanceof Error ? error.message : '路由摘要刷新失败',
    },
  }
}

export function applyGatewaySiteSummaries(routes: GatewayRoute[], summaries: SiteSummary[]) {
  return summaries.reduce((nextRoutes, summary) => mergeGatewaySiteSummary(nextRoutes, summary), routes)
}

export function mergeGatewayProbeResult(routes: GatewayRoute[], result: GatewayRouteProbeResult) {
  return routes.map((route) =>
    route.id === result.id
      ? normalizeGatewayRoute({
          ...route,
          last_status_code: result.last_status_code,
          last_error: result.last_error,
          last_latency_ms: result.last_latency_ms,
          last_success_at: result.last_success_at,
          last_failure_at: result.last_failure_at,
          supported_models: result.supported_models ?? result.models ?? route.supported_models,
          model_probe_status: result.model_probe_status ?? route.model_probe_status,
          model_probe_message: result.model_probe_message ?? result.message ?? route.model_probe_message,
          model_probe_updated_at: result.model_probe_updated_at ?? result.checked_at ?? route.model_probe_updated_at,
        })
      : route,
  )
}

export function mergeGatewayRouteBalanceResult(routes: GatewayRoute[], result: BalanceProbeResult) {
  return routes.map((route) =>
    route.id === result.route_id
      ? normalizeGatewayRoute({
          ...route,
          last_balance: result.last_balance ?? result.remaining,
          balance_display: result.balance_display || formatBalance(result.last_balance ?? result.remaining, result.unit),
          balance_unit: normalizeBalanceUnit(result.unit ?? route.balance_unit),
          balance_probe_url: result.balance_probe_url ?? route.balance_probe_url,
        })
      : route,
  )
}

export function replaceReorderedGatewayRoutes(routeData: GatewayRoute[], includeDisabled: boolean) {
  const normalized = routeData.map(normalizeGatewayRoute)
  return {
    priorityRoutes: normalized,
    routes: normalized.filter((route) => includeDisabled || route.is_enabled),
  }
}

export function buildGatewayRouteToggleErrorPlan(error: unknown) {
  return {
    notice: {
      tone: 'error' as const,
      message: error instanceof Error ? error.message : '切换失败',
    },
  }
}

export function buildGatewayRouteToggleSuccessPlan({
  wasEnabled,
}: {
  wasEnabled: boolean
}) {
  return {
    notice: {
      tone: 'success' as const,
      message: wasEnabled ? '已禁用该路由。' : '已重新启用该路由。',
    },
  }
}

export function buildGatewaySyncErrorPlan(error: unknown) {
  return {
    notice: {
      tone: 'error' as const,
      message: error instanceof Error ? error.message : '同步失败',
    },
  }
}

export function buildGatewaySyncSuccessPlan({
  routeCount,
  balanceSuccessCount,
}: {
  routeCount: number
  balanceSuccessCount: number
}) {
  return {
    notice: {
      tone: 'success' as const,
      message: `已同步 ${routeCount} 条网关路由，余额读取成功 ${balanceSuccessCount} 条。`,
    },
  }
}

export function buildGatewayDisableAllRoutesErrorPlan(error: unknown) {
  return {
    notice: {
      tone: 'error' as const,
      message: error instanceof Error ? error.message : '禁用全部失败',
    },
  }
}

export function buildGatewayDisableAllRoutesSuccessPlan({
  disabledCount,
}: {
  disabledCount: number
}) {
  return {
    notice: {
      tone: 'success' as const,
      message: `已禁用 ${disabledCount} 条路由。`,
    },
  }
}

export function buildGatewayEnableOnlyRouteErrorPlan(error: unknown) {
  return {
    notice: {
      tone: 'error' as const,
      message: error instanceof Error ? error.message : '禁用其他失败',
    },
  }
}

export function buildGatewayEnableOnlyRouteSuccessPlan() {
  return {
    notice: {
      tone: 'success' as const,
      message: '已仅启用该路由，其他路由已禁用。',
    },
  }
}

export function buildGatewayResetCircuitErrorPlan(error: unknown) {
  return {
    notice: {
      tone: 'error' as const,
      message: error instanceof Error ? error.message : '重置失败',
    },
  }
}

export function buildGatewayResetCircuitSuccessPlan() {
  return {
    notice: {
      tone: 'success' as const,
      message: '已重置该路由熔断状态。',
    },
  }
}
