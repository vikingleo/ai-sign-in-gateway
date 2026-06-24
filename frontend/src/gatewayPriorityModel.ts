import type { GatewayRoute } from './types.ts'

export type GatewayPriorityPresetMode = 'package' | 'balance'

type GatewayPriorityListLoadErrorPlan = {
  notice: {
    tone: 'error'
    message: string
  }
}

type GatewayPriorityMoveErrorPlan = {
  notice: {
    tone: 'error'
    message: string
  }
}

type GatewayPriorityMoveSuccessPlan = {
  notice: {
    tone: 'success'
    message: string
  }
}

type GatewayPriorityPresetErrorPlan = {
  notice: {
    tone: 'error'
    message: string
  }
}

type GatewayPriorityPresetSuccessPlan = {
  notice: {
    tone: 'success'
    message: string
  }
}

export function buildGatewayPriorityDialogDraft(route: GatewayRoute, routes: GatewayRoute[]) {
  return {
    route,
    insertIndex: undefined as number | undefined,
    open: true,
    routes,
  }
}

export function buildGatewayPriorityMoveRequest(route: GatewayRoute, target: number | null | undefined) {
  if (target === undefined || target === null || Number.isNaN(Number(target))) {
    const message = '请输入目标优先级。'
    return {
      error: message,
      validationNotice: {
        tone: 'error' as const,
        message,
      },
      payload: null,
    }
  }
  return {
    error: '',
    validationNotice: null,
    payload: {
      route_id: route.id,
      mode: 'move' as const,
      index: Math.trunc(Number(target)),
    },
  }
}

export function buildGatewayPriorityPresetPayload(mode: GatewayPriorityPresetMode) {
  return { mode }
}

export function gatewayPriorityPresetSuccessMessage(mode: GatewayPriorityPresetMode) {
  return mode === 'package' ? '已按套餐优先重排。' : '已按余额优先重排。'
}

export function buildGatewayPriorityPresetSuccessPlan(
  mode: GatewayPriorityPresetMode,
): GatewayPriorityPresetSuccessPlan {
  return {
    notice: {
      tone: 'success',
      message: gatewayPriorityPresetSuccessMessage(mode),
    },
  }
}

export function selectGatewayPriorityRoute(routes: GatewayRoute[], current: GatewayRoute | null) {
  return current ? routes.find((route) => route.id === current.id) ?? current : null
}

export function gatewayPriorityRouteRowClassName(record: GatewayRoute, current: GatewayRoute | null) {
  return record.id === current?.id ? 'priority-route-row priority-route-row--current' : 'priority-route-row'
}

export function buildGatewayPriorityListLoadErrorPlan(error: unknown): GatewayPriorityListLoadErrorPlan {
  return {
    notice: {
      tone: 'error',
      message: error instanceof Error ? error.message : '优先级列表加载失败',
    },
  }
}

export function buildGatewayPriorityMoveErrorPlan(error: unknown): GatewayPriorityMoveErrorPlan {
  return {
    notice: {
      tone: 'error',
      message: error instanceof Error ? error.message : '优先级更新失败',
    },
  }
}

export function buildGatewayPriorityMoveSuccessPlan(): GatewayPriorityMoveSuccessPlan {
  return {
    notice: {
      tone: 'success',
      message: '优先级已更新。',
    },
  }
}

export function buildGatewayPriorityPresetErrorPlan(error: unknown): GatewayPriorityPresetErrorPlan {
  return {
    notice: {
      tone: 'error',
      message: error instanceof Error ? error.message : '优先级重排失败',
    },
  }
}
