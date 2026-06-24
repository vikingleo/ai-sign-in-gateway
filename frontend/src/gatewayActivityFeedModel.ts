import { formatGroupNames } from './format.ts'
import {
  activeRequestMeta,
  activeRequestRouteLabel,
  activeRequestTransferLines,
  activeRequestURL,
  logActualModel,
  logRequestLabel,
  logRequestedModel,
  logRequestURL,
  logRouteLabel,
  logTransferLines,
} from './gatewayActivityDisplayModel.ts'
import { activeRequestRouteTypeLabel } from './gatewayRouteDisplayModel.ts'
import { gatewayRouteStrategyOptions } from './gatewayViewConfig.ts'
import type { GatewayActiveRequest, GatewayLog, GatewayStrategyStat } from './types.ts'
import { formatElapsed, shortFingerprint } from './viewUtils.ts'

export function formatGatewayTime(value: string | null) {
  if (!value) return '暂无'
  return new Date(value).toLocaleString('zh-CN')
}

function strategyLabel(strategy: GatewayStrategyStat['route_strategy'] | string) {
  return gatewayRouteStrategyOptions.find((item) => item.value === strategy)?.label ?? String(strategy)
}

export function buildActiveRouteFeed(items: GatewayActiveRequest[]) {
  return items.map((item) => ({
    ...item,
    kind: 'active',
    label: activeRequestRouteLabel(item),
    meta: activeRequestMeta(item),
    elapsedLabel: formatElapsed(item.elapsed_ms),
    routeTypeLabel: activeRequestRouteTypeLabel(item.route_type),
    requestedModelLabel: String(item.requested_model || '').trim() || '未声明',
    actualModelLabel: String(item.actual_model || item.requested_model || '').trim() || '待返回',
    groupLabel: formatGroupNames(item.group_name) || '未分组',
    methodLabel: item.method,
    requestURL: activeRequestURL(item),
    targetLabel: `${item.method} ${activeRequestURL(item)}`,
    strategyLabel: strategyLabel(item.route_strategy),
    primaryBadge: `并发 ${item.active_concurrency}`,
    primaryBadgeColor: 'processing',
    secondaryBadge: formatElapsed(item.elapsed_ms),
    attemptLabel: `尝试 ${item.attempt_index}`,
    timeLabel: `开始 ${formatGatewayTime(item.started_at)}`,
    sourceActive: item,
    sourceLog: undefined,
    success: item.success,
    failure_reason: item.failure_reason,
    previous_error: item.previous_error,
    transfer_to: item.transfer_to,
    final_attempt: item.final_attempt,
    transferLines: activeRequestTransferLines(item),
  }))
}

export function buildRecentRouteFeed(logs: GatewayLog[]) {
  return logs.slice(0, 8).map((item) => ({
    id: `log-${item.id}`,
    sourceLog: item,
    sourceActive: undefined,
    kind: 'completed',
    label: logRouteLabel(item),
    success: item.success,
    failure_reason: item.failure_reason,
    previous_error: item.previous_error,
    transfer_to: item.transfer_to,
    final_attempt: item.final_attempt,
    meta: [
      item.route_id ? `Route #${item.route_id}` : 'Route 未知',
      item.site_id ? `站点 #${item.site_id}` : '',
      item.key_fingerprint ? `Key ${shortFingerprint(item.key_fingerprint)}` : '',
    ].filter(Boolean),
    elapsedLabel: item.latency_ms !== null ? `${item.latency_ms} ms` : '暂无延迟',
    routeTypeLabel: '',
    requestedModelLabel: logRequestedModel(item),
    actualModelLabel: logActualModel(item),
    groupLabel: formatGroupNames(item.group_name) || '未分组',
    methodLabel: item.method,
    requestURL: logRequestURL(item),
    targetLabel: logRequestLabel(item),
    strategyLabel: strategyLabel(item.route_strategy),
    primaryBadge: item.success ? '成功' : '失败',
    primaryBadgeColor: item.success ? 'success' : 'error',
    secondaryBadge: item.latency_ms !== null ? `${item.latency_ms} ms` : '暂无延迟',
    attemptLabel: `尝试 ${item.attempt_index}`,
    timeLabel: `完成 ${formatGatewayTime(item.created_at)}`,
    transferLines: logTransferLines(item),
    is_stream: item.is_stream,
  }))
}

export function buildRouteActivityFeed(activeRequests: GatewayActiveRequest[], logs: GatewayLog[]) {
  return [...buildActiveRouteFeed(activeRequests), ...buildRecentRouteFeed(logs)]
    .slice(0, 12)
}

export type GatewayActiveRouteFeedItem = ReturnType<typeof buildActiveRouteFeed>[number]
export type GatewayRecentRouteFeedItem = ReturnType<typeof buildRecentRouteFeed>[number]
export type GatewayActivityFeedItem = GatewayActiveRouteFeedItem | GatewayRecentRouteFeedItem
