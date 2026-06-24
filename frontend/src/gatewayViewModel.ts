import { formatBalance, formatGroupNames, parseGroupNames } from './format.ts'
import {
  balanceUnitOrder,
  formatUSD,
  hasRouteIssue,
  routeBalanceUnit,
  routeCircuitState,
  routePathLabel,
  routeRequestBaseList,
  routeTypeLabel,
} from './gatewayRouteDisplayModel.ts'
import { gatewayRouteStrategyOptions, type GatewayIssueState } from './gatewayViewConfig.ts'
import type {
  GatewayLog,
  GatewayOverview,
  GatewayRoute,
  GatewayRouteGroup,
  GatewayStrategyStat,
  GatewayUsage,
  SiteGroup,
} from './types.ts'
import { formatNumber, includesSearch } from './viewUtils.ts'

export { buildRouteActivityFeed } from './gatewayActivityFeedModel.ts'
export type { GatewayActivityFeedItem } from './gatewayActivityFeedModel.ts'

export type MetricTone = 'primary' | 'success' | 'warning' | 'info' | 'neutral'
export type RouteBatchProgress = { total: number; done: number; success: number; failed: number }

export function routeTotalBalanceSummary(routes: GatewayRoute[]) {
  const totals = new Map<string, number>()
  for (const route of routes) {
    if (route.last_balance === null || route.last_balance === undefined || Number.isNaN(route.last_balance)) {
      continue
    }
    const unit = routeBalanceUnit(route)
    totals.set(unit, (totals.get(unit) ?? 0) + Number(route.last_balance))
  }
  if (!totals.size) {
    return '暂无'
  }
  return [...totals.entries()]
    .sort(([left], [right]) => balanceUnitOrder(left) - balanceUnitOrder(right) || left.localeCompare(right, 'zh-CN'))
    .map(([unit, value]) => formatBalance(value, unit))
    .join(' / ')
}

export function buildGatewayMetricCards(overview: GatewayOverview | null, balanceSummary: string) {
  if (!overview) {
    return []
  }
  return [
    { title: '总额度', value: balanceSummary, tone: 'primary' },
    { title: '24H 请求', value: formatNumber(overview.request_count_24h), tone: 'info' },
    { title: '成功率', value: `${overview.success_rate_24h}%`, tone: 'success' },
    { title: '当前并发', value: formatNumber(overview.active_concurrency), tone: 'neutral' },
    { title: '今日最高并发', value: formatNumber(overview.max_concurrency_today), tone: 'warning' },
    { title: '历史最高并发', value: formatNumber(overview.max_concurrency_all_time), tone: 'info' },
    {
      title: '24H 模型费用',
      value: formatUSD(overview.usage_cost_24h?.total_cost),
      tone: overview.usage_cost_24h?.unknown_requests ? 'warning' : 'primary',
    },
  ] satisfies Array<{ title: string; value: string | number; tone: MetricTone }>
}

export function buildRoutePoolStatusCards(overview: GatewayOverview | null) {
  if (!overview) {
    return []
  }
  const total = Math.max(overview.total_routes, 1)
  return [
    { key: 'healthy', label: '健康路由', value: overview.healthy_routes, tone: 'success', ratio: overview.healthy_routes / total },
    { key: 'half_open', label: '半开探测', value: overview.half_open_routes, tone: 'warning', ratio: overview.half_open_routes / total },
    { key: 'open', label: '熔断中', value: overview.open_circuit_routes, tone: 'danger', ratio: overview.open_circuit_routes / total },
    { key: 'disabled', label: '停用路由', value: overview.disabled_routes, tone: 'neutral', ratio: overview.disabled_routes / total },
  ] satisfies Array<{ key: string; label: string; value: number; tone: 'success' | 'warning' | 'danger' | 'neutral'; ratio: number }>
}

export function buildRoutePoolPreviewRoutes(routes: GatewayRoute[]) {
  return routes
    .slice()
    .sort(
      (a, b) =>
        b.active_concurrency - a.active_concurrency ||
        b.request_count - a.request_count ||
        Number(Boolean(b.last_error)) - Number(Boolean(a.last_error)) ||
        a.route_priority - b.route_priority,
    )
    .slice(0, 5)
}

export function strategyLabel(strategy: GatewayStrategyStat['route_strategy'] | string) {
  return gatewayRouteStrategyOptions.find((item) => item.value === strategy)?.label ?? String(strategy)
}

export function buildGatewayStrategyCards(items: GatewayStrategyStat[] | null | undefined) {
  if (!items?.length) {
    return []
  }
  const sorted = items.slice().sort((a, b) => b.request_count - a.request_count)
  const peak = Math.max(...sorted.map((item) => item.request_count), 1)
  return sorted.slice(0, 4).map((item, index) => ({
    key: item.route_strategy,
    title: strategyLabel(item.route_strategy),
    value: formatNumber(item.request_count),
    width: `${Math.max(18, (item.request_count / peak) * 100)}%`,
    tone: (['primary', 'info', 'success', 'warning'] as MetricTone[])[index] ?? 'neutral',
  }))
}

