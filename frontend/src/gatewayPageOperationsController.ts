import type { ComputedRef } from 'vue'

import { useGatewayPageAdminActions } from './gatewayPageAdminActionsController.ts'
import type { GatewayPageDisplayHelpers } from './gatewayPageDisplayHelpersController.ts'
import type { GatewayPagePlatform } from './gatewayPagePlatformController.ts'
import { useGatewayPageRefreshActions } from './gatewayPageRefreshActionsController.ts'
import type { GatewayPageRequests } from './gatewayPageRequestsController.ts'
import { useGatewayPageRouteActions } from './gatewayPageRouteActionsController.ts'
import { useGatewayPageRuntimeActions } from './gatewayPageRuntimeActionsController.ts'
import type { GatewayPageState } from './gatewayPageStateController.ts'
import type { GatewayNoticeActions } from './gatewayNoticeController.ts'
import type { GatewayRouteMutationActions } from './gatewayRouteMutationActionsController.ts'

type GatewayPageOperationsOptions = {
  state: GatewayPageState
  gatewayPageRequests: GatewayPageRequests
  gatewayPageDisplayHelpers: GatewayPageDisplayHelpers
  gatewayPagePlatform: GatewayPagePlatform
  routeMutationActions: GatewayRouteMutationActions
  isGatewayMonitor: ComputedRef<boolean>
  mounted: () => boolean
  nowMs: () => number
  nowIso: () => string
  showNotice: GatewayNoticeActions['showNotice']
  showPlanNotice: GatewayNoticeActions['showPlanNotice']
}

export function useGatewayPageOperations({
  state,
  gatewayPageRequests,
  gatewayPageDisplayHelpers,
  gatewayPagePlatform,
  routeMutationActions,
  isGatewayMonitor,
  mounted,
  nowMs,
  nowIso,
  showNotice,
  showPlanNotice,
}: GatewayPageOperationsOptions) {
  const runtimeActions = useGatewayPageRuntimeActions({
    state,
    gatewayPageRequests,
    gatewayPageDisplayHelpers,
    gatewayPagePlatform,
    routeMutationActions,
    isGatewayMonitor,
    mounted,
    nowMs,
    showNotice,
    showPlanNotice,
  })
  let routeActions: ReturnType<typeof useGatewayPageRouteActions>
  const refreshActions = useGatewayPageRefreshActions({
    state,
    gatewayPageRequests,
    runtimeActions,
    getRouteActions: () => routeActions,
    showPlanNotice,
  })
  routeActions = useGatewayPageRouteActions({
    state,
    gatewayPageRequests,
    gatewayPageDisplayHelpers,
    gatewayPagePlatform,
    routeMutationActions,
    refreshActions,
    runtimeActions,
    nowIso,
    showNotice,
    showPlanNotice,
  })
  const adminActions = useGatewayPageAdminActions({
    state,
    gatewayPageRequests,
    routeActions,
    runtimeActions,
    showPlanNotice,
  })

  return {
    runtimeActions,
    refreshActions,
    routeActions,
    adminActions,
  }
}
