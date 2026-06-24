import { balanceTone, formatBalance, formatGroupNames, normalizeBalanceUnit } from './format.ts'
import { normalizeStringList as normalizeModelList, shortFingerprint, supportedModelsPreview } from './viewUtils.ts'
import { routePathOptions, routeTypeOptions } from './gatewayViewConfig.ts'
import type { GatewayActiveRequest, GatewayRoute, GatewayUsageRoute } from './types.ts'

export function routeBalanceUnit(route: GatewayRoute) {
  const display = String(route.balance_display ?? '').trim()
  if (/^[$¥€£]/.test(display)) {
    return display[0]
  }
  const suffix = display.match(/\s([^\s]+)$/)
  if (suffix) {
    return normalizeBalanceUnit(suffix[1])
  }
  return normalizeBalanceUnit(route.balance_unit)
}

export function balanceUnitOrder(unit: string) {
  const normalized = normalizeBalanceUnit(unit)
  if (normalized === '$') return 0
  if (normalized === '¥') return 1
  if (normalized === '€') return 2
  if (normalized === '£') return 3
  return 10
}

export function formatUSD(value: number | null | undefined) {
  const numeric = Number(value ?? 0)
  if (!Number.isFinite(numeric)) {
    return '$0'
  }
  return `$${numeric.toLocaleString('zh-CN', {
    minimumFractionDigits: numeric > 0 && numeric < 0.01 ? 6 : 2,
    maximumFractionDigits: numeric > 0 && numeric < 0.01 ? 6 : 2,
  })}`
}

export function asGatewayRoute(record: unknown) {
  return record as GatewayRoute
}

export function gatewayRouteRowKey(record: GatewayRoute) {
  return record.id
}

export function usageRowKey(record: GatewayUsageRoute) {
  return record.route_id ?? `${record.site_id ?? 'unknown'}-${record.key_fingerprint || record.route_label}`
}

export function usageRouteLabel(route: GatewayUsageRoute) {
  const label = String(route.route_label ?? '').trim()
  if (label) {
    return label
  }
  const parts = [
    route.route_id ? `#${route.route_id}` : '',
    route.site_name || (route.site_id ? `站点 #${route.site_id}` : ''),
    route.key_name,
  ].filter(Boolean)
  return parts.length ? parts.join(' / ') : '未知路由'
}

export function usageRouteMeta(route: GatewayUsageRoute) {
  return [
    route.route_id ? `Route #${route.route_id}` : 'Route 未知',
    route.model ? `模型 ${route.model}` : '',
    route.site_id ? `站点 #${route.site_id}` : '',
    route.route_type ? `类型 ${routeTypeLabel(route.route_type)}` : '',
    route.group_name ? `分组 ${formatGroupNames(route.group_name)}` : '',
    route.key_fingerprint ? `Key ${shortFingerprint(route.key_fingerprint)}` : '',
  ].filter(Boolean).join(' / ')
}

export function loadRouteLabel(route: GatewayRoute) {
  const siteName = String(route.site_name || route.site_name_snapshot || route.site_base_url_snapshot || `站点 #${route.site_id}`).trim()
  return `${siteName}${route.key_name ? ` / ${route.key_name}` : ''}`
}

export function routePriorityLabel(route: GatewayRoute | null) {
  return route ? String(route.route_priority) : '暂无'
}

export function routeSnapshotLabel(route: GatewayRoute) {
  return route.site_name_snapshot || route.site_base_url_snapshot || ''
}

export function routeKeyLabel(route: GatewayRoute) {
  return route.key_fingerprint ? `Key ${route.key_fingerprint}` : 'Key 未知'
}

export function routeIssueLabels(route: GatewayRoute) {
  const labels: string[] = []
  if (route.site_missing) {
    labels.push('站点已删除')
  }
  if (route.has_api_key === false) {
    labels.push('缺少 API Key')
  }
  if (!route.is_enabled && route.is_enabled_manual) {
    labels.push('手动禁用')
  }
  return labels
}

export function routeDetailItems(route: GatewayRoute) {
  return [
    { label: '快照', value: routeSnapshotLabel(route) || '未记录' },
    { label: '当前出口', value: route.request_base_url || route.base_url || route.site_base_url_snapshot || '未记录' },
    { label: '出口候选', value: routeRequestBasePreview(route) },
    { label: '请求格式', value: routePathLabel(route.route_path) },
    { label: '余额接口', value: route.balance_probe_url || '自动探测' },
    { label: '支持模型', value: supportedModelsPreview(route.supported_models, 3) },
    { label: '站点', value: `#${route.site_id}` },
    { label: 'Key', value: routeKeyLabel(route) },
  ]
}

export function routeTypeLabel(routeType: string) {
  return routeTypeOptions.find((item) => item.value === routeType)?.label ?? routeType
}

export function normalizeRoutePath(value: unknown): NonNullable<GatewayRoute['route_path']> {
  return value === 'chat/completions' || value === 'responses' ? value : ''
}

