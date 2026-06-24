import { ref } from 'vue'

import { buildGatewayRouteDiagnosisErrorPlan } from './gatewayRouteDiagnosisModel.ts'
import type { GatewayRoute, GatewayRouteDiagnosis } from './types.ts'

type LoadGatewayRouteDiagnosisOptions = {
  route: GatewayRoute
  requestDiagnosis: (routeId: number) => Promise<GatewayRouteDiagnosis>
  openDrawer: () => void
  setLoading: (loading: boolean) => void
  setDiagnosis: (diagnosis: GatewayRouteDiagnosis) => void
  showPlanNotice: (plan: ReturnType<typeof buildGatewayRouteDiagnosisErrorPlan>) => void
}

export type OpenGatewayRouteDiagnosisActionOptions = Omit<LoadGatewayRouteDiagnosisOptions, 'route'>

export function useGatewayRouteDiagnosisDrawer() {
  const open = ref(false)
  const loading = ref(false)
  const diagnosis = ref<GatewayRouteDiagnosis | null>(null)

  function openDrawer() {
    open.value = true
    diagnosis.value = null
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setDiagnosis(value: GatewayRouteDiagnosis) {
    diagnosis.value = value
  }

  return {
    open,
    loading,
    diagnosis,
    openDrawer,
    setLoading,
    setDiagnosis,
  }
}

export type GatewayRouteDiagnosisDrawer = ReturnType<typeof useGatewayRouteDiagnosisDrawer>

export async function loadGatewayRouteDiagnosis({
  route,
  requestDiagnosis,
  openDrawer,
  setLoading,
  setDiagnosis,
  showPlanNotice,
}: LoadGatewayRouteDiagnosisOptions) {
  openDrawer()
  setLoading(true)
  try {
    setDiagnosis(await requestDiagnosis(route.id))
  } catch (err) {
    const errorPlan = buildGatewayRouteDiagnosisErrorPlan(err)
    showPlanNotice(errorPlan)
  } finally {
    setLoading(false)
  }
}

export function createOpenGatewayRouteDiagnosisAction(options: OpenGatewayRouteDiagnosisActionOptions) {
  return (route: GatewayRoute) =>
    loadGatewayRouteDiagnosis({
      ...options,
      route,
    })
}