export function buildUsageSummaryCards(gatewayUsage: GatewayUsage | null) {
  if (!gatewayUsage) {
    return []
  }
  return [
    { title: '模型费用', value: formatUSD(gatewayUsage.computed_total_cost), tone: gatewayUsage.computed_cost_mixed ? 'warning' : 'primary' },
    { title: '时间段请求', value: formatNumber(gatewayUsage.request_count), tone: 'primary' },
    { title: '成功请求', value: formatNumber(gatewayUsage.success_count), tone: 'success' },
    { title: '总 Token', value: formatNumber(gatewayUsage.total_tokens), tone: 'info' },
  ] satisfies Array<{ title: string; value: string; tone: MetricTone }>
}

export function buildGatewayGroupOptions(
  routeGroups: GatewayRouteGroup[],
  routes: GatewayRoute[],
  selectedGroups: string[],
) {
  const labels = new Set<string>()
  routeGroups.forEach((group) => labels.add(group.name))
  routes.forEach((route) => {
    parseGroupNames(route.group_name).forEach((groupName) => labels.add(groupName))
  })
  selectedGroups.forEach((groupName) => labels.add(groupName))
  return [...labels]
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
    .map((groupName) => ({ label: groupName, value: groupName }))
}

export function buildSiteGroupOptions(
  siteGroups: SiteGroup[],
  addUpstreamGroupNames: string[],
) {
  const labels = new Set<string>()
  siteGroups.forEach((group) => labels.add(group.name))
  addUpstreamGroupNames.forEach((groupName) => labels.add(groupName))
  return [...labels]
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
    .map((groupName) => ({ label: groupName, value: groupName }))
}

export type GatewayRouteFilters = {
  keyword: string
  selectedGroups: string[]
  selectedRouteTypes: Array<GatewayRoute['route_type']>
  selectedIssueStates: GatewayIssueState[]
}

type GatewayRouteFilterState = {
  routeSearch: string
  selectedGroups: string[]
  selectedRouteTypes: Array<GatewayRoute['route_type']>
  selectedIssueStates: GatewayIssueState[]
}

export function buildGatewayRouteFilters(filters: GatewayRouteFilterState): GatewayRouteFilters {
  return {
    keyword: filters.routeSearch,
    selectedGroups: [...filters.selectedGroups],
    selectedRouteTypes: [...filters.selectedRouteTypes],
    selectedIssueStates: [...filters.selectedIssueStates],
  }
}

export function filterGatewayRoutes(routes: GatewayRoute[], filters: GatewayRouteFilters) {
  const keyword = filters.keyword.trim().toLowerCase()
  const selectedGroupSet = new Set(filters.selectedGroups)
  const selectedRouteTypeSet = new Set(filters.selectedRouteTypes)
  const selectedIssueStateSet = new Set(filters.selectedIssueStates)
  return routes.filter((route) =>
    (!selectedGroupSet.size || parseGroupNames(route.group_name).some((groupName) => selectedGroupSet.has(groupName))) &&
    (!selectedRouteTypeSet.size || selectedRouteTypeSet.has(route.route_type)) &&
    (!selectedIssueStateSet.size ||
      (selectedIssueStateSet.has('with_error') && hasRouteIssue(route)) ||
      (selectedIssueStateSet.has('without_error') && !hasRouteIssue(route))) &&
    includesSearch(
      [
        route.site_name,
        route.key_name,
        route.route_type,
        routeTypeLabel(route.route_type),
        routePathLabel(route.route_path),
        routeCircuitState(route),
        route.request_base_url,
        routeRequestBaseList(route).join(' '),
        route.base_url,
        formatGroupNames(route.group_name),
        route.group_name,
        route.last_error,
        route.balance_display,
        route.package_display,
      ],
      keyword,
    ),
  )
}

export function filterGatewayLogs(logs: GatewayLog[], keywordValue: string) {
  const keyword = keywordValue.trim().toLowerCase()
  return logs.filter((log) =>
    includesSearch(
      [
        log.site_name,
        log.model,
        log.requested_model,
        log.actual_model,
        log.route_id,
        log.route_label,
        log.key_name,
        log.key_fingerprint,
        log.site_id,
        log.target_path,
        log.request_url,
        log.user_agent,
        log.method,
        log.failure_reason,
        log.route_strategy,
      ],
      keyword,
    ),
  )
}

export function progressPercent(progress: RouteBatchProgress | null) {
  if (!progress || progress.total <= 0) {
    return 0
  }
  return Math.min(100, Math.round((progress.done / progress.total) * 100))
}