export function routePathLabel(routePath: unknown) {
  return routePathOptions.find((item) => item.value === normalizeRoutePath(routePath))?.label ?? '跟随客户端'
}

export function activeRequestRouteTypeLabel(routeType: GatewayActiveRequest['route_type']) {
  const normalized = String(routeType ?? '').trim()
  return routeTypeOptions.find((item) => item.value === normalized)?.label ?? (normalized || '未知')
}

export function routeCircuitState(route: GatewayRoute): 'closed' | 'open' | 'half_open' | 'paused' {
  if (!route.is_enabled) {
    return 'paused'
  }
  if (route.circuit_state === 'open' || route.circuit_state === 'half_open') {
    return route.circuit_state
  }
  return 'closed'
}

export function routeLastUpdateTime(route: GatewayRoute) {
  if (hasRouteIssue(route)) {
    return route.last_failure_at || route.last_used_at || route.last_success_at
  }
  return route.last_success_at || route.last_used_at || route.last_failure_at
}

export function routeLastUpdateLabel(route: GatewayRoute) {
  if (hasRouteIssue(route)) {
    return '异常'
  }
  if (route.last_success_at) {
    return '成功'
  }
  if (route.last_used_at) {
    return '使用'
  }
  return '更新'
}

export function hasRouteIssue(route: GatewayRoute) {
  return Boolean(String(route.last_error ?? '').trim())
}

export function normalizeGatewayRoute(route: GatewayRoute): GatewayRoute {
  const balanceUnit = normalizeBalanceUnit(route.balance_unit)
  return {
    ...route,
    balance_unit: balanceUnit,
    route_path: normalizeRoutePath(route.route_path),
    balance_display: route.balance_display || formatBalance(route.last_balance, balanceUnit),
    package_unit: normalizeBalanceUnit(route.package_unit, ''),
    supported_models: normalizeModelList(route.supported_models),
    manual_request_base_urls: normalizeModelList(route.manual_request_base_urls ?? []),
  }
}

export function balanceClass(balance: number | null | undefined) {
  const tone = balanceTone(balance)
  return tone === 'empty' ? '' : `balance-value balance-value--${tone}`
}

export function primaryLatency(route: GatewayRoute) {
  return route.ewma_latency_ms ?? route.last_latency_ms ?? route.avg_latency_ms ?? null
}

export function latencyTone(latencyMs: number | null | undefined): 'low' | 'medium' | 'high' | 'empty' {
  if (latencyMs === null || latencyMs === undefined || Number.isNaN(latencyMs)) {
    return 'empty'
  }
  if (latencyMs < 1200) {
    return 'low'
  }
  if (latencyMs < 3200) {
    return 'medium'
  }
  return 'high'
}

export function latencyClass(latencyMs: number | null | undefined) {
  const tone = latencyTone(latencyMs)
  return tone === 'empty' ? 'gateway-latency' : `gateway-latency gateway-latency--${tone}`
}

export function formatLatency(latencyMs: number | null | undefined) {
  if (latencyMs === null || latencyMs === undefined || Number.isNaN(latencyMs)) {
    return '暂无'
  }
  return `${latencyMs} ms`
}

export function routeRequestBaseList(route: GatewayRoute): string[] {
  const raw = [
    ...(route.manual_request_base_urls ?? []),
    ...(route.request_base_urls ?? []),
    route.request_base_url,
    route.base_url,
    route.site_base_url_snapshot,
  ]
  return raw
    .map((item) => String(item ?? '').trim())
    .filter((item, index, source) => item && source.indexOf(item) === index)
}

export function routeRequestBasePreview(route: GatewayRoute): string {
  const urls = routeRequestBaseList(route)
  if (!urls.length) {
    return '未记录'
  }
  if (urls.length === 1) {
    return urls[0]
  }
  const preview = urls.slice(0, 2).join(' -> ')
  return urls.length > 2 ? `${preview} 等 ${urls.length} 个` : preview
}

export function routeLatencyDetails(route: GatewayRoute) {
  const items: string[] = []
  if (route.last_latency_ms !== null) {
    items.push(`最近 ${route.last_latency_ms} ms`)
  }
  if (route.ewma_latency_ms !== null) {
    items.push(`EWMA ${route.ewma_latency_ms} ms`)
  }
  if (route.avg_latency_ms !== null) {
    items.push(`均值 ${route.avg_latency_ms} ms`)
  }
  return items
}

export function routeErrorDetails(route: GatewayRoute) {
  const items: string[] = []
  if (route.last_error) {
    items.push(route.last_error)
  }
  if (routeLastUpdateTime(route)) {
    items.push(`${routeLastUpdateLabel(route)}：${formatRouteTime(routeLastUpdateTime(route))}`)
  }
  return items
}

function formatRouteTime(value: string | null) {
  if (!value) return '暂无'
  return new Date(value).toLocaleString('zh-CN')
}
