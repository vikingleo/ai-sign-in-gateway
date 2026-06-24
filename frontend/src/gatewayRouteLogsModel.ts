type GatewayRouteLogsErrorPlan = {
  notice: {
    tone: 'error'
    message: string
  }
  shouldClearLogs: boolean
}

export function buildGatewayRouteLogsErrorPlan(error: unknown): GatewayRouteLogsErrorPlan {
  return {
    notice: {
      tone: 'error',
      message: error instanceof Error ? error.message : '路由请求历史加载失败',
    },
    shouldClearLogs: true,
  }
}
