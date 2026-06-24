import type { Ref } from 'vue'

import { createApplyGatewayPriorityReorderedRoutesAction } from './gatewayPriorityController.ts'
import { createApplyGatewayRouteBalanceResultAction } from './gatewayRouteBalanceProbeController.ts'
import { createApplyGatewayProbeResultAction } from './gatewayRouteProbeController.ts'
import {
  mergeActiveRequestSnapshot,
  mergeGatewayProbeResult,
  mergeGatewayRouteBalanceResult,
} from './gatewayRouteStateModel.ts'
import { createApplyGatewayActiveRequestSnapshotAction } from './gatewayRuntimeController.ts'
import type { GatewayOverview, GatewayRoute } from './types.ts'

type GatewayRouteMutationActionsOptions = {
  routes: Ref<GatewayRoute[]>
  priorityRoutes: Ref<GatewayRoute[]>
  overview: Ref<GatewayOverview | null>
  includeDisabled: Ref<boolean>
}

function createRefSetter<T>(target: Ref<T>) {
  return (nextValue: T) => {
    target.value = nextValue
  }
}

export function useGatewayRouteMutationActions({
  routes,
  priorityRoutes,
  overview,
  includeDisabled,
}: GatewayRouteMutationActionsOptions) {
  const setRoutes = createRefSetter(routes)
  const setPriorityRoutes = createRefSetter(priorityRoutes)
  const setOverview = createRefSetter(overview)

  const applyActiveRequestSnapshot = createApplyGatewayActiveRequestSnapshotAction({
    getRoutes: () => routes.value,
    getPriorityRoutes: () => priorityRoutes.value,
    getOverview: () => overview.value,
    mergeSnapshot: mergeActiveRequestSnapshot,
    setRoutes,
    setPriorityRoutes,
    setOverview,
  })
  const applyProbeResult = createApplyGatewayProbeResultAction({
    getRoutes: () => routes.value,
    mergeProbeResult: mergeGatewayProbeResult,
    setRoutes,
  })
  const applyRouteBalanceResult = createApplyGatewayRouteBalanceResultAction({
    getRoutes: () => routes.value,
    mergeBalanceResult: mergeGatewayRouteBalanceResult,
    setRoutes,
  })
  const applyReorderedRoutes = createApplyGatewayPriorityReorderedRoutesAction({
    getIncludeDisabled: () => includeDisabled.value,
    setPriorityRoutes,
    setRoutes,
  })

  return {
    applyActiveRequestSnapshot,
    applyProbeResult,
    applyRouteBalanceResult,
    applyReorderedRoutes,
  }
}

export type GatewayRouteMutationActions = ReturnType<typeof useGatewayRouteMutationActions>
