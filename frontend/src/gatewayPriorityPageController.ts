import {
  createMoveGatewayPriorityRouteAction,
  createOpenGatewayPriorityDialogAction,
  createPresetGatewayPriorityRoutesAction,
} from './gatewayPriorityController.ts'
import type { GatewayRoutePriorityReorderPayload } from './apiGateway.ts'
import type { GatewayRoute } from './types.ts'

type RefLike<T> = {
  value: T
}

type GatewayPriorityNotice = {
  tone: 'success' | 'error'
  message: string
}

type GatewayPriorityNoticePlan = {
  notice: GatewayPriorityNotice
}

type GatewayPriorityPageActionOptions = {
  routes: RefLike<GatewayRoute[]>
  priorityRoute: RefLike<GatewayRoute | null>
  priorityInsertIndex: RefLike<number | null | undefined>
  requestRoutes: (options: { includeDisabled: true }) => Promise<GatewayRoute[]>
  requestReorder: (payload: GatewayRoutePriorityReorderPayload) => Promise<GatewayRoute[]>
  normalizeRoute: (route: GatewayRoute) => GatewayRoute
  openPriorityDialog: (route: GatewayRoute, currentRoutes: GatewayRoute[]) => void
  setPriorityDialogLoading: (loading: boolean) => void
  setPriorityRoutes: (routes: GatewayRoute[]) => void
  selectPriorityRoute: (route: GatewayRoute | null) => void
  clearPriorityInsertIndex: () => void
  applyReorderedRoutes: (routes: GatewayRoute[]) => void
  showNotice: (notice: GatewayPriorityNotice) => void
  showPlanNotice: (plan: GatewayPriorityNoticePlan) => void
}

export function useGatewayPriorityPageActions({
  routes,
  priorityRoute,
  priorityInsertIndex,
  requestRoutes,
  requestReorder,
  normalizeRoute,
  openPriorityDialog,
  setPriorityDialogLoading,
  setPriorityRoutes,
  selectPriorityRoute,
  clearPriorityInsertIndex,
  applyReorderedRoutes,
  showNotice,
  showPlanNotice,
}: GatewayPriorityPageActionOptions) {
  const openPriorityDialogAction = createOpenGatewayPriorityDialogAction({
    getCurrentRoutes: () => routes.value,
    requestRoutes,
    normalizeRoute,
    openDialog: openPriorityDialog,
    setLoading: setPriorityDialogLoading,
    setRoutes: setPriorityRoutes,
    selectRoute: selectPriorityRoute,
    showPlanNotice,
  })
  const handlePriorityMove = createMoveGatewayPriorityRouteAction({
    getRoute: () => priorityRoute.value,
    getTarget: () => priorityInsertIndex.value,
    requestReorder,
    applyReorderedRoutes,
    setLoading: setPriorityDialogLoading,
    selectRoute: selectPriorityRoute,
    showNotice,
    showPlanNotice,
  })
  const handlePriorityPreset = createPresetGatewayPriorityRoutesAction({
    getCurrentRoute: () => priorityRoute.value,
    requestReorder,
    applyReorderedRoutes,
    setLoading: setPriorityDialogLoading,
    clearInsertIndex: clearPriorityInsertIndex,
    selectRoute: selectPriorityRoute,
    showPlanNotice,
  })

  return {
    openPriorityDialog: openPriorityDialogAction,
    handlePriorityMove,
    handlePriorityPreset,
  }
}
