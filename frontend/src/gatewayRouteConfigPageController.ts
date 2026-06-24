import type { Ref } from 'vue'

import {
  createChangeGatewayRoutePathAction,
  createChangeGatewayRouteTypeAction,
  createOpenGatewayRouteModelsDialogAction,
  createSaveGatewayRouteModelsAction,
  createSelectGatewayRoutePathAction,
  createSelectGatewayRouteTypeAction,
} from './gatewayRouteConfigController.ts'
import type { GatewayRoute, GatewayRouteUpdatePayload } from './types.ts'

type RouteConfigNoticePlan = {
  notice: {
    tone: 'success' | 'error'
    message: string
  }
}

type GatewayRouteConfigPageActionsOptions = {
  routes: Ref<GatewayRoute[]>
  priorityRoutes: Ref<GatewayRoute[]>
  routeModelsDialogRoute: Ref<GatewayRoute | null>
  routeModelsDialogValue: Ref<unknown>
  routeModelsDialogRequestURLs: Ref<unknown>
  requestUpdateRoute: (routeId: number, payload: GatewayRouteUpdatePayload) => Promise<GatewayRoute>
  routeLabel: (route: GatewayRoute) => string
  routeTypeLabel: (routeType: GatewayRoute['route_type']) => string
  routePathLabel: (routePath: NonNullable<GatewayRoute['route_path']>) => string
  openRouteModelsDialog: (route: GatewayRoute) => void
  setRouteModelsDialogSaving: (saving: boolean) => void
  closeRouteModelsDialogAfterSuccess: () => void
  showPlanNotice: (plan: RouteConfigNoticePlan) => void
}

function createRefSetter<T>(target: Ref<T>) {
  return (nextValue: T) => {
    target.value = nextValue
  }
}

export function useGatewayRouteConfigPageActions({
  routes,
  priorityRoutes,
  routeModelsDialogRoute,
  routeModelsDialogValue,
  routeModelsDialogRequestURLs,
  requestUpdateRoute,
  routeLabel,
  routeTypeLabel,
  routePathLabel,
  openRouteModelsDialog,
  setRouteModelsDialogSaving,
  closeRouteModelsDialogAfterSuccess,
  showPlanNotice,
}: GatewayRouteConfigPageActionsOptions) {
  const setRoutes = createRefSetter(routes)
  const setPriorityRoutes = createRefSetter(priorityRoutes)
  const handleRouteTypeChange = createChangeGatewayRouteTypeAction({
    getRoutes: () => routes.value,
    setRoutes,
    getPriorityRoutes: () => priorityRoutes.value,
    setPriorityRoutes,
    requestUpdateRoute,
    routeLabel,
    routeTypeLabel,
    showPlanNotice,
  })
  const handleRouteTypeSelect = createSelectGatewayRouteTypeAction({
    changeRouteType: handleRouteTypeChange,
  })
  const handleRoutePathChange = createChangeGatewayRoutePathAction({
    getRoutes: () => routes.value,
    setRoutes,
    getPriorityRoutes: () => priorityRoutes.value,
    setPriorityRoutes,
    requestUpdateRoute,
    routeLabel,
    routePathLabel,
    showPlanNotice,
  })
  const handleRoutePathSelect = createSelectGatewayRoutePathAction({
    changeRoutePath: handleRoutePathChange,
  })
  const openRouteModelsDialogAction = createOpenGatewayRouteModelsDialogAction({
    openDialog: openRouteModelsDialog,
  })
  const saveRouteModelsDialog = createSaveGatewayRouteModelsAction({
    getRoute: () => routeModelsDialogRoute.value,
    getSupportedModels: () => routeModelsDialogValue.value,
    getRequestURLs: () => routeModelsDialogRequestURLs.value,
    getRoutes: () => routes.value,
    setRoutes,
    getPriorityRoutes: () => priorityRoutes.value,
    setPriorityRoutes,
    requestUpdateRoute,
    setSaving: setRouteModelsDialogSaving,
    closeAfterSuccess: closeRouteModelsDialogAfterSuccess,
    showPlanNotice,
  })

  return {
    handleRouteTypeSelect,
    handleRoutePathSelect,
    openRouteModelsDialog: openRouteModelsDialogAction,
    saveRouteModelsDialog,
  }
}
