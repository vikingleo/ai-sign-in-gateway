import { shortFingerprint } from './viewUtils.ts'
import type { GatewayActiveRequest, GatewayLog } from './types.ts'

export function logRequestedModel(log: GatewayLog) {
  return String(log.requested_model || log.model || '').trim() || '未声明'
}

export function logActualModel(log: GatewayLog) {
  return String(log.actual_model || log.requested_model || log.model || '').trim() || '未记录'
}

export function logModelMeta(log: GatewayLog) {
  return `请求 ${logRequestedModel(log)} / 命中 ${logActualModel(log)}`
}

export function logRequestURL(log: GatewayLog) {
  return String(log.request_url || log.target_path || '/').trim()
}

export function logRequestLabel(log: GatewayLog) {
  return `${log.method} ${logRequestURL(log)}`
}

export function logMethodLabel(log: GatewayLog) {
  return String(log.method || 'GET').trim().toUpperCase()
}

export function requestMethodColor(method: string | null | undefined) {
  switch (String(method || '').trim().toUpperCase()) {
    case 'GET':
      return 'green'
    case 'POST':
      return 'blue'
    case 'PUT':
      return 'purple'
    case 'PATCH':
      return 'orange'
    case 'DELETE':
      return 'red'
    case 'OPTIONS':
      return 'cyan'
    case 'HEAD':
      return 'geekblue'
    default:
      return 'default'
  }
}

export function logUserAgent(log: GatewayLog) {
  return String(log.user_agent || '').trim()
}

export function activeRequestURL(item: GatewayActiveRequest) {
  return String(item.request_url || item.target_path || '/').trim()
}

export function activeRequestRouteLabel(item: GatewayActiveRequest) {
  const label = String(item.route_label ?? '').trim()
  if (label) {
    return label
  }
  const parts = [
    item.route_id ? `#${item.route_id}` : '',
    item.site_name || (item.site_id ? `站点 #${item.site_id}` : ''),
    item.key_name,
  ].filter(Boolean)
  return parts.length ? parts.join(' / ') : '未知路由'
}

export function activeRequestMeta(item: GatewayActiveRequest) {
  return [
    item.route_id ? `Route #${item.route_id}` : 'Route 未知',
    item.site_id ? `站点 #${item.site_id}` : '',
    item.key_fingerprint ? `Key ${shortFingerprint(item.key_fingerprint)}` : '',
    item.request_base_url,
  ].filter(Boolean)
}
