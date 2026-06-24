type GatewayRouteDiagnosisErrorPlan = {
  notice: {
    tone: 'error'
    message: string
  }
}

export function buildGatewayRouteDiagnosisErrorPlan(error: unknown): GatewayRouteDiagnosisErrorPlan {
  return {
    notice: {
      tone: 'error',
      message: error instanceof Error ? error.message : '路由诊断失败',
    },
  }
}
