import { normalizeGatewayRoute, normalizeRoutePath } from './gatewayRouteDisplayModel.ts'
import type { GatewayRoute, GatewayRouteUpdatePayload } from './types.ts'
import { normalizeStringList } from './viewUtils.ts'

export function isGatewayRouteType(value: unknown): value is GatewayRoute['route_type'] {
  return value === 'general' || value === 'claude' || value === 'gpt' || value === 'codex' || value === 'gemini'
}

export function isGatewayRoutePath(value: unknown): value is NonNullable<GatewayRoute['route_path']> {
  return value === '' || value === 'chat/completions' || value === 'responses'
}

export function buildGatewayRouteTypePayload(
  route: GatewayRoute,
  routeType: GatewayRoute['route_type'],
): GatewayRouteUpdatePayload {
  return {
    route_type: routeType,
    route_path: route.route_path ?? '',
    supported_models: route.supported_models ?? [],
  }
}

export function buildGatewayRoutePathPayload(
  route: GatewayRoute,
  routePath: NonNullable<GatewayRoute['route_path']>,
): GatewayRouteUpdatePayload {
  return {
    route_type: route.route_type,
    route_path: routePath,
    supported_models: route.supported_models ?? [],
  }
}

export function applyGatewayRouteTypeDraft(
  routes: GatewayRoute[],
  routeId: number,
  routeType: GatewayRoute['route_type'],
) {
  return routes.map((route) => (route.id === routeId ? normalizeGatewayRoute({ ...route, route_type: routeType }) : route))
}

export function applyGatewayRoutePathDraft(
  routes: GatewayRoute[],
  routeId: number,
  routePath: NonNullable<GatewayRoute['route_path']>,
) {
  return routes.map((route) => (route.id === routeId ? normalizeGatewayRoute({ ...route, route_path: routePath }) : route))
}

export function replaceGatewayRoute(routes: GatewayRoute[], route: GatewayRoute) {
  const normalized = normalizeGatewayRoute(route)
  return routes.map((item) => (item.id === normalized.id ? normalized : item))
}

export function buildGatewayRouteTypeChangeErrorPlan(error: unknown) {
  return {
    notice: {
      tone: 'error' as const,
      message: error instanceof Error ? error.message : '类型切换失败',
    },
  }
}

export function buildGatewayRouteTypeChangeSuccessPlan({
  routeLabel,
  routeTypeLabel,
}: {
  routeLabel: string
  routeTypeLabel: string
}) {
  return {
    notice: {
      tone: 'success' as const,
      message: `${routeLabel} 已切换为 ${routeTypeLabel}。`,
    },
  }
}

export function buildGatewayRoutePathChangeErrorPlan(error: unknown) {
  return {
    notice: {
      tone: 'error' as const,
      message: error instanceof Error ? error.message : '请求格式切换失败',
    },
  }
}

export function buildGatewayRoutePathChangeSuccessPlan({
  routeLabel,
  routePathLabel,
}: {
  routeLabel: string
  routePathLabel: string
}) {
  return {
    notice: {
      tone: 'success' as const,
      message: `${routeLabel} 请求格式已切换为 ${routePathLabel}。`,
    },
  }
}

export function buildGatewayRouteModelsSaveErrorPlan(error: unknown) {
  return {
    notice: {
      tone: 'error' as const,
      message: error instanceof Error ? error.message : '保存失败',
    },
  }
}

export function buildGatewayRouteModelsSaveSuccessPlan() {
  return {
    notice: {
      tone: 'success' as const,
      message: '路由配置已更新。',
    },
  }
}

export function buildGatewayRouteModelsDialogDraft(route: GatewayRoute) {
  return {
    supportedModels: normalizeStringList(route.supported_models),
    requestURLs: normalizeStringList(route.manual_request_base_urls ?? []).join('\n'),
  }
}

export function buildGatewayRouteModelsPayload(
  route: GatewayRoute,
  supportedModels: unknown,
  manualRequestBaseURLs: unknown,
): GatewayRouteUpdatePayload {
  return {
    route_type: route.route_type,
    route_path: normalizeRoutePath(route.route_path),
    supported_models: normalizeStringList(supportedModels),
    manual_request_base_urls: normalizeStringList(manualRequestBaseURLs),
  }
}
