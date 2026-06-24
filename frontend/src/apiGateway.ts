import { request, type GatewayLogStatusFilter, type RequestOptions } from './apiCore'
import type {
  BalanceProbeResult,
  GatewayActiveRequest,
  GatewayLog,
  GatewayOverview,
  GatewayRoute,
  GatewayRouteDeleteResult,
  GatewayRouteDiagnosis,
  GatewayRouteGroup,
  GatewayRouteProbeResult,
  GatewayRouteUpdatePayload,
  GatewaySettingsData,
  GatewayUsage,
} from './types'

export function getGatewayOverview(options: RequestOptions = {}): Promise<GatewayOverview> {
  return request('/gateway-admin/overview', { signal: options.signal })
}

export function getGatewayUsage(options?: { start?: string; end?: string; signal?: AbortSignal }): Promise<GatewayUsage> {
  const params = new URLSearchParams()
  if (options?.start) {
    params.set('start', options.start)
  }
  if (options?.end) {
    params.set('end', options.end)
  }
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return request(`/gateway-admin/usage${suffix}`, { signal: options?.signal })
}

export function getGatewaySettings(options: RequestOptions = {}): Promise<GatewaySettingsData> {
  return request('/gateway-admin/settings', { signal: options.signal })
}

export function updateGatewaySettings(payload: GatewaySettingsData): Promise<GatewaySettingsData> {
  return request('/gateway-admin/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function syncGatewayRoutes(): Promise<{ status: string; route_count: number }> {
  return request('/gateway-admin/sync', {
    method: 'POST',
  })
}

export function getGatewayRoutes(options?: { group?: string; includeDisabled?: boolean; signal?: AbortSignal }): Promise<GatewayRoute[]> {
  const params = new URLSearchParams()
  if (options?.group) {
    params.set('group', options.group)
  }
  if (options?.includeDisabled !== undefined) {
    params.set('include_disabled', String(options.includeDisabled))
  }
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return request(`/gateway-admin/routes${suffix}`, { signal: options?.signal })
}

export function getGatewayRouteGroups(options: RequestOptions = {}): Promise<GatewayRouteGroup[]> {
  return request('/gateway-admin/route-groups', { signal: options.signal })
}

export function createGatewayRouteGroup(payload: { name: string; api_key?: string }): Promise<GatewayRouteGroup> {
  const apiKey = payload.api_key?.trim()
  return request('/gateway-admin/route-groups', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      ...(apiKey ? { api_key: apiKey } : {}),
    }),
  })
}

export function updateGatewayRouteGroup(id: number, payload: { name: string; api_key?: string; clear_api_key?: boolean }): Promise<GatewayRouteGroup> {
  return request(`/gateway-admin/route-groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: payload.name,
      ...(payload.api_key !== undefined ? { api_key: payload.api_key } : {}),
      ...(payload.clear_api_key ? { clear_api_key: true } : {}),
    }),
  })
}

export function deleteGatewayRouteGroup(id: number): Promise<{ status: string; message: string }> {
  return request(`/gateway-admin/route-groups/${id}`, {
    method: 'DELETE',
  })
}

export function updateGatewayRouteGroups(id: number, groupIds: number[]): Promise<GatewayRoute> {
  return request(`/gateway-admin/routes/${id}/groups`, {
    method: 'PUT',
    body: JSON.stringify({ group_ids: groupIds }),
  })
}

export function deleteGatewayRoute(id: number): Promise<GatewayRouteDeleteResult> {
  return request(`/gateway-admin/routes/${id}`, {
    method: 'DELETE',
  })
}

export function toggleGatewayRoute(id: number): Promise<{ id: number; is_enabled: boolean; is_enabled_manual?: boolean; circuit_state: string }> {
  return request(`/gateway-admin/routes/${id}/toggle`, {
    method: 'POST',
  })
}

export function disableAllGatewayRoutes(): Promise<{ status: string; disabled_count: number }> {
  return request('/gateway-admin/routes/disable-all', {
    method: 'POST',
  })
}

export function enableOnlyGatewayRoute(id: number): Promise<{ status: string; enabled_route_id: number }> {
  return request(`/gateway-admin/routes/${id}/enable-only`, {
    method: 'POST',
  })
}

export function resetGatewayRouteCircuit(id: number): Promise<{ id: number; is_enabled: boolean; circuit_state: string }> {
  return request(`/gateway-admin/routes/${id}/reset-circuit`, {
    method: 'POST',
  })
}

export function updateGatewayRouteType(
  id: number,
  payload: GatewayRouteUpdatePayload,
): Promise<GatewayRoute> {
  return request(`/gateway-admin/routes/${id}/type`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export type GatewayRoutePriorityReorderPayload =
  | { route_id: number; mode: 'move'; index: number }
  | { mode: 'package' | 'balance'; route_id?: number; index?: never }

export function reorderGatewayRoutePriorities(payload: GatewayRoutePriorityReorderPayload): Promise<GatewayRoute[]> {
  return request('/gateway-admin/routes/priorities/reorder', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function probeGatewayRoute(id: number): Promise<GatewayRouteProbeResult> {
  return request(`/gateway-admin/routes/${id}/probe`, {
    method: 'POST',
  })
}

export function diagnoseGatewayRoute(id: number): Promise<GatewayRouteDiagnosis> {
  return request(`/gateway-admin/routes/${id}/diagnose`)
}

export function probeGatewayRouteBalance(id: number, payload?: { balance_probe_url?: string }): Promise<BalanceProbeResult> {
  return request(`/gateway-admin/routes/${id}/balance-probe`, {
    method: 'POST',
    body: payload ? JSON.stringify(payload) : undefined,
  })
}

export function probeGatewayRoutes(routeIds: number[]): Promise<GatewayRouteProbeResult[]> {
  return request('/gateway-admin/routes/probe', {
    method: 'POST',
    body: JSON.stringify({ route_ids: routeIds }),
  })
}

export function getGatewayLogs(limit = 80, options: RequestOptions & { status?: GatewayLogStatusFilter } = {}): Promise<GatewayLog[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (options.status && options.status !== 'all') {
    params.set('status', options.status)
  }
  return request(`/gateway-admin/logs?${params.toString()}`, { signal: options.signal })
}

export function getGatewayActiveRequests(options: RequestOptions & { includeRecent?: boolean } = {}): Promise<GatewayActiveRequest[]> {
  const query = options.includeRecent ? '?include_recent=true' : ''
  return request(`/gateway-admin/active-requests${query}`, { signal: options.signal })
}

export function getGatewayRouteLogs(routeId: number, limit = 80, options: RequestOptions & { status?: GatewayLogStatusFilter } = {}): Promise<GatewayLog[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (options.status && options.status !== 'all') {
    params.set('status', options.status)
  }
  return request(`/gateway-admin/routes/${routeId}/logs?${params.toString()}`, { signal: options.signal })
}
