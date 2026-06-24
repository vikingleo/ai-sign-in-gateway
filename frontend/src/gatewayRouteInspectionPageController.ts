import { createOpenGatewayRouteDiagnosisAction } from './gatewayRouteDiagnosisController.ts'
import { createOpenGatewayRouteLogsAction } from './gatewayRouteLogsController.ts'
import type { GatewayLog, GatewayRoute, GatewayRouteDiagnosis } from './types.ts'

type GatewayRouteInspectionNoticePlan = {
  notice: {
    tone: 'error'
    message: string
  }
}

type GatewayRouteInspectionPageOptions = {
  requestDiagnosis: (routeId: number) => Promise<GatewayRouteDiagnosis>
  openDiagnosisDrawer: () => void
  setDiagnosisLoading: (loading: boolean) => void
  setDiagnosis: (diagnosis: GatewayRouteDiagnosis) => void
  requestLogs: (routeId: number, limit: number) => Promise<GatewayLog[]>
  openLogsDrawer: (route: GatewayRoute) => void
  setLogsLoading: (loading: boolean) => void
  setLogs: (logs: GatewayLog[]) => void
  clearLogs: () => void
  showPlanNotice: (plan: GatewayRouteInspectionNoticePlan) => void
}

export function useGatewayRouteInspectionPageActions({
  requestDiagnosis,
  openDiagnosisDrawer,
  setDiagnosisLoading,
  setDiagnosis,
  requestLogs,
  openLogsDrawer,
  setLogsLoading,
  setLogs,
  clearLogs,
  showPlanNotice,
}: GatewayRouteInspectionPageOptions) {
  const openRouteDiagnosis = createOpenGatewayRouteDiagnosisAction({
    requestDiagnosis,
    openDrawer: openDiagnosisDrawer,
    setLoading: setDiagnosisLoading,
    setDiagnosis,
    showPlanNotice,
  })
  const openRouteLogs = createOpenGatewayRouteLogsAction({
    requestLogs,
    openDrawer: openLogsDrawer,
    setLoading: setLogsLoading,
    setLogs,
    clearLogs,
    showPlanNotice,
  })

  return {
    openRouteDiagnosis,
    openRouteLogs,
  }
}
