import { ref } from 'vue'

import { buildGatewayRouteLogsErrorPlan } from './gatewayRouteLogsModel.ts'
import type { GatewayLog, GatewayRoute } from './types.ts'

type LoadGatewayRouteLogsOptions = {
  route: GatewayRoute
  requestLogs: (routeId: number, limit: number) => Promise<GatewayLog[]>
  openDrawer: (route: GatewayRoute) => void
  setLoading: (loading: boolean) => void
  setLogs: (logs: GatewayLog[]) => void
  clearLogs: () => void
  showPlanNotice: (plan: ReturnType<typeof buildGatewayRouteLogsErrorPlan>) => void
}

export type OpenGatewayRouteLogsActionOptions = Omit<LoadGatewayRouteLogsOptions, 'route'>

export function useGatewayRouteLogsDrawer() {
  const open = ref(false)
  const loading = ref(false)
  const route = ref<GatewayRoute | null>(null)
  const search = ref('')
  const logs = ref<GatewayLog[]>([])

  function openDrawer(selectedRoute: GatewayRoute) {
    open.value = true
    route.value = selectedRoute
    search.value = ''
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setLogs(value: GatewayLog[]) {
    logs.value = value
  }

  function clearLogs() {
    logs.value = []
  }

  return {
    open,
    loading,
    route,
    search,
    logs,
    openDrawer,
    setLoading,
    setLogs,
    clearLogs,
  }
}

export type GatewayRouteLogsDrawer = ReturnType<typeof useGatewayRouteLogsDrawer>

export function createOpenGatewayRouteLogsAction(options: OpenGatewayRouteLogsActionOptions) {
  return (route: GatewayRoute) =>
    loadGatewayRouteLogs({
      ...options,
      route,
    })
}

export async function loadGatewayRouteLogs({
  route,
  requestLogs,
  openDrawer,
  setLoading,
  setLogs,
  clearLogs,
  showPlanNotice,
}: LoadGatewayRouteLogsOptions) {
  openDrawer(route)
  setLoading(true)
  try {
    setLogs(await requestLogs(route.id, 120))
  } catch (err) {
    const errorPlan = buildGatewayRouteLogsErrorPlan(err)
    showPlanNotice(errorPlan)
    if (errorPlan.shouldClearLogs) {
      clearLogs()
    }
  } finally {
    setLoading(false)
  }
}
